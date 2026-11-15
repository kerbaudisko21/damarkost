import type { AppData, Booking, Expense, Invoice, Lease, Payment, Room, Settings, Tenant } from '../domain/types'
import { addDays, addMonths, dueDateFor, fromISO, periodOf, todayISO } from '../lib/dates'

export const DEFAULT_TEMPLATES: Settings['templates'] = {
  reminder: {
    id: 'Halo Kak {nama}, semoga sehat selalu.\nMengingatkan sewa Kamar {kamar} bulan {bulan} sebesar {nominal}, jatuh tempo {jatuh_tempo}.\nTransfer ke {rekening}. Terima kasih!\n— {kos}',
    en: 'Hi {nama}, hope you are well.\nJust a reminder: rent for Room {kamar} for {bulan} is {nominal}, due {jatuh_tempo}.\nPlease transfer to {rekening}. Thank you!\n— {kos}',
  },
  receipt: {
    id: 'Halo Kak {nama}, terima kasih.\nPembayaran sewa Kamar {kamar} bulan {bulan} sebesar {nominal} sudah kami terima pada {tanggal_bayar}.\n— {kos}',
    en: 'Hi {nama}, thank you.\nWe have received your rent for Room {kamar} for {bulan}: {nominal}, on {tanggal_bayar}.\n— {kos}',
  },
}

export const DEFAULT_SETTINGS: Settings = {
  propertyName: 'Damar Kost',
  ownerName: 'Bu Ratna',
  bankAccount: '[BANK & NO. REKENING] a.n. [NAMA PEMILIK]',
  billingMode: 'entry',
  fixedDay: 1,
  prorata: true,
  lateFeeEnabled: false,
  graceDays: 3,
  lateFeePerDay: 10000,
  checkInTime: '14.00',
  checkOutTime: '12.00',
  requireGuestKtp: false,
  pinEnabled: false,
  templates: DEFAULT_TEMPLATES,
}

/** Data contoh 9 kamar, dibuat relatif terhadap hari ini supaya demo selalu "hidup". */
export function makeSeed(today = todayISO()): AppData {
  const day = fromISO(today).getDate()
  const clampDay = (n: number) => Math.min(28, Math.max(1, n))
  const rooms: Room[] = [
    ['101', 1, 'standard'], ['102', 1, 'standard'], ['103', 1, 'standard'], ['104', 1, 'standard'],
    ['201', 2, 'ac'], ['202', 2, 'ac'], ['203', 2, 'ac'], ['204', 2, 'ac'], ['205', 2, 'ac'],
  ].map(([code, floor]) => ({
    id: `r${code}`, code: code as string, floor: floor as number,
    basePrice: 1500000, nightlyPrice: 300000,
    rentMode: code === '103' ? 'both' : code === '203' ? 'daily' : 'monthly',
  }))
  const r203 = rooms.find((r) => r.code === '203')!
  r203.repairUntil = addDays(today, 2)
  r203.repairNote = 'Servis AC'

  const T = (id: string, name: string, phone: string, job: string, hometown: string, emergency: string): Tenant => ({ id, name, phone, job, hometown, emergency })
  const tenants: Tenant[] = [
    T('t1', 'Andi Pratama', '0812-3456-7810', 'Karyawan swasta', 'Klaten', 'Kakak · 0813-1100-2233'),
    T('t2', 'Rina Kurnia', '0813-2211-4590', 'Mahasiswi', 'Pati', 'Ibu · 0812-7766-5544'),
    T('t3', 'Dewi Lestari', '0857-9012-3344', 'Perawat', 'Magelang', ''),
    T('t4', 'Sinta Maharani', '0821-7788-1020', 'Mahasiswi', 'Semarang', 'Ibu · 0812-4400-1122'),
    T('t5', 'Budi Santoso', '0812-6655-2299', 'Wiraswasta', 'Solo', 'Istri · 0857-2200-3344'),
    T('t6', 'Fajar Nugroho', '0896-1234-0087', 'Mahasiswa', 'Purwokerto', ''),
    T('t7', 'Maya Putri', '0838-4455-6677', 'Guru', 'Kudus', 'Ayah · 0812-9900-8877'),
    { id: 't8', name: 'Yoga Saputra', phone: '0815-3322-1100', job: 'Karyawan swasta', hometown: 'Boyolali', archivedAt: addDays(today, -20) },
  ]
  const L = (id: string, tenantId: string, room: string, monthsAgo: number, dueDay: number, extra: Partial<Lease> = {}): Lease => {
    const r = rooms.find((x) => x.code === room)!
    const start = dueDateFor(addMonths(periodOf(today), -monthsAgo), dueDay)
    return { id, tenantId, roomId: r.id, startDate: start, rent: r.basePrice, dueDay, deposit: r.basePrice, depositStatus: 'held', ...extra }
  }
  const lateDay = clampDay(day - 6), soonDay = clampDay(day + 1), laterDay = clampDay(day + 4)
  const leases: Lease[] = [
    L('l1', 't1', '101', 20, soonDay),
    L('l2', 't2', '102', 27, clampDay(day - 11)),
    L('l3', 't3', '104', 10, clampDay(day - 4)),
    L('l4', 't4', '201', 14, lateDay),
    L('l5', 't5', '202', 21, 1),
    L('l6', 't6', '204', 5, laterDay),
    L('l7', 't7', '205', 23, clampDay(day - 13), { plannedEnd: addDays(today, 14) }),
    L('l8', 't8', '103', 8, 1, { endDate: addDays(today, -20), depositStatus: 'refunded' }),
  ]

  const invoices: Invoice[] = []
  const payments: Payment[] = []
  const methods: Payment['method'][] = ['transfer', 'transfer', 'qris', 'cash']
  for (let m = 5; m >= 0; m--) {
    const period = addMonths(periodOf(today), -m)
    for (const l of leases) {
      const pStart = `${period}-01`
      if (l.startDate > dueDateFor(period, 28) || (l.endDate && l.endDate <= pStart)) continue
      const inv: Invoice = { id: `i_${l.id}_${period}`, leaseId: l.id, period, dueDate: dueDateFor(period, l.dueDay), amount: l.rent }
      invoices.push(inv)
      const unpaidNow = m === 0 && ['l1', 'l4', 'l6'].includes(l.id)
      if (!unpaidNow && inv.dueDate <= today) {
        const lateBy = l.id === 'l4' && m === 3 ? 2 : 0
        payments.push({ id: `p_${inv.id}`, invoiceId: inv.id, amount: inv.amount, paidAt: addDays(inv.dueDate, lateBy - 1), method: methods[(m + Number(l.id.slice(1))) % 4] })
      }
    }
  }

  const E = (d: number, category: Expense['category'], amount: number, note: string): Expense => ({ id: `e${d}${category}`, date: addDays(today, -d), category, amount, note })
  const expenses: Expense[] = [
    E(7, 'water', 220000, 'PDAM bulan lalu'),
    E(10, 'elec', 850000, 'Listrik bersama (lorong, pompa air)'),
    E(12, 'clean', 300000, 'Upah petugas kebersihan'),
    E(14, 'wifi', 350000, 'Langganan internet'),
  ]

  const sources = [
    { id: 'direct', name: 'Langsung/WA', commissionPct: 0, color: '#6E8450' },
    { id: 'walkin', name: 'Walk-in', commissionPct: 0, color: '#9A7149' },
    { id: 'airbnb', name: 'Airbnb', commissionPct: 3, color: '#D9534F' },
    { id: 'traveloka', name: 'Traveloka', commissionPct: 15, color: '#2B7BC0' },
    { id: 'booking', name: 'Booking.com', commissionPct: 15, color: '#24427D' },
  ]
  const B = (id: string, room: string, guestName: string, guestPhone: string, guests: number, inOff: number, outOff: number, sourceId: string, paid: Booking['paid'], status: Booking['status']): Booking => {
    const r = rooms.find((x) => x.code === room)!
    const src = sources.find((s) => s.id === sourceId)!
    return { id, roomId: r.id, guestName, guestPhone, guests, checkIn: addDays(today, inOff), checkOut: addDays(today, outOff), rate: r.nightlyPrice, sourceId, commissionPct: src.commissionPct, paid, dpAmount: paid === 'dp' ? r.nightlyPrice : 0, status }
  }
  const bookings: Booking[] = [
    B('b1', '103', 'Dimas Saputra', '0813-5566-7788', 2, -1, 1, 'traveloka', 'paid', 'in'),
    B('b2', '203', 'Laras Wibowo', '0857-1122-3344', 1, 3, 5, 'airbnb', 'paid', 'booked'),
    B('b3', '203', 'Keluarga Hendra', '0812-9988-7766', 3, 5, 8, 'direct', 'dp', 'booked'),
    B('b4', '203', 'Arif Nugraha', '0896-4455-1122', 2, 8, 10, 'booking', 'unpaid', 'booked'),
  ]

  return { version: 1, rooms, tenants, leases, invoices, payments, expenses, sources, bookings, settings: { ...DEFAULT_SETTINGS } }
}
