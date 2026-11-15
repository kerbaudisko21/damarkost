import type { AppData, ISODate } from './types'
import { invoiceStatus, leaseActiveOn } from './billing'
import { addDays, diffDays, periodOf } from '../lib/dates'

export type ReminderKind = 'late' | 'due' | 'checkin' | 'checkout' | 'leaving' | 'repair'

export interface Reminder {
  id: string
  kind: ReminderKind
  /** urutan: makin kecil makin penting */
  rank: number
  name: string
  roomCode: string
  days: number
  amount?: number
  invoiceId?: string
  bookingId?: string
  date?: ISODate
}

/** Semua hal yang perlu diingatkan hari ini (dipakai lonceng, badge ikon, dan push pagi). */
export function computeReminders(data: AppData, today: ISODate, dueWindow = 3): Reminder[] {
  const out: Reminder[] = []
  const room = (id: string) => data.rooms.find((r) => r.id === id)

  for (const inv of data.invoices.filter((i) => i.period <= periodOf(today))) {
    const lease = data.leases.find((l) => l.id === inv.leaseId)
    if (!lease) continue
    const st = invoiceStatus(inv, data.payments, today, data.settings)
    if (st.state === 'paid') continue
    const tenant = data.tenants.find((x) => x.id === lease.tenantId)
    const r = room(lease.roomId)
    if (!tenant || !r) continue
    if (st.state === 'late') out.push({ id: 'late-' + inv.id, kind: 'late', rank: 0, name: tenant.name, roomCode: r.code, days: st.daysLate, amount: st.remaining, invoiceId: inv.id })
    else if (st.daysLeft <= dueWindow) out.push({ id: 'due-' + inv.id, kind: 'due', rank: 1, name: tenant.name, roomCode: r.code, days: st.daysLeft, amount: st.remaining, invoiceId: inv.id })
  }

  for (const b of data.bookings) {
    if (b.status === 'cancelled' || b.status === 'out') continue
    const r = room(b.roomId)
    if (!r) continue
    if (b.status === 'booked' && (b.checkIn === today || b.checkIn === addDays(today, 1)))
      out.push({ id: 'in-' + b.id, kind: 'checkin', rank: 2, name: b.guestName, roomCode: r.code, days: diffDays(today, b.checkIn), bookingId: b.id, date: b.checkIn })
    if (b.status === 'in' && (b.checkOut === today || b.checkOut === addDays(today, 1)))
      out.push({ id: 'out-' + b.id, kind: 'checkout', rank: 2, name: b.guestName, roomCode: r.code, days: diffDays(today, b.checkOut), bookingId: b.id, date: b.checkOut })
  }

  for (const l of data.leases) {
    if (!l.plannedEnd || !leaseActiveOn(l, today)) continue
    const d = diffDays(today, l.plannedEnd)
    const tenant = data.tenants.find((x) => x.id === l.tenantId), r = room(l.roomId)
    if (tenant && r && d >= 0 && d <= 14) out.push({ id: 'leave-' + l.id, kind: 'leaving', rank: 3, name: tenant.name, roomCode: r.code, days: d, date: l.plannedEnd })
  }

  for (const r of data.rooms) {
    if (!r.repairUntil) continue
    const d = diffDays(today, r.repairUntil)
    if (d >= 0 && d <= 2) out.push({ id: 'repair-' + r.id, kind: 'repair', rank: 3, name: r.repairNote ?? '', roomCode: r.code, days: d, date: r.repairUntil })
  }

  return out.sort((a, b) => a.rank - b.rank || b.days - a.days)
}

/** Jumlah untuk badge ikon: hanya yang butuh tindakan (telat, jatuh tempo, check-in/out). */
export const badgeCount = (rs: Reminder[]) => rs.filter((r) => r.rank <= 2).length
