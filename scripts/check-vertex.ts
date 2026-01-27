/**
 * Script para verificar el estado del datastore de Vertex AI Search
 */

import { GoogleAuth } from 'google-auth-library'

const PROJECT_ID = process.env.VERTEX_PROJECT_ID
const LOCATION = process.env.VERTEX_LOCATION
const COLLECTION = process.env.VERTEX_COLLECTION
const ENGINE_ID = process.env.VERTEX_ENGINE_ID
const SERVING_CONFIG = process.env.VERTEX_SERVING_CONFIG

async function checkDatastore() {
    try {
        const auth = new GoogleAuth({
            keyFilename: './app/google-key.json',
            scopes: ['https://www.googleapis.com/auth/cloud-platform'],
        })

        const client = await auth.getClient()
        const accessToken = await client.getAccessToken()

        // 1. Verificar info del engine
        console.log('📊 Verificando engine...')
        const engineUrl = `https://discoveryengine.googleapis.com/v1alpha/projects/${PROJECT_ID}/locations/${LOCATION}/collections/${COLLECTION}/dataStores/${ENGINE_ID}/servingConfigs/${SERVING_CONFIG}:search`;
        const engineResponse = await fetch(engineUrl, {
            headers: {
                Authorization: `Bearer ${accessToken.token}`,
            },
        })

        if (engineResponse.ok) {
            const engineData = await engineResponse.json()
            console.log('✅ Engine encontrado:', JSON.stringify(engineData, null, 2))
        } else {
            console.error('❌ Error obteniendo engine:', await engineResponse.text())
        }

        // 2. Probar búsqueda simple
        console.log('\n🔍 Probando búsqueda...')
        const searchUrl = `https://discoveryengine.googleapis.com/v1alpha/projects/${PROJECT_ID}/locations/${LOCATION}/collections/${COLLECTION}/engines/${ENGINE_ID}/servingConfigs/default_search:search`

        const searchResponse = await fetch(searchUrl, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken.token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                query: 'piso',
                pageSize: 10,
            }),
        })

        if (searchResponse.ok) {
            const searchData = await searchResponse.json()
            console.log('✅ Respuesta de búsqueda:', JSON.stringify(searchData, null, 2))
        } else {
            console.error('❌ Error en búsqueda:', await searchResponse.text())
        }
    } catch (error: any) {
        console.error('❌ Error:', error.message)
    }
}

checkDatastore()
