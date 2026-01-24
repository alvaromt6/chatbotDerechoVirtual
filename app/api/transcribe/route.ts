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

        const formData = await req.formData()
        const file = formData.get('file') as File

        if (!file) {
            return NextResponse.json({ error: 'No se encontró el archivo de audio' }, { status: 400 })
        }

        // OpenAI espera un objeto File-like. 
        // Al venir de formData en Next.js App Router, 'file' ya es un File/Blob válido.
        const transcription = await openai.audio.transcriptions.create({
            file: file,
            model: 'gpt-4o-mini-transcribe',
            language: 'es', // Forzamos español para mejor precisión
        })
        /*
        const transcription = await openai.audio.transcriptions.create({
            file,
            model: 'whisper-1',
            language: 'es',
            prompt: 'Transcribe solo lo que oigas. Si no se entiende no hagas nada',
            temperature: 0,
        })
        */

        const text = transcription.text.trim()

        // FILTRO DE ALUCINACIONES:
        // Whisper a veces "alucina" con silencios y devuelve créditos de subtítulos.
        const hallucinations = [
            'Amara.org',
            'Subtítulos',
            'transcribed by',
            'Copyright',
            'instrucciones',
            'suscríbete',
            'plara',
            'aleja',
            'silencio',
            '¡Gracias por ver el vídeo!',
            '¡Gracias!',
            '¡Adios!'
        ]

        const isHallucination = hallucinations.some(h =>
            text.toLowerCase().includes(h.toLowerCase())
        )

        if (isHallucination || text.length < 2) {
            console.log('Alucinación detectada y filtrada:', text)
            return NextResponse.json({ text: '' }) // Devolvemos vacío para que el frontend no envíe nada
        }

        return NextResponse.json({
            text: text,
        })

    } catch (error: any) {
        console.error('Transcription Error:', error)
        return NextResponse.json({ error: 'Error al transcribir audio' }, { status: 500 })
    }
}
