import Link from "next/link";
import { ArrowRight, BookOpen, MessageCircle, Sparkles } from "lucide-react";
import { ThemeToggle } from "./components/ThemeToggle";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors">

      {/* HEADER */}
      <header className="px-6 h-16 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="bg-white p-1 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm">
            <img src="/logo.png" alt="Logo" className="w-8 h-8 object-contain" />
          </div>
          <span className="text-xl font-bold text-slate-900 dark:text-white">Alvaro TutorAI</span>
        </div>

        <div className="flex items-center gap-4">
          <ThemeToggle />
          <Link
            href="/login"
            className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-blue-900 dark:hover:text-blue-400 transition-colors"
          >
            Iniciar Sesión
          </Link>
          <Link
            href="/register"
            className="text-sm font-medium bg-blue-900 hover:bg-blue-800 text-white px-4 py-2 rounded-full transition-colors"
          >
            Registrarse
          </Link>
        </div>
      </header>

      {/* HERO SECTION */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-5xl mx-auto w-full">

        <div className="inline-flex items-center gap-2 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-3 py-1 rounded-full text-xs font-semibold mb-6 animate-fade-in-up">
          <Sparkles className="w-3 h-3" />
          <span>Tu compañero de estudios legal 24/7</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-6 leading-tight max-w-4xl">
          Domina el Derecho con <span className="text-blue-600 dark:text-blue-400">Inteligencia Artificial</span>
        </h1>

        <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
          Alvaro TutorAI te ayuda a comprender conceptos complejos, repasar para exámenes y mejorar tu razonamiento jurídico con un tutor personalizado.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <Link
            href="/register"
            className="flex items-center justify-center gap-2 bg-blue-900 hover:bg-blue-800 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all transform hover:scale-105 shadow-lg shadow-blue-900/20"
          >
            Comenzar Gratis
            <ArrowRight className="w-5 h-5" />
          </Link>
          <Link
            href="/login"
            className="flex items-center justify-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            Ya tengo cuenta
          </Link>
        </div>

        {/* FEATURES GRID */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20 w-full text-left">
          <div className="p-6 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center mb-4 text-indigo-600 dark:text-indigo-400">
              <MessageCircle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Chat Socrático</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              No solo te da respuestas, te guía con preguntas para que construyas tu propio razonamiento jurídico.
            </p>
          </div>

          <div className="p-6 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center mb-4 text-emerald-600 dark:text-emerald-400">
              <BookOpen className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Repaso Efectivo</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              Utiliza el método Feynman para explicarte conceptos difíciles de forma sencilla y clara.
            </p>
          </div>

          <div className="p-6 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center mb-4 text-amber-600 dark:text-amber-400">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Disponible 24/7</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              Tu tutor personal siempre listo para resolver dudas a cualquier hora, sin cansancio.
            </p>
          </div>
        </div>

      </main>

      {/* FOOTER */}
      <footer className="py-8 text-center text-slate-500 dark:text-slate-400 text-sm border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <p>© {new Date().getFullYear()} Alvaro TutorAI. Todos los derechos reservados.</p>
      </footer>
    </div>
  );
}
