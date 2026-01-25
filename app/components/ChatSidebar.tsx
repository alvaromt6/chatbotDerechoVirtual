import { MessageSquare, Plus, Trash2, X } from 'lucide-react'

/**
 * Representa una conversación individual en el historial.
 */
interface Conversation {
    id: number
    title: string | null
    created_at: string
}

/**
 * Props para el componente ChatSidebar.
 */
interface ChatSidebarProps {
    conversations: Conversation[]   // Lista de conversaciones a mostrar
    currentId: number | null        // ID de la conversación actual (o null si es nueva)
    onSelect: (id: number) => void  // Función al hacer click en una conversación
    onNewChat: () => void           // Función para crear un chat nuevo
    onDelete?: (id: number) => void // Función opcional para borrar conversaciones
    isOpen: boolean                 // Estado de visibilidad en móvil
    onClose: () => void             // Función para cerrar el sidebar en móvil
}

/**
 * Componente ChatSidebar: Muestra una lista lateral de las conversaciones previas.
 * Es responsivo: fijo en desktop, deslizable en móvil.
 */
export function ChatSidebar({
    conversations,
    currentId,
    onSelect,
    onNewChat,
    onDelete,
    isOpen,
    onClose
}: ChatSidebarProps) {

    return (
        <>
            {/* Overlay para móvil: Fondo oscuro cuando el menú está abierto */}
            <div
                className={`fixed inset-0 bg-black/50 z-30 lg:hidden transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={onClose}
            />

            {/* Contenedor Principal del Sidebar */}
            <div className={`
                fixed lg:static top-0 left-0 h-full w-64 bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 
                z-40 transition-transform duration-300 ease-in-out flex flex-col
                ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} 
                /* En móvil empieza oculto (-translate-x-full) y se muestra si isOpen. En desktop siempre visible (lg:translate-x-0) */
            `}>
                {/* Cabecera del Sidebar (Solo visible título y cerrar en móvil) */}
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <span className="font-semibold text-slate-700 dark:text-slate-200">Historial</span>
                    {/* Botón X para cerrar en móvil */}
                    <button onClick={onClose} className="lg:hidden p-1 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Botón de "Nuevo Chat" */}
                <div className="p-4">
                    <button
                        onClick={() => {
                            onNewChat()
                            // En móvil, cerramos el menú al crear nuevo chat para ver la conversación
                            if (window.innerWidth < 1024) onClose()
                        }}
                        className="w-full flex items-center gap-2 px-4 py-3 bg-blue-900 hover:bg-blue-800 text-white rounded-xl transition-colors shadow-sm cursor-pointer"
                    >
                        <Plus className="w-5 h-5" />
                        <span className="font-medium">Nuevo Chat</span>
                    </button>
                </div>

                {/* Lista de Conversaciones (Scrollable) */}
                <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
                    {conversations.length === 0 ? (
                        <div className="text-center py-8 text-sm text-slate-400 px-4">
                            No hay conversaciones previas.
                        </div>
                    ) : (
                        conversations.map((conv) => (
                            <div
                                key={conv.id}
                                className={`group flex items-center gap-2 px-3 py-3 rounded-xl cursor-pointer transition-colors text-sm ${currentId === conv.id
                                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100' // Estilo activo
                                    : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300' // Estilo inactivo
                                    }`}
                                onClick={() => {
                                    onSelect(conv.id)
                                    // Cerrar menú en móvil al seleccionar
                                    if (window.innerWidth < 1024) onClose()
                                }}
                            >
                                <MessageSquare className="w-4 h-4 shrink-0 opacity-70" />
                                <span className="truncate flex-1 text-left">
                                    {conv.title || 'Nueva conversación'}
                                </span>

                                {/* Botón de Eliminar (Solo visible en hover o si es el chat activo) */}
                                {onDelete && (currentId === conv.id || window.matchMedia('(hover: hover)').matches) && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation() // Evita activar el chat al borrarlo
                                            onDelete(conv.id)
                                        }}
                                        className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-lg text-slate-400 hover:text-red-500 transition-all"
                                        title="Eliminar conversación"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        ))
                    )}
                </div>

                {/* Footer vacio por ahora */}
            </div>
        </>
    )
}
