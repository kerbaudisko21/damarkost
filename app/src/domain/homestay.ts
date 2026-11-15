import type { Booking, ISODate } from './types'
import { addDays, diffDays, periodOf } from '../lib/dates'

export function nights(b: Pick<Booking, 'checkIn' | 'checkOut'>): number {
  return Math.max(0, diffDays(b.checkIn, b.checkOut))
}

export function bookingTotal(b: Pick<Booking, 'checkIn' | 'checkOut' | 'rate'>): number {
  return nights(b) * b.rate
}

export function bookingCommission(b: Pick<Booking, 'checkIn' | 'checkOut' | 'rate' | 'commissionPct'>): number {
  return Math.round((bookingTotal(b) * b.commissionPct) / 100)
}

export function bookingNet(b: Pick<Booking, 'checkIn' | 'checkOut' | 'rate' | 'commissionPct'>): number {
  return bookingTotal(b) - bookingCommission(b)
}

/** Dua rentang [checkIn, checkOut) bertabrakan? (check-out hari yang sama dengan check-in tamu lain = aman) */
export function rangesOverlap(aIn: ISODate, aOut: ISODate, bIn: ISODate, bOut: ISODate): boolean {
  return aIn < bOut && bIn < aOut
}

export function findConflict(
  bookings: Booking[],
  candidate: Pick<Booking, 'roomId' | 'checkIn' | 'checkOut'> & { id?: string },
): Booking | undefined {
  return bookings.find(
    (b) =>
      b.id !== candidate.id &&
      b.roomId === candidate.roomId &&
      b.status !== 'cancelled' &&
      rangesOverlap(b.checkIn, b.checkOut, candidate.checkIn, candidate.checkOut),
  )
}

/** Jumlah malam pesanan yang jatuh di periode 'YYYY-MM'. */
export function nightsInPeriod(b: Pick<Booking, 'checkIn' | 'checkOut'>, period: string): number {
  let n = 0
  for (let d = b.checkIn; d < b.checkOut; d = addDays(d, 1)) if (periodOf(d) === period) n++
  return n
}

/** Posisi bar di kalender (kolom 1-based, lebar dalam malam) untuk jendela [start, start+days). */
export function barPlacement(b: Pick<Booking, 'checkIn' | 'checkOut'>, start: ISODate, days: number): { col: number; span: number; clippedStart: boolean } | null {
  const end = addDays(start, days)
  if (!rangesOverlap(b.checkIn, b.checkOut, start, end)) return null
  const from = b.checkIn < start ? start : b.checkIn
  const to = b.checkOut > end ? end : b.checkOut
  return { col: diffDays(start, from) + 1, span: diffDays(from, to), clippedStart: b.checkIn < start }
}
