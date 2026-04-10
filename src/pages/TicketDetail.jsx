import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import * as store from '../store'
import { useAuth } from '../hooks/useAuth.jsx'
import { SERVICES, PAYMENT_MODES, DELIVERY_MODES, INTAKE_MODES, countItems } from '../utils/services.jsx'
import { formatFCFA } from '../utils/fcfa.jsx'
import PhotoUpload from '../components/PhotoUpload'

export default function TicketDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isAdmin } = useAuth()
  const [ticket, setTicket] = useState(null)
  const [showPayment, setShowPayment] = useState(false)
  const [flagNote, setFlagNote] = useState('')
  const [photo, setPhoto] = useState(null)

  useEffect(() => {
    setTicket(store.getTicketById(id))
  }, [id])

  useEffect(() => {
    if (ticket?.photoId) store.getPhoto(ticket.photoId).then(setPhoto)
  }, [ticket?.photoId])

  if (!ticket) return <p className="text-center py-12 text-slate-400">Ticket introuvable</p>

  const service = SERVICES.find((s) => s.id === ticket.serviceType)

  function refresh() { setTicket(store.getTicketById(id)) }

  function handleApprove() {
    store.updateTicketStatus(id, 'approved')
    refresh()
  }

  function handleFlag() {
    if (!flagNote.trim()) return alert('Ajoutez une note.')
    store.updateTicketStatus(id, 'flagged', flagNote.trim())
    setFlagNote('')
    refresh()
  }

  return (
    <div className="space-y-4">
      <button onClick={() => navigate(-1)} className="text-primary text-sm font-medium">&larr; Retour</button>

      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{ticket.clientName}</h2>
            <p className="text-sm text-slate-500">{service?.label}</p>
          </div>
          <StatusBadge status={ticket.status} />
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <Stat label="CA Facture" value={formatFCFA(ticket.caFacture)} />
          <Stat label="Total Paye" value={formatFCFA(ticket.totalPaid)} />
          <Stat label="Reste a Payer" value={formatFCFA(ticket.remainingBalance)} color={ticket.remainingBalance > 0 ? 'text-red-600' : 'text-green-600'} />
          <Stat label="Nb Pièces" value={countItems(ticket.items)} />
        </div>
        {/* Item breakdown for pressing/lessive */}
        {Array.isArray(ticket.items) && ticket.items.length > 0 && (
          <div className="mt-3 bg-slate-50 rounded-lg p-3">
            <p className="text-xs font-medium text-slate-500 mb-2">Détail des pièces</p>
            <div className="flex flex-wrap gap-2">
              {ticket.items.map((item, i) => (
                <span key={i} className="text-xs bg-white border border-slate-200 rounded-full px-2.5 py-1">
                  {item.qty}× {item.type === 'autre' ? (item.label || 'Autre') : item.type}
                </span>
              ))}
            </div>
          </div>
        )}
        {/* Intake mode */}
        {ticket.intakeMode && (
          <div className="mt-2 text-xs text-slate-500">
            Entrée: {INTAKE_MODES.find(m => m.id === ticket.intakeMode)?.label || ticket.intakeMode}
          </div>
        )}
        {/* Delivery mode */}
        {ticket.deliveryMode && (
          <div className="text-xs text-slate-500">
            Sortie: {DELIVERY_MODES.find(m => m.id === ticket.deliveryMode)?.label || ticket.deliveryMode}
          </div>
        )}
        {photo && <img src={photo} alt="Photo" className="mt-3 w-full h-48 object-cover rounded-lg" />}
        {ticket.flagNote && <div className="mt-3 bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg">Note: {ticket.flagNote}</div>}
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
        <h3 className="font-bold text-slate-900 mb-3">Paiements ({ticket.payments?.length || 0})</h3>
        <div className="space-y-2">
          {(ticket.payments || []).map((p, i) => (
            <div key={i} className="flex justify-between items-center text-sm py-2 border-b border-slate-50 last:border-0">
              <div>
                <span className="font-medium">{formatFCFA(p.amount)}</span>
                <span className="text-slate-400 ml-2 capitalize">{p.paymentMode}</span>
              </div>
              <span className="text-xs text-slate-400">{new Date(p.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          ))}
        </div>
        {ticket.remainingBalance > 0 && (
          <button onClick={() => setShowPayment(true)} className="mt-3 w-full py-2 text-sm font-semibold text-primary border border-primary rounded-lg">
            + Ajouter un paiement (restat)
          </button>
        )}
      </div>

      {showPayment && <PaymentForm ticketId={id} remaining={ticket.remainingBalance} onClose={() => { setShowPayment(false); refresh() }} />}

      {isAdmin && ticket.status === 'pending' && (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 space-y-3">
          <h3 className="font-bold text-slate-900">Validation</h3>
          {/* Delivery mode selection */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Mode de sortie</label>
            <div className="flex gap-2">
              {DELIVERY_MODES.map((m) => (
                <button key={m.id} type="button" onClick={() => {
                  store.updateTicketDelivery(id, m.id)
                  refresh()
                }}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    ticket.deliveryMode === m.id ? 'bg-primary text-white border-primary' : 'bg-white text-slate-600 border-slate-300'
                  }`}>
                  {m.label}
                </button>
              ))}
            </div>
          </div>
          <button onClick={handleApprove} className="w-full py-2.5 bg-green-600 text-white font-semibold rounded-lg">Approuver</button>
          <div className="flex gap-2">
            <input type="text" value={flagNote} onChange={(e) => setFlagNote(e.target.value)} placeholder="Raison du signalement..."
              className="flex-1 px-3 py-2 rounded-lg border border-slate-300 text-sm" />
            <button onClick={handleFlag} className="px-4 py-2 bg-red-600 text-white font-semibold rounded-lg text-sm">Signaler</button>
          </div>
        </div>
      )}
    </div>
  )
}

function PaymentForm({ ticketId, remaining, onClose }) {
  const [amount, setAmount] = useState(remaining)
  const [mode, setMode] = useState('cash')

  function handleSubmit(e) {
    e.preventDefault()
    store.addPayment(ticketId, { amount: Number(amount) || 0, paymentMode: mode })
    onClose()
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl p-4 shadow-sm border border-blue-200 space-y-4">
      <h3 className="font-bold text-slate-900">Ajouter un paiement</h3>
      <p className="text-sm text-slate-500">Reste: {formatFCFA(remaining)}</p>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Montant (FCFA)</label>
        <input type="number" min="0" max={remaining} value={amount} onChange={(e) => setAmount(e.target.value)} required
          className="w-full px-3 py-2.5 rounded-lg border border-slate-300 focus:border-primary outline-none" />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Mode</label>
        <div className="flex gap-2">
          {PAYMENT_MODES.map((m) => (
            <button key={m.id} type="button" onClick={() => setMode(m.id)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium border ${mode === m.id ? 'bg-primary text-white border-primary' : 'bg-white text-slate-600 border-slate-300'}`}>
              {m.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex gap-3">
        <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-slate-300 text-slate-600 font-medium">Annuler</button>
        <button type="submit" className="flex-1 py-2.5 rounded-lg bg-primary text-white font-semibold">Enregistrer</button>
      </div>
    </form>
  )
}

function StatusBadge({ status }) {
  const styles = { pending: 'bg-amber-100 text-amber-700', approved: 'bg-green-100 text-green-700', flagged: 'bg-red-100 text-red-700' }
  const labels = { pending: 'En attente', approved: 'Approuve', flagged: 'Signale' }
  return <span className={`text-xs px-2 py-0.5 rounded-full ${styles[status] || styles.pending}`}>{labels[status] || status}</span>
}

function Stat({ label, value, color = 'text-slate-900' }) {
  return <div className="bg-slate-50 rounded-lg px-3 py-2"><p className="text-xs text-slate-500">{label}</p><p className={`font-semibold ${color}`}>{value}</p></div>
}
