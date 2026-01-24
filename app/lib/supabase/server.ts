import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
    // 1. En Next.js 15/16, cookies() es asíncrono. Necesitamos el 'await'.
    const cookieStore = await cookies()

    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                // 2. GET: Para que el servidor sepa quién eres (ej. en /chat)
                get(name: string) {
                    return cookieStore.get(name)?.value
                },
                // 3. SET: Para que Supabase pueda "refrescar" tu sesión si caduca.
                set(name: string, value: string, options: CookieOptions) {
                    try {
                        // El try-catch es vital: Next.js da error si intentas 
                        // escribir una cookie desde un Server Component. 
                        // Supabase lo hace automáticamente, y este bloque 
                        // evita que tu app se rompa.
                        cookieStore.set({ name, value, ...options })
                    } catch (error) {
                        // Silenciamos el error porque el Proxy se encargará 
                        // de escribir la cookie realmente.
                    }
                },
                // 4. REMOVE: Para cuando haces logout.
                remove(name: string, options: CookieOptions) {
                    try {
                        cookieStore.set({ name, value: '', ...options })
                    } catch (error) {
                        // Igual que el set: omitimos el error en Server Components.
                    }
                },
            },
        }
    )
}