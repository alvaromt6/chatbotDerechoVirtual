'use client'

import { createClient } from '@/app/lib/supabase/client'

/**
 * Inicia sesión con email y contraseña.
 * Utiliza el cliente de Supabase para el navegador.
 */
export async function login(formData: FormData) {
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const supabase = createClient()

    // Intento de inicio de sesión
    const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
    })

    // Si hay un error (ej. credenciales incorrectas), lanzamos una excepción
    if (error) {
        throw new Error(error.message)
    }

    // Redirección manual tras éxito
    window.location.href = '/chat'
}

/**
 * Registra un nuevo usuario y guarda metadatos adicionales.
 */
export async function signup(formData: FormData) {
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const fullName = formData.get('fullName') as string
    const supabase = createClient()

    // Registro del usuario en Supabase Auth
    const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                // Guardamos el nombre en los metadatos. 
                // Usamos 'full_name' para compatibilidad con triggers de perfiles.
                full_name: fullName,
            },
        },
    })

    if (error) {
        throw new Error(error.message)
    }

    // Redireccionamos al chat (donde el proxy validará la sesión)
    window.location.href = '/chat'
}

/**
 * Cierra la sesión del usuario actual.
 */
export async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()

    // Al cerrar sesión, volvemos a la pantalla de login
    window.location.href = '/login'
}
