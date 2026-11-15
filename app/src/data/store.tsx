import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { get, set } from 'idb-keyval'
import type { AppData, Booking, Expense, Lease, PayMethod, Room, Settings, Tenant } from '../domain/types'
import { ensureInvoices, firstInvoice } from '../domain/billing'
import { findConflict } from '../domain/homestay'
import { makeSeed } from './seed'
import { todayISO } from '../lib/dates'
import { uid } from '../lib/format'

/**
 * Penyimpanan mode demo: semua data di IndexedDB perangkat.
 * Saat Supabase tersambung, fungsi-fungsi di bawah diganti panggilan ke database (lihat docs/03-TECH-PLAN.md).
 */
const KEY = 'damarkost-data-v1'

export interface NewTenantInput {
  name: string
  phone: string
  roomId: string
  startDate: string
  rent: number
  deposit: number
  job?: string
  hometown?: string
  emergency?: string
  /** Sudah bayar bulan pertama saat masuk? (kos dibayar di muka) */
  firstPayment?: { method: PayMethod } | null
}

export interface NewBookingInput {
  roomId: string
  guestName: string
  guestPhone: string
  guests: number
  checkIn: string
  checkOut: string
  rate: number
  sourceId: string
  paid: Booking['paid']
  dpAmount: number
}

interface Store {
  data: AppData
  today: string
  ready: boolean
  recordPayment: (invoiceId: string, amount: number, method: PayMethod) => string
  voidPayment: (paymentId: string) => void
  addTenant: (input: NewTenantInput) => void
  checkout: (leaseId: string, date: string, deduction: number, reason: string) => void
  addExpense: (e: Omit<Expense, 'id'>) => string
  voidExpense: (id: string) => void
  addBooking: (b: NewBookingInput) => { ok: true; id: string } | { ok: false; conflict: Booking }
  setBookingStatus: (id: string, status: Booking['status']) => void
  updateRoom: (id: string, patch: Partial<Room>) => void
  updateLease: (id: string, patch: Partial<Lease>) => void
  updateSettings: (patch: Partial<Settings>) => void
  updateTenant: (id: string, patch: Partial<Tenant>) => void
  resetDemo: () => void
}

const Ctx = createContext<Store | null>(null)

function withInvoices(d: AppData, today: string): AppData {
  const created = ensureInvoices(d, today, () => uid('inv'))
  return created.length ? { ...d, invoices: [...d.invoices, ...created] } : d
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const today = todayISO()
  const [data, setData] = useState<AppData>(() => makeSeed(today))
  const [ready, setReady] = useState(false)
  const loaded = useRef(false)

  useEffect(() => {
    get<AppData>(KEY)
      .then((saved) => setData(withInvoices(saved && saved.version === 1 ? saved : makeSeed(today), today)))
      .catch(() => setData(withInvoices(makeSeed(today), today)))
      .finally(() => { loaded.current = true; setReady(true) })
  }, [today])

  useEffect(() => {
    if (!loaded.current) return
    const t = setTimeout(() => { set(KEY, data).catch(() => undefined) }, 250)
    return () => clearTimeout(t)
  }, [data])

  const update = useCallback((fn: (d: AppData) => AppData) => setData((d) => withInvoices(fn(d), today)), [today])

  const store = useMemo<Store>(() => ({
    data, today, ready,
    recordPayment: (invoiceId, amount, method) => {
      const id = uid('pay')
      update((d) => ({ ...d, payments: [...d.payments, { id, invoiceId, amount, method, paidAt: today }] }))
      return id
    },
    voidPayment: (paymentId) => update((d) => ({ ...d, payments: d.payments.map((p) => (p.id === paymentId ? { ...p, voidedAt: today } : p)) })),
    addTenant: (input) => update((d) => {
      const tenant: Tenant = { id: uid('t'), name: input.name.trim(), phone: input.phone.trim(), job: input.job, hometown: input.hometown, emergency: input.emergency }
      const lease: Lease = {
        id: uid('l'), tenantId: tenant.id, roomId: input.roomId, startDate: input.startDate, rent: input.rent,
        dueDay: Number(input.startDate.slice(8, 10)), deposit: input.deposit, depositStatus: 'held',
      }
      // Tagihan bulan pertama langsung dibuat (jatuh tempo = tanggal masuk); bila sudah bayar, langsung lunas.
      const inv = firstInvoice(lease, d.settings, () => uid('inv'))
      const payments = input.firstPayment
        ? [...d.payments, { id: uid('pay'), invoiceId: inv.id, amount: inv.amount, method: input.firstPayment.method, paidAt: input.startDate < today ? input.startDate : today }]
        : d.payments
      return { ...d, tenants: [...d.tenants, tenant], leases: [...d.leases, lease], invoices: [...d.invoices, inv], payments }
    }),
    checkout: (leaseId, date, deduction, reason) => update((d) => {
      const lease = d.leases.find((l) => l.id === leaseId)
      return {
        ...d,
        leases: d.leases.map((l) => l.id === leaseId ? { ...l, endDate: date, depositStatus: deduction > 0 ? 'deducted' : 'refunded', deduction, deductionReason: reason || undefined } : l),
        tenants: d.tenants.map((t) => (lease && t.id === lease.tenantId ? { ...t, archivedAt: date } : t)),
      }
    }),
    addExpense: (e) => { const id = uid('exp'); update((d) => ({ ...d, expenses: [{ ...e, id }, ...d.expenses] })); return id },
    voidExpense: (id) => update((d) => ({ ...d, expenses: d.expenses.map((e) => (e.id === id ? { ...e, voidedAt: today } : e)) })),
    addBooking: (b) => {
      const conflict = findConflict(data.bookings, b)
      if (conflict) return { ok: false, conflict }
      const src = data.sources.find((s) => s.id === b.sourceId)
      const id = uid('bk')
      update((d) => ({ ...d, bookings: [...d.bookings, { ...b, id, commissionPct: src?.commissionPct ?? 0, status: 'booked' }] }))
      return { ok: true, id }
    },
    setBookingStatus: (id, status) => update((d) => ({ ...d, bookings: d.bookings.map((b) => (b.id === id ? { ...b, status } : b)) })),
    updateRoom: (id, patch) => update((d) => ({ ...d, rooms: d.rooms.map((r) => (r.id === id ? { ...r, ...patch } : r)) })),
    updateLease: (id, patch) => update((d) => ({ ...d, leases: d.leases.map((l) => (l.id === id ? { ...l, ...patch } : l)) })),
    updateSettings: (patch) => update((d) => ({ ...d, settings: { ...d.settings, ...patch } })),
    updateTenant: (id, patch) => update((d) => ({ ...d, tenants: d.tenants.map((t) => (t.id === id ? { ...t, ...patch } : t)) })),
    resetDemo: () => setData(withInvoices(makeSeed(today), today)),
  }), [data, today, ready, update])

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>
}

export function useStore(): Store {
  const s = useContext(Ctx)
  if (!s) throw new Error('useStore must be used inside StoreProvider')
  return s
}
