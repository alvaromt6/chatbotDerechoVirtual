'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/app/lib/supabase/client'
import { GraduationCap, LogOut, Send, User, Mic, Square, Loader2 } from 'lucide-react'
import { signOut } from '@/app/lib/auth-actions'
import { ThemeToggle } from '@/app/components/ThemeToggle'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import TextareaAutosize from 'react-textarea-autosize'

/**
 * Interfaz para definir la estructura de un mensaje en el chat.
 */
interface Message {
    role: 'user' | 'assistant'
    content: string
}

/**
 * Página principal del Chat: Gestiona la interfaz de mensajería, el historial
 * y la comunicación con la API de IA.
 */
export default function ChatPage() {
    // ESTADOS
    const [messages, setMessages] = useState<Message[]>([]) // Historial de mensajes en pantalla
    const [input, setInput] = useState('')                 // Texto actual en el campo de entrada
    const [loading, setLoading] = useState(false)          // Estado de carga (esperando respuesta de IA)
    const [user, setUser] = useState<any>(null)           // Información del usuario logueado

    // ESTADOS PARA AUDIO
    const [isRecording, setIsRecording] = useState(false)
    const [isTranscribing, setIsTranscribing] = useState(false)

    // REFERENCIAS
    const messagesEndRef = useRef<HTMLDivElement>(null)    // Referencia para scroll automático al final
    const mediaRecorderRef = useRef<MediaRecorder | null>(null)
    const chunksRef = useRef<Blob[]>([])
    const recordingStartTimeRef = useRef<number | null>(null)
    const supabase = createClient()                        // Cliente de Supabase (frontend)

    /**
     * EFECTO INICIAL: Cargar datos del usuario y su historial de mensajes.
     */
    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            setUser(user)

            // Cargar historial de la base de datos si el usuario existe
            if (user) {
                const { data, error } = await supabase
                    .from('messages')
                    .select('role, content')
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: true })

                if (data && !error) {
                    setMessages(data as Message[])
                }
            }
        }
        getUser()
    }, [])

    /**
     * EFECTO: Hacer scroll automático hacia abajo cada vez que hay un nuevo mensaje.
     */
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    /**
     * FUNCIÓN: Iniciar grabación de audio
     */
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            const mediaRecorder = new MediaRecorder(stream)
            mediaRecorderRef.current = mediaRecorder
            chunksRef.current = []

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunksRef.current.push(e.data)
                }
            }

            mediaRecorder.onstop = async () => {
                const duration = Date.now() - (recordingStartTimeRef.current || 0)

                // Detener todos los tracks del stream para apagar el micrófono
                stream.getTracks().forEach(track => track.stop())

                if (duration < 1000) {
                    // alert('Grabación muy corta. Mantén presionado o habla más tiempo.')
                    return
                }

                const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' })
                await handleTranscribe(audioBlob)
            }

            mediaRecorder.start()
            recordingStartTimeRef.current = Date.now()
            setIsRecording(true)
        } catch (err) {
            console.error('Error al acceder al micrófono:', err)
            alert('No se pudo acceder al micrófono. Por favor, verifica los permisos.')
        }
    }

    /**
     * FUNCIÓN: Detener grabación
     */
    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop()
            setIsRecording(false)
        }
    }

    /**
     * FUNCIÓN: Enviar mensaje a la API
     */
    const sendMessage = async (text: string) => {
        if (!text.trim() || loading) return

        // Añadir mensaje del usuario a la lista visual inmediatamente
        setMessages((prev) => [...prev, { role: 'user', content: text }])
        setLoading(true)

        try {
            // Llamada a nuestra API de OpenAI
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: text,
                    history: messages,
                    studentName: user?.user_metadata?.full_name,
                }),
            })

            const data = await response.json()
            if (data.reply) {
                // Añadir respuesta de la IA a la lista visual
                setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }])
            }
        } catch (error) {
            console.error('Error al enviar mensaje:', error)
        } finally {
            setLoading(false)
        }
    }

    /**
     * FUNCIÓN: Transcribir audio
     */
    const handleTranscribe = async (audioBlob: Blob) => {
        setIsTranscribing(true)
        try {
            const formData = new FormData()
            formData.append('file', audioBlob, 'recording.webm')

            const response = await fetch('/api/transcribe', {
                method: 'POST',
                body: formData,
            })

            const data = await response.json()
            if (data.text) {
                // AUTO-SEND: Enviar directamente la transcripción
                await sendMessage(data.text)
            } else if (data.error) {
                console.error('Error de transcripción:', data.error)
            }
        } catch (error) {
            console.error('Error enviando audio:', error)
        } finally {
            setIsTranscribing(false)
        }
    }

    /**
     * FUNCIÓN: Manejador del form submit
     */
    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault()
        const text = input
        setInput('')
        await sendMessage(text)
    }

    return (
        <div className="flex flex-col h-screen bg-slate-50 dark:bg-slate-900 transition-colors">

            {/* CABECERA: Logo, Nombre del bot, Selector de tema y Usuario */}
            <header className="h-16 glass-card flex items-center justify-between px-6 sticky top-0 z-10 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                    <div className="bg-blue-900 p-2 rounded-lg text-white">
                        <GraduationCap className="w-5 h-5" />
                    </div>
                    <span className="font-bold text-slate-900 dark:text-white hidden sm:inline">Alvaro TutorAI</span>
                </div>

                <div className="flex items-center gap-4">
                    <ThemeToggle />
                    {/* Badge de Usuario */}
                    <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 py-1.5 px-3 rounded-full">
                        <User className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                            {user?.user_metadata?.full_name || 'Estudiante'}
                        </span>
                    </div>
                    {/* Botón de Salir */}
                    <button
                        onClick={() => signOut()}
                        className="p-2 text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                        title="Cerrar sesión"
                    >
                        <LogOut className="w-5 h-5" />
                    </button>
                </div>
            </header>

            {/* ÁREA DE MENSAJES: Renderiza la conversación */}
            <main className="flex-1 overflow-y-auto p-4 space-y-4 max-w-4xl w-full mx-auto scroll-smooth">
                {/* Pantalla de bienvenida si no hay mensajes */}
                {messages.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4">
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 max-w-md transition-colors">
                            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-2">¡Hola, {user?.user_metadata?.full_name}! 👋</h2>
                            <p className="text-slate-500 dark:text-slate-400 italic">
                                Soy tu tutor de Derecho. ¿Qué tema legal te gustaría explorar hoy? Podemos repasar conceptos, analizar casos o aplicar el método Feynman.
                            </p>
                        </div>
                    </div>
                )}

                {/* Lista de burbujas de chat */}
                {messages.map((msg, i) => (
                    <div
                        key={i}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        <div
                            className={`max-w-[85%] p-4 shadow-sm text-sm sm:text-base ${msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-ai'
                                }`}
                        >
                            <div className="prose dark:prose-invert max-w-none break-words">
                                <ReactMarkdown
                                    remarkPlugins={[remarkGfm]}
                                    components={{
                                        p: ({ node, ...props }) => <p className="mb-2 last:mb-0" {...props} />,
                                        ul: ({ node, ...props }) => <ul className="list-disc ml-4 mb-2" {...props} />,
                                        ol: ({ node, ...props }) => <ol className="list-decimal ml-4 mb-2" {...props} />,
                                        li: ({ node, ...props }) => <li className="mb-1" {...props} />,
                                        strong: ({ node, ...props }) => <strong className="font-bold text-blue-900 dark:text-blue-300" {...props} />
                                    }}
                                >
                                    {msg.content}
                                </ReactMarkdown>
                            </div>
                        </div>
                    </div>
                ))}

                {/* Animación de carga (escribiendo...) */}
                {loading && (
                    <div className="flex justify-start">
                        <div className="chat-bubble-ai p-4 flex gap-1">
                            <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce [animation-delay:-.3s]"></div>
                            <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce [animation-delay:-.5s]"></div>
                        </div>
                    </div>
                )}
                {/* Elemento invisible para asegurar que el scroll llegue al final */}
                <div ref={messagesEndRef} />
            </main>

            {/* ÁREA DE ENTRADA: Input de texto y botón de envío */}
            <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 transition-colors">
                <form
                    onSubmit={handleSend}
                    className="max-w-4xl mx-auto relative flex items-center gap-2"
                >
                    {/* Botón de Micrófono */}
                    <button
                        type="button"
                        onClick={isRecording ? stopRecording : startRecording}
                        className={`p-3 rounded-xl transition-all ${isRecording
                            ? 'bg-red-500 text-white animate-pulse cursor-pointer'
                            : isTranscribing
                                ? 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-wait'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-700 cursor-pointer'
                            }`}
                        disabled={isTranscribing || loading}
                        title={isRecording ? "Detener grabación" : "Grabar audio"}
                    >
                        {isRecording ? (
                            <Square className="w-5 h-5 fill-current" />
                        ) : isTranscribing ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <Mic className="w-5 h-5" />
                        )}
                    </button>


                    <TextareaAutosize
                        minRows={1}
                        maxRows={5}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault()
                                if (input.trim() && !loading && !isRecording && !isTranscribing) {
                                    handleSend(e as any)
                                }
                            }
                        }}
                        disabled={loading || isRecording}
                        placeholder={isRecording ? "Escuchando..." : isTranscribing ? "Transcribiendo..." : "Escribe o graba tu duda legal..."}
                        className="w-full bg-slate-100 dark:bg-slate-800 border border-transparent focus:border-blue-300 focus:bg-white dark:focus:bg-slate-700 focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/20 rounded-2xl py-3 pl-4 pr-14 outline-none transition-all placeholder:text-slate-400 text-slate-900 dark:text-slate-100 resize-none overflow-hidden"
                    />
                    <button
                        type="submit"
                        disabled={!input.trim() || loading || isRecording || isTranscribing}
                        className="absolute right-2 bottom-2 p-2 bg-blue-900 text-white rounded-xl hover:bg-blue-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Send className="w-5 h-5" />
                    </button>
                </form>
                {/* Descargo de responsabilidad */}
                <p className="text-center text-[10px] text-slate-400 mt-2">
                    Alvaro TutorAI puede cometer errores. Verifica siempre con fuentes oficiales.
                </p>
            </div>
        </div>
    )
}
