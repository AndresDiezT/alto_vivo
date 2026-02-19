import React from 'react'
import { cn } from '@/utils'
import { Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react'
import type { InputHTMLAttributes } from 'react'

// ─── Spinner ──────────────────────────────────────────────────────────────────
export function Spinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
    const s = { sm: 'w-4 h-4', md: 'w-5 h-5', lg: 'w-7 h-7' }[size]
    return <Loader2 className={cn('animate-spin text-brand-600', s)} />
}

// ─── Loading full page ─────────────────────────────────────────────────────────
export function PageLoader() {
    return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="flex flex-col items-center gap-3">
                <Spinner size="lg" />
                <p className="text-sm text-gray-500">Cargando...</p>
            </div>
        </div>
    )
}

// ─── Error message ─────────────────────────────────────────────────────────────
export function ErrorAlert({ message }: { message: string }) {
    return (
        <div className="flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{message}</span>
        </div>
    )
}

// ─── Input con label ───────────────────────────────────────────────────────────
interface InputFieldProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string
    error?: string
    hint?: string
}

export function InputField({ label, error, hint, className, id, ...props }: InputFieldProps) {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

    return (
        <div className="space-y-1">
            {label && (
                <label htmlFor={inputId} className="label">
                    {label}
                    {props.required && <span className="text-red-400 ml-0.5">*</span>}
                </label>
            )}
            <input
                id={inputId}
                className={cn('input', error && 'input-error', className)}
                {...props}
            />
            {hint && !error && <p className="text-xs text-gray-400">{hint}</p>}
            {error && (
                <p className="error-msg">
                    <AlertCircle className="w-3 h-3" />
                    {error}
                </p>
            )}
        </div>
    )
}

// ─── Password Input ────────────────────────────────────────────────────────────
export function PasswordField({
    label,
    error,
    hint,
    className,
    id,
    required,
    ...inputProps
}: InputFieldProps) {
    const [show, setShow] = React.useState(false)
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

    return (
        <div className="space-y-1">
            {label && (
                <label htmlFor={inputId} className="label">
                    {label}
                    {required && <span className="text-red-400 ml-0.5">*</span>}
                </label>
            )}

            <div className="relative">
                <input
                    id={inputId}
                    {...inputProps}
                    type={show ? 'text' : 'password'}
                    className={cn(
                        'input pr-10',
                        error && 'input-error',
                        className
                    )}
                />

                <button
                    type="button"
                    onClick={() => setShow((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                    {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
            </div>

            {hint && !error && <p className="text-xs text-gray-400">{hint}</p>}

            {error && (
                <p className="error-msg">
                    <AlertCircle className="w-3 h-3" />
                    {error}
                </p>
            )}
        </div>
    )
}


// ─── Select ────────────────────────────────────────────────────────────────────
interface SelectFieldProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    label?: string
    error?: string
    options: { value: string; label: string }[]
}

export function SelectField({ label, error, options, className, id, ...props }: SelectFieldProps) {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

    return (
        <div className="space-y-1">
            {label && (
                <label htmlFor={inputId} className="label">
                    {label}
                    {props.required && <span className="text-red-400 ml-0.5">*</span>}
                </label>
            )}
            <select
                id={inputId}
                className={cn(
                    'input appearance-none cursor-pointer bg-[url("data:image/svg+xml,%3csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 20 20\'%3e%3cpath stroke=\'%236b7280\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'1.5\' d=\'M6 8l4 4 4-4\'/%3e%3c/svg%3e")] bg-[right_0.75rem_center] bg-[length:1.25em] bg-no-repeat pr-10',
                    error && 'input-error',
                    className
                )}
                {...props}
            >
                {options.map((o) => (
                    <option key={o.value} value={o.value}>
                        {o.label}
                    </option>
                ))}
            </select>
            {error && (
                <p className="error-msg">
                    <AlertCircle className="w-3 h-3" />
                    {error}
                </p>
            )}
        </div>
    )
}

// ─── Textarea ─────────────────────────────────────────────────────────────────
interface TextareaFieldProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    label?: string
    error?: string
}

export function TextareaField({ label, error, className, id, ...props }: TextareaFieldProps) {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

    return (
        <div className="space-y-1">
            {label && (
                <label htmlFor={inputId} className="label">
                    {label}
                </label>
            )}
            <textarea
                id={inputId}
                rows={3}
                className={cn('input resize-none', error && 'input-error', className)}
                {...props}
            />
            {error && (
                <p className="error-msg">
                    <AlertCircle className="w-3 h-3" />
                    {error}
                </p>
            )}
        </div>
    )
}

// ─── Modal ────────────────────────────────────────────────────────────────────
interface ModalProps {
    isOpen: boolean
    onClose: () => void
    title: string
    children: React.ReactNode
    size?: 'sm' | 'md' | 'lg'
}

export function Modal({ isOpen, onClose, title, children, size = 'md' }: ModalProps) {
    React.useEffect(() => {
        const handler = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
        if (isOpen) document.addEventListener('keydown', handler)
        return () => document.removeEventListener('keydown', handler)
    }, [isOpen, onClose])

    if (!isOpen) return null

    const sizeClass = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl' }[size]

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
                onClick={onClose}
            />
            {/* Panel */}
            <div
                className={cn(
                    'relative w-full bg-white rounded-xl2 shadow-modal animate-scale-in',
                    sizeClass
                )}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <h2 className="text-base font-semibold text-gray-900">{title}</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100"
                    >
                        ✕
                    </button>
                </div>
                <div className="p-6">{children}</div>
            </div>
        </div>
    )
}

// ─── Confirm Dialog ───────────────────────────────────────────────────────────
interface ConfirmProps {
    isOpen: boolean
    onClose: () => void
    onConfirm: () => void
    title: string
    message: string
    confirmLabel?: string
    danger?: boolean
    loading?: boolean
}

export function ConfirmDialog({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmLabel = 'Confirmar',
    danger = false,
    loading = false,
}: ConfirmProps) {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
            <div className="space-y-4">
                <p className="text-sm text-gray-600">{message}</p>
                <div className="flex gap-2 justify-end">
                    <button onClick={onClose} className="btn-secondary btn-sm">
                        Cancelar
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={loading}
                        className={cn(danger ? 'btn-danger' : 'btn-primary', 'btn-sm')}
                    >
                        {loading ? <Spinner size="sm" /> : confirmLabel}
                    </button>
                </div>
            </div>
        </Modal>
    )
}

// ─── Empty state ──────────────────────────────────────────────────────────────
interface EmptyStateProps {
    icon?: React.ReactNode
    title: string
    description?: string
    action?: React.ReactNode
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center py-16 text-center">
            {icon && <div className="text-4xl mb-4">{icon}</div>}
            <h3 className="text-sm font-semibold text-gray-800 mb-1">{title}</h3>
            {description && <p className="text-sm text-gray-500 mb-4 max-w-xs">{description}</p>}
            {action}
        </div>
    )
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
export function Avatar({
    name,
    size = 'md',
    className,
}: {
    name: string | null
    size?: 'sm' | 'md' | 'lg' | 'xl'
    className?: string
}) {
    const initials = name
        ? name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()
        : '?'

    const sizeClass = {
        sm: 'w-7 h-7 text-xs',
        md: 'w-9 h-9 text-sm',
        lg: 'w-11 h-11 text-base',
        xl: 'w-16 h-16 text-xl',
    }[size]

    return (
        <div
            className={cn(
                'rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-white',
                'flex items-center justify-center font-semibold flex-shrink-0',
                sizeClass,
                className
            )}
        >
            {initials}
        </div>
    )
}

// ─── Badge ────────────────────────────────────────────────────────────────────
export function Badge({
    children,
    variant = 'gray',
}: {
    children: React.ReactNode
    variant?: 'gray' | 'brand' | 'green' | 'yellow' | 'red'
}) {
    const v = {
        gray: 'badge-gray',
        brand: 'badge-brand',
        green: 'badge-green',
        yellow: 'badge-yellow',
        red: 'badge-red',
    }[variant]

    return <span className={v}>{children}</span>
}

// ─── Checkbox ─────────────────────────────────────────────────────────────────
interface CheckboxProps {
    label: string
    description?: string
    checked: boolean
    onChange: (v: boolean) => void
    disabled?: boolean
}

export function Checkbox({ label, description, checked, onChange, disabled }: CheckboxProps) {
    return (
        <label className={cn('flex items-start gap-3 cursor-pointer group', disabled && 'opacity-50 cursor-not-allowed')}>
            <div className="relative mt-0.5">
                <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => !disabled && onChange(e.target.checked)}
                    disabled={disabled}
                    className="sr-only peer"
                />
                <div
                    className={cn(
                        'w-4 h-4 rounded border-2 border-gray-300 transition-all',
                        'peer-checked:bg-brand-600 peer-checked:border-brand-600',
                        'group-hover:border-brand-400'
                    )}
                />
                {checked && (
                    <svg
                        className="absolute inset-0 w-4 h-4 text-white"
                        viewBox="0 0 16 16"
                        fill="none"
                    >
                        <path
                            d="M3 8l3.5 3.5 6.5-7"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                )}
            </div>
            <div>
                <span className="text-sm font-medium text-gray-800">{label}</span>
                {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
            </div>
        </label>
    )
}