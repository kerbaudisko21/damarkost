import type { ISODate, Lang } from '../domain/types'

const pad = (n: number) => String(n).padStart(2, '0')

export function toISO(d: Date): ISODate {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function fromISO(s: ISODate): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function todayISO(): ISODate {
  return toISO(new Date())
}

export function addDays(s: ISODate, n: number): ISODate {
  const d = fromISO(s)
  d.setDate(d.getDate() + n)
  return toISO(d)
}

/** Selisih hari b - a (bilangan bulat, aman terhadap DST). */
export function diffDays(a: ISODate, b: ISODate): number {
  const da = fromISO(a), db = fromISO(b)
  return Math.round((Date.UTC(db.getFullYear(), db.getMonth(), db.getDate()) - Date.UTC(da.getFullYear(), da.getMonth(), da.getDate())) / 86400000)
}

export function daysInMonth(year: number, month0: number): number {
  return new Date(year, month0 + 1, 0).getDate()
}

export function periodOf(s: ISODate): string {
  return s.slice(0, 7)
}

/** Tanggal jatuh tempo di periode 'YYYY-MM' untuk tanggal-tagih tertentu (dibatasi akhir bulan). */
export function dueDateFor(period: string, day: number): ISODate {
  const [y, m] = period.split('-').map(Number)
  const last = daysInMonth(y, m - 1)
  return `${period}-${pad(Math.min(day, last))}`
}

const MONTHS: Record<Lang, string[]> = {
  id: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
}
const MONTHS_LONG: Record<Lang, string[]> = {
  id: ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
}
const WEEKDAYS: Record<Lang, string[]> = {
  id: ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'],
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
}
const WD_SHORT: Record<Lang, string[]> = {
  id: ['Mg', 'Sn', 'Sl', 'Rb', 'Km', 'Jm', 'Sb'],
  en: ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'],
}

/** '16 Nov' atau '16 Nov 2026' */
export function fmtDate(s: ISODate, lang: Lang, withYear = false): string {
  const d = fromISO(s)
  return `${d.getDate()} ${MONTHS[lang][d.getMonth()]}${withYear ? ' ' + d.getFullYear() : ''}`
}

export function fmtLongDay(s: ISODate, lang: Lang): string {
  const d = fromISO(s)
  return `${WEEKDAYS[lang][d.getDay()]}, ${d.getDate()} ${MONTHS[lang][d.getMonth()]} ${d.getFullYear()}`
}

export function monthName(period: string, lang: Lang): string {
  const m = Number(period.slice(5, 7)) - 1
  return `${MONTHS_LONG[lang][m]} ${period.slice(0, 4)}`
}

export function monthShort(period: string, lang: Lang): string {
  return MONTHS[lang][Number(period.slice(5, 7)) - 1]
}

export function weekdayShort(s: ISODate, lang: Lang): string {
  return WD_SHORT[lang][fromISO(s).getDay()]
}

export function addMonths(period: string, n: number): string {
  const [y, m] = period.split('-').map(Number)
  const d = new Date(y, m - 1 + n, 1)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
}
