import { useState, useEffect } from 'react'
import * as store from '../store'
import { formatFCFA } from '../utils/fcfa.jsx'
import PhotoUpload from '../components/PhotoUpload'

export default function DailyClosing() {
  const currentBizDay = store.businessDay()
  const [selectedDate, setSelectedDate] = useState(currentBizDay)
  const [closing, setClosing] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [cashPhotoId, setCashPhotoId] = useState(null)
  const [momoPhotoId, setMomoPhotoId] = useState(null)
  const [form, setForm] = useState({ cashCount: '', momoMorning: '', momoEvening: '' })
  const [unclosedDays, setUnclosedDays] = useState([])

  useEffect(() => {
    setUnclosedDays(store.getUnclosedDays())
  }, [])

  useEffect(() => {
    setClosing(store.getClosing(selectedDate))
    setLoading(false)
  }, [selectedDate])

  function update(field) { return (e) => setForm((f) => ({ ...f, [field]: e.target.value })) }

  function makePhotoHandler(setter) {
    return async (blob) => {
      if (!blob) { setter(null); return }
      const reader = new FileReader()
      reader.onload = async () => { const id = await store.savePhoto(reader.result); setter(id) }
      reader.readAsDataURL(blob)
    }
  }

  function formatDateFR(dateStr) {
    const d = new Date(dateStr + 'T12:00:00')
    return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!cashPhotoId) { alert('La photo de la caisse est obligatoire.'); return }
    if (!momoPhotoId) { alert('La capture MoMo est obligatoire.'); return }
    setSubmitting(true)

    const cashCount = Number(form.cashCount) || 0
    const momoMorning = Number(form.momoMorning) || 0
    const momoEvening = Number(form.momoEvening) || 0
    const { expectedCash, expectedMomo } = store.computeExpected(selectedDate)
    const momoActual = momoEvening - momoMorning

    const data = {
      cashCount,
      cashPhotoId,
      momoMorning,
      momoEvening,
      momoPhotoId,
      expectedCash,
      expectedMomo,
      cashDiscrepancy: cashCount - expectedCash,
      momoDiscrepancy: momoActual - expectedMomo,
    }

    store.saveClosing(selectedDate, data)
    setClosing(data)
    setSubmitting(false)
    setUnclosedDays(store.getUnclosedDays())
  }

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>

  return (
    <div className="space-y-4">
      {/* Unclosed days banner */}
      {unclosedDays.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="font-bold text-amber-800 text-sm mb-2">Journées non clôturées</p>
          <div className="space-y-2">
            {unclosedDays.map(date => (
              <button key={date} onClick={() => setSelectedDate(date)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm ${
                  selectedDate === date ? 'bg-amber-200 font-semibold' : 'bg-amber-100'
                } text-amber-900`}>
                {formatDateFR(date)} — Clôturer maintenant?
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Date selector */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-slate-700">Journée:</label>
        <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}
          className="px-3 py-2 rounded-lg border border-slate-300 text-sm focus:border-primary outline-none" />
      </div>

      {closing ? (
        <ClosingSummary closing={closing} date={selectedDate} formatDateFR={formatDateFR} />
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Clôture de caisse</h2>
            <p className="text-sm text-slate-500">Journée du {formatDateFR(selectedDate)} (10h → 10h)</p>
          </div>

          <section className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 space-y-4">
            <h3 className="font-bold text-slate-900">1. Comptage espèces</h3>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Total espèces en caisse (FCFA) *</label>
              <input type="number" min="0" value={form.cashCount} onChange={update('cashCount')} required
                className="w-full px-3 py-2.5 rounded-lg border border-slate-300 focus:border-primary outline-none text-lg font-semibold"
                placeholder="Compter les billets et pièces" />
            </div>
            <PhotoUpload label="Photo de la caisse" onPhoto={makePhotoHandler(setCashPhotoId)} required />
          </section>

          <section className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 space-y-4">
            <h3 className="font-bold text-slate-900">2. Solde Mobile Money</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Solde matin *</label>
                <input type="number" min="0" value={form.momoMorning} onChange={update('momoMorning')} required
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-300 focus:border-primary outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Solde soir *</label>
                <input type="number" min="0" value={form.momoEvening} onChange={update('momoEvening')} required
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-300 focus:border-primary outline-none" />
              </div>
            </div>
            <PhotoUpload label="Capture MoMo (soir)" onPhoto={makePhotoHandler(setMomoPhotoId)} required />
          </section>

          <button type="submit" disabled={submitting}
            className="w-full py-3 bg-primary text-white font-bold rounded-xl text-lg disabled:opacity-50">
            {submitting ? 'Clôture en cours...' : `Clôturer la journée du ${selectedDate}`}
          </button>
        </form>
      )}
    </div>
  )
}

function ClosingSummary({ closing, date, formatDateFR }) {
  const cashOk = closing.cashDiscrepancy === 0
  const momoOk = closing.momoDiscrepancy === 0

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-slate-900">Clôture effectuée</h2>
        <p className="text-sm text-slate-500">{formatDateFR(date)} (10h → 10h)</p>
      </div>
      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 space-y-3">
        <h3 className="font-bold text-slate-900">Espèces</h3>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <Stat label="En caisse" value={formatFCFA(closing.cashCount)} />
          <Stat label="Attendu" value={formatFCFA(closing.expectedCash)} />
        </div>
        <div className={`text-center py-2 rounded-lg font-bold text-sm ${cashOk ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {cashOk ? 'Pas d\'écart' : `Écart: ${formatFCFA(closing.cashDiscrepancy)}`}
        </div>
      </div>
      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 space-y-3">
        <h3 className="font-bold text-slate-900">Mobile Money</h3>
        <div className="grid grid-cols-3 gap-2 text-sm">
          <Stat label="Matin" value={formatFCFA(closing.momoMorning)} />
          <Stat label="Soir" value={formatFCFA(closing.momoEvening)} />
          <Stat label="Attendu" value={formatFCFA(closing.expectedMomo)} />
        </div>
        <div className={`text-center py-2 rounded-lg font-bold text-sm ${momoOk ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {momoOk ? 'Pas d\'écart' : `Écart: ${formatFCFA(closing.momoDiscrepancy)}`}
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value }) {
  return <div className="bg-slate-50 rounded-lg px-3 py-2"><p className="text-xs text-slate-500">{label}</p><p className="font-semibold text-slate-900">{value}</p></div>
}
