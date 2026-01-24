'use client'

import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import { Moon, Sun } from 'lucide-react'

/**
 * Componente ThemeToggle: Permite al usuario cambiar entre el modo claro y oscuro.
 * Utiliza 'next-themes' para gestionar el estado del tema y 'lucide-react' para los iconos.
 */
export function ThemeToggle() {
    // El estado 'mounted' es crucial en Next.js para evitar errores de hidratación.
    // El servidor no sabe qué tema prefiere el usuario, por lo que esperamos a que
    // el componente se monte en el cliente antes de mostrar el icono correcto.
    const [mounted, setMounted] = useState(false)
    const { theme, setTheme } = useTheme()

    // Este efecto se ejecuta solo una vez cuando el componente se monta en el navegador.
    useEffect(() => {
        setMounted(true)
    }, [])

    // Si el componente aún no se ha montado, devolvemos un espacio vacío (placeholder).
    // Esto evita que el layout de la página "salte" cuando el icono aparece.
    if (!mounted) {
        return (
            <div className="p-2 w-9 h-9" />
        )
    }

    return (
        <button
            // Cambia el tema entre 'light' y 'dark' al hacer clic.
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-slate-600 dark:text-slate-300 cursor-pointer"
            aria-label="Cambiar tema"
        >
            {/* Muestra el Sol si el tema es oscuro (para cambiar a claro) y la Luna si es claro. */}
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
    )
}
