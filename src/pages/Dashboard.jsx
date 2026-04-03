import { useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import * as store from '../store'
import { useAuth } from '../hooks/useAuth.jsx'
import { SERVICES } from '../utils/services.jsx'
import { formatFCFA, formatShort } from '../utils/fcfa.jsx'
import StatCard from '../components/StatCard'
import { exportWeeklyExcel } from '../utils/exportExcel'

function todayStr() { return new Date().toISOString().slice(0, 10) }

export default function Dashboard() {
  const { isAdmin } = useAuth()
  const today = todayStr()
  const [, setRefresh] = useState(0)
  const forceRefresh = useCallback(() => setRefresh((n) => n + 1), [])

  const tickets = store.getTickets(today)
  const expenses = store.getExpenses(today)
  const closing = store.getClosing(today)

  const totalCA = tickets.reduce((s, t) => s + (t.caFacture || 0), 0)
  const totalEncaisse = tickets.reduce((s, t) => s + (t.totalPaid || 0), 0)
  const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0)
  const net = totalEncaisse - totalExpenses

  const byCash = tickets.reduce((s, t) => s + (t.payments || []).filter(p => p.paymentMode === 'cash').reduce((a, p) => a + p.amount, 0), 0)
  const byMomo = tickets.reduce((s, t) => s + (t.payments || []).filter(p => p.paymentMode === 'momo').reduce((a, p) => a + p.amount, 0), 0)
  const byCheque = totalEncaisse - byCash - byMomo

  const pendingTickets = tickets.filter((t) => t.status === 'pending')
  const pendingExpenses = expenses.filter((e) => e.status === 'pending')
  const pendingCount = pendingTickets.length + pendingExpenses.length

  const byService = SERVICES.map((s) => {
    const st = tickets.filter((t) => t.serviceType === s.id)
    const ca = st.reduce((sum, t) => sum + (t.caFacture || 0), 0)
    return { ...s, ca, pct: s.objectif > 0 ? Math.round((ca / s.objectif) * 100) : 0 }
  })

  if (!isAdmin) {
    return (
      <div className="text-center py-12 text-slate-500">
        <p className="text-lg font-medium">Bienvenue sur TopClean+</p>
        <p className="mt-1">Utilisez les onglets pour saisir vos transactions.</p>
      </div>
    )
  }

  function handleApproveExpense(id) {
    store.updateExpenseStatus(id, 'approved')
    forceRefresh()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Tableau de bord</h2>
          <p className="text-sm text-slate-500">{new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>
        {pendingCount > 0 && (
          <span className="bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">{pendingCount} en attente</span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatCard label="CA Facture" value={formatFCFA(totalCA)} />
        <StatCard label="Encaisse" value={formatFCFA(totalEncaisse)} color="text-green-700" />
        <StatCard label="Depenses" value={formatFCFA(totalExpenses)} color="text-red-600" />
        <StatCard label="Net" value={formatFCFA(net)} color={net >= 0 ? 'text-green-700' : 'text-red-600'} />
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
        <h3 className="font-bold text-slate-900 text-sm mb-3">Repartition paiements</h3>
        <div className="flex gap-2">
          <PaymentChip label="Especes" amount={byCash} color="bg-green-100 text-green-700" />
          <PaymentChip label="MoMo" amount={byMomo} color="bg-yellow-100 text-yellow-700" />
          <PaymentChip label="Cheque" amount={byCheque} color="bg-blue-100 text-blue-700" />
        </div>
      </div>

      <div className={`rounded-xl p-4 shadow-sm border ${closing ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
        <div className="flex items-center gap-2">
          <span className="text-lg">{closing ? '\u2713' : '!'}</span>
          <div>
            <p className="font-bold text-sm">{closing ? 'Caisse cloturee' : 'Caisse non cloturee'}</p>
            {closing && (
              <div className="text-xs mt-1 space-x-3">
                <span>Ecart especes: {formatFCFA(closing.cashDiscrepancy)}</span>
                <span>Ecart MoMo: {formatFCFA(closing.momoDiscrepancy)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {pendingCount > 0 && (
        <div className="space-y-3">
          <h3 className="font-bold text-slate-900">En attente d'approbation</h3>
          {pendingTickets.map((t) => (
            <Link key={t.id} to={`/tickets/${t.id}`} className="block bg-white rounded-xl p-4 shadow-sm border-l-4 border-amber-400">
              <div className="flex justify-between">
                <div>
                  <p className="font-semibold text-sm">{t.clientName}</p>
                  <p className="text-xs text-slate-500">{SERVICES.find(s => s.id === t.serviceType)?.label}</p>
                </div>
                <p className="font-bold">{formatFCFA(t.caFacture)}</p>
              </div>
            </Link>
          ))}
          {pendingExpenses.map((e) => (
            <div key={e.id} className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-red-400">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold text-sm">{e.description}</p>
                  <p className="text-xs text-slate-500">{e.category}</p>
                </div>
                <p className="font-bold text-red-600">-{formatFCFA(e.amount)}</p>
              </div>
              <button onClick={() => handleApproveExpense(e.id)} className="mt-2 w-full py-1.5 text-sm font-medium text-green-700 bg-green-50 rounded-lg">Approuver</button>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
        <h3 className="font-bold text-slate-900 text-sm mb-3">CA par service (vs objectif mensuel)</h3>
        <div className="space-y-3">
          {byService.map((s) => (
            <div key={s.id}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-600">{s.label}</span>
                <span className="font-medium">{formatShort(s.ca)} / {formatShort(s.objectif)}</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${Math.min(100, s.pct)}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Excel export */}
      <button
        onClick={exportWeeklyExcel}
        className="w-full py-3 bg-green-600 text-white font-semibold rounded-xl flex items-center justify-center gap-2"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
          <path fillRule="evenodd" d="M12 2.25a.75.75 0 01.75.75v11.69l3.22-3.22a.75.75 0 111.06 1.06l-4.5 4.5a.75.75 0 01-1.06 0l-4.5-4.5a.75.75 0 111.06-1.06l3.22 3.22V3a.75.75 0 01.75-.75zm-9 13.5a.75.75 0 01.75.75v2.25a1.5 1.5 0 001.5 1.5h13.5a1.5 1.5 0 001.5-1.5V16.5a.75.75 0 011.5 0v2.25a3 3 0 01-3 3H5.25a3 3 0 01-3-3V16.5a.75.75 0 01.75-.75z" clipRule="evenodd" />
        </svg>
        Telecharger le bilan de la semaine (Excel)
      </button>
    </div>
  )
}

function PaymentChip({ label, amount, color }) {
  return (
    <div className={`flex-1 rounded-lg px-3 py-2 text-center ${color}`}>
      <p className="text-xs font-medium">{label}</p>
      <p className="font-bold text-sm">{formatShort(amount)}</p>
    </div>
  )
}
