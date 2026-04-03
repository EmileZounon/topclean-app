import { useState, useCallback } from 'react'
import * as store from '../store'
import { useAuth } from '../hooks/useAuth.jsx'
import { PAYMENT_MODES, EXPENSE_CATEGORIES } from '../utils/services.jsx'
import { formatFCFA } from '../utils/fcfa.jsx'
import PhotoUpload from '../components/PhotoUpload'

function todayStr() { return new Date().toISOString().slice(0, 10) }

export default function Expenses() {
  const { isAdmin } = useAuth()
  const [expenses, setExpenses] = useState(() => store.getExpenses(todayStr()))
  const [showForm, setShowForm] = useState(false)
  const refresh = useCallback(() => setExpenses(store.getExpenses(todayStr())), [])

  const total = expenses.reduce((sum, e) => sum + (e.amount || 0), 0)

  function handleApprove(id) {
    store.updateExpenseStatus(id, 'approved')
    refresh()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Depenses du jour</h2>
          <p className="text-sm text-slate-500">Total: {formatFCFA(total)}</p>
        </div>
        <button onClick={() => setShowForm(true)} className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold">+ Nouvelle</button>
      </div>

      {showForm && <ExpenseForm onClose={() => { setShowForm(false); refresh() }} />}

      {expenses.length === 0 && !showForm && <p className="text-center text-slate-400 py-12">Aucune depense aujourd'hui</p>}

      <div className="space-y-3">
        {expenses.map((e) => (
          <div key={e.id} className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-semibold text-slate-900">{e.description}</p>
                <p className="text-sm text-slate-500">{e.category} &middot; {e.supplier || 'N/A'}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-red-600">-{formatFCFA(e.amount)}</p>
                <StatusBadge status={e.status} />
              </div>
            </div>
            {isAdmin && e.status === 'pending' && (
              <button onClick={() => handleApprove(e.id)} className="mt-3 w-full py-1.5 text-sm font-medium text-green-700 bg-green-50 rounded-lg">Approuver</button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function ExpenseForm({ onClose }) {
  const [loading, setLoading] = useState(false)
  const [photoId, setPhotoId] = useState(null)
  const [form, setForm] = useState({ description: '', category: 'Produits', amount: '', supplier: '', paymentMode: 'cash' })

  function update(field) { return (e) => setForm((f) => ({ ...f, [field]: e.target.value })) }

  async function handlePhoto(blob) {
    if (!blob) { setPhotoId(null); return }
    const reader = new FileReader()
    reader.onload = async () => { const id = await store.savePhoto(reader.result); setPhotoId(id) }
    reader.readAsDataURL(blob)
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!photoId) { alert('La photo du recu est obligatoire.'); return }
    setLoading(true)
    store.addExpense({
      date: todayStr(),
      description: form.description.trim(),
      category: form.category,
      amount: Number(form.amount) || 0,
      supplier: form.supplier.trim(),
      paymentMode: form.paymentMode,
      photoId,
    })
    setLoading(false)
    onClose()
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 mb-4 space-y-4">
      <h3 className="font-bold text-slate-900">Nouvelle depense</h3>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Description *</label>
        <input type="text" value={form.description} onChange={update('description')} required
          className="w-full px-3 py-2.5 rounded-lg border border-slate-300 focus:border-primary outline-none" placeholder="Ex: Achat lessive" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Categorie</label>
          <select value={form.category} onChange={update('category')} className="w-full px-3 py-2.5 rounded-lg border border-slate-300 outline-none">
            {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Montant (FCFA) *</label>
          <input type="number" min="0" value={form.amount} onChange={update('amount')} required
            className="w-full px-3 py-2.5 rounded-lg border border-slate-300 outline-none" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Fournisseur</label>
        <input type="text" value={form.supplier} onChange={update('supplier')} className="w-full px-3 py-2.5 rounded-lg border border-slate-300 outline-none" placeholder="Optionnel" />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Mode de paiement</label>
        <div className="flex gap-2">
          {PAYMENT_MODES.map((m) => (
            <button key={m.id} type="button" onClick={() => setForm((f) => ({ ...f, paymentMode: m.id }))}
              className={`flex-1 py-2 rounded-lg text-sm font-medium border ${form.paymentMode === m.id ? 'bg-primary text-white border-primary' : 'bg-white text-slate-600 border-slate-300'}`}>
              {m.label}
            </button>
          ))}
        </div>
      </div>
      <PhotoUpload label="Photo du recu" onPhoto={handlePhoto} required />
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-slate-300 text-slate-600 font-medium">Annuler</button>
        <button type="submit" disabled={loading} className="flex-1 py-2.5 rounded-lg bg-primary text-white font-semibold disabled:opacity-50">
          {loading ? 'Enregistrement...' : 'Enregistrer'}
        </button>
      </div>
    </form>
  )
}

function StatusBadge({ status }) {
  const styles = { pending: 'bg-amber-100 text-amber-700', approved: 'bg-green-100 text-green-700', flagged: 'bg-red-100 text-red-700' }
  const labels = { pending: 'En attente', approved: 'Approuve', flagged: 'Signale' }
  return <span className={`text-xs px-2 py-0.5 rounded-full ${styles[status] || styles.pending}`}>{labels[status] || status}</span>
}
