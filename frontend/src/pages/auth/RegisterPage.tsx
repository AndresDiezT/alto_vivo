import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link } from 'react-router-dom'
import { useRegister } from '@/hooks/useAuth'
import { InputField, PasswordField, ErrorAlert, Spinner } from '@/components/ui'
import { getApiErrorMessage } from '@/utils'

const schema = z.object({
    full_name: z.string().min(2, 'Mínimo 2 caracteres'),
    username: z
        .string()
        .min(3, 'Mínimo 3 caracteres')
        .regex(/^[a-zA-Z0-9_]+$/, 'Solo letras, números y guiones bajos'),
    email: z.string().email('Email inválido'),
    phone: z.string().optional(),
    password: z.string().min(8, 'Mínimo 8 caracteres'),
    confirm_password: z.string(),
}).refine((d) => d.password === d.confirm_password, {
    message: 'Las contraseñas no coinciden',
    path: ['confirm_password'],
})

type FormData = z.infer<typeof schema>

export function RegisterPage() {
    const { mutate, isPending, error } = useRegister()
    const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
        resolver: zodResolver(schema),
    })

    const onSubmit = ({ confirm_password, ...data }: FormData) => mutate(data)

    return (
        <div className="animate-slide-up">
            <div className="bg-white rounded-2xl shadow-modal p-8">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-900">Crea tu cuenta</h1>
                    <p className="text-sm text-gray-500 mt-1">Gratis para siempre, sin tarjeta de crédito</p>
                </div>

                {error && <div className="mb-4"><ErrorAlert message={getApiErrorMessage(error)} /></div>}

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5">
                    <InputField
                        label="Nombre completo"
                        placeholder="Juan García"
                        error={errors.full_name?.message}
                        required
                        {...register('full_name')}
                    />

                    <div className="grid grid-cols-2 gap-3">
                        <InputField
                            label="Username"
                            placeholder="juangarcia"
                            error={errors.username?.message}
                            required
                            {...register('username')}
                        />
                        <InputField
                            label="Teléfono"
                            placeholder="+57 300 000 0000"
                            error={errors.phone?.message}
                            {...register('phone')}
                        />
                    </div>

                    <InputField
                        label="Email"
                        type="email"
                        placeholder="juan@email.com"
                        error={errors.email?.message}
                        required
                        {...register('email')}
                    />

                    <PasswordField
                        label="Contraseña"
                        placeholder="Mínimo 8 caracteres"
                        error={errors.password?.message}
                        required
                        {...register('password')}
                    />

                    <PasswordField
                        label="Confirmar contraseña"
                        placeholder="Repite tu contraseña"
                        error={errors.confirm_password?.message}
                        required
                        {...register('confirm_password')}
                    />

                    <button type="submit" disabled={isPending} className="btn-primary w-full btn-lg mt-1">
                        {isPending ? <Spinner size="sm" /> : 'Crear cuenta'}
                    </button>
                </form>
            </div>

            <p className="text-center text-sm text-white/70 mt-5">
                ¿Ya tienes cuenta?{' '}
                <Link to="/login" className="text-white font-medium hover:underline">
                    Inicia sesión
                </Link>
            </p>
        </div>
    )
}