import { Construction } from 'lucide-react'

interface Props {
    module: string
}

export function ComingSoonPage({ module }: Props) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center animate-fade-in">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center mb-5">
                <Construction className="w-8 h-8 text-amber-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
                {module} — Próximamente
            </h2>
            <p className="text-sm text-gray-500 max-w-sm">
                Este módulo está en desarrollo. Estará disponible en la próxima versión del sistema.
            </p>
            <div className="mt-6 flex items-center gap-2 text-xs text-gray-400">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                En desarrollo activo
            </div>
        </div>
    )
}