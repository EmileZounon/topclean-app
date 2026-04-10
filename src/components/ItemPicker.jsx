import { PIECE_TYPES } from '../utils/services.jsx'

// Standard piece types (everything except 'autre')
const STANDARD_TYPES = PIECE_TYPES.filter((p) => p.id !== 'autre')

export default function ItemPicker({ value = [], onChange }) {
  // --- helpers ---

  function getQty(typeId) {
    return value.filter((i) => i.type === typeId).reduce((sum, i) => sum + i.qty, 0)
  }

  function setStandardQty(typeId, newQty) {
    const next = value.filter((i) => i.type !== typeId)
    if (newQty > 0) next.push({ type: typeId, qty: newQty })
    onChange(next)
  }

  function incrementStandard(typeId) {
    const current = getQty(typeId)
    setStandardQty(typeId, current + 1)
  }

  function decrementStandard(typeId) {
    const current = getQty(typeId)
    if (current <= 0) return
    setStandardQty(typeId, current - 1)
  }

  // Autre entries are tracked by their index in the value array
  const autreEntries = value
    .map((item, idx) => ({ ...item, _idx: idx }))
    .filter((item) => item.type === 'autre')

  function addAutre() {
    onChange([...value, { type: 'autre', label: '', qty: 1 }])
  }

  function removeAutre(idx) {
    onChange(value.filter((_, i) => i !== idx))
  }

  function incrementAutre(idx) {
    const next = value.map((item, i) =>
      i === idx ? { ...item, qty: item.qty + 1 } : item
    )
    onChange(next)
  }

  function updateAutreLabel(idx, label) {
    const next = value.map((item, i) => (i === idx ? { ...item, label } : item))
    onChange(next)
  }

  const totalPieces = value.reduce((sum, i) => sum + (i.qty || 0), 0)

  return (
    <div className="space-y-2">
      {/* Standard types */}
      {STANDARD_TYPES.map((pieceType) => {
        const qty = getQty(pieceType.id)
        const active = qty > 0
        return (
          <div
            key={pieceType.id}
            className={`flex items-center justify-between rounded-xl border px-4 py-3 transition-colors ${
              active
                ? 'border-primary bg-primary/5'
                : 'border-slate-200 bg-slate-50'
            }`}
          >
            <span
              className={`text-sm ${
                active ? 'font-semibold text-slate-800' : 'text-slate-400'
              }`}
            >
              {pieceType.label}
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => decrementStandard(pieceType.id)}
                className={`w-8 h-8 rounded-full border flex items-center justify-center text-lg leading-none transition-colors ${
                  active
                    ? 'border-primary text-primary hover:bg-primary/10'
                    : 'border-slate-300 text-slate-300'
                }`}
              >
                −
              </button>

              <span
                className={`w-5 text-center text-sm ${
                  active ? 'font-semibold text-slate-800' : 'text-slate-400'
                }`}
              >
                {qty}
              </span>

              <button
                type="button"
                onClick={() => incrementStandard(pieceType.id)}
                className="w-8 h-8 rounded-full border border-primary text-primary flex items-center justify-center text-lg leading-none hover:bg-primary/10 transition-colors"
              >
                +
              </button>
            </div>
          </div>
        )
      })}

      {/* Autre entries */}
      {autreEntries.map((entry) => (
        <div
          key={entry._idx}
          className="rounded-xl border border-primary bg-primary/5 px-4 py-3 space-y-2"
        >
          <div className="flex items-center justify-between">
            <input
              type="text"
              value={entry.label || ''}
              onChange={(e) => updateAutreLabel(entry._idx, e.target.value)}
              placeholder="Nom de l'article…"
              className="flex-1 text-sm font-semibold text-slate-800 bg-transparent outline-none placeholder-slate-400 mr-2"
            />

            <div className="flex items-center gap-2">
              {/* Minus removes the entire entry */}
              <button
                type="button"
                onClick={() => removeAutre(entry._idx)}
                className="w-8 h-8 rounded-full border border-red-300 text-red-400 flex items-center justify-center text-lg leading-none hover:bg-red-50 transition-colors"
              >
                −
              </button>

              <span className="w-5 text-center text-sm font-semibold text-slate-800">
                {entry.qty}
              </span>

              <button
                type="button"
                onClick={() => incrementAutre(entry._idx)}
                className="w-8 h-8 rounded-full border border-primary text-primary flex items-center justify-center text-lg leading-none hover:bg-primary/10 transition-colors"
              >
                +
              </button>
            </div>
          </div>
        </div>
      ))}

      {/* Add autre button */}
      <button
        type="button"
        onClick={addAutre}
        className="w-full py-2.5 rounded-xl border border-dashed border-slate-300 text-slate-400 text-sm hover:border-primary hover:text-primary transition-colors"
      >
        + Autre article
      </button>

      {/* Summary bar */}
      {totalPieces > 0 && (
        <div className="rounded-xl bg-slate-100 px-4 py-3 flex justify-between items-center">
          <span className="text-sm text-slate-500">Total pièces</span>
          <span className="text-sm font-bold text-slate-800">{totalPieces}</span>
        </div>
      )}
    </div>
  )
}
