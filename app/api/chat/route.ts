import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@/app/lib/supabase/server'
import { searchVertexAI, buildVertexContext } from '@/app/lib/vertex-search'

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(req: Request) {
    try {
        // -----------------------------------------------------------------------
        // 1. CONFIGURACIÓN Y AUTENTICACIÓN
        // -----------------------------------------------------------------------
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        // Si no hay usuario logueado, rechazamos la petición por seguridad
        if (!user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        const { message, history, studentName, conversationId } = await req.json()

        // -----------------------------------------------------------------------
        // 2. DEFINICIÓN DE LA PERSONALIDAD (SYSTEM PROMPT)
        // -----------------------------------------------------------------------
        const systemPrompt = `
      Eres un tutor experto en Derecho para estudiantes universitarios. Tu objetivo es ser empático, pedagógico y motivador.
      
      REGLAS DE COMPORTAMIENTO:
      - Recuerda siempre que el nombre del alumno es ${studentName || 'estudiante'}. Refiérete a él/ella de forma natural.
      - Usa un tono profesional pero cercano, como un mentor.
      - No des la respuesta directamente de inmediato. Usa el método Socrático: haz preguntas que guíen al estudiante a razonar.
      - Si el estudiante explica un concepto, usa el método Feynman para comprobar si lo ha entendido (pídele que lo explique "como si tuviera 5 años").
      - Fomenta el pensamiento crítico legal.
      - Estás preparado para integrar RAG (Búsqueda de archivos de manuales de Derecho en el futuro).
    `

        // -----------------------------------------------------------------------
        // 3. REFLEJO INMEDIATO EN BASE DE DATOS (Optimistic Update)
        // -----------------------------------------------------------------------
        // Guardamos la pregunta del usuario ANTES de generar la respuesta.
        // Esto asegura que si el usuario cancela o cierra, su duda queda registrada.
        await supabase.from('messages').insert([
            {
                user_id: user.id,
                content: message,
                role: 'user',
                conversation_id: conversationId // Guardamos el ID de la conversación
            }
        ])

        // -----------------------------------------------------------------------
        // 4. VERTEX AI SEARCH - BÚSQUEDA DE CONTEXTO
        // -----------------------------------------------------------------------
        let vertexContext = ''

        try {
            console.log('🚀 [API] Llamando a Vertex AI con mensaje:', message)
            const contextText = await searchVertexAI(message)

            if (contextText && contextText.trim()) {
                console.log(
                    '📄 [Vertex AI] Contexto encontrado:',
                    contextText.substring(0, 120) + '...'
                )
                vertexContext = buildVertexContext(contextText)
            } else {
                console.log('ℹ️ [Vertex AI] Sin resultados relevantes')
            }
        } catch (err: any) {
            console.warn('⚠️ [Vertex AI] Error:', err.message || err)
        }

        // -----------------------------------------------------------------------
        // 5. INICIO DEL STREAMING CON OPENAI
        // -----------------------------------------------------------------------
        const stream = await openai.chat.completions.create({
            model: 'gpt-5.2',
            messages: [
                { role: 'system', content: systemPrompt },

                // Si hay contexto de Vertex AI, lo agregamos como mensaje del sistema
                ...(vertexContext
                    ? [
                        {
                            role: 'system' as const,
                            content: vertexContext,
                        },
                    ]
                    : []),

                ...history,
                { role: 'user', content: message },
            ],
            temperature: 0.4, // Creatividad baja para mantener precisión legal
            stream: true,     // <--- IMPORTANTE: Habilita el modo streaming
        })

        // -----------------------------------------------------------------------
        // 6. PROCESAMIENTO DEL STREAM (RETRANSMISIÓN + GRABACIÓN)
        // -----------------------------------------------------------------------
        // Creamos un stream personalizado que hace dos cosas a la vez:
        // 1. Envía los trozos (chunks) al frontend para que el usuario lea en vivo.
        // 2. Acumula el texto completo en memoria para guardarlo en la BD al final.

        const encoder = new TextEncoder()
        let fullResponse = '' // Aquí acumularemos la respuesta completa

        const customStream = new ReadableStream({
            async start(controller) {
                try {
                    // Iteramos sobre cada pedacito de texto que nos manda OpenAI
                    for await (const chunk of stream) {
                        const content = chunk.choices[0]?.delta?.content || ''
                        if (content) {
                            fullResponse += content
                            // Enviamos el pedacito al Frontend
                            controller.enqueue(encoder.encode(content))
                        }
                    }
                    controller.close() // Cerramos el stream cuando OpenAI termina

                    // -----------------------------------------------------------------------
                    // 7. PERSISTENCIA FINAL
                    // -----------------------------------------------------------------------
                    // Una vez terminado, guardamos la respuesta completa.
                    if (fullResponse) {
                        await supabase.from('messages').insert([
                            {
                                user_id: user.id,
                                content: fullResponse,
                                role: 'assistant',
                                conversation_id: conversationId // Guardamos el ID de la conversación
                            },
                        ])
                    }
                } catch (err) {
                    controller.error(err)
                }
            },
        })

        // Devolvemos el stream como respuesta HTTP
        return new NextResponse(customStream, {
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'Cache-Control': 'no-cache',
            },
        })

    } catch (error: any) {
        console.error('API Error:', error)
        return NextResponse.json({ error: 'Error interno en el servidor' }, { status: 500 })
    }
}
