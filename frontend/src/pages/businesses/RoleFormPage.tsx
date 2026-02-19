import { useParams, useNavigate, Link } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Settings } from 'lucide-react'
import React from 'react'
import {
    usePermissions, useCreateRole, useUpdateRole, useRole,
} from '@/hooks/useBusiness'
import {
    InputField, TextareaField, Checkbox,
    ErrorAlert, Spinner, PageLoader,
} from '@/components/ui'
import { PermissionsModal } from '@/components/PermissionsModal'
import { getApiErrorMessage } from '@/utils'

const schema = z.object({
    name: z.string().min(2, 'Mínimo 2 caracteres'),
    description: z.string().optional(),
    can_manage_users: z.boolean(),
    can_manage_roles: z.boolean(),
    permission_codes: z.array(z.string()),
})

type FormData = z.infer<typeof schema>

export function RoleFormPage() {
    const { id, roleId } = useParams<{ id: string; roleId?: string }>()
    const businessId = Number(id)
    const isEdit = !!roleId
    const navigate = useNavigate()

    const [showPermissionsModal, setShowPermissionsModal] = React.useState(false)

    const { data: permissions, isLoading: loadingPerms } = usePermissions(businessId)
    const { data: existingRole, isLoading: loadingRole } = useRole(businessId, Number(roleId))

    const createRole = useCreateRole(businessId)
    const updateRole = useUpdateRole(businessId, Number(roleId))
    const mutation = isEdit ? updateRole : createRole

    const { register, handleSubmit, control, watch, setValue, formState: { errors } } = useForm<FormData>({
        resolver: zodResolver(schema),
        defaultValues: {
            name: '',
            description: '',
            can_manage_users: false,
            can_manage_roles: false,
            permission_codes: [],
        },
        values: existingRole ? {
            name: existingRole.name,
            description: existingRole.description ?? '',
            can_manage_users: existingRole.can_manage_users,
            can_manage_roles: existingRole.can_manage_roles,
            permission_codes: existingRole.permissions.map((p) => p.code),
        } : undefined,
    })

    const selectedCodes = watch('permission_codes')

    const handlePermissionsSave = (codes: string[]) => {
        setValue('permission_codes', codes, { shouldDirty: true })
    }

    const onSubmit = (data: FormData) => {
        mutation.mutate(data as any, {
            onSuccess: () => navigate(`/businesses/${id}/roles`),
        })
    }

    if (loadingPerms || (isEdit && loadingRole)) return <PageLoader />

    return (
        <div className="p-8 max-w-3xl mx-auto animate-fade-in">
            <div className="flex items-center gap-3 mb-6">
                <Link to={`/businesses/${id}/roles`} className="btn-ghost btn-sm p-2">
                    <ArrowLeft className="w-4 h-4" />
                </Link>
                <div>
                    <h1 className="text-xl font-bold text-gray-900">
                        {isEdit ? 'Editar rol' : 'Crear rol'}
                    </h1>
                    <p className="text-sm text-gray-500">Define nombre y permisos</p>
                </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {/* Info básica */}
                <div className="card p-6 space-y-4">
                    <h2 className="text-sm font-semibold text-gray-800">Información del rol</h2>

                    {mutation.error && <ErrorAlert message={getApiErrorMessage(mutation.error)} />}

                    <InputField
                        label="Nombre del rol"
                        placeholder="Ej: Vendedor Senior, Bodeguero..."
                        error={errors.name?.message}
                        required
                        {...register('name')}
                    />
                    <TextareaField
                        label="Descripción"
                        placeholder="¿Qué hace este rol en el negocio?"
                        {...register('description')}
                    />

                    {/* Capacidades especiales */}
                    <div>
                        <p className="label">Capacidades administrativas</p>
                        <div className="space-y-3 mt-2">
                            <Controller
                                control={control}
                                name="can_manage_users"
                                render={({ field }) => (
                                    <Checkbox
                                        label="Puede gestionar usuarios"
                                        description="Invitar y remover usuarios del negocio"
                                        checked={field.value}
                                        onChange={field.onChange}
                                    />
                                )}
                            />
                            <Controller
                                control={control}
                                name="can_manage_roles"
                                render={({ field }) => (
                                    <Checkbox
                                        label="Puede gestionar roles"
                                        description="Crear, editar y eliminar roles del negocio"
                                        checked={field.value}
                                        onChange={field.onChange}
                                    />
                                )}
                            />
                        </div>
                    </div>
                </div>

                {/* Permisos */}
                <div className="card p-6">
                    <div className="flex items-center justify-between mb-3">
                        <div>
                            <h2 className="text-sm font-semibold text-gray-800">Permisos del rol</h2>
                            <p className="text-xs text-gray-500 mt-0.5">
                                {selectedCodes.length} permisos seleccionados
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setShowPermissionsModal(true)}
                            className="btn-primary btn-sm"
                        >
                            <Settings className="w-4 h-4" />
                            Gestionar permisos
                        </button>
                    </div>

                    {/* {selectedCodes.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                            {selectedCodes.map((code) => (
                                <span key={code} className="badge badge-brand text-xs">
                                    {code.split('.')[1]}
                                </span>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-gray-400 text-center py-6">
                            Sin permisos asignados. Haz clic en "Gestionar permisos" para seleccionar.
                        </p>
                    )} */}
                </div>

                {/* Footer */}
                <div className="flex gap-3">
                    <Link to={`/businesses/${id}/roles`} className="btn-secondary flex-1">
                        Cancelar
                    </Link>
                    <button type="submit" disabled={mutation.isPending} className="btn-primary flex-1">
                        {mutation.isPending ? (
                            <Spinner size="sm" />
                        ) : isEdit ? (
                            'Guardar cambios'
                        ) : (
                            'Crear rol'
                        )}
                    </button>
                </div>
            </form>

            {/* Permissions Modal */}
            {permissions && (
                <PermissionsModal
                    isOpen={showPermissionsModal}
                    onClose={() => setShowPermissionsModal(false)}
                    onSave={handlePermissionsSave}
                    permissions={permissions}
                    selectedCodes={selectedCodes}
                />
            )}
        </div>
    )
}