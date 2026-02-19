import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link } from 'react-router-dom'
import { ArrowLeft, ShieldCheck } from 'lucide-react'
import { authApi } from '@/api/auth'
import { useMutation } from '@tanstack/react-query'
import { PasswordField, ErrorAlert, Spinner } from '@/components/ui'
import { getApiErrorMessage } from '@/utils'
import React from 'react'

const schema = z.object({
    current_password: z.string().min(1, 'Ingresa tu contraseña actual'),
    new_password: z.string().min(8, 'Mínimo 8 caracteres'),
    confirm_new_password: z.string(),
}).refine((d) => d.new_password === d.confirm_new_password, {
    message: 'Las contraseñas no coinciden',
    path: ['confirm_new_password'],
})

type FormData = z.infer<typeof schema>

export function SecurityPage() {
    const [success, setSuccess] = React.useState(false)

    const mutation = useMutation({
        mutationFn: ({ current_password, new_password }: { current_password: string; new_password: string }) =>
            authApi.changePassword({ current_password, new_password }),
        onSuccess: () => {
            setSuccess(true)
            reset()
        },
    })

    const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
        resolver: zodResolver(schema),
    })

    const onSubmit = ({ current_password, new_password }: FormData) => {
        mutation.mutate({ current_password, new_password })
    }

    return (
        <div className="p-8 max-w-xl mx-auto animate-fade-in">
            <div className="flex items-center gap-3 mb-6">
                <Link to="/profile" className="btn-ghost btn-sm p-2">
                    <ArrowLeft className="w-4 h-4" />
                </Link>
                <div>
                    <h1 className="text-xl font-bold text-gray-900">Seguridad</h1>
                    <p className="text-sm text-gray-500">Cambia tu contraseña</p>
                </div>
            </div>

            <div className="card p-6">
                <div className="flex items-center gap-3 mb-5 pb-5 border-b border-gray-100">
                    <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center">
                        <ShieldCheck className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-gray-800">Cambiar contraseña</p>
                        <p className="text-xs text-gray-400">
                            Recomendamos usar una contraseña segura de al menos 8 caracteres
                        </p>
                    </div>
                </div>

                {mutation.error && (
                    <div className="mb-4">
                        <ErrorAlert message={getApiErrorMessage(mutation.error)} />
                    </div>
                )}
                {success && (
                    <div className="mb-4 p-3.5 bg-green-50 border border-green-100 rounded-xl text-sm text-green-700">
                        Contraseña actualizada correctamente
                    </div>
                )}

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <PasswordField
                        label="Contraseña actual"
                        placeholder="Tu contraseña actual"
                        error={errors.current_password?.message}
                        required
                        {...register('current_password')}
                    />
                    <PasswordField
                        label="Nueva contraseña"
                        placeholder="Mínimo 8 caracteres"
                        error={errors.new_password?.message}
                        required
                        {...register('new_password')}
                    />
                    <PasswordField
                        label="Confirmar nueva contraseña"
                        placeholder="Repite la nueva contraseña"
                        error={errors.confirm_new_password?.message}
                        required
                        {...register('confirm_new_password')}
                    />

                    <div className="flex justify-end pt-1">
                        <button type="submit" disabled={mutation.isPending} className="btn-primary">
                            {mutation.isPending ? <Spinner size="sm" /> : 'Actualizar contraseña'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}