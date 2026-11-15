export type RentMode = 'monthly' | 'daily' | 'both'
export type PayMethod = 'cash' | 'transfer' | 'qris'
export type Lang = 'id' | 'en'
export type Theme = 'light' | 'dark'

/** Tanggal disimpan sebagai string ISO lokal 'YYYY-MM-DD'. Uang dalam Rupiah (bilangan bulat). */
export type ISODate = string

export interface Room {
  id: string
  code: string
  floor: number
  /** Keterangan bebas, mis. 'Kamar mandi dalam' (opsional). Semua kamar ber-AC. */
  label?: string
  basePrice: number
  nightlyPrice: number
  rentMode: RentMode
  repairUntil?: ISODate
  repairNote?: string
}

export interface Tenant {
  id: string
  name: string
  phone: string
  job?: string
  hometown?: string
  emergency?: string
  archivedAt?: ISODate
}

export interface Lease {
  id: string
  tenantId: string
  roomId: string
  startDate: ISODate
  endDate?: ISODate
  plannedEnd?: ISODate
  rent: number
  dueDay: number
  deposit: number
  depositStatus: 'held' | 'refunded' | 'deducted'
  deduction?: number
  deductionReason?: string
}

export interface Invoice {
  id: string
  leaseId: string
  period: string // 'YYYY-MM'
  dueDate: ISODate
  amount: number
}

export interface Payment {
  id: string
  invoiceId: string
  amount: number
  paidAt: ISODate
  method: PayMethod
  voidedAt?: ISODate
}

export type ExpenseCategory = 'elec' | 'water' | 'wifi' | 'clean' | 'repair' | 'other'

export interface Expense {
  id: string
  date: ISODate
  category: ExpenseCategory
  amount: number
  note: string
  voidedAt?: ISODate
}

export interface BookingSource {
  id: string
  name: string
  commissionPct: number
  color: string
}

export type BookingStatus = 'booked' | 'in' | 'out' | 'cancelled'

export interface Booking {
  id: string
  roomId: string
  guestName: string
  guestPhone: string
  guests: number
  checkIn: ISODate
  checkOut: ISODate // eksklusif (hari keluar)
  rate: number
  sourceId: string
  commissionPct: number
  paid: 'unpaid' | 'dp' | 'paid'
  dpAmount: number
  status: BookingStatus
}

export interface Settings {
  propertyName: string
  ownerName: string
  bankAccount: string
  billingMode: 'entry' | 'fixed'
  fixedDay: number
  prorata: boolean
  lateFeeEnabled: boolean
  graceDays: number
  lateFeePerDay: number
  checkInTime: string
  checkOutTime: string
  requireGuestKtp: boolean
  pinEnabled: boolean
  pinHash?: string
  templates: { reminder: Record<Lang, string>; receipt: Record<Lang, string> }
}

export interface AppData {
  version: 1
  rooms: Room[]
  tenants: Tenant[]
  leases: Lease[]
  invoices: Invoice[]
  payments: Payment[]
  expenses: Expense[]
  sources: BookingSource[]
  bookings: Booking[]
  settings: Settings
}
