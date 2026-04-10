import { useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import * as store from '../store'
import { SERVICES, PAYMENT_MODES, INTAKE_MODES, usesItemPicker, countItems } from '../utils/services.jsx'
import { formatFCFA } from '../utils/fcfa.jsx'
import PhotoUpload from '../components/PhotoUpload'
import ItemPicker from '../components/ItemPicker'

export default function Tickets() {
  const today = store.businessDay()
  const [tickets, setTickets] = useState(() => store.getTickets(today))
  const [showForm, setShowForm] = useState(false)

  const refresh = useCallback(() => setTickets(store.getTickets(today)), [today])

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-slate-900">
          Tickets du jour
          <span className="text-sm font-normal text-slate-400 ml-2">({tickets.length})</span>
        </h2>
        <button
          onClick={() => setShowForm(true)}
          className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold"
        >
          + Nouveau
        </button>
      </div>

      {showForm && <TicketForm onClose={() => { setShowForm(false); refresh() }} />}

      {tickets.length === 0 && !showForm && (
        <p className="text-center text-slate-400 py-12">Aucun ticket aujourd'hui</p>
      )}

      <div className="space-y-3">
        {tickets.map((t) => (
          <Link
            key={t.id}
            to={`/tickets/${t.id}`}
            className="block bg-white rounded-xl p-4 shadow-sm border border-slate-100"
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="font-semibold text-slate-900">{t.clientName}</p>
                <p className="text-sm text-slate-500">
                  {SERVICES.find((s) => s.id === t.serviceType)?.label || t.serviceType}
                </p>
              </div>
              <div className="text-right">
                <p className="font-bold text-slate-900">{formatFCFA(t.caFacture)}</p>
                <StatusBadge status={t.status} />
              </div>
            </div>
            <div className="flex gap-3 mt-2 text-xs text-slate-400">
              <span>{(() => { const n = countItems(t.items); return `${n} pièce${n > 1 ? 's' : ''}` })()}</span>
              <span>Avance: {formatFCFA(t.totalPaid)}</span>
              <span>Reste: {formatFCFA(t.remainingBalance)}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

function StatusBadge({ status }) {
  const styles = { pending: 'bg-amber-100 text-amber-700', approved: 'bg-green-100 text-green-700', flagged: 'bg-red-100 text-red-700' }
  const labels = { pending: 'En attente', approved: 'Approuve', flagged: 'Signale' }
  return <span className={`text-xs px-2 py-0.5 rounded-full ${styles[status] || styles.pending}`}>{labels[status] || status}</span>
}

function TicketForm({ onClose }) {
  const [loading, setLoading] = useState(false)
  const [photoId, setPhotoId] = useState(null)
  const [form, setForm] = useState({
    clientName: '',
    serviceType: 'pressing',
    items: 1,
    detailedItems: [],
    intakeMode: 'depot_boutique',
    caFacture: '',
    advance: '',
    paymentMode: 'cash',
  })

  const showPicker = usesItemPicker(form.serviceType)
  const service = SERVICES.find((s) => s.id === form.serviceType)
  const ca = Number(form.caFacture) || 0
  const advance = Number(form.advance) || 0
  const advancePct = ca > 0 ? Math.round((advance / ca) * 100) : 0
  const showAdvanceWarning =
    service?.minAdvancePct > 0 && ca > 0 && advance > 0 && advancePct < service.minAdvancePct

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }))
  }

  async function handlePhoto(blob) {
    if (!blob) { setPhotoId(null); return }
    const reader = new FileReader()
    reader.onload = async () => {
      const id = await store.savePhoto(reader.result)
      setPhotoId(id)
    }
    reader.readAsDataURL(blob)
  }

  function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    store.addTicket({
      date: store.businessDay(),
      clientName: form.clientName.trim(),
      serviceType: form.serviceType,
      items: showPicker ? form.detailedItems : (Number(form.items) || 1),
      caFacture: Number(form.caFacture) || 0,
      advance: Number(form.advance) || 0,
      paymentMode: form.paymentMode,
      intakeMode: form.intakeMode,
      photoId,
    })
    setLoading(false)
    onClose()
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 mb-4 space-y-4">
      <h3 className="font-bold text-slate-900">Nouveau ticket</h3>

      {/* Client name */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Nom du client *</label>
        <input type="text" value={form.clientName} onChange={update('clientName')} required
          className="w-full px-3 py-2.5 rounded-lg border border-slate-300 focus:border-primary focus:ring-1 focus:ring-primary outline-none"
          placeholder="Ex: Mme Adjovi" />
      </div>

      {/* Service select (full width) */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Service *</label>
        <select value={form.serviceType} onChange={update('serviceType')}
          className="w-full px-3 py-2.5 rounded-lg border border-slate-300 focus:border-primary outline-none">
          {SERVICES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
      </div>

      {/* Item picker or simple quantity input */}
      {showPicker ? (
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Articles</label>
          <ItemPicker
            value={form.detailedItems}
            onChange={(val) => setForm((f) => ({ ...f, detailedItems: val }))}
          />
        </div>
      ) : (
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Nb pièces</label>
          <input type="number" min="1" value={form.items} onChange={update('items')}
            className="w-full px-3 py-2.5 rounded-lg border border-slate-300 focus:border-primary outline-none" />
        </div>
      )}

      {/* CA facturé + Avance */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">CA facturé (FCFA) *</label>
          <input type="number" min="0" value={form.caFacture} onChange={update('caFacture')} required
            className="w-full px-3 py-2.5 rounded-lg border border-slate-300 focus:border-primary outline-none" placeholder="50 000" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Avance (FCFA)</label>
          <input type="number" min="0" value={form.advance} onChange={update('advance')}
            className="w-full px-3 py-2.5 rounded-lg border border-slate-300 focus:border-primary outline-none" placeholder="25 000" />
        </div>
      </div>

      {/* Advance warning */}
      {showAdvanceWarning && (
        <div className="rounded-lg bg-orange-50 border border-orange-200 px-3 py-2 text-sm text-orange-700">
          Attention : avance ({advancePct}%) inférieure à {service.minAdvancePct}% du CA facturé
        </div>
      )}

      {/* Payment mode */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Mode de paiement</label>
        <div className="flex gap-2">
          {PAYMENT_MODES.map((m) => (
            <button key={m.id} type="button" onClick={() => setForm((f) => ({ ...f, paymentMode: m.id }))}
              className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                form.paymentMode === m.id ? 'bg-primary text-white border-primary' : 'bg-white text-slate-600 border-slate-300'
              }`}>
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Intake mode */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Mode de dépôt</label>
        <div className="flex gap-2">
          {INTAKE_MODES.map((m) => (
            <button key={m.id} type="button" onClick={() => setForm((f) => ({ ...f, intakeMode: m.id }))}
              className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                form.intakeMode === m.id ? 'bg-primary text-white border-primary' : 'bg-white text-slate-600 border-slate-300'
              }`}>
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <PhotoUpload label="Photo (recu, articles)" onPhoto={handlePhoto} />

      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-slate-300 text-slate-600 font-medium">Annuler</button>
        <button type="submit" disabled={loading} className="flex-1 py-2.5 rounded-lg bg-primary text-white font-semibold disabled:opacity-50">
          {loading ? 'Enregistrement...' : 'Enregistrer'}
        </button>
      </div>
    </form>
  )
}
