/**
 * Cliente para Vertex AI Search
 */

import { GoogleAuth } from 'google-auth-library'

const PROJECT_ID = process.env.VERTEX_PROJECT_ID
const LOCATION = process.env.VERTEX_LOCATION
const COLLECTION = process.env.VERTEX_COLLECTION
const ENGINE_ID = process.env.VERTEX_ENGINE_ID
const SERVING_CONFIG = process.env.VERTEX_SERVING_CONFIG

if (!PROJECT_ID || !LOCATION || !COLLECTION || !ENGINE_ID || !SERVING_CONFIG) {
    console.warn('⚠️ [Vertex AI] Faltan variables de entorno esenciales para Vertex AI Search')
}

interface SearchResult {
    id: string
    title: string
    snippet: string
    link?: string
}

/**
 * Busca documentos relevantes en Vertex AI Search
 */
export async function searchVertexAI(query: string): Promise<string> {
    try {
        console.log('🔍 [Vertex AI] Buscando:', query)

        // Crear cliente de autenticación
        // Configurar autenticación
        const authOptions: any = {
            scopes: ['https://www.googleapis.com/auth/cloud-platform'],
        }

        // Si tenemos la clave en JSON (como en Vercel), la usamos directamente
        if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
            try {
                authOptions.credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON)
            } catch (e) {
                console.error('❌ [Vertex AI] Error al parsear GOOGLE_APPLICATION_CREDENTIALS_JSON')
            }
        } else {
            // En local, usamos el archivo
            authOptions.keyFilename = './app/google-key.json'
        }

        const auth = new GoogleAuth(authOptions)

        // Obtener access token
        const client = await auth.getClient()
        const accessToken = await client.getAccessToken()

        if (!accessToken.token) {
            console.error('❌ [Vertex AI] No se pudo obtener access token')
            return ''
        }

        // Construir URL del endpoint (usando dataStores en vez de engines)
        const url = `https://discoveryengine.googleapis.com/v1alpha/projects/${PROJECT_ID}/locations/${LOCATION}/collections/${COLLECTION}/dataStores/${ENGINE_ID}/servingConfigs/${SERVING_CONFIG}:search`

        console.log('📡 [Vertex AI] URL:', url)
        console.log('📝 [Vertex AI] Query enviada:', query)

        // Preparar el body de la request
        const requestBody = {
            query: query,
            pageSize: 5,
            contentSearchSpec: {
                // Forzar búsqueda en el contenido del PDF
                snippetSpec: {
                    maxSnippetCount: 3,
                    returnSnippet: true,
                },
                extractiveContentSpec: {
                    maxExtractiveSegmentCount: 3,
                    maxExtractiveAnswerCount: 1,
                },
            },
            queryExpansionSpec: {
                condition: 'AUTO',
            },
            spellCorrectionSpec: {
                mode: 'AUTO',
            },
        }

        console.log(
            '📦 [Vertex AI] Body enviado:',
            JSON.stringify(requestBody, null, 2)
        )

        // Hacer la búsqueda
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken.token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
        })

        if (!response.ok) {
            const errorText = await response.text()
            console.error(
                `❌ [Vertex AI] Error HTTP ${response.status}:`,
                errorText
            )
            return ''
        }

        const data = await response.json()
        console.log('📦 [Vertex AI] Respuesta:', JSON.stringify(data, null, 2))

        // Extraer resultados
        const results: SearchResult[] = []

        if (data.results && Array.isArray(data.results)) {
            for (const result of data.results) {
                const doc = result.document

                if (!doc) continue

                // Intentar obtener datos
                const structData = doc.structData || {}
                const derivedData = doc.derivedStructData || {}

                const title =
                    structData.title || derivedData.title || 'Sin título'
                const snippet =
                    structData.snippet ||
                    derivedData.snippets?.[0]?.snippet ||
                    derivedData.extractiveSegments?.[0]?.content ||
                    ''
                const link = structData.link || derivedData.link

                if (snippet) {
                    results.push({
                        id: result.id,
                        title,
                        snippet,
                        link,
                    })
                }
            }
        }

        if (results.length === 0) {
            console.log('ℹ️ [Vertex AI] Sin resultados relevantes')
            return ''
        }

        console.log(
            `✅ [Vertex AI] Encontrados ${results.length} documentos relevantes`
        )

        // Formatear como contexto
        const context = results
            .map((r, i) => {
                let text = `### Documento ${i + 1}: ${r.title}\n${r.snippet}`
                if (r.link) {
                    text += `\nFuente: ${r.link}`
                }
                return text
            })
            .join('\n\n---\n\n')

        return context
    } catch (error: any) {
        console.error('❌ [Vertex AI] Error:', error.message)
        console.error('Stack:', error.stack)
        return ''
    }
}

/**
 * Envuelve el contexto para el prompt
 */
export function buildVertexContext(text: string): string {
    return `
📚 DOCUMENTACIÓN AUTORIZADA (Vertex AI Search):
--------------------------------------------
${text}
--------------------------------------------
Usa ESTA información como fuente prioritaria. Si mencionas artículos legales, ponlos en negrita.
`
}
