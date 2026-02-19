import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Plus, TrendingUp, TrendingDown, Lock, Unlock, AlertTriangle } from 'lucide-react'
import React from 'react'
import {
  useCurrentSession, useSessionHistory,
  useOpenSession, useCloseSession, useAddMovement,
} from '@/hooks/useFinance'
import { useCashRegisters } from '@/hooks/useFinance'
import { PageLoader, Modal, ErrorAlert, Spinner, Badge } from '@/components/ui'
import { formatDate, getApiErrorMessage } from '@/utils'
import type { CashSession, PaymentBreakdown } from '@/types/finances.types'

type Tab = 'session' | 'history'

export function RegisterDetailPage() {
  const { id, registerId } = useParams<{ id: string; registerId: string }>()
  const businessId = Number(id)
  const rId = Number(registerId)

  const [tab, setTab] = React.useState<Tab>('session')
  const [openModal, setOpenModal] = React.useState(false)
  const [closeModal, setCloseModal] = React.useState(false)
  const [movementModal, setMovementModal] = React.useState(false)
  const [historyDetail, setHistoryDetail] = React.useState<CashSession | null>(null)

  // Formularios
  const [openForm, setOpenForm] = React.useState({ opening_amount: '', opening_notes: '' })
  const [closeForm, setCloseForm] = React.useState({ closing_amount: '', closing_notes: '' })
  const [movForm, setMovForm] = React.useState({ movement_type: 'income' as 'income' | 'expense', amount: '', description: '' })

  const { data: registers } = useCashRegisters(businessId)
  const { data: session, isLoading: loadingSession } = useCurrentSession(businessId, rId)
  const { data: history } = useSessionHistory(businessId, rId)
  const openSession = useOpenSession(businessId, rId)
  const closeSession = useCloseSession(businessId, rId)
  const addMovement = useAddMovement(businessId, rId)

  const register = registers?.find(r => r.id === rId)
  const isOpen = !!session

  const handleOpen = () => {
    openSession.mutate(
      { opening_amount: Number(openForm.opening_amount) || 0, opening_notes: openForm.opening_notes || undefined },
      { onSuccess: () => { setOpenModal(false); setOpenForm({ opening_amount: '', opening_notes: '' }) } }
    )
  }

  const handleClose = () => {
    closeSession.mutate(
      { closing_amount: Number(closeForm.closing_amount), closing_notes: closeForm.closing_notes || undefined },
      { onSuccess: () => { setCloseModal(false); setCloseForm({ closing_amount: '', closing_notes: '' }) } }
    )
  }

  const handleMovement = () => {
    addMovement.mutate(
      { movement_type: movForm.movement_type, amount: Number(movForm.amount), description: movForm.description },
      { onSuccess: () => { setMovementModal(false); setMovForm({ movement_type: 'income', amount: '', description: '' }) } }
    )
  }

  if (loadingSession && !register) return <PageLoader />

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to={`/businesses/${id}/finance`} className="btn-ghost btn-sm p-2">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-gray-900">{register?.name ?? 'Caja'}</h1>
            <Badge variant={isOpen ? 'green' : 'gray'}>
              {isOpen ? 'Abierta' : 'Cerrada'}
            </Badge>
          </div>
          {session && (
            <p className="text-sm text-gray-400">
              Abierta por {session.opened_by_name ?? '—'} · {formatDate(session.opened_at)}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {isOpen ? (
            <>
              <button onClick={() => setMovementModal(true)} className="btn-secondary btn-sm">
                <Plus className="w-4 h-4" /> Movimiento
              </button>
              <button onClick={() => setCloseModal(true)} className="btn-danger btn-sm">
                <Lock className="w-4 h-4" /> Cerrar caja
              </button>
            </>
          ) : (
            <button onClick={() => setOpenModal(true)} className="btn-primary btn-sm">
              <Unlock className="w-4 h-4" /> Abrir caja
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-100">
        <div className="flex gap-1">
          {([
            { key: 'session', label: isOpen ? 'Sesión activa' : 'Sin sesión' },
            { key: 'history', label: `Historial (${history?.length ?? 0})` },
          ] as const).map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                tab === t.key ? 'border-brand-600 text-brand-700' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab: Sesión activa */}
      {tab === 'session' && (
        !isOpen ? (
          <div className="text-center py-16 space-y-3">
            <Lock className="w-10 h-10 text-gray-200 mx-auto" />
            <p className="text-sm text-gray-400">La caja está cerrada</p>
            <button onClick={() => setOpenModal(true)} className="btn-primary btn-sm">
              <Unlock className="w-4 h-4" /> Abrir caja
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Métricas rápidas */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <MetricCard label="Base apertura" value={`$${Number(session.opening_amount).toLocaleString()}`} />
              <MetricCard
                label="Ventas sesión"
                value="En tiempo real"
                sub="Se calculan al cierre"
                dim
              />
              <MetricCard
                label="Ingresos manuales"
                value={`$${session.movements.filter(m => m.movement_type === 'income').reduce((a, m) => a + Number(m.amount), 0).toLocaleString()}`}
                color="green"
              />
              <MetricCard
                label="Gastos manuales"
                value={`$${session.movements.filter(m => m.movement_type === 'expense').reduce((a, m) => a + Number(m.amount), 0).toLocaleString()}`}
                color="red"
              />
            </div>

            {/* Movimientos manuales */}
            <div className="card overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-surface-50">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Movimientos manuales</p>
                <button onClick={() => setMovementModal(true)} className="btn-secondary btn-sm">
                  <Plus className="w-3.5 h-3.5" /> Agregar
                </button>
              </div>
              {session.movements.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">Sin movimientos en esta sesión</p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {session.movements.map(m => (
                    <div key={m.id} className="flex items-center justify-between px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center ${
                          m.movement_type === 'income' ? 'bg-green-50' : 'bg-red-50'
                        }`}>
                          {m.movement_type === 'income'
                            ? <TrendingUp className="w-3.5 h-3.5 text-green-600" />
                            : <TrendingDown className="w-3.5 h-3.5 text-red-500" />
                          }
                        </div>
                        <div>
                          <p className="text-sm text-gray-800">{m.description}</p>
                          <p className="text-xs text-gray-400">{formatDate(m.created_at)}</p>
                        </div>
                      </div>
                      <p className={`text-sm font-semibold ${
                        m.movement_type === 'income' ? 'text-green-600' : 'text-red-500'
                      }`}>
                        {m.movement_type === 'income' ? '+' : '-'}${Number(m.amount).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )
      )}

      {/* Tab: Historial */}
      {tab === 'history' && (
        <div className="space-y-3">
          {!history?.length ? (
            <p className="text-sm text-gray-400 text-center py-10">Sin cierres anteriores</p>
          ) : history.filter(s => s.status === 'closed').map(s => (
            <div key={s.id}>
              <button
                onClick={() => setHistoryDetail(historyDetail?.id === s.id ? null : s)}
                className="card p-4 w-full text-left hover:bg-surface-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      Cierre — {formatDate(s.closed_at ?? s.opened_at)}
                    </p>
                    <p className="text-xs text-gray-400">
                      {s.opened_by_name} → {s.closed_by_name ?? '—'}
                      {' · '}{formatDate(s.opened_at)} – {s.closed_at ? formatDate(s.closed_at) : '—'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-900">
                      ${Number(s.total_sales ?? 0).toLocaleString()}
                    </p>
                    {s.difference !== null && (
                      <p className={`text-xs font-medium ${
                        Number(s.difference) === 0 ? 'text-green-600' :
                        Number(s.difference) > 0 ? 'text-blue-600' : 'text-red-600'
                      }`}>
                        {Number(s.difference) > 0 ? '+' : ''}${Number(s.difference).toLocaleString()} diferencia
                      </p>
                    )}
                  </div>
                </div>
              </button>

              {/* Detalle del cierre */}
              {historyDetail?.id === s.id && (
                <SessionDetail session={s} />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal abrir caja */}
      <Modal isOpen={openModal} onClose={() => setOpenModal(false)} title="Abrir caja" size="sm">
        <div className="space-y-4">
          {openSession.error && <ErrorAlert message={getApiErrorMessage(openSession.error)} />}
          <div className="space-y-1">
            <label className="label">Monto de apertura (efectivo en caja)</label>
            <input
              type="number" min="0" className="input text-lg" placeholder="$0" autoFocus
              value={openForm.opening_amount}
              onChange={e => setOpenForm(p => ({ ...p, opening_amount: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <label className="label">Notas (opcional)</label>
            <input
              className="input" placeholder="Ej: Turno mañana..."
              value={openForm.opening_notes}
              onChange={e => setOpenForm(p => ({ ...p, opening_notes: e.target.value }))}
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button onClick={() => setOpenModal(false)} className="btn-secondary flex-1">Cancelar</button>
            <button onClick={handleOpen} disabled={openSession.isPending} className="btn-primary flex-1">
              {openSession.isPending ? <Spinner size="sm" /> : 'Abrir caja'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal cerrar caja */}
      <Modal isOpen={closeModal} onClose={() => setCloseModal(false)} title="Cerrar caja" size="sm">
        <div className="space-y-4">
          {closeSession.error && <ErrorAlert message={getApiErrorMessage(closeSession.error)} />}
          <div className="p-3 bg-yellow-50 border border-yellow-100 rounded-xl flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-yellow-700">
              El sistema consolidará automáticamente todas las ventas de la sesión. Ingresa el conteo físico del efectivo.
            </p>
          </div>
          <div className="space-y-1">
            <label className="label">Efectivo contado en caja *</label>
            <input
              type="number" min="0" className="input text-lg" placeholder="$0" autoFocus
              value={closeForm.closing_amount}
              onChange={e => setCloseForm(p => ({ ...p, closing_amount: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <label className="label">Notas del cierre (opcional)</label>
            <input
              className="input" placeholder="Ej: Sin novedad..."
              value={closeForm.closing_notes}
              onChange={e => setCloseForm(p => ({ ...p, closing_notes: e.target.value }))}
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button onClick={() => setCloseModal(false)} className="btn-secondary flex-1">Cancelar</button>
            <button
              onClick={handleClose}
              disabled={!closeForm.closing_amount || closeSession.isPending}
              className="btn-danger flex-1"
            >
              {closeSession.isPending ? <Spinner size="sm" /> : 'Cerrar caja'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal movimiento manual */}
      <Modal isOpen={movementModal} onClose={() => setMovementModal(false)} title="Registrar movimiento" size="sm">
        <div className="space-y-4">
          {addMovement.error && <ErrorAlert message={getApiErrorMessage(addMovement.error)} />}
          <div className="grid grid-cols-2 gap-2">
            {(['income', 'expense'] as const).map(type => (
              <button
                key={type}
                onClick={() => setMovForm(p => ({ ...p, movement_type: type }))}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 text-sm font-medium transition-all ${
                  movForm.movement_type === type
                    ? type === 'income'
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-red-500 bg-red-50 text-red-700'
                    : 'border-gray-100 text-gray-500 hover:border-gray-200'
                }`}
              >
                {type === 'income'
                  ? <><TrendingUp className="w-4 h-4" /> Entrada</>
                  : <><TrendingDown className="w-4 h-4" /> Salida</>
                }
              </button>
            ))}
          </div>
          <div className="space-y-1">
            <label className="label">Monto *</label>
            <input
              type="number" min="0.01" className="input text-lg" placeholder="$0" autoFocus
              value={movForm.amount}
              onChange={e => setMovForm(p => ({ ...p, amount: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <label className="label">Descripción *</label>
            <input
              className="input"
              placeholder={movForm.movement_type === 'income' ? 'Ej: Préstamo, otro ingreso...' : 'Ej: Pago servicio, compra menor...'}
              value={movForm.description}
              onChange={e => setMovForm(p => ({ ...p, description: e.target.value }))}
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button onClick={() => setMovementModal(false)} className="btn-secondary flex-1">Cancelar</button>
            <button
              onClick={handleMovement}
              disabled={!movForm.amount || !movForm.description || addMovement.isPending}
              className="btn-primary flex-1"
            >
              {addMovement.isPending ? <Spinner size="sm" /> : 'Registrar'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

// ── Sub-componentes ───────────────────────────────────────────────────────────

function MetricCard({ label, value, sub, color, dim }: {
  label: string; value: string; sub?: string
  color?: 'green' | 'red'; dim?: boolean
}) {
  const textColor = color === 'green' ? 'text-green-600' : color === 'red' ? 'text-red-600' : 'text-gray-900'
  return (
    <div className="card p-4">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className={`text-base font-bold ${dim ? 'text-gray-400' : textColor}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}

function SessionDetail({ session }: { session: CashSession }) {
  const diff = Number(session.difference ?? 0)
  const diffColor = diff === 0 ? 'text-green-600' : diff > 0 ? 'text-blue-600' : 'text-red-600'
  const diffLabel = diff === 0 ? 'Cuadra exacto' : diff > 0 ? `Sobrante $${diff.toLocaleString()}` : `Faltante $${Math.abs(diff).toLocaleString()}`

  return (
    <div className="mt-1 card border-t-0 rounded-t-none p-5 space-y-4 bg-surface-50">
      {/* Desglose por método */}
      {session.payment_breakdown.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Ventas por método de pago</p>
          <div className="space-y-1.5">
            {session.payment_breakdown.map((b: PaymentBreakdown) => (
              <div key={b.payment_method_id} className="flex justify-between text-sm">
                <span className={`text-gray-600 ${b.is_credit ? 'italic' : ''}`}>
                  {b.payment_method_name}{b.is_credit ? ' (fiado)' : ''}
                </span>
                <span className={`font-medium ${b.is_credit ? 'text-yellow-600' : 'text-gray-800'}`}>
                  ${Number(b.total).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Resumen cierre */}
      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-100">
        <div>
          <p className="text-xs text-gray-400">Total ventas</p>
          <p className="text-sm font-semibold text-gray-800">${Number(session.total_sales ?? 0).toLocaleString()}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Fiado</p>
          <p className="text-sm font-semibold text-yellow-600">${Number(session.total_credit ?? 0).toLocaleString()}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Ingresos manuales</p>
          <p className="text-sm font-semibold text-green-600">${Number(session.total_income ?? 0).toLocaleString()}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Gastos manuales</p>
          <p className="text-sm font-semibold text-red-500">${Number(session.total_expense ?? 0).toLocaleString()}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Esperado en caja</p>
          <p className="text-sm font-semibold text-gray-800">${Number(session.expected_amount ?? 0).toLocaleString()}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Conteo físico</p>
          <p className="text-sm font-semibold text-gray-800">${Number(session.closing_amount ?? 0).toLocaleString()}</p>
        </div>
      </div>

      <div className={`text-center text-sm font-bold py-2 rounded-xl ${
        diff === 0 ? 'bg-green-50 text-green-600' :
        diff > 0 ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-600'
      }`}>
        {diffLabel}
      </div>

      {session.closing_notes && (
        <p className="text-xs text-gray-400 italic">"{session.closing_notes}"</p>
      )}
    </div>
  )
}