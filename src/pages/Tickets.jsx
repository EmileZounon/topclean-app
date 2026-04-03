import { useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import * as store from '../store'
import { SERVICES, PAYMENT_MODES } from '../utils/services.jsx'
import { formatFCFA } from '../utils/fcfa.jsx'
import PhotoUpload from '../components/PhotoUpload'

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

export default function Tickets() {
  const [tickets, setTickets] = useState(() => store.getTickets(todayStr()))
  const [showForm, setShowForm] = useState(false)

  const refresh = useCallback(() => setTickets(store.getTickets(todayStr())), [])

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
              <span>Avance: {formatFCFA(t.totalPaid)}</span>
              <span>Reste: {formatFCFA(t.remainingBalance)}</span>
              <span className="capitalize">{t.payments?.[0]?.paymentMode || ''}</span>
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
    caFacture: '',
    advance: '',
    paymentMode: 'cash',
  })

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
      date: todayStr(),
      clientName: form.clientName.trim(),
      serviceType: form.serviceType,
      items: Number(form.items) || 1,
      caFacture: Number(form.caFacture) || 0,
      advance: Number(form.advance) || 0,
      paymentMode: form.paymentMode,
      photoId,
    })
    setLoading(false)
    onClose()
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 mb-4 space-y-4">
      <h3 className="font-bold text-slate-900">Nouveau ticket</h3>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Nom du client *</label>
        <input type="text" value={form.clientName} onChange={update('clientName')} required
          className="w-full px-3 py-2.5 rounded-lg border border-slate-300 focus:border-primary focus:ring-1 focus:ring-primary outline-none"
          placeholder="Ex: Mme Adjovi" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Service *</label>
          <select value={form.serviceType} onChange={update('serviceType')}
            className="w-full px-3 py-2.5 rounded-lg border border-slate-300 focus:border-primary outline-none">
            {SERVICES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Nb pieces</label>
          <input type="number" min="1" value={form.items} onChange={update('items')}
            className="w-full px-3 py-2.5 rounded-lg border border-slate-300 focus:border-primary outline-none" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">CA facture (FCFA) *</label>
          <input type="number" min="0" value={form.caFacture} onChange={update('caFacture')} required
            className="w-full px-3 py-2.5 rounded-lg border border-slate-300 focus:border-primary outline-none" placeholder="50 000" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Avance (FCFA)</label>
          <input type="number" min="0" value={form.advance} onChange={update('advance')}
            className="w-full px-3 py-2.5 rounded-lg border border-slate-300 focus:border-primary outline-none" placeholder="25 000" />
        </div>
      </div>

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
