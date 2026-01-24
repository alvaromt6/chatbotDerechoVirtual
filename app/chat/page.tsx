'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/app/lib/supabase/client'
import { GraduationCap, LogOut, Send, User } from 'lucide-react'
import { signOut } from '@/app/lib/auth-actions'
import { ThemeToggle } from '@/app/components/ThemeToggle'

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

    // REFERENCIAS
    const messagesEndRef = useRef<HTMLDivElement>(null)    // Referencia para scroll automático al final
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
     * FUNCIÓN: Enviar un mensaje.
     * 1. Actualiza la UI localmente con el mensaje del usuario.
     * 2. Envía el mensaje a la API /api/chat.
     * 3. Recibe y muestra la respuesta de la IA.
     */
    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!input.trim() || loading) return

        const userMessage = input
        setInput('')

        // Añadir mensaje del usuario a la lista visual inmediatamente
        setMessages((prev) => [...prev, { role: 'user', content: userMessage }])
        setLoading(true)

        try {
            // Llamada a nuestra API de OpenAI
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: userMessage,
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
                            <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
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
                    className="max-w-4xl mx-auto relative flex items-center"
                >
                    <input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        disabled={loading}
                        placeholder="Escribe tu duda legal aquí..."
                        className="w-full bg-slate-100 dark:bg-slate-800 border border-transparent focus:border-blue-300 focus:bg-white dark:focus:bg-slate-700 focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/20 rounded-2xl py-3 pl-4 pr-14 outline-none transition-all placeholder:text-slate-400 text-slate-900 dark:text-slate-100"
                    />
                    <button
                        type="submit"
                        disabled={!input.trim() || loading}
                        className="absolute right-2 p-2 bg-blue-900 text-white rounded-xl hover:bg-blue-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
