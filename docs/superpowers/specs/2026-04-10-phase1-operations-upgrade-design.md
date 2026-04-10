# Phase 1: TopClean+ Operations Upgrade

## Context

TopClean+ is a cash flow management PWA for a cleaning business in Benin (21 employees, ~10M FCFA/month target). The MVP handles transaction entry, expenses, daily closing, owner dashboard, French chat, and Excel export. All data lives in localStorage/IndexedDB on a single device.

The business owner reviewed the MVP and requested operational features that better match his real-world workflow: detailed item tracking, flexible cash register closing, advance payment rules, and daily activity metrics.

## Scope

Phase 1 adds 6 features without changing the architecture (no Firebase, no multi-device). All changes stay within the existing localStorage + React + Vite stack.

---

## 1. Service Category Split

### Current
5 services. Canapé & Matelas are grouped under one ID (`canape`).

### New
6 services, each with its own objectif and advance rule:

| Service | ID | Min. Advance | Objectif (FCFA/mois) |
|---|---|---|---|
| Pressing & Blanchisserie | `pressing` | 50% (warning) | 4 000 000 |
| Lessive / Laverie | `lessive` | 50% (warning) | 1 500 000 |
| Nettoyage Maison/Bat. | `nettoyage` | Flexible | 3 000 000 |
| Canapé | `canape` | Flexible | 600 000 |
| Matelas | `matelas` | Flexible | 400 000 |
| Désinfection | `desinfection` | Flexible | 500 000 |

### Advance Rule Behavior
- When the selected service has a 50% rule and the entered advance is below 50% of CA facturé, an **orange warning** appears: "Attention: avance inférieure à 50%"
- The warning **never blocks** submission. The receptionist can always proceed.
- Tickets submitted below the threshold are visible to the owner in the dashboard (the existing `pending` status handles this).

### Migration
Existing tickets with `serviceType: 'canape'` remain valid. No data migration needed — the old `canape` ID now means "Canapé" specifically. The new `matelas` ID only applies to new tickets going forward.

### File: `src/utils/services.jsx`
```js
export const SERVICES = [
  { id: 'pressing', label: 'Pressing & Blanchisserie', objectif: 4000000, minAdvancePct: 50 },
  { id: 'lessive', label: 'Lessive / Laverie', objectif: 1500000, minAdvancePct: 50 },
  { id: 'nettoyage', label: 'Nettoyage Maison/Bat.', objectif: 3000000, minAdvancePct: 0 },
  { id: 'canape', label: 'Canapé', objectif: 600000, minAdvancePct: 0 },
  { id: 'matelas', label: 'Matelas', objectif: 400000, minAdvancePct: 0 },
  { id: 'desinfection', label: 'Désinfection', objectif: 500000, minAdvancePct: 0 },
]
```

---

## 2. Detailed Item Breakdown

### Current
Tickets have `items: 3` — a single number with no detail about what the pieces are.

### New
For **pressing** and **lessive** services, replace the single number with an item picker.

#### Piece Types
```js
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
```

#### UI: Item Picker
- Each piece type shows as a row with the label and + / - buttons
- Rows with qty 0 are dimmed, rows with qty > 0 are highlighted
- "Autre" row: when qty > 0, a text input appears for the custom label (e.g., "rideau"). To add multiple different custom items (e.g., 2 rideaux + 1 nappe), the receptionist adds one "Autre" entry per distinct item type — each with its own label and qty.
- Total pieces shown at the bottom, auto-calculated

#### Data Model Change
```js
// Old
items: 3

// New (pressing/lessive)
items: [
  { type: 'chemise', qty: 2 },
  { type: 'pantalon', qty: 1 },
  { type: 'autre', label: 'rideau', qty: 2 },
  { type: 'autre', label: 'nappe', qty: 1 }
]

// Other services keep simple format
items: 1
```

#### When it applies
- `pressing` and `lessive`: show the item picker
- All other services (`nettoyage`, `canape`, `matelas`, `desinfection`): keep the simple number input. For these services, the quantity means "number of items/jobs" (e.g., 2 canapés, 1 matelas).

#### Backward Compatibility
Old tickets with `items: 3` (a number) continue to display fine. The UI checks `Array.isArray(ticket.items)` to decide whether to show the breakdown or just the count.

---

## 3. Intake & Delivery Tracking

### New Fields on Tickets

**At creation — how items arrived:**
| Value | Label | Meaning |
|---|---|---|
| `depot_boutique` | Dépôt boutique | Client came to the shop |
| `collecte` | Collecte | Agent went to collect from client |

**At completion — how items left (set when ticket is closed/approved):**
| Value | Label | Meaning |
|---|---|---|
| `retrait_boutique` | Retrait boutique | Client picked up at shop |
| `livraison` | Livraison | Agent delivered to client |

### UI
- **Ticket form**: Radio buttons for intake mode (`intakeMode`), defaults to `depot_boutique`
- **Ticket detail page**: When approving/completing a ticket, radio buttons for delivery mode (`deliveryMode`)

### Data Model
```js
{
  // ... existing fields
  intakeMode: 'depot_boutique' | 'collecte',
  deliveryMode: 'retrait_boutique' | 'livraison' | null, // null until completed
}
```

---

## 4. Business Day Logic (10h–10h)

### Current
Everything uses `todayStr()` which returns the calendar date. Closing is locked to today.

### New
The "business day" runs from 10:00 to 10:00 the next day.

#### Helper Function
```js
export function businessDay() {
  const now = new Date()
  if (now.getHours() < 10) {
    // Before 10 AM: still yesterday's business day
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    return yesterday.toISOString().slice(0, 10)
  }
  return now.toISOString().slice(0, 10)
}
```

#### Where It Applies
- **Ticket creation**: `date` field uses `businessDay()` instead of `todayStr()`
- **Expense creation**: same
- **Daily closing**: defaults to `businessDay()`
- **Dashboard**: shows data for `businessDay()`
- **Chat parser**: uses `businessDay()` for all queries

#### Display
The dashboard and closing page show: "Journée du 10 avril (10h → 10h)" to make the business day explicit.

---

## 5. Flexible Cash Closing

### Current
Closing is hardcoded to today. If you miss closing, the data is gone.

### New Behavior

1. **Unclosed day detection**: On load, the closing page checks if any recent day (up to 7 days back) has tickets/expenses but no closing record.
2. **Banner**: If unclosed days exist, shows: "La caisse du [date] n'a pas été clôturée. Clôturer maintenant?" with a button.
3. **Date picker**: The owner can select any past date to close. The form loads that day's tickets/expenses for reconciliation.
4. **Lock after closing**: Once a day is closed, it cannot be re-closed. The summary is read-only.
5. **Flow**: Close yesterday → then today's business day becomes active for new entries.

### Closing Page Flow
```
On load:
  1. Find unclosed days (have tickets but no closing record)
  2. If unclosed days exist → show banner with oldest unclosed day
  3. Default the form to the selected day (or current business day if all caught up)
  4. Load that day's tickets + expenses for the reconciliation form
  5. Submit → saves closing for that specific date
```

---

## 6. Daily Activity Summary

### New Dashboard Card
A new "Activité du jour" card on the owner dashboard, showing operational metrics + financials for the current business day.

```
Activité du jour
─────────────────────────────
Entrées:   8 dépôts boutique · 5 collectes
Sorties:   6 retraits boutique · 3 livraisons
Pièces:    47 pressing · 12 laverie
Services:  2 canapé · 1 matelas · 1 désinfection
─────────────────────────────
CA facturé:     850 000 FCFA
Encaissé:       625 000 FCFA
Reste à payer:  225 000 FCFA
Dépenses:        45 000 FCFA
Net du jour:    580 000 FCFA
```

### Data Source
All computed from existing ticket + expense data for the current business day. No new storage needed.

### Calculations
- **Entrées**: count tickets by `intakeMode`
- **Sorties**: count tickets by `deliveryMode` (only completed tickets)
- **Pièces**: sum `items` for pressing/lessive tickets, grouped by service
- **Services**: count tickets for canapé, matelas, nettoyage, désinfection
- **CA facturé**: sum of all `caFacture`
- **Encaissé**: sum of all `totalPaid`
- **Reste à payer**: sum of all `remainingBalance`
- **Dépenses**: sum of all expense amounts
- **Net du jour**: Encaissé - Dépenses

---

## Files Affected

| File | Changes |
|---|---|
| `src/utils/services.jsx` | Split canapé/matelas, add `minAdvancePct`, add `PIECE_TYPES` |
| `src/store.js` | `businessDay()` helper, updated `addTicket` (items array, intakeMode), unclosed-day query |
| `src/pages/Tickets.jsx` | Item picker component, intake radio, advance warning |
| `src/pages/TicketDetail.jsx` | Delivery mode selection on completion, item breakdown display |
| `src/pages/DailyClosing.jsx` | Date picker, business-day default, unclosed-day banner |
| `src/pages/Dashboard.jsx` | Activity summary card (counts + financials) |
| `src/chat/parser.js` | Update aliases (matelas no longer maps to canape), piece type parsing |
| `src/utils/exportExcel.js` | Item breakdown columns in export |

## Files Not Touched
- Auth (`useAuth.jsx`, `Login.jsx`)
- Photos (`PhotoUpload.jsx`, IndexedDB logic)
- PWA config (`manifest.json`, service worker)
- Layout (`Layout.jsx`)
- Styling (Tailwind config)

---

## Phase 2 (Saved for Later)

Not in scope for this work. Documented in memory:
1. Multi-device accessibility (Firebase migration)
2. Garment movement tracking (boutique ↔ atelier, agent attribution)
3. Collection/delivery agent tracking (which viandier)
4. Profit First financial model
5. WhatsApp bot
6. In-app chatbot
7. Anomaly detection, audit trail
