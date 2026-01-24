import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@/app/lib/supabase/server'

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(req: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        const { message, history, studentName } = await req.json()

        // 1. Preparar el Prompt del Sistema (Pedagógico y Empático)
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

        // 2. Llamada a OpenAI
        const response = await openai.chat.completions.create({
            model: 'gpt-5.2', // Modelo estable y rápido para tutoría legal
            messages: [
                { role: 'system', content: systemPrompt },
                ...history,
                { role: 'user', content: message },
            ],
            temperature: 0.4,       // Creatividad baja: respuestas más precisas y predecibles

        })

        const aiMessage = response.choices[0].message.content

        // 3. Persistencia en Supabase (Tabla 'messages')
        // Insertamos primero el del usuario y luego el de la IA para garantizar el orden cronológico
        await supabase.from('messages').insert([
            { user_id: user.id, content: message, role: 'user' }
        ])

        const { error: dbError } = await supabase.from('messages').insert([
            { user_id: user.id, content: aiMessage, role: 'assistant' },
        ])

        if (dbError) {
            console.error('Error guardando mensaje de la IA:', dbError)
        }

        // 4. Espacio para RAG (Google File Search)
        // TODO: Implementar Google File Search aquí.

        return NextResponse.json({
            reply: aiMessage,
        })
    } catch (error: any) {
        console.error('API Error:', error)
        return NextResponse.json({ error: 'Error interno en el servidor' }, { status: 500 })
    }
}
