import { useParams, Link, useNavigate } from 'react-router-dom'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
import { useProduct, useCreateProduct, useUpdateProduct, useCategories } from '@/hooks/useInventory'
import { InputField, TextareaField, Checkbox, ErrorAlert, Spinner, PageLoader } from '@/components/ui'
import { getApiErrorMessage } from '@/utils'

const presentationSchema = z.object({
    name: z.string().min(1, 'Requerido'),
    barcode: z.string().optional(),
    sale_price: z.coerce.number().min(0),
    min_stock: z.coerce.number().min(0),
})

const schema = z.object({
    name: z.string().min(2, 'Mínimo 2 caracteres'),
    description: z.string().optional(),
    category_id: z.coerce.number().optional().or(z.literal('').transform(() => undefined)),
    is_perishable: z.boolean(),
    presentations: z.array(presentationSchema).min(1, 'Agrega al menos una presentación'),
})

type FormData = z.infer<typeof schema>

export function ProductFormPage() {
    const { id, productId } = useParams<{ id: string; productId?: string }>()
    const businessId = Number(id)
    const isEdit = !!productId
    const navigate = useNavigate()

    const { data: existing, isLoading } = useProduct(businessId, Number(productId))
    const { data: categories } = useCategories(businessId)
    const create = useCreateProduct(businessId)
    const update = useUpdateProduct(businessId, Number(productId))
    const mutation = isEdit ? update : create

    const { register, handleSubmit, control, watch, formState: { errors } } = useForm<FormData>({
        resolver: zodResolver(schema),
        defaultValues: { is_perishable: false, presentations: [{ name: 'Unidad', sale_price: 0, min_stock: 0 }] },
        values: existing ? {
            name: existing.name,
            description: existing.description ?? '',
            category_id: existing.category_id ?? undefined,
            is_perishable: existing.is_perishable,
            presentations: existing.presentations.map(p => ({
                name: p.name, barcode: p.barcode ?? '', sale_price: Number(p.sale_price), min_stock: p.min_stock,
            })),
        } : undefined,
    })

    const { fields, append, remove } = useFieldArray({ control, name: 'presentations' })

    const onSubmit = (data: FormData) => {
        mutation.mutate(data as any, {
            onSuccess: (product: any) => navigate(`/businesses/${id}/inventory/products/${product.id}`),
        })
    }

    if (isEdit && isLoading) return <PageLoader />

    return (
        <div className="p-8 max-w-2xl mx-auto animate-fade-in">
            <div className="flex items-center gap-3 mb-6">
                <Link to={`/businesses/${id}/inventory`} className="btn-ghost btn-sm p-2">
                    <ArrowLeft className="w-4 h-4" />
                </Link>
                <div>
                    <h1 className="text-xl font-bold text-gray-900">{isEdit ? 'Editar producto' : 'Nuevo producto'}</h1>
                    <p className="text-sm text-gray-500">Configura el producto y sus presentaciones</p>
                </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                {mutation.error && <ErrorAlert message={getApiErrorMessage(mutation.error)} />}

                {/* Info básica */}
                <div className="card p-6 space-y-4">
                    <h2 className="text-sm font-semibold text-gray-800">Información del producto</h2>
                    <InputField label="Nombre" required error={errors.name?.message} {...register('name')} />
                    <TextareaField label="Descripción" {...register('description')} />
                    <div className="space-y-1">
                        <label className="label">Categoría</label>
                        <select className="input" {...register('category_id')}>
                            <option value="">Sin categoría</option>
                            {categories?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                    <Checkbox
                        label="Producto perecedero"
                        description="Activa el control de fechas de vencimiento por lote"
                        checked={watch('is_perishable')}
                        onChange={v => register('is_perishable').onChange({ target: { value: v } })}
                    />
                </div>

                {/* Presentaciones */}
                <div className="card p-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-semibold text-gray-800">Presentaciones</h2>
                        <button type="button" onClick={() => append({ name: '', sale_price: 0, min_stock: 0 })} className="btn-secondary btn-sm">
                            <Plus className="w-4 h-4" /> Agregar
                        </button>
                    </div>
                    {errors.presentations?.root && (
                        <p className="text-xs text-red-500">{errors.presentations.root.message}</p>
                    )}
                    <div className="space-y-3">
                        {fields.map((field, i) => (
                            <div key={field.id} className="border border-gray-100 rounded-xl p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                    <p className="text-xs font-semibold text-gray-600">Presentación {i + 1}</p>
                                    {fields.length > 1 && (
                                        <button type="button" onClick={() => remove(i)} className="text-red-500 hover:text-red-700">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <InputField
                                        label="Nombre"
                                        placeholder="Ej: Unidad, Caja x12, 500ml"
                                        error={errors.presentations?.[i]?.name?.message}
                                        {...register(`presentations.${i}.name`)}
                                    />
                                    <InputField label="Código de barras" {...register(`presentations.${i}.barcode`)} />
                                    <InputField
                                        label="Precio de venta"
                                        type="number" min="0"
                                        error={errors.presentations?.[i]?.sale_price?.message}
                                        {...register(`presentations.${i}.sale_price`)}
                                    />
                                    <InputField
                                        label="Stock mínimo"
                                        type="number" min="0"
                                        hint="Alerta cuando el stock llegue a este nivel"
                                        {...register(`presentations.${i}.min_stock`)}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex gap-3">
                    <Link to={`/businesses/${id}/inventory`} className="btn-secondary flex-1">Cancelar</Link>
                    <button type="submit" disabled={mutation.isPending} className="btn-primary flex-1">
                        {mutation.isPending ? <Spinner size="sm" /> : isEdit ? 'Guardar cambios' : 'Crear producto'}
                    </button>
                </div>
            </form>
        </div>
    )
}