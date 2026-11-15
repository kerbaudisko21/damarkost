import type { AppData, Invoice, ISODate, Lease, Payment, Room, Settings } from './types'
import { addDays, daysInMonth, diffDays, dueDateFor, fromISO, periodOf } from '../lib/dates'
import { bookingNet, nightsInPeriod } from './homestay'

export function leaseActiveOn(l: Lease, d: ISODate): boolean {
  return l.startDate <= d && (!l.endDate || l.endDate > d)
}

export function activeLeaseForRoom(data: AppData, roomId: string, d: ISODate): Lease | undefined {
  return data.leases.find((l) => l.roomId === roomId && leaseActiveOn(l, d))
}

function periodBounds(period: string): { start: ISODate; end: ISODate } {
  const [y, m] = period.split('-').map(Number)
  return { start: `${period}-01`, end: `${period}-${String(daysInMonth(y, m - 1)).padStart(2, '0')}` }
}

/** Nominal tagihan pertama bila prorata (mode serentak + masuk di tengah bulan). */
export function firstInvoiceAmount(lease: Lease, settings: Settings, period: string): number {
  if (settings.billingMode !== 'fixed' || !settings.prorata || periodOf(lease.startDate) !== period) return lease.rent
  const d = fromISO(lease.startDate)
  const total = daysInMonth(d.getFullYear(), d.getMonth())
  const remaining = total - d.getDate() + 1
  return Math.round((lease.rent * remaining) / total)
}

/**
 * Tagihan bulan pertama saat penghuni masuk. Kos dibayar di muka → jatuh tempo = tanggal masuk
 * (mode serentak: tanggal tagih tetap, dengan prorata bila aktif).
 */
export function firstInvoice(lease: Lease, settings: Settings, makeId: () => string): Invoice {
  const period = periodOf(lease.startDate)
  return { id: makeId(), leaseId: lease.id, period, dueDate: lease.startDate, amount: firstInvoiceAmount(lease, settings, period) }
}

/**
 * Buat tagihan periode berjalan untuk setiap sewa bulanan yang aktif (idempoten).
 * Di produksi logika ini dijalankan pg_cron di Supabase; di mode demo dipanggil saat aplikasi dibuka.
 */
export function ensureInvoices(data: AppData, today: ISODate, makeId: () => string): Invoice[] {
  const period = periodOf(today)
  const { start, end } = periodBounds(period)
  const created: Invoice[] = []
  for (const l of data.leases) {
    const room = data.rooms.find((r) => r.id === l.roomId)
    if (!room || room.rentMode === 'daily') continue
    const activeInPeriod = l.startDate <= end && (!l.endDate || l.endDate > start)
    if (!activeInPeriod) continue
    if (data.invoices.some((i) => i.leaseId === l.id && i.period === period)) continue
    const day = data.settings.billingMode === 'fixed' ? data.settings.fixedDay : l.dueDay
    created.push({ id: makeId(), leaseId: l.id, period, dueDate: dueDateFor(period, day), amount: firstInvoiceAmount(l, data.settings, period) })
  }
  return created
}

export type BillState = 'paid' | 'partial' | 'due' | 'late'

export interface InvoiceStatus {
  paidSum: number
  lateFee: number
  total: number
  remaining: number
  state: BillState
  daysLate: number
  daysLeft: number
  lastPayment?: Payment
}

export function invoiceStatus(inv: Invoice, payments: Payment[], today: ISODate, settings: Settings): InvoiceStatus {
  const ps = payments.filter((p) => p.invoiceId === inv.id && !p.voidedAt)
  const paidSum = ps.reduce((a, p) => a + p.amount, 0)
  const daysLate = Math.max(0, diffDays(inv.dueDate, today))
  const daysLeft = Math.max(0, diffDays(today, inv.dueDate))
  const feeDays = settings.lateFeeEnabled ? Math.max(0, daysLate - settings.graceDays) : 0
  const paid = paidSum >= inv.amount
  const lateFee = paid ? 0 : feeDays * settings.lateFeePerDay
  const total = inv.amount + lateFee
  const state: BillState = paid ? 'paid' : daysLate > 0 ? 'late' : paidSum > 0 ? 'partial' : 'due'
  const lastPayment = ps.sort((a, b) => (a.paidAt < b.paidAt ? 1 : -1))[0]
  return { paidSum, lateFee, total, remaining: Math.max(0, total - paidSum), state, daysLate, daysLeft, lastPayment }
}

export type RoomStateKey = 'paid' | 'due' | 'late' | 'empty' | 'repair' | 'homestay'

export interface RoomView {
  room: Room
  key: RoomStateKey
  lease?: Lease
  tenantName?: string
  invoice?: Invoice
  status?: InvoiceStatus
  guestName?: string
  bookingId?: string
}

export function roomView(data: AppData, room: Room, today: ISODate): RoomView {
  if (room.repairUntil && room.repairUntil >= today) return { room, key: 'repair' }
  const booking = data.bookings.find(
    (b) => b.roomId === room.id && b.status !== 'cancelled' && b.status !== 'out' && b.checkIn <= today && today < b.checkOut,
  )
  if (booking) return { room, key: 'homestay', guestName: booking.guestName, bookingId: booking.id }
  const lease = activeLeaseForRoom(data, room.id, today)
  if (!lease) return { room, key: 'empty' }
  const tenant = data.tenants.find((t) => t.id === lease.tenantId)
  const invoice = data.invoices.find((i) => i.leaseId === lease.id && i.period === periodOf(today))
  const status = invoice ? invoiceStatus(invoice, data.payments, today, data.settings) : undefined
  const key: RoomStateKey = !status || status.state === 'paid' ? 'paid' : status.state === 'late' ? 'late' : 'due'
  return { room, key, lease, tenantName: tenant?.name, invoice, status }
}

export interface MonthSummary {
  target: number
  collected: number
  outstanding: number
  expenses: number
  homestayNet: number
  profit: number
  pct: number
}

export function monthSummary(data: AppData, period: string, today: ISODate): MonthSummary {
  const invs = data.invoices.filter((i) => i.period === period)
  let target = 0, collected = 0
  for (const inv of invs) {
    const st = invoiceStatus(inv, data.payments, today, data.settings)
    target += inv.amount
    collected += Math.min(st.paidSum, inv.amount)
  }
  const expenses = data.expenses.filter((e) => !e.voidedAt && periodOf(e.date) === period).reduce((a, e) => a + e.amount, 0)
  const homestayNet = data.bookings
    .filter((b) => b.status !== 'cancelled')
    .reduce((a, b) => a + Math.round(bookingNet(b) * (nightsInPeriod(b, period) / Math.max(1, diffDays(b.checkIn, b.checkOut)))), 0)
  const profit = collected + homestayNet - expenses
  return { target, collected, outstanding: Math.max(0, target - collected), expenses, homestayNet, profit, pct: target ? Math.round((collected / target) * 100) : 0 }
}

/** Pemasukan kos per bulan (untuk grafik 6 bulan). */
export function collectedInPeriod(data: AppData, period: string): number {
  const ids = new Set(data.invoices.filter((i) => i.period === period).map((i) => i.id))
  return data.payments.filter((p) => !p.voidedAt && ids.has(p.invoiceId)).reduce((a, p) => a + p.amount, 0)
}

export { addDays }
