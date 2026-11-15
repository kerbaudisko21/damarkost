import type { Lang } from '../domain/types'

export function rp(n: number): string {
  const sign = n < 0 ? '−' : ''
  return sign + 'Rp' + Math.abs(Math.round(n)).toLocaleString('id-ID')
}

/** 'Rp5,4 jt' / 'Rp5.4M' */
export function rpShort(n: number, lang: Lang): string {
  if (Math.abs(n) < 1_000_000) return rp(n)
  const v = (n / 1_000_000).toFixed(1)
  return lang === 'en' ? `Rp${v}M` : `Rp${v.replace('.', ',')} jt`
}

/** Ambil angka dari input bebas: 'Rp1.250.000' → 1250000 */
export function parseRupiah(s: string): number {
  const n = parseInt(s.replace(/\D/g, ''), 10)
  return Number.isFinite(n) ? n : 0
}

export function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase()
}

/** ID unik (UUID, cocok dengan kolom uuid di Supabase). Prefix diabaikan, dipertahankan agar pemanggil lama tetap jalan. */
export function uid(_prefix = 'id'): string {
  void _prefix
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => { const r = (Math.random() * 16) | 0; return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16) })
}

/** Isi template: '{nama}' / '{name}' dst. */
export function fillTemplate(tpl: string, vars: Record<string, string>): string {
  return tpl.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? vars[k] : m))
}
