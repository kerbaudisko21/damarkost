import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { get, set } from 'idb-keyval'
import type { AppData, Booking, Expense, Lease, Payment, PayMethod, Room, Settings, Tenant } from '../domain/types'
import { ensureInvoices, firstInvoice } from '../domain/billing'
import { findConflict } from '../domain/homestay'
import { makeSeed } from './seed'
import { todayISO } from '../lib/dates'
import { uid } from '../lib/format'
import { supabase } from '../lib/supabase'
import {
  bootstrapIfEmpty, fromBooking, fromExpense, fromInvoice, fromLease, fromPayment, fromRoom, fromSettings, fromTenant,
  loadAll, saveLocalPin, SchemaMissingError,
} from './remote'

/**
 * Dua mode penyimpanan:
 * - demo  : tanpa Supabase (.env kosong) → data contoh di IndexedDB perangkat.
 * - cloud : pemilik sudah login → data dimuat dari Supabase; setiap perubahan langsung tampil
 *           lalu disimpan ke Supabase. Bila gagal, muncul pesan & data dimuat ulang dari server.
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

export type LoadState = 'loading' | 'ready' | 'schema-missing' | 'error'

interface Store {
  data: AppData
  today: string
  ready: boolean
  mode: 'demo' | 'cloud'
  loadState: LoadState
  loadError: string | null
  syncError: string | null
  clearSyncError: () => void
  reload: () => void
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

type Res = PromiseLike<{ error: { message: string } | null }>

export function StoreProvider({ children, cloud, ownerName }: { children: ReactNode; cloud: boolean; ownerName?: string }) {
  const today = todayISO()
  const sb = cloud ? supabase : null
  const [data, setData] = useState<AppData>(() => makeSeed(today))
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [loadError, setLoadError] = useState<string | null>(null)
  const [syncError, setSyncError] = useState<string | null>(null)
  const loaded = useRef(false)
  const [reloadKey, setReloadKey] = useState(0)

  // ---------- muat ----------
  useEffect(() => {
    let alive = true
    loaded.current = false
    if (!sb) {
      get<AppData>(KEY)
        .then((saved) => alive && setData(withInvoices(saved && saved.version === 1 ? saved : makeSeed(today), today)))
        .catch(() => alive && setData(withInvoices(makeSeed(today), today)))
        .finally(() => { if (alive) { loaded.current = true; setLoadState('ready') } })
      return () => { alive = false }
    }
    ;(async () => {
      try {
        let d = await loadAll(sb)
        if (await bootstrapIfEmpty(sb, d, ownerName ?? '')) d = await loadAll(sb)
        // Tagihan bulan berjalan (cadangan bila cron belum jalan). Unik per (sewa, periode) → aman dari dobel.
        const created = ensureInvoices(d, today, () => uid('inv'))
        if (created.length) {
          const { error } = await sb.from('invoice').upsert(created.map(fromInvoice), { onConflict: 'lease_id,period', ignoreDuplicates: true })
          if (!error) d = await loadAll(sb)
        }
        if (alive) { setData(d); loaded.current = true; setLoadState('ready') }
      } catch (e) {
        if (!alive) return
        setLoadError((e as Error).message)
        setLoadState(e instanceof SchemaMissingError ? 'schema-missing' : 'error')
      }
    })()
    return () => { alive = false }
  }, [sb, today, ownerName, reloadKey])

  // demo: simpan ke perangkat
  useEffect(() => {
    if (sb || !loaded.current) return
    const t = setTimeout(() => { set(KEY, data).catch(() => undefined) }, 250)
    return () => clearTimeout(t)
  }, [data, sb])

  const reload = useCallback(() => setReloadKey((k) => k + 1), [])
  const clearSyncError = useCallback(() => setSyncError(null), [])

  /** Jalankan penulisan ke Supabase berurutan; bila ada yang gagal → tampilkan pesan & muat ulang. */
  const persist = useCallback((...ops: (() => Res)[]) => {
    if (!sb) return
    ;(async () => {
      for (const op of ops) {
        const { error } = await op()
        if (error) { setSyncError(error.message); reload(); return }
      }
    })()
  }, [sb, reload])

  const update = useCallback((fn: (d: AppData) => AppData) => setData((d) => (sb ? fn(d) : withInvoices(fn(d), today))), [sb, today])

  // Pengaturan diketik per huruf → simpan ke server setelah jeda singkat.
  const settingsTimer = useRef<number | undefined>(undefined)
  const pendingSettings = useRef<Partial<Settings>>({})

  const store = useMemo<Store>(() => ({
    data, today,
    ready: loadState === 'ready',
    mode: sb ? 'cloud' : 'demo',
    loadState, loadError, syncError,
    clearSyncError,
    reload,

    recordPayment: (invoiceId, amount, method) => {
      const p: Payment = { id: uid('pay'), invoiceId, amount, method, paidAt: today }
      update((d) => ({ ...d, payments: [...d.payments, p] }))
      persist(() => sb!.from('payment').insert(fromPayment(p)))
      return p.id
    },
    voidPayment: (paymentId) => {
      update((d) => ({ ...d, payments: d.payments.map((p) => (p.id === paymentId ? { ...p, voidedAt: today } : p)) }))
      persist(() => sb!.from('payment').update({ voided_at: new Date().toISOString() }).eq('id', paymentId))
    },
    addTenant: (input) => {
      const tenant: Tenant = { id: uid('t'), name: input.name.trim(), phone: input.phone.trim(), job: input.job, hometown: input.hometown, emergency: input.emergency }
      const lease: Lease = {
        id: uid('l'), tenantId: tenant.id, roomId: input.roomId, startDate: input.startDate, rent: input.rent,
        dueDay: Number(input.startDate.slice(8, 10)), deposit: input.deposit, depositStatus: 'held',
      }
      // Tagihan bulan pertama langsung dibuat (jatuh tempo = tanggal masuk); bila sudah bayar, langsung lunas.
      const inv = firstInvoice(lease, data.settings, () => uid('inv'))
      const pay: Payment | null = input.firstPayment
        ? { id: uid('pay'), invoiceId: inv.id, amount: inv.amount, method: input.firstPayment.method, paidAt: input.startDate < today ? input.startDate : today }
        : null
      update((d) => ({ ...d, tenants: [...d.tenants, tenant], leases: [...d.leases, lease], invoices: [...d.invoices, inv], payments: pay ? [...d.payments, pay] : d.payments }))
      persist(
        () => sb!.from('tenant').insert(fromTenant(tenant)),
        () => sb!.from('lease').insert(fromLease(lease)),
        () => sb!.from('invoice').insert(fromInvoice(inv)),
        ...(pay ? [() => sb!.from('payment').insert(fromPayment(pay))] : []),
      )
    },
    checkout: (leaseId, date, deduction, reason) => {
      const lease = data.leases.find((l) => l.id === leaseId)
      const patch: Partial<Lease> = { endDate: date, depositStatus: deduction > 0 ? 'deducted' : 'refunded', deduction, deductionReason: reason || undefined }
      update((d) => ({
        ...d,
        leases: d.leases.map((l) => (l.id === leaseId ? { ...l, ...patch } : l)),
        tenants: d.tenants.map((t) => (lease && t.id === lease.tenantId ? { ...t, archivedAt: date } : t)),
      }))
      persist(
        () => sb!.from('lease').update(fromLease(patch)).eq('id', leaseId),
        ...(lease ? [() => sb!.from('tenant').update({ archived_at: date }).eq('id', lease.tenantId)] : []),
      )
    },
    addExpense: (e) => {
      const exp: Expense = { ...e, id: uid('exp') }
      update((d) => ({ ...d, expenses: [exp, ...d.expenses] }))
      persist(() => sb!.from('expense').insert(fromExpense(exp)))
      return exp.id
    },
    voidExpense: (id) => {
      update((d) => ({ ...d, expenses: d.expenses.map((e) => (e.id === id ? { ...e, voidedAt: today } : e)) }))
      persist(() => sb!.from('expense').update({ voided_at: new Date().toISOString() }).eq('id', id))
    },
    addBooking: (b) => {
      const conflict = findConflict(data.bookings, b)
      if (conflict) return { ok: false, conflict }
      const src = data.sources.find((s) => s.id === b.sourceId)
      const booking: Booking = { ...b, id: uid('bk'), commissionPct: src?.commissionPct ?? 0, status: 'booked' }
      update((d) => ({ ...d, bookings: [...d.bookings, booking] }))
      persist(() => sb!.from('booking').insert(fromBooking(booking)))
      return { ok: true, id: booking.id }
    },
    setBookingStatus: (id, status) => {
      update((d) => ({ ...d, bookings: d.bookings.map((b) => (b.id === id ? { ...b, status } : b)) }))
      persist(() => sb!.from('booking').update({ status }).eq('id', id))
    },
    updateRoom: (id, patch) => {
      update((d) => ({ ...d, rooms: d.rooms.map((r) => (r.id === id ? { ...r, ...patch } : r)) }))
      persist(() => sb!.from('room').update(fromRoom(patch)).eq('id', id))
    },
    updateLease: (id, patch) => {
      update((d) => ({ ...d, leases: d.leases.map((l) => (l.id === id ? { ...l, ...patch } : l)) }))
      persist(() => sb!.from('lease').update(fromLease(patch)).eq('id', id))
    },
    updateSettings: (patch) => {
      update((d) => ({ ...d, settings: { ...d.settings, ...patch } }))
      if (!sb) return
      const { pinEnabled, pinHash, ...rest } = patch
      if ('pinEnabled' in patch || 'pinHash' in patch) saveLocalPin({ pinEnabled: pinEnabled ?? data.settings.pinEnabled, pinHash: 'pinHash' in patch ? pinHash : data.settings.pinHash })
      if (!Object.keys(fromSettings(rest)).length) return
      pendingSettings.current = { ...pendingSettings.current, ...rest }
      window.clearTimeout(settingsTimer.current)
      settingsTimer.current = window.setTimeout(() => {
        const body = fromSettings(pendingSettings.current)
        pendingSettings.current = {}
        persist(() => sb.from('property').update(body).not('owner_id', 'is', null))
      }, 500)
    },
    updateTenant: (id, patch) => {
      update((d) => ({ ...d, tenants: d.tenants.map((t) => (t.id === id ? { ...t, ...patch } : t)) }))
      persist(() => sb!.from('tenant').update(fromTenant(patch)).eq('id', id))
    },
    resetDemo: () => { if (!sb) setData(withInvoices(makeSeed(today), today)) },
  }), [data, today, loadState, loadError, syncError, sb, reload, clearSyncError, persist, update])

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>
}

export function useStore(): Store {
  const s = useContext(Ctx)
  if (!s) throw new Error('useStore must be used inside StoreProvider')
  return s
}
