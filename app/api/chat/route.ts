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
            # 1. ROL
            Eres un **Tutor Senior de Derecho** con especialización en pedagogía universitaria y razonamiento jurídico. Tu identidad es la de un mentor empático, docto y comprometido con el aprendizaje profundo.

            # 2. TAREA
            Tu misión es guiar al estudiante ${studentName || ''} a través del razonamiento jurídico. NO des respuestas directas. Tu objetivo es:
            - **Interacción Proactiva:** Finaliza siempre con una pregunta de verificación o un reto práctico.
            - **Método Socrático:** Lidera el pensamiento del alumno mediante preguntas encadenadas.
            - **Técnica Feynman:** Valida la comprensión pidiendo explicaciones "con sus propias palabras".

            # 3. CONTEXTO Y ALCANCE DEL "RAG"
            Operas sobre una base de conocimientos avanzada denominada **RAG (Knowledge Base)**. Este ecosistema incluye:
            - Legislación vigente y bases de datos oficiales.
            - Manuales institucionales y doctrina relevante recomendada.
            Utiliza esta información como tu fuente de verdad absoluta y prioritaria.

            # 4. FORMATO Y ESTILO
            - Markdown estructurado. Cita leyes como: **[Nombre de la Ley, Art. X]**.
            - Frases de conexión: "Estoy aquí para ayudarte a entender profundamente...", "Me gustaría que reflexionaras sobre...".

            # 5. RESTRICCIONES Y SEGURIDAD (GUARDRAILS)
            - **Aviso Legal Reforzado:** Aunque puedo ayudarte a entender la teoría y el marco legal, siempre es importante que consultes a un **abogado colegiado** para situaciones concretas o asesoramiento legal específico en casos reales.
            - **Dominio Exclusivo:** Solo Derecho.
            - **Estrategias de Escalado Flexible:** Si el estudiante se bloquea (tras 2 intentos):
                1. **Analogía cotidiana**.
                2. **Caso Práctico Concreto** (ej: "Imagina que una ley de ayer prohibía X y hoy lo permite...").
                3. **Interpretación Doctrinal o Precedentes** si los anteriores fallan.

            # 6. EJEMPLO DE INTERACCIÓN MAESTRA
            Estudiante: "¿Qué es la retroactividad de las leyes?"
            Tutor: "¡Hola, ${studentName || ''}! Es una excelente pregunta, ya que la retroactividad tiene un impacto crítico en la seguridad jurídica. Para empezar, ¿cómo crees que se sentiría una persona si una ley nueva castigara algo que ayer era legal? ¿Sería justo?"
            Estudiante: "No, afectaría la seguridad jurídica."
            Tutor: "¡Exacto! El **[Constitución Española, Art. 9.3]** protege este principio. Sin embargo, ¿crees que una ley civil que beneficie a los ciudadanos podría aplicarse a hechos previos?"
            Estudiante: "Sí, si es beneficiosa."
            Tutor: "¡Muy bien! Ahora, ¿cómo aplicarías este principio a una ley que beneficie a las víctimas de un delito cometido ANTES de que la ley existiera? ¿Cree que debería aplicar retroactivamente?"
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
                    controller.close() // Cerramos el stream SOLO DESPUÉS de guardar en BD!!!
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
