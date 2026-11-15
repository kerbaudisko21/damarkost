import type { RoomView } from '../domain/billing'
import type { DictKey } from './i18n'

type T = (key: DictKey, vars?: Record<string, string | number>) => string

/** Teks chip status lengkap: 'Telat 6 hari', 'Jatuh tempo 1 hari lagi', 'Lunas', … */
export function roomChip(v: RoomView, t: T): string {
  switch (v.key) {
    case 'late': return t('state.lateDays', { n: v.status?.daysLate ?? 0 })
    case 'due': return v.status && v.status.daysLeft === 0 ? `${t('state.due')} · ${t('state.dueToday')}` : `${t('state.due')} · ${t('state.dueIn', { n: v.status?.daysLeft ?? 0 })}`
    default: return t(`state.${v.key}` as DictKey)
  }
}

/** Label pendek untuk jendela rumah ilustrasi. */
export function roomTag(v: RoomView, t: T, lang: 'id' | 'en'): string {
  switch (v.key) {
    case 'paid': return t('state.paid')
    case 'late': return t('state.late')
    case 'due': return lang === 'en' ? `${v.status?.daysLeft ?? 0}d` : `${v.status?.daysLeft ?? 0} hr`
    case 'empty': return t('state.empty')
    case 'repair': return t('tag.repair')
    case 'homestay': return t('tag.guest')
  }
}

export const STATE_DOT: Record<RoomView['key'], string> = {
  paid: 'var(--paid-dot)', due: 'var(--due-dot)', late: 'var(--late-dot)', empty: 'var(--empty-dot)', repair: 'var(--repair-dot)', homestay: 'var(--hs-dot)',
}
