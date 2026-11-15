import { describe, expect, it } from 'vitest'
import { ensureInvoices, firstInvoiceAmount, invoiceStatus, monthSummary, roomView } from './billing'
import { barPlacement, bookingNet, findConflict, nights, nightsInPeriod } from './homestay'
import { makeSeed, DEFAULT_SETTINGS } from '../data/seed'
import { addDays, dueDateFor } from '../lib/dates'
import { fillTemplate, parseRupiah, rp, rpShort } from '../lib/format'
import { waNumber } from '../lib/wa'
import type { Booking, Invoice, Lease } from './types'

const lease = (p: Partial<Lease> = {}): Lease => ({ id: 'l', tenantId: 't', roomId: 'r101', startDate: '2026-09-10', rent: 1500000, dueDay: 10, deposit: 1500000, depositStatus: 'held', ...p })

describe('format', () => {
  it('rupiah', () => {
    expect(rp(1250000)).toBe('Rp1.250.000')
    expect(rp(-5000)).toBe('−Rp5.000')
    expect(rpShort(5400000, 'id')).toBe('Rp5,4 jt')
    expect(rpShort(5400000, 'en')).toBe('Rp5.4M')
    expect(parseRupiah('Rp1.250.000')).toBe(1250000)
    expect(parseRupiah('abc')).toBe(0)
  })
  it('template & nomor WA', () => {
    expect(fillTemplate('Halo {nama}, kamar {kamar} {x}', { nama: 'Sinta', kamar: '201' })).toBe('Halo Sinta, kamar 201 {x}')
    expect(waNumber('0821-7788-1020')).toBe('6282177881020')
    expect(waNumber('+62 821 7788')).toBe('628217788')
  })
})

describe('tanggal jatuh tempo', () => {
  it('dibatasi akhir bulan (tgl 31 di Februari → 28)', () => {
    expect(dueDateFor('2026-02', 31)).toBe('2026-02-28')
    expect(dueDateFor('2028-02', 30)).toBe('2028-02-29')
    expect(dueDateFor('2026-11', 10)).toBe('2026-11-10')
  })
})

describe('tagihan', () => {
  it('ensureInvoices idempoten & melewati kamar harian', () => {
    const d = makeSeed('2026-11-16')
    d.invoices = []
    let n = 0
    const created = ensureInvoices(d, '2026-11-16', () => `x${n++}`)
    expect(created.length).toBe(7) // 7 sewa bulanan aktif
    d.invoices = created
    expect(ensureInvoices(d, '2026-11-16', () => 'y')).toHaveLength(0)
    d.rooms.find((r) => r.id === 'r101')!.rentMode = 'daily'
    d.invoices = []
    expect(ensureInvoices(d, '2026-11-16', () => 'z')).toHaveLength(6)
  })

  it('status: jatuh tempo, telat, sebagian, lunas, dan dibatalkan', () => {
    const inv: Invoice = { id: 'i', leaseId: 'l', period: '2026-11', dueDate: '2026-11-10', amount: 1500000 }
    const s = DEFAULT_SETTINGS
    expect(invoiceStatus(inv, [], '2026-11-08', s)).toMatchObject({ state: 'due', daysLeft: 2 })
    expect(invoiceStatus(inv, [], '2026-11-16', s)).toMatchObject({ state: 'late', daysLate: 6, remaining: 1500000 })
    const part = [{ id: 'p', invoiceId: 'i', amount: 500000, paidAt: '2026-11-05', method: 'cash' as const }]
    expect(invoiceStatus(inv, part, '2026-11-05', s)).toMatchObject({ state: 'partial', remaining: 1000000 })
    const full = [{ id: 'p', invoiceId: 'i', amount: 1500000, paidAt: '2026-11-09', method: 'transfer' as const }]
    expect(invoiceStatus(inv, full, '2026-11-16', s).state).toBe('paid')
    expect(invoiceStatus(inv, [{ ...full[0], voidedAt: '2026-11-16' }], '2026-11-16', s).state).toBe('late')
  })

  it('denda telat setelah masa tenggang', () => {
    const inv: Invoice = { id: 'i', leaseId: 'l', period: '2026-11', dueDate: '2026-11-10', amount: 1500000 }
    const s = { ...DEFAULT_SETTINGS, lateFeeEnabled: true, graceDays: 3, lateFeePerDay: 10000 }
    expect(invoiceStatus(inv, [], '2026-11-12', s).lateFee).toBe(0)
    expect(invoiceStatus(inv, [], '2026-11-16', s)).toMatchObject({ lateFee: 30000, total: 1530000 })
  })

  it('prorata hanya untuk mode serentak di bulan pertama', () => {
    const l = lease({ startDate: '2026-11-16', rent: 1500000 })
    expect(firstInvoiceAmount(l, DEFAULT_SETTINGS, '2026-11')).toBe(1500000)
    const fixed = { ...DEFAULT_SETTINGS, billingMode: 'fixed' as const, prorata: true }
    expect(firstInvoiceAmount(l, fixed, '2026-11')).toBe(750000) // 15 dari 30 hari
    expect(firstInvoiceAmount(l, fixed, '2026-12')).toBe(1500000)
  })
})

describe('homestay', () => {
  const b = (p: Partial<Booking>): Booking => ({ id: 'b', roomId: 'r103', guestName: 'A', guestPhone: '', guests: 1, checkIn: '2026-11-20', checkOut: '2026-11-23', rate: 250000, sourceId: 'direct', commissionPct: 0, paid: 'unpaid', dpAmount: 0, status: 'booked', ...p })

  it('malam, komisi, bersih', () => {
    expect(nights(b({}))).toBe(3)
    expect(bookingNet(b({ commissionPct: 15 }))).toBe(637500)
  })

  it('bentrok vs tidak bentrok (check-out = check-in tamu berikut aman)', () => {
    const existing = [b({ id: 'x' })]
    expect(findConflict(existing, { roomId: 'r103', checkIn: '2026-11-22', checkOut: '2026-11-24' })?.id).toBe('x')
    expect(findConflict(existing, { roomId: 'r103', checkIn: '2026-11-23', checkOut: '2026-11-25' })).toBeUndefined()
    expect(findConflict(existing, { roomId: 'r203', checkIn: '2026-11-21', checkOut: '2026-11-22' })).toBeUndefined()
    expect(findConflict([b({ id: 'x', status: 'cancelled' })], { roomId: 'r103', checkIn: '2026-11-21', checkOut: '2026-11-22' })).toBeUndefined()
  })

  it('malam per bulan untuk pesanan lintas bulan', () => {
    const cross = b({ checkIn: '2026-11-29', checkOut: '2026-12-02' })
    expect(nightsInPeriod(cross, '2026-11')).toBe(2)
    expect(nightsInPeriod(cross, '2026-12')).toBe(1)
  })

  it('posisi bar kalender', () => {
    expect(barPlacement(b({ checkIn: '2026-11-15', checkOut: '2026-11-17' }), '2026-11-16', 14)).toEqual({ col: 1, span: 1, clippedStart: true })
    expect(barPlacement(b({}), '2026-11-16', 14)).toEqual({ col: 5, span: 3, clippedStart: false })
    expect(barPlacement(b({ checkIn: '2026-12-10', checkOut: '2026-12-12' }), '2026-11-16', 14)).toBeNull()
  })
})

describe('pengingat', () => {
  it('telat, jatuh tempo ≤3 hari, check-out besok, penghuni keluar, perbaikan', async () => {
    const { computeReminders, badgeCount } = await import('./reminders')
    const today = '2026-11-16'
    const d = makeSeed(today)
    d.invoices.push(...ensureInvoices(d, today, () => Math.random().toString()))
    const rs = computeReminders(d, today)
    const kinds = rs.map((r) => r.kind)
    expect(kinds[0]).toBe('late')
    expect(rs.find((r) => r.kind === 'late')?.name).toBe('Sinta Maharani')
    expect(kinds).toContain('due') // Andi besok
    expect(kinds).toContain('checkout') // Dimas besok
    expect(kinds).toContain('leaving') // Maya ±14 hari
    expect(kinds).toContain('repair') // 203 selesai 2 hari lagi
    expect(rs.some((r) => r.name === 'Fajar Nugroho')).toBe(false) // jatuh tempo 4 hari lagi: belum diingatkan
    expect(badgeCount(rs)).toBe(rs.filter((r) => ['late', 'due', 'checkin', 'checkout'].includes(r.kind)).length)
  })
})

describe('data contoh', () => {
  it('kamar 103 homestay, 203 servis, ada yang telat & jatuh tempo', () => {
    const today = '2026-11-16'
    const d = makeSeed(today)
    d.invoices.push(...ensureInvoices(d, today, () => Math.random().toString()))
    const keys = Object.fromEntries(d.rooms.map((r) => [r.code, roomView(d, r, today).key]))
    expect(keys['103']).toBe('homestay')
    expect(keys['203']).toBe('repair')
    expect(keys['201']).toBe('late')
    expect(keys['101']).toBe('due')
    const sum = monthSummary(d, '2026-11', today)
    expect(sum.target).toBeGreaterThan(sum.collected)
    expect(sum.homestayNet).toBeGreaterThan(0)
    expect(addDays(today, 1)).toBe('2026-11-17')
  })
})
