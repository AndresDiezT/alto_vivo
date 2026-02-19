import { useParams, useNavigate, Link } from 'react-router-dom'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft } from 'lucide-react'
import { useInviteUser, useRoleList } from '@/hooks/useBusiness'
import { InputField, SelectField, ErrorAlert, Spinner } from '@/components/ui'
import { getApiErrorMessage } from '@/utils'
import type { InviteUserForm, InviteUserFormInput } from '@/types'

const schema = z.object({
    user_email: z.string().email('Email inválido'),
    business_role_id: z.coerce.number().min(1, 'Selecciona un rol'),
})

export function BusinessInvitePage() {
    const { id } = useParams<{ id: string }>()
    const businessId = Number(id)
    const navigate = useNavigate()

    const { data: roles } = useRoleList(businessId)
    const inviteUser = useInviteUser(businessId)

    const { register, handleSubmit, formState: { errors } } = useForm<InviteUserFormInput, any, InviteUserForm>({
        resolver: zodResolver(schema) as unknown as Resolver<InviteUserFormInput, any, InviteUserForm>,
    })

    const onSubmit = (data: InviteUserForm) => {
        inviteUser.mutate(data, {
            onSuccess: () => navigate(`/businesses/${id}/users`),
        })
    }

    const roleOptions = [
        { value: '', label: 'Selecciona un rol...' },
        ...(roles ?? []).map((r) => ({ value: String(r.id), label: r.name })),
    ]

    return (
        <div className="p-8 max-w-xl mx-auto animate-fade-in">
            <div className="flex items-center gap-3 mb-6">
                <Link to={`/businesses/${id}/users`} className="btn-ghost btn-sm p-2">
                    <ArrowLeft className="w-4 h-4" />
                </Link>
                <div>
                    <h1 className="text-xl font-bold text-gray-900">Invitar usuario</h1>
                    <p className="text-sm text-gray-500">El usuario debe tener una cuenta registrada</p>
                </div>
            </div>

            <div className="card p-6">
                {inviteUser.error && (
                    <div className="mb-4">
                        <ErrorAlert message={getApiErrorMessage(inviteUser.error)} />
                    </div>
                )}

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <InputField
                        label="Email del usuario"
                        type="email"
                        placeholder="usuario@email.com"
                        error={errors.user_email?.message}
                        hint="El usuario debe tener una cuenta en AltoVivo para ser invitado"
                        required
                        {...register('user_email')}
                    />

                    <SelectField
                        label="Asignar rol"
                        error={errors.business_role_id?.message}
                        options={roleOptions}
                        required
                        {...register('business_role_id')}
                    />

                    <div className="pt-2 flex gap-3">
                        <Link to={`/businesses/${id}/users`} className="btn-secondary flex-1">
                            Cancelar
                        </Link>
                        <button type="submit" disabled={inviteUser.isPending} className="btn-primary flex-1">
                            {inviteUser.isPending ? <Spinner size="sm" /> : 'Invitar usuario'}
                        </button>
                    </div>
                </form>
            </div>

            {/* Info de roles */}
            {roles && roles.length > 0 && (
                <div className="card p-5 mt-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                        Roles disponibles
                    </p>
                    <div className="space-y-2">
                        {roles.map((r) => (
                            <div key={r.id} className="flex items-start gap-2.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-brand-400 mt-1.5 flex-shrink-0" />
                                <div>
                                    <p className="text-sm font-medium text-gray-800">{r.name}</p>
                                    {r.description && (
                                        <p className="text-xs text-gray-400">{r.description}</p>
                                    )}
                                    <p className="text-xs text-gray-400 mt-0.5">
                                        {r.permissions.length} permisos
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}