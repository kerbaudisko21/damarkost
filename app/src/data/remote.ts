import type { SupabaseClient } from '@supabase/supabase-js'
import type { AppData, Booking, BookingSource, Expense, Invoice, Lease, Payment, Room, Settings, Tenant } from '../domain/types'
import { DEFAULT_SETTINGS } from './seed'

/**
 * Pemetaan AppData ↔ tabel Supabase (lihat supabase/migrations).
 * RLS memastikan semua baris milik pemilik yang login (owner_id diisi otomatis = auth.uid()).
 */

type Row = Record<string, unknown>
const n = (v: unknown) => (v == null ? undefined : (v as string))
const num = (v: unknown) => Number(v ?? 0)

// ---------- baca ----------
const toRoom = (r: Row): Room => ({
  id: r.id as string, code: r.code as string, floor: num(r.floor), label: n(r.label),
  basePrice: num(r.base_price), nightlyPrice: num(r.nightly_price), rentMode: r.rent_mode as Room['rentMode'],
  repairUntil: n(r.repair_until), repairNote: n(r.repair_note),
})
const toTenant = (r: Row): Tenant => ({
  id: r.id as string, name: r.full_name as string, phone: r.phone as string, job: n(r.job), hometown: n(r.hometown),
  emergency: n(r.emergency), archivedAt: n(r.archived_at),
})
const toLease = (r: Row): Lease => ({
  id: r.id as string, tenantId: r.tenant_id as string, roomId: r.room_id as string, startDate: r.start_date as string,
  endDate: n(r.end_date), plannedEnd: n(r.planned_end), rent: num(r.rent), dueDay: num(r.due_day), deposit: num(r.deposit),
  depositStatus: r.deposit_status as Lease['depositStatus'], deduction: r.deduction == null ? undefined : num(r.deduction), deductionReason: n(r.deduction_reason),
})
const toInvoice = (r: Row): Invoice => ({ id: r.id as string, leaseId: r.lease_id as string, period: (r.period as string).trim(), dueDate: r.due_date as string, amount: num(r.amount) })
const toPayment = (r: Row): Payment => ({
  id: r.id as string, invoiceId: r.invoice_id as string, amount: num(r.amount), paidAt: r.paid_at as string,
  method: r.method as Payment['method'], voidedAt: r.voided_at ? (r.voided_at as string).slice(0, 10) : undefined,
})
const toExpense = (r: Row): Expense => ({
  id: r.id as string, date: r.date as string, category: r.category as Expense['category'], amount: num(r.amount), note: (r.note as string) ?? '',
  voidedAt: r.voided_at ? (r.voided_at as string).slice(0, 10) : undefined,
})
const toSource = (r: Row): BookingSource => ({ id: r.id as string, name: r.name as string, commissionPct: num(r.commission_pct), color: r.color as string })
const toBooking = (r: Row): Booking => ({
  id: r.id as string, roomId: r.room_id as string, guestName: r.guest_name as string, guestPhone: (r.guest_phone as string) ?? '',
  guests: num(r.guests), checkIn: r.check_in as string, checkOut: r.check_out as string, rate: num(r.nightly_rate),
  sourceId: (r.source_id as string) ?? '', commissionPct: num(r.commission_pct), paid: r.paid_status as Booking['paid'],
  dpAmount: num(r.dp_amount), status: r.status as Booking['status'],
})

/** PIN adalah kunci layar per-HP → disimpan di perangkat, bukan di database. */
const PIN_KEY = 'kc-pin'
export function loadLocalPin(): Pick<Settings, 'pinEnabled' | 'pinHash'> {
  try { const v = JSON.parse(localStorage.getItem(PIN_KEY) || '{}'); return { pinEnabled: !!v.pinEnabled, pinHash: v.pinHash } } catch { return { pinEnabled: false } }
}
export function saveLocalPin(p: Pick<Settings, 'pinEnabled' | 'pinHash'>) {
  try { localStorage.setItem(PIN_KEY, JSON.stringify(p)) } catch { /* abaikan */ }
}

const toSettings = (r: Row | null): Settings => ({
  ...DEFAULT_SETTINGS,
  ...(r ? {
    propertyName: r.name as string, ownerName: (r.owner_name as string) ?? '', bankAccount: (r.bank_account as string) ?? '',
    billingMode: r.billing_mode as Settings['billingMode'], fixedDay: num(r.fixed_day), prorata: !!r.prorata,
    lateFeeEnabled: !!r.late_fee_enabled, graceDays: num(r.grace_days), lateFeePerDay: num(r.late_fee_per_day),
    checkInTime: r.check_in_time as string, checkOutTime: r.check_out_time as string, requireGuestKtp: !!r.require_guest_ktp,
    templates: r.templates && Object.keys(r.templates as object).length ? (r.templates as Settings['templates']) : DEFAULT_SETTINGS.templates,
  } : {}),
  ...loadLocalPin(),
})

export class SchemaMissingError extends Error {}

export async function loadAll(sb: SupabaseClient): Promise<AppData> {
  const q = await Promise.all([
    sb.from('property').select('*').maybeSingle(),
    sb.from('room').select('*').order('code'),
    sb.from('tenant').select('*'),
    sb.from('lease').select('*'),
    sb.from('invoice').select('*').is('voided_at', null),
    sb.from('payment').select('*'),
    sb.from('expense').select('*').order('date', { ascending: false }),
    sb.from('booking_source').select('*').eq('active', true),
    sb.from('booking').select('*'),
  ])
  const err = q.find((r) => r.error)?.error
  if (err) {
    if (err.code === 'PGRST205' || err.code === '42P01' || err.code === '42703') throw new SchemaMissingError(err.message)
    throw new Error(err.message)
  }
  const [prop, rooms, tenants, leases, invoices, payments, expenses, sources, bookings] = q.map((r) => r.data)
  return {
    version: 1,
    settings: toSettings(prop as Row | null),
    rooms: (rooms as Row[]).map(toRoom),
    tenants: (tenants as Row[]).map(toTenant),
    leases: (leases as Row[]).map(toLease),
    invoices: (invoices as Row[]).map(toInvoice),
    payments: (payments as Row[]).map(toPayment),
    expenses: (expenses as Row[]).map(toExpense),
    sources: (sources as Row[]).map(toSource),
    bookings: (bookings as Row[]).map(toBooking),
  }
}

// ---------- tulis ----------
export const fromRoom = (r: Partial<Room>) => clean({
  id: r.id, code: r.code, floor: r.floor, label: r.label === undefined ? undefined : r.label || null, base_price: r.basePrice, nightly_price: r.nightlyPrice,
  rent_mode: r.rentMode, repair_until: 'repairUntil' in r ? r.repairUntil ?? null : undefined, repair_note: 'repairNote' in r ? r.repairNote ?? null : undefined,
})
export const fromTenant = (t: Partial<Tenant>) => clean({ id: t.id, full_name: t.name, phone: t.phone, job: t.job, hometown: t.hometown, emergency: t.emergency, archived_at: t.archivedAt })
export const fromLease = (l: Partial<Lease>) => clean({
  id: l.id, tenant_id: l.tenantId, room_id: l.roomId, start_date: l.startDate, end_date: l.endDate, planned_end: l.plannedEnd, rent: l.rent,
  due_day: l.dueDay, deposit: l.deposit, deposit_status: l.depositStatus, deduction: l.deduction, deduction_reason: l.deductionReason,
})
export const fromInvoice = (i: Invoice) => ({ id: i.id, lease_id: i.leaseId, period: i.period, due_date: i.dueDate, amount: i.amount })
export const fromPayment = (p: Payment) => clean({ id: p.id, invoice_id: p.invoiceId, amount: p.amount, paid_at: p.paidAt, method: p.method, voided_at: p.voidedAt })
export const fromExpense = (e: Expense) => clean({ id: e.id, date: e.date, category: e.category, amount: e.amount, note: e.note, voided_at: e.voidedAt })
export const fromBooking = (b: Partial<Booking>) => clean({
  id: b.id, room_id: b.roomId, source_id: b.sourceId || undefined, guest_name: b.guestName, guest_phone: b.guestPhone, guests: b.guests,
  check_in: b.checkIn, check_out: b.checkOut, nightly_rate: b.rate, commission_pct: b.commissionPct, paid_status: b.paid, dp_amount: b.dpAmount, status: b.status,
})
export const fromSettings = (s: Partial<Settings>) => clean({
  name: s.propertyName, owner_name: s.ownerName, bank_account: s.bankAccount, billing_mode: s.billingMode, fixed_day: s.fixedDay, prorata: s.prorata,
  late_fee_enabled: s.lateFeeEnabled, grace_days: s.graceDays, late_fee_per_day: s.lateFeePerDay, check_in_time: s.checkInTime,
  check_out_time: s.checkOutTime, require_guest_ktp: s.requireGuestKtp, templates: s.templates,
})

function clean<T extends Row>(o: T): Partial<T> {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as Partial<T>
}

/** Data awal saat pemilik pertama kali login: 9 kamar (harga belum diatur) + sumber pesanan homestay. */
export async function bootstrapIfEmpty(sb: SupabaseClient, data: AppData, ownerName: string): Promise<boolean> {
  let changed = false
  const { data: prop } = await sb.from('property').select('owner_id').maybeSingle()
  if (!prop) {
    const { error } = await sb.from('property').insert({ ...fromSettings({ ...DEFAULT_SETTINGS, ownerName }), bank_account: '' })
    if (error) throw new Error(error.message)
    changed = true
  }
  if (data.rooms.length === 0) {
    const rooms = ['101', '102', '103', '104', '201', '202', '203', '204', '205'].map((code) => ({ code, floor: Number(code[0]), base_price: 0, nightly_price: 0, rent_mode: 'monthly' }))
    const { error } = await sb.from('room').insert(rooms)
    if (error) throw new Error(error.message)
    changed = true
  }
  if (data.sources.length === 0) {
    const sources = [['Langsung/WA', 0, '#6E8450'], ['Walk-in', 0, '#9A7149'], ['Airbnb', 3, '#D9534F'], ['Traveloka', 15, '#2B7BC0'], ['Booking.com', 15, '#24427D']]
      .map(([name, commission_pct, color]) => ({ name, commission_pct, color }))
    const { error } = await sb.from('booking_source').insert(sources)
    if (error) throw new Error(error.message)
    changed = true
  }
  return changed
}
