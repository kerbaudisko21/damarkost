import { useState, type ReactNode } from 'react'
import { Droplet, MoreHorizontal, Plus, Sparkles, Wifi, Wrench, Zap } from 'lucide-react'
import { useStore } from '../data/store'
import { usePrefs } from '../lib/prefs'
import type { ExpenseCategory } from '../domain/types'
import { addMonths, fmtDate, monthName, periodOf } from '../lib/dates'
import { rp } from '../lib/format'
import { Choices, SubHeader, useToast } from '../components/ui'
import { useSheets } from '../components/sheets'
import { stagger } from '../components/Loading'

export const CAT_ICON: Record<ExpenseCategory, ReactNode> = {
  elec: <Zap size={20} />, water: <Droplet size={20} />, wifi: <Wifi size={20} />, clean: <Sparkles size={20} />, repair: <Wrench size={20} />, other: <MoreHorizontal size={20} />,
}
const CAT_TONE: Record<ExpenseCategory, string> = { elec: 'due', water: 'empty', wifi: 'empty', clean: 'paid', repair: 'repair', other: 'archived' }

export default function ExpensesScreen() {
  const { t, lang } = usePrefs()
  const toast = useToast()
  const open = useSheets()
  const { data, today, voidExpense } = useStore()
  const [cat, setCat] = useState<'all' | ExpenseCategory>('all')
  const period = periodOf(today)
  const live = data.expenses.filter((e) => !e.voidedAt)
  const month = live.filter((e) => periodOf(e.date) === period)
  const prev = live.filter((e) => periodOf(e.date) === addMonths(period, -1)).reduce((a, e) => a + e.amount, 0)
  const list = live.filter((e) => cat === 'all' || e.category === cat).sort((a, b) => b.date.localeCompare(a.date))
  return (
    <main className="screen sub">
      <SubHeader title={t('exp.title')} action={<button className="icon-btn solid" aria-label={t('exp.add')} onClick={() => open({ kind: 'expense' })}><Plus size={20} /></button>} />
      <div className="card" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <span className="stack"><span className="sub" style={{ fontWeight: 600 }}>{t('exp.total', { month: monthName(period, lang).split(' ')[0] })}</span><span className="num" style={{ fontSize: 24, fontWeight: 800 }}>{rp(month.reduce((a, e) => a + e.amount, 0))}</span></span>
        <span className="stack" style={{ alignItems: 'flex-end' }}><span className="sub">{monthName(addMonths(period, -1), lang).split(' ')[0]}</span><span className="num" style={{ fontWeight: 700 }}>{rp(prev)}</span></span>
      </div>
      <Choices value={cat} onChange={setCat} options={(['all', 'elec', 'water', 'wifi', 'clean', 'repair', 'other'] as const).map((c) => ({ value: c, label: t(`cat.${c}`) }))} />
      {list.length === 0 && <div className="empty-note">{t('exp.none')}</div>}
      <div className="stack-lg">
        {list.map((e, i) => (
          <div key={e.id} className="row-btn rise" style={{ ...stagger(i), cursor: 'default' }}>
            <span className={'chip ' + CAT_TONE[e.category]} style={{ width: 42, height: 42, borderRadius: 12, padding: 0, justifyContent: 'center' }}>{CAT_ICON[e.category]}</span>
            <span className="stack grow"><span className="title">{t(`cat.${e.category}`)}</span><span className="sub">{e.note || '—'}</span><span className="sub small">{fmtDate(e.date, lang, true)}</span></span>
            <span className="stack" style={{ alignItems: 'flex-end' }}>
              <span className="amount">{rp(e.amount)}</span>
              <button className="link-btn" style={{ padding: '4px 0', fontSize: 12, color: 'var(--bad)' }} onClick={() => { voidExpense(e.id); toast(t('exp.voided')) }}>{t('exp.void')}</button>
            </span>
          </div>
        ))}
      </div>
    </main>
  )
}
