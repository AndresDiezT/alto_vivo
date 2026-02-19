import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useLocation } from 'react-router-dom'
import { useLogin } from '@/hooks/useAuth'
import { InputField, PasswordField, ErrorAlert, Spinner } from '@/components/ui'
import { getApiErrorMessage } from '@/utils'

const schema = z.object({
    email: z.string().email('Email inválido'),
    password: z.string().min(1, 'Ingresa tu contraseña'),
})

type FormData = z.infer<typeof schema>

export function LoginPage() {
    const location = useLocation()
    const registered = location.state?.registered

    const { mutate, isPending, error } = useLogin()
    const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
        resolver: zodResolver(schema),
    })

    const onSubmit = (data: FormData) => mutate(data)

    return (
        <div className="animate-slide-up">
            {/* Card */}
            <div className="bg-white rounded-2xl shadow-modal p-8">
                {/* Header */}
                <div className="mb-7">
                    <h1 className="text-2xl font-bold text-gray-900">Bienvenido de nuevo</h1>
                    <p className="text-sm text-gray-500 mt-1">Ingresa a tu cuenta para continuar</p>
                </div>

                {registered && (
                    <div className="mb-4 p-3.5 bg-green-50 border border-green-100 rounded-xl text-sm text-green-700">
                        Cuenta creada. Inicia sesión para continuar.
                    </div>
                )}

                {error && <div className="mb-4"><ErrorAlert message={getApiErrorMessage(error)} /></div>}

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <InputField
                        label="Email"
                        type="email"
                        placeholder="tu@email.com"
                        error={errors.email?.message}
                        required
                        {...register('email')}
                    />

                    <PasswordField
                        label="Contraseña"
                        placeholder="••••••••"
                        error={errors.password?.message}
                        required
                        {...register('password')}
                    />

                    <button type="submit" disabled={isPending} className="btn-primary w-full btn-lg mt-2">
                        {isPending ? <Spinner size="sm" /> : 'Iniciar sesión'}
                    </button>
                </form>
            </div>

            <p className="text-center text-sm text-white/70 mt-5">
                ¿No tienes cuenta?{' '}
                <Link to="/register" className="text-white font-medium hover:underline">
                    Regístrate gratis
                </Link>
            </p>
        </div>
    )
}