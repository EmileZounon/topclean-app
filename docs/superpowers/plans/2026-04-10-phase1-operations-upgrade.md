# Phase 1: Operations Upgrade — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add detailed item tracking, flexible cash closing with 10h–10h business days, per-service advance rules, intake/delivery tracking, and daily activity metrics to the TopClean+ PWA.

**Architecture:** All changes stay within the existing React + Vite + Tailwind + localStorage stack. No new dependencies. The `businessDay()` helper replaces `todayStr()` throughout. The ticket data model gains new fields (items array, intakeMode, deliveryMode) while remaining backward-compatible with existing data.

**Tech Stack:** React 18, Vite, Tailwind CSS, localStorage, IndexedDB (photos only)

**Spec:** `docs/superpowers/specs/2026-04-10-phase1-operations-upgrade-design.md`

---

### Task 1: Update Service Categories & Add Piece Types

**Files:**
- Modify: `src/utils/services.jsx`

This task splits Canapé & Matelas into separate categories, adds `minAdvancePct` to each service, and defines the `PIECE_TYPES` array for pressing/lessive item breakdown.

- [ ] **Step 1: Update SERVICES array**

Replace the entire contents of `src/utils/services.jsx` with:

```jsx
export const SERVICES = [
  { id: 'pressing', label: 'Pressing & Blanchisserie', objectif: 4000000, minAdvancePct: 50 },
  { id: 'lessive', label: 'Lessive / Laverie', objectif: 1500000, minAdvancePct: 50 },
  { id: 'nettoyage', label: 'Nettoyage Maison/Bat.', objectif: 3000000, minAdvancePct: 0 },
  { id: 'canape', label: 'Canapé', objectif: 600000, minAdvancePct: 0 },
  { id: 'matelas', label: 'Matelas', objectif: 400000, minAdvancePct: 0 },
  { id: 'desinfection', label: 'Désinfection', objectif: 500000, minAdvancePct: 0 },
]

export const PIECE_TYPES = [
  { id: 'chemise', label: 'Chemise' },
  { id: 'pantalon', label: 'Pantalon' },
  { id: 'costume', label: 'Costume (complet)' },
  { id: 'robe', label: 'Robe' },
  { id: 'jupe', label: 'Jupe' },
  { id: 'veste', label: 'Veste / Blazer' },
  { id: 'drap', label: 'Drap' },
  { id: 'autre', label: 'Autre' },
]

export const INTAKE_MODES = [
  { id: 'depot_boutique', label: 'Dépôt boutique' },
  { id: 'collecte', label: 'Collecte' },
]

export const DELIVERY_MODES = [
  { id: 'retrait_boutique', label: 'Retrait boutique' },
  { id: 'livraison', label: 'Livraison' },
]

export const PAYMENT_MODES = [
  { id: 'cash', label: 'Espèces' },
  { id: 'momo', label: 'Mobile Money' },
  { id: 'cheque', label: 'Chèque' },
]

export const EXPENSE_CATEGORIES = [
  'Produits',
  'Transport',
  'Loyer',
  'Fournitures',
  'Maintenance',
  'Autre',
]

export const TOTAL_OBJECTIF = SERVICES.reduce((sum, s) => sum + s.objectif, 0)

// Returns true if the service uses the detailed item picker (pressing/lessive)
export function usesItemPicker(serviceId) {
  return serviceId === 'pressing' || serviceId === 'lessive'
}

// Returns total piece count from items (handles both old number format and new array format)
export function countItems(items) {
  if (typeof items === 'number') return items
  if (Array.isArray(items)) return items.reduce((sum, i) => sum + (i.qty || 0), 0)
  return 1
}
```

- [ ] **Step 2: Verify the app still loads**

Run: `cd /Users/emilegio/topclean-app && npm run dev`

Open the app in browser. The dashboard should show 6 services instead of 5 in the "CA par service" section. Canapé and Matelas should appear as separate rows.

- [ ] **Step 3: Commit**

```bash
cd /Users/emilegio/topclean-app
git add src/utils/services.jsx
git commit -m "Split canapé/matelas into separate services, add piece types and intake/delivery modes"
```

---

### Task 2: Add businessDay() Helper and Update Store

**Files:**
- Modify: `src/store.js`

Replace `todayStr()` usage with a `businessDay()` helper that implements the 10h–10h cutoff. Also add a helper to find unclosed days.

- [ ] **Step 1: Add businessDay() and getUnclosedDays() to store.js**

Add these functions after the `genId()` function (after line 24):

```js
// ─── Business Day (10h–10h) ─────────────────────
export function businessDay() {
  const now = new Date()
  if (now.getHours() < 10) {
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    return yesterday.toISOString().slice(0, 10)
  }
  return now.toISOString().slice(0, 10)
}

// Find days that have tickets or expenses but no closing (up to 7 days back)
export function getUnclosedDays() {
  const allTickets = getAll(KEYS.tickets)
  const allExpenses = getAll(KEYS.expenses)
  const closings = JSON.parse(localStorage.getItem(KEYS.dailyClosing) || '{}')
  const today = businessDay()

  // Collect all dates that have activity
  const activeDates = new Set()
  allTickets.forEach(t => activeDates.add(t.date))
  allExpenses.forEach(e => activeDates.add(e.date))

  // Filter to dates that have no closing and are before today
  return [...activeDates]
    .filter(d => d < today && !closings[d])
    .sort()
    .slice(-7) // last 7 unclosed days max
}
```

- [ ] **Step 2: Update addTicket to support new fields**

Replace the `addTicket` function in `src/store.js` (lines 35–61) with:

```js
export function addTicket(ticket) {
  const all = getAll(KEYS.tickets)
  const id = genId()
  const ca = ticket.caFacture || 0
  const advance = ticket.advance || 0
  const entry = {
    id,
    date: ticket.date,
    clientName: ticket.clientName,
    serviceType: ticket.serviceType,
    items: ticket.items || 1,
    caFacture: ca,
    payments: [{
      amount: advance,
      paymentMode: ticket.paymentMode,
      createdAt: Date.now(),
    }],
    totalPaid: advance,
    remainingBalance: ca - advance,
    status: 'pending',
    intakeMode: ticket.intakeMode || 'depot_boutique',
    deliveryMode: null,
    createdAt: Date.now(),
    photoId: ticket.photoId || null,
  }
  all.push(entry)
  setAll(KEYS.tickets, all)
  return entry
}
```

- [ ] **Step 3: Add updateTicketDelivery function**

Add this after the `updateTicketStatus` function (after line 87):

```js
export function updateTicketDelivery(id, deliveryMode) {
  const all = getAll(KEYS.tickets)
  const idx = all.findIndex((t) => t.id === id)
  if (idx === -1) return
  all[idx].deliveryMode = deliveryMode
  setAll(KEYS.tickets, all)
}
```

- [ ] **Step 4: Verify the app still loads**

Run: `cd /Users/emilegio/topclean-app && npm run dev`

Open the app. Create a test ticket — it should still work. The new fields (`intakeMode`, `deliveryMode`) are stored but not yet visible in the UI.

- [ ] **Step 5: Commit**

```bash
cd /Users/emilegio/topclean-app
git add src/store.js
git commit -m "Add businessDay() helper, intake/delivery fields, unclosed-day detection"
```

---

### Task 3: Build Item Picker Component

**Files:**
- Create: `src/components/ItemPicker.jsx`

A reusable component showing piece types with +/- quantity buttons. Only used for pressing and lessive services.

- [ ] **Step 1: Create ItemPicker.jsx**

```jsx
import { useState } from 'react'
import { PIECE_TYPES } from '../utils/services.jsx'

export default function ItemPicker({ value, onChange }) {
  // value: array of { type, qty, label? } or undefined
  // onChange: called with updated array

  const items = value || PIECE_TYPES.map(p => ({ type: p.id, qty: 0 }))

  function updateQty(type, delta) {
    const updated = items.map(item => {
      if (item.type === type) {
        return { ...item, qty: Math.max(0, (item.qty || 0) + delta) }
      }
      return item
    })
    // If this is a new 'autre' item being incremented and none exists yet, add it
    if (type === 'autre' && delta > 0 && !items.some(i => i.type === 'autre')) {
      updated.push({ type: 'autre', label: '', qty: 1 })
    }
    onChange(updated.filter(i => i.qty > 0))
  }

  function updateAutreLabel(index, label) {
    const updated = items.map((item, i) => i === index ? { ...item, label } : item)
    onChange(updated.filter(i => i.qty > 0))
  }

  function addAutre() {
    const updated = [...items, { type: 'autre', label: '', qty: 1 }]
    onChange(updated.filter(i => i.qty > 0))
  }

  const totalPieces = items.reduce((sum, i) => sum + (i.qty || 0), 0)

  // Standard piece types (not autre)
  const standardTypes = PIECE_TYPES.filter(p => p.id !== 'autre')
  // All autre entries
  const autreEntries = items.filter(i => i.type === 'autre' && i.qty > 0)

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-slate-700">Détail des pièces</label>

      {standardTypes.map(pieceType => {
        const item = items.find(i => i.type === pieceType.id)
        const qty = item?.qty || 0
        return (
          <div key={pieceType.id}
            className={`flex items-center justify-between px-3 py-2 rounded-lg border ${qty > 0 ? 'border-primary bg-primary/5' : 'border-slate-200 bg-slate-50'}`}>
            <span className={`text-sm ${qty > 0 ? 'font-semibold text-slate-900' : 'text-slate-400'}`}>
              {pieceType.label}
            </span>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => updateQty(pieceType.id, -1)}
                className="w-8 h-8 rounded-full border border-slate-300 text-slate-600 flex items-center justify-center text-lg font-bold disabled:opacity-30"
                disabled={qty === 0}>−</button>
              <span className="w-6 text-center font-semibold text-slate-900">{qty}</span>
              <button type="button" onClick={() => updateQty(pieceType.id, 1)}
                className="w-8 h-8 rounded-full border border-primary text-primary flex items-center justify-center text-lg font-bold">+</button>
            </div>
          </div>
        )
      })}

      {/* Autre entries */}
      {autreEntries.map((item, i) => {
        const itemIndex = items.indexOf(item)
        return (
          <div key={`autre-${i}`} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-primary bg-primary/5">
            <input
              type="text"
              value={item.label || ''}
              onChange={(e) => updateAutreLabel(itemIndex, e.target.value)}
              placeholder="Nom (ex: rideau)"
              className="flex-1 px-2 py-1 text-sm rounded border border-slate-300 focus:border-primary outline-none"
            />
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => updateQty(item.type, -1)}
                className="w-8 h-8 rounded-full border border-slate-300 text-slate-600 flex items-center justify-center text-lg font-bold"
                // We need a way to target this specific autre entry
                onClick={() => {
                  const updated = items.filter((_, idx) => idx !== itemIndex)
                  onChange(updated.filter(it => it.qty > 0))
                }}>−</button>
              <span className="w-6 text-center font-semibold text-slate-900">{item.qty}</span>
              <button type="button" onClick={() => {
                const updated = items.map((it, idx) => idx === itemIndex ? { ...it, qty: it.qty + 1 } : it)
                onChange(updated.filter(it => it.qty > 0))
              }}
                className="w-8 h-8 rounded-full border border-primary text-primary flex items-center justify-center text-lg font-bold">+</button>
            </div>
          </div>
        )
      })}

      {/* Add autre button */}
      <button type="button" onClick={addAutre}
        className="w-full py-2 text-sm font-medium text-primary border border-dashed border-primary rounded-lg">
        + Autre article
      </button>

      {/* Total */}
      <div className="flex justify-between items-center px-3 py-2 bg-slate-100 rounded-lg">
        <span className="text-sm font-medium text-slate-600">Total pièces</span>
        <span className="font-bold text-slate-900">{totalPieces}</span>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Fix the duplicate onClick issue**

The "autre" minus button has two `onClick` handlers. Remove the first one — the second (inline) is the correct one that removes the specific autre entry. The minus button for autre entries should be:

```jsx
<button type="button"
  onClick={() => {
    const updated = items.filter((_, idx) => idx !== itemIndex)
    onChange(updated.filter(it => it.qty > 0))
  }}
  className="w-8 h-8 rounded-full border border-slate-300 text-slate-600 flex items-center justify-center text-lg font-bold">−</button>
```

- [ ] **Step 3: Verify component renders**

Open the app. The component isn't wired up yet — we'll integrate it in Task 4. Just verify the app loads without errors.

- [ ] **Step 4: Commit**

```bash
cd /Users/emilegio/topclean-app
git add src/components/ItemPicker.jsx
git commit -m "Add ItemPicker component for pressing/lessive piece breakdown"
```

---

### Task 4: Update Ticket Form (Item Picker, Intake Mode, Advance Warning)

**Files:**
- Modify: `src/pages/Tickets.jsx`

Wire up the item picker for pressing/lessive, add intake mode radio buttons, add advance warning, and switch from `todayStr()` to `businessDay()`.

- [ ] **Step 1: Update imports**

Replace the imports at the top of `src/pages/Tickets.jsx` (lines 1–6):

```jsx
import { useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import * as store from '../store'
import { SERVICES, PAYMENT_MODES, INTAKE_MODES, usesItemPicker, countItems } from '../utils/services.jsx'
import { formatFCFA } from '../utils/fcfa.jsx'
import PhotoUpload from '../components/PhotoUpload'
import ItemPicker from '../components/ItemPicker'
```

- [ ] **Step 2: Replace todayStr() with businessDay()**

Replace the `todayStr()` function and its usages in `Tickets`:

```jsx
export default function Tickets() {
  const today = store.businessDay()
  const [tickets, setTickets] = useState(() => store.getTickets(today))
  const [showForm, setShowForm] = useState(false)

  const refresh = useCallback(() => setTickets(store.getTickets(today)), [today])
```

- [ ] **Step 3: Update ticket list to show item count using countItems()**

In the ticket card (inside `tickets.map`), replace `t.items` display if needed. Update the "Avance/Reste" line to also show piece count:

```jsx
<div className="flex gap-3 mt-2 text-xs text-slate-400">
  <span>{countItems(t.items)} pièce{countItems(t.items) > 1 ? 's' : ''}</span>
  <span>Avance: {formatFCFA(t.totalPaid)}</span>
  <span>Reste: {formatFCFA(t.remainingBalance)}</span>
</div>
```

- [ ] **Step 4: Rewrite TicketForm with item picker, intake mode, and advance warning**

Replace the entire `TicketForm` function with:

```jsx
function TicketForm({ onClose }) {
  const [loading, setLoading] = useState(false)
  const [photoId, setPhotoId] = useState(null)
  const [form, setForm] = useState({
    clientName: '',
    serviceType: 'pressing',
    items: 1,
    detailedItems: [],
    caFacture: '',
    advance: '',
    paymentMode: 'cash',
    intakeMode: 'depot_boutique',
  })

  const showPicker = usesItemPicker(form.serviceType)
  const service = SERVICES.find(s => s.id === form.serviceType)
  const ca = Number(form.caFacture) || 0
  const advance = Number(form.advance) || 0
  const advancePct = ca > 0 ? Math.round((advance / ca) * 100) : 0
  const showAdvanceWarning = service?.minAdvancePct > 0 && ca > 0 && advance > 0 && advancePct < service.minAdvancePct

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
    const today = store.businessDay()
    const items = showPicker ? form.detailedItems : (Number(form.items) || 1)
    store.addTicket({
      date: today,
      clientName: form.clientName.trim(),
      serviceType: form.serviceType,
      items,
      caFacture: ca,
      advance: Math.min(advance, ca),
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

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Nom du client *</label>
        <input type="text" value={form.clientName} onChange={update('clientName')} required
          className="w-full px-3 py-2.5 rounded-lg border border-slate-300 focus:border-primary focus:ring-1 focus:ring-primary outline-none"
          placeholder="Ex: Mme Adjovi" />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Service *</label>
        <select value={form.serviceType} onChange={update('serviceType')}
          className="w-full px-3 py-2.5 rounded-lg border border-slate-300 focus:border-primary outline-none">
          {SERVICES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
      </div>

      {/* Item picker for pressing/lessive, simple number for others */}
      {showPicker ? (
        <ItemPicker value={form.detailedItems} onChange={(items) => setForm(f => ({ ...f, detailedItems: items }))} />
      ) : (
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Quantité</label>
          <input type="number" min="1" value={form.items} onChange={update('items')}
            className="w-full px-3 py-2.5 rounded-lg border border-slate-300 focus:border-primary outline-none" />
        </div>
      )}

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
        <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
          <span className="text-amber-600 text-lg">!</span>
          <p className="text-sm text-amber-700">
            Attention: avance ({advancePct}%) inférieure à {service.minAdvancePct}% du CA facturé
          </p>
        </div>
      )}

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
        <label className="block text-sm font-medium text-slate-700 mb-1">Mode d'entrée</label>
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

      <PhotoUpload label="Photo (reçu, articles)" onPhoto={handlePhoto} />

      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-slate-300 text-slate-600 font-medium">Annuler</button>
        <button type="submit" disabled={loading} className="flex-1 py-2.5 rounded-lg bg-primary text-white font-semibold disabled:opacity-50">
          {loading ? 'Enregistrement...' : 'Enregistrer'}
        </button>
      </div>
    </form>
  )
}
```

- [ ] **Step 5: Verify the ticket form**

Run the dev server. Open the Tickets page:
1. Select "Pressing" → item picker should appear with +/- buttons
2. Select "Canapé" → simple number input should appear
3. Enter a CA of 50000 and advance of 20000 with Pressing → orange warning should show
4. Enter a CA of 50000 and advance of 20000 with Canapé → no warning (flexible)
5. Select intake mode → both buttons should toggle
6. Submit a ticket → should appear in the list

- [ ] **Step 6: Commit**

```bash
cd /Users/emilegio/topclean-app
git add src/pages/Tickets.jsx
git commit -m "Add item picker, intake mode, and advance warning to ticket form"
```

---

### Task 5: Update Ticket Detail Page (Item Breakdown + Delivery Mode)

**Files:**
- Modify: `src/pages/TicketDetail.jsx`

Show item breakdown instead of just a number, add intake mode display, and let the owner set delivery mode when approving.

- [ ] **Step 1: Update imports**

Replace the imports at the top of `src/pages/TicketDetail.jsx` (lines 1–7):

```jsx
import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import * as store from '../store'
import { useAuth } from '../hooks/useAuth.jsx'
import { SERVICES, PAYMENT_MODES, DELIVERY_MODES, INTAKE_MODES, countItems } from '../utils/services.jsx'
import { formatFCFA } from '../utils/fcfa.jsx'
import PhotoUpload from '../components/PhotoUpload'
```

- [ ] **Step 2: Replace the items display in the detail card**

Replace `<Stat label="Nb Pieces" value={ticket.items} />` (line 60) with:

```jsx
<Stat label="Nb Pièces" value={countItems(ticket.items)} />
```

- [ ] **Step 3: Add item breakdown and intake mode after the stats grid**

After the stats grid closing `</div>` (line 61), add:

```jsx
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
```

- [ ] **Step 4: Add delivery mode selection to the approval section**

Replace the approval section (lines 88–98) with:

```jsx
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
```

- [ ] **Step 5: Verify ticket detail page**

Open a ticket detail:
1. If it has detailed items (array), the breakdown should show as chips (e.g., "2× chemise", "1× pantalon")
2. Old tickets with `items: 3` should still show "3" as the count
3. Intake mode should display
4. For pending tickets (admin view), delivery mode buttons should appear above the approve button

- [ ] **Step 6: Commit**

```bash
cd /Users/emilegio/topclean-app
git add src/pages/TicketDetail.jsx
git commit -m "Show item breakdown, intake/delivery modes on ticket detail page"
```

---

### Task 6: Update Expenses Page to Use businessDay()

**Files:**
- Modify: `src/pages/Expenses.jsx`

Simple change — replace `todayStr()` with `store.businessDay()`.

- [ ] **Step 1: Update Expenses.jsx**

Replace `function todayStr() { return new Date().toISOString().slice(0, 10) }` (line 8) by removing it entirely.

Replace all `todayStr()` calls with `store.businessDay()`:

Line 11: `const [expenses, setExpenses] = useState(() => store.getExpenses(store.businessDay()))`
Line 13: `const refresh = useCallback(() => setExpenses(store.getExpenses(store.businessDay())), [])`
Line 79: `date: store.businessDay(),`

- [ ] **Step 2: Verify**

Open the Expenses page. It should behave the same as before (unless it's before 10 AM, in which case it shows yesterday's expenses).

- [ ] **Step 3: Commit**

```bash
cd /Users/emilegio/topclean-app
git add src/pages/Expenses.jsx
git commit -m "Switch expenses page to businessDay() for 10h-10h logic"
```

---

### Task 7: Update Daily Closing (Flexible Dates + Business Day)

**Files:**
- Modify: `src/pages/DailyClosing.jsx`

Add unclosed-day banner, date picker, and switch to business day logic.

- [ ] **Step 1: Rewrite DailyClosing.jsx**

Replace the entire file with:

```jsx
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
    // Refresh unclosed days
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
```

- [ ] **Step 2: Verify closing page**

1. Open the Clôture page — should default to current business day
2. If there are unclosed days, the amber banner should appear
3. Clicking a date in the banner should switch the form to that day
4. The date picker should allow selecting any date
5. If a day is already closed, the summary shows (read-only)
6. Submit a closing — should work and remove that day from the unclosed banner

- [ ] **Step 3: Commit**

```bash
cd /Users/emilegio/topclean-app
git add src/pages/DailyClosing.jsx
git commit -m "Flexible cash closing with date picker, unclosed-day banner, 10h-10h business day"
```

---

### Task 8: Update Dashboard (Activity Summary + Business Day)

**Files:**
- Modify: `src/pages/Dashboard.jsx`

Add the "Activité du jour" card with operational counts and financials. Switch to business day.

- [ ] **Step 1: Update imports and add countItems**

Replace imports at the top of `src/pages/Dashboard.jsx` (lines 1–8):

```jsx
import { useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import * as store from '../store'
import { useAuth } from '../hooks/useAuth.jsx'
import { SERVICES, INTAKE_MODES, DELIVERY_MODES, countItems } from '../utils/services.jsx'
import { formatFCFA, formatShort } from '../utils/fcfa.jsx'
import StatCard from '../components/StatCard'
import { exportWeeklyExcel } from '../utils/exportExcel'
```

- [ ] **Step 2: Replace todayStr() with businessDay()**

Replace `function todayStr() { return new Date().toISOString().slice(0, 10) }` and `const today = todayStr()` (lines 10, 15) with:

```jsx
const today = store.businessDay()
```

(Remove the `todayStr` function entirely.)

- [ ] **Step 3: Add activity summary card**

After the closing status card (after the `</div>` at line 96) and before the pending approvals section, add the activity summary:

```jsx
{/* Activity summary */}
<div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
  <h3 className="font-bold text-slate-900 text-sm mb-3">Activité du jour</h3>

  {/* Intake/delivery counts */}
  <div className="space-y-2 mb-4">
    <div className="flex gap-4 text-sm">
      <span className="text-slate-600">
        Entrées: <strong>{tickets.filter(t => t.intakeMode === 'depot_boutique').length}</strong> dépôts boutique
        {' · '}<strong>{tickets.filter(t => t.intakeMode === 'collecte').length}</strong> collectes
      </span>
    </div>
    <div className="flex gap-4 text-sm">
      <span className="text-slate-600">
        Sorties: <strong>{tickets.filter(t => t.deliveryMode === 'retrait_boutique').length}</strong> retraits boutique
        {' · '}<strong>{tickets.filter(t => t.deliveryMode === 'livraison').length}</strong> livraisons
      </span>
    </div>
  </div>

  {/* Pieces by service */}
  <div className="mb-4">
    <p className="text-xs text-slate-500 mb-1">Pièces & services</p>
    <div className="flex flex-wrap gap-2">
      {SERVICES.map(s => {
        const serviceTickets = tickets.filter(t => t.serviceType === s.id)
        if (serviceTickets.length === 0) return null
        const totalPieces = serviceTickets.reduce((sum, t) => sum + countItems(t.items), 0)
        return (
          <span key={s.id} className="text-xs bg-slate-100 rounded-full px-2.5 py-1">
            {totalPieces} {s.label}
          </span>
        )
      })}
    </div>
  </div>

  {/* Financial summary */}
  <div className="border-t border-slate-100 pt-3 space-y-1">
    <div className="flex justify-between text-sm">
      <span className="text-slate-600">CA facturé</span>
      <span className="font-semibold">{formatFCFA(totalCA)}</span>
    </div>
    <div className="flex justify-between text-sm">
      <span className="text-slate-600">Encaissé</span>
      <span className="font-semibold text-green-700">{formatFCFA(totalEncaisse)}</span>
    </div>
    <div className="flex justify-between text-sm">
      <span className="text-slate-600">Reste à payer</span>
      <span className="font-semibold text-amber-600">{formatFCFA(totalCA - totalEncaisse)}</span>
    </div>
    <div className="flex justify-between text-sm">
      <span className="text-slate-600">Dépenses</span>
      <span className="font-semibold text-red-600">{formatFCFA(totalExpenses)}</span>
    </div>
    <div className="flex justify-between text-sm border-t border-slate-100 pt-1">
      <span className="font-medium text-slate-900">Net du jour</span>
      <span className={`font-bold ${net >= 0 ? 'text-green-700' : 'text-red-600'}`}>{formatFCFA(net)}</span>
    </div>
  </div>
</div>
```

- [ ] **Step 4: Update the dashboard header date display**

Replace the date display (line 60) to show business day context:

```jsx
<p className="text-sm text-slate-500">
  {new Date(today + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
  <span className="text-xs text-slate-400 ml-1">(10h→10h)</span>
</p>
```

- [ ] **Step 5: Verify dashboard**

1. Dashboard should show 6 service bars instead of 5
2. The new "Activité du jour" card should show intake/delivery counts (mostly 0 for old tickets), pieces by service, and full financial breakdown
3. The date header should show "(10h→10h)"

- [ ] **Step 6: Commit**

```bash
cd /Users/emilegio/topclean-app
git add src/pages/Dashboard.jsx
git commit -m "Add daily activity summary card with operational metrics and financials"
```

---

### Task 9: Update Chat Parser

**Files:**
- Modify: `src/chat/parser.js`

Update aliases so matelas is its own service, use `businessDay()`, and handle piece type mentions in natural language.

- [ ] **Step 1: Update SERVICE_ALIASES**

Replace the `SERVICE_ALIASES` object (lines 9–14):

```js
const SERVICE_ALIASES = {
  pressing: 'pressing', press: 'pressing', blanchisserie: 'pressing', blanch: 'pressing',
  lessive: 'lessive', laverie: 'lessive', lavage: 'lessive', laver: 'lessive',
  nettoyage: 'nettoyage', menage: 'nettoyage', maison: 'nettoyage', batiment: 'nettoyage', nettoyer: 'nettoyage',
  canape: 'canape', sofa: 'canape',
  matelas: 'matelas',
  desinfection: 'desinfection', desinfecter: 'desinfection',
}
```

- [ ] **Step 2: Add piece type aliases and extraction**

Add after `extractPieces` function (after line 85):

```js
const PIECE_ALIASES = {
  chemise: 'chemise', chemises: 'chemise',
  pantalon: 'pantalon', pantalons: 'pantalon',
  costume: 'costume', costumes: 'costume', complet: 'costume', complets: 'costume',
  robe: 'robe', robes: 'robe',
  jupe: 'jupe', jupes: 'jupe',
  veste: 'veste', vestes: 'veste', blazer: 'veste', blazers: 'veste',
  drap: 'drap', draps: 'drap',
}

function extractDetailedItems(text) {
  const norm = normalize(text)
  const items = []
  // Match patterns like "3 chemises", "2 pantalons", "1 costume"
  const regex = /(\d+)\s*(chemises?|pantalons?|costumes?|complets?|robes?|jupes?|vestes?|blazers?|draps?)/gi
  let match
  while ((match = regex.exec(text)) !== null) {
    const qty = parseInt(match[1], 10)
    const typeKey = normalize(match[2])
    const type = PIECE_ALIASES[typeKey]
    if (type && qty > 0) {
      const existing = items.find(i => i.type === type)
      if (existing) existing.qty += qty
      else items.push({ type, qty })
    }
  }
  return items.length > 0 ? items : null
}
```

- [ ] **Step 3: Replace todayStr() with businessDay()**

In the `processMessage` function (line 112), replace:
```js
const today = new Date().toISOString().slice(0, 10)
```
with:
```js
const today = store.businessDay()
```

- [ ] **Step 4: Update the ticket case to use detailed items**

In the `ticket` case (around line 194), replace the ticket creation section:

```js
case 'ticket': {
  const amounts = extractAmount(text)
  const clientName = extractName(text)
  const service = findService(text)
  const mode = findPaymentMode(text)
  const pieces = extractPieces(text)
  const detailedItems = extractDetailedItems(text)

  if (!clientName && amounts.length === 0) {
    return { type: 'error', message: 'Je n\'ai pas compris. Essayez:\n"Mme Adjovi pressing 2 chemises 1 pantalon 50000 avance 25000 momo"' }
  }

  const ca = amounts[0] || 0
  const advance = amounts[1] || ca
  const serviceType = service || 'pressing'
  const items = detailedItems || pieces

  const ticket = store.addTicket({
    date: today,
    clientName: clientName || 'Client',
    serviceType,
    items,
    caFacture: ca,
    advance: Math.min(advance, ca),
    paymentMode: mode,
    photoId: null,
  })

  const sLabel = SERVICES.find(s => s.id === ticket.serviceType)?.label || ticket.serviceType
  const itemsSummary = Array.isArray(ticket.items)
    ? ticket.items.map(i => `${i.qty}× ${i.type}`).join(', ')
    : `${countItems(ticket.items)} pièce(s)`

  return {
    type: 'success',
    message: `✅ Ticket créé:\n• Client: ${ticket.clientName}\n• Service: ${sLabel}\n• Pièces: ${itemsSummary}\n• CA: ${formatFCFA(ticket.caFacture)}\n• Avance: ${formatFCFA(ticket.totalPaid)}\n• Reste: ${formatFCFA(ticket.remainingBalance)}\n• Mode: ${mode}`,
  }
}
```

- [ ] **Step 5: Update import to include countItems**

Update the import at line 4:

```js
import { SERVICES, PAYMENT_MODES, EXPENSE_CATEGORIES } from '../utils/services.jsx'
```

to:

```js
import { SERVICES, PAYMENT_MODES, EXPENSE_CATEGORIES, countItems } from '../utils/services.jsx'
```

Also add `import * as store from '../store'` — already exists at line 5, but make sure `store.businessDay()` is accessible.

- [ ] **Step 6: Verify chat**

Test in the chat:
- "Mme Adjovi pressing 2 chemises 1 pantalon 50000 avance 25000 momo" → should create ticket with detailed items
- "matelas 80000 mme Koffi" → should create a matelas ticket (not canape)
- "combien aujourd'hui" → should show business day stats

- [ ] **Step 7: Commit**

```bash
cd /Users/emilegio/topclean-app
git add src/chat/parser.js
git commit -m "Update chat parser: matelas as own service, piece type parsing, businessDay()"
```

---

### Task 10: Update Excel Export

**Files:**
- Modify: `src/utils/exportExcel.js`

Add item breakdown column and update for 6 services.

- [ ] **Step 1: Update import**

Add `countItems` to the import (line 2):

```js
import { SERVICES, PAYMENT_MODES, countItems } from './services.jsx'
```

- [ ] **Step 2: Update ticket sheet headers and rows**

Replace the ticket sheet section (lines 22–36) with:

```js
// ─── Sheet 1: TICKETS ──────────────────────────
const ticketRows = [['Date', 'Client', 'Service', 'Nb Pièces', 'Détail Pièces', 'CA Facturé', 'Total Payé', 'Reste', 'Mode Paiement', 'Entrée', 'Sortie', 'Statut']]
let allTickets = []
dates.forEach(date => {
  const tickets = store.getTickets(date)
  allTickets = allTickets.concat(tickets)
  tickets.forEach(t => {
    const service = SERVICES.find(s => s.id === t.serviceType)?.label || t.serviceType
    const mode = t.payments?.[0]?.paymentMode || ''
    const statut = t.status === 'approved' ? 'Approuvé' : t.status === 'flagged' ? 'Signalé' : 'En attente'
    const nbPieces = countItems(t.items)
    const detail = Array.isArray(t.items)
      ? t.items.map(i => `${i.qty}× ${i.type === 'autre' ? (i.label || 'autre') : i.type}`).join(', ')
      : ''
    const intake = t.intakeMode === 'collecte' ? 'Collecte' : 'Dépôt boutique'
    const delivery = t.deliveryMode === 'livraison' ? 'Livraison' : t.deliveryMode === 'retrait_boutique' ? 'Retrait boutique' : ''
    ticketRows.push([t.date, t.clientName, service, nbPieces, detail, t.caFacture, t.totalPaid, t.remainingBalance, mode, intake, delivery, statut])
  })
})
const wsTickets = XLSX.utils.aoa_to_sheet(ticketRows)
wsTickets['!cols'] = [{ wch: 12 }, { wch: 20 }, { wch: 25 }, { wch: 10 }, { wch: 30 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 16 }, { wch: 16 }, { wch: 12 }]
XLSX.utils.book_append_sheet(wb, wsTickets, 'TICKETS')
```

- [ ] **Step 3: Verify export**

Click "Télécharger le bilan de la semaine" on the dashboard. Open the Excel file:
- TICKETS sheet should have "Détail Pièces", "Entrée", and "Sortie" columns
- 6 services should appear in the BILAN HEBDO sheet

- [ ] **Step 4: Commit**

```bash
cd /Users/emilegio/topclean-app
git add src/utils/exportExcel.js
git commit -m "Add item breakdown, intake/delivery columns to Excel export"
```

---

### Task 11: Final Integration Verification

No files changed — this is a verification pass.

- [ ] **Step 1: Full app walkthrough**

1. Open the app in browser
2. **Ticket form:** Select Pressing → item picker appears. Add 2 chemises, 1 pantalon, 1 "Autre" labeled "rideau". Select "Collecte" as intake. Enter CA 75000, advance 30000 → orange warning shows. Submit.
3. **Ticket detail:** Open the ticket → see item breakdown chips, intake mode, financial details. Set delivery mode to "Livraison". Approve.
4. **Dashboard:** See 6 services in progress bars. See "Activité du jour" with 1 collecte, 1 livraison, pieces count, and full financial summary.
5. **Expenses:** Create an expense → should use business day.
6. **Daily closing:** See date picker and "(10h → 10h)" label. Close the day.
7. **Chat:** Type "Mme Koffi matelas 80000" → creates matelas ticket (not canape).
8. **Excel export:** Download and verify new columns.

- [ ] **Step 2: Test backward compatibility**

If there are existing tickets in localStorage with `items: 3` (number), they should still display correctly everywhere:
- Ticket list: "3 pièces"
- Ticket detail: "3" (no breakdown section)
- Dashboard: counted correctly
- Excel: "3" in Nb Pièces, empty in Détail

- [ ] **Step 3: Commit any fixes**

If any issues found, fix and commit with descriptive message.
