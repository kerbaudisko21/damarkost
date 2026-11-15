import { useMemo, useState } from 'react'
import { Download } from 'lucide-react'
import { useStore } from '../data/store'
import { usePrefs } from '../lib/prefs'
import { collectedInPeriod, invoiceStatus, monthSummary } from '../domain/billing'
import type { ExpenseCategory } from '../domain/types'
import { addMonths, monthName, monthShort, periodOf } from '../lib/dates'
import { rp } from '../lib/format'
import { SubHeader } from '../components/ui'
import { stagger } from '../components/Loading'

export default function ReportScreen() {
  const { t, lang } = usePrefs()
  const { data, today } = useStore()
  const period = periodOf(today)
  const sum = useMemo(() => monthSummary(data, period, today), [data, period, today])
  const [hover, setHover] = useState<number | null>(null)
  const [table, setTable] = useState(false)
  const months = Array.from({ length: 6 }, (_, i) => addMonths(period, i - 5))
  const series = months.map((p) => ({ p, v: collectedInPeriod(data, p) }))
  const max = Math.max(1, ...series.map((s) => s.v), sum.target)
  const hi = hover ?? 4
  const cats = (['elec', 'water', 'wifi', 'clean', 'repair', 'other'] as ExpenseCategory[])
    .map((c) => ({ c, v: data.expenses.filter((e) => !e.voidedAt && e.category === c && periodOf(e.date) === period).reduce((a, e) => a + e.amount, 0) }))
    .filter((x) => x.v > 0).sort((a, b) => b.v - a.v)
  const catMax = Math.max(1, ...cats.map((c) => c.v))
  const monthlyRooms = data.rooms.filter((r) => r.rentMode !== 'daily')
  const occupied = monthlyRooms.filter((r) => data.leases.some((l) => l.roomId === r.id && !l.endDate)).length
  const invs = data.invoices.filter((i) => i.period === period).map((i) => invoiceStatus(i, data.payments, today, data.settings))
  const paidCount = invs.filter((s) => s.state === 'paid').length
  const depositHeld = data.leases.filter((l) => !l.endDate && l.depositStatus === 'held').reduce((a, l) => a + l.deposit, 0)

  const exportCsv = () => {
    const rows = [['Periode', 'Kamar', 'Penghuni', 'Tagihan', 'Dibayar', 'Status']]
    for (const inv of data.invoices.filter((i) => i.period === period)) {
      const l = data.leases.find((x) => x.id === inv.leaseId)!, tn = data.tenants.find((x) => x.id === l.tenantId)!, r = data.rooms.find((x) => x.id === l.roomId)!
      const st = invoiceStatus(inv, data.payments, today, data.settings)
      rows.push([inv.period, r.code, tn.name, String(inv.amount), String(st.paidSum), st.state])
    }
    rows.push([], ['Tanggal', 'Kategori', 'Keterangan', 'Nominal'])
    for (const e of data.expenses.filter((x) => !x.voidedAt && periodOf(x.date) === period)) rows.push([e.date, e.category, e.note, String(e.amount)])
    const csv = '﻿' + rows.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(';')).join('\n')
    const file = new File([csv], `damar-kost-${period}.csv`, { type: 'text/csv' })
    const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean }
    if (nav.canShare?.({ files: [file] })) { nav.share({ files: [file], title: file.name }).catch(() => undefined); return }
    const a = document.createElement('a')
    a.href = URL.createObjectURL(file); a.download = file.name; a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  }

  return (
    <main className="screen sub">
      <SubHeader title={t('rep.title')} />
      <section className="card" style={{ background: 'var(--hero)', color: '#fff', border: 0 }}>
        <span style={{ fontSize: 14, opacity: 0.9 }}>{t('rep.profit', { month: monthName(period, lang).split(' ')[0] })}</span>
        <span className="num" style={{ fontSize: 34, fontWeight: 800, letterSpacing: '-0.02em' }}>{rp(sum.profit)}</span>
        <div className="grid2">
          {[[t('more.income'), sum.collected], [t('more.homestay'), sum.homestayNet], [t('more.expenses'), -sum.expenses], [t('bills.out'), sum.outstanding]].map(([k, v]) => (
            <div key={String(k)} className="stack" style={{ padding: '10px 12px', borderRadius: 12, background: 'rgba(255,255,255,0.14)' }}><span style={{ fontSize: 12, opacity: 0.9 }}>{k}</span><span className="num" style={{ fontSize: 15, fontWeight: 800 }}>{rp(Number(v))}</span></div>
          ))}
        </div>
        <span style={{ fontSize: 12, opacity: 0.85 }}>{t('rep.deposit', { amount: rp(depositHeld) })}</span>
      </section>

      <section className="card">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h2>{t('rep.chart')}</h2>
          <button className="btn sm" style={{ height: 32 }} onClick={() => setTable(!table)}>{table ? t('rep.chartView') : t('rep.table')}</button>
        </div>
        {!table ? (
          <>
            <span className="title num">{monthName(series[hi].p, lang)} · {rp(series[hi].v)}</span>
            <div className="bars" onMouseLeave={() => setHover(null)}>
              {series.map((s, i) => (
                <button key={s.p} style={stagger(i)} aria-label={`${monthName(s.p, lang)}: ${rp(s.v)}`} onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} onClick={() => setHover(i)}>
                  <span style={{ height: Math.round((s.v / max) * 150), opacity: i === 5 ? 0.45 : hover === null || hover === i ? 1 : 0.6 }} />
                </button>
              ))}
            </div>
            <div className="bars-axis">{series.map((s) => <span key={s.p}>{monthShort(s.p, lang)}</span>)}</div>
            <span className="sub small">{t('rep.live')}</span>
          </>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead><tr><th style={{ textAlign: 'left', padding: '8px 0', color: 'var(--ink2)', fontSize: 12 }}>{t('rep.month')}</th><th style={{ textAlign: 'right', padding: '8px 0', color: 'var(--ink2)', fontSize: 12 }}>{t('more.income')}</th></tr></thead>
            <tbody>{series.map((s) => <tr key={s.p}><td style={{ padding: '8px 0', borderTop: '1px solid var(--line2)' }}>{monthName(s.p, lang)}</td><td className="num" style={{ padding: '8px 0', borderTop: '1px solid var(--line2)', textAlign: 'right', fontWeight: 700 }}>{rp(s.v)}</td></tr>)}</tbody>
          </table>
        )}
      </section>

      <section className="card">
        <h2>{t('rep.byCat')}</h2>
        {cats.length === 0 && <span className="sub">{t('exp.none')}</span>}
        {cats.map((c) => (
          <div key={c.c} className="stack" style={{ gap: 6 }}>
            <div className="kv"><span style={{ color: 'var(--ink)', fontWeight: 600 }}>{t(`cat.${c.c}`)}</span><span className="num">{rp(c.v)}</span></div>
            <div className="meter"><span style={{ width: `${Math.round((c.v / catMax) * 100)}%` }} /></div>
          </div>
        ))}
      </section>

      <div className="grid2">
        <div className="card" style={{ gap: 4, padding: 14 }}><span className="sub small" style={{ fontWeight: 600 }}>{t('rep.occ')}</span><span style={{ fontSize: 22, fontWeight: 800 }}>{Math.round((occupied / Math.max(1, monthlyRooms.length)) * 100)}%</span><span className="sub small">{t('rep.occNote', { n: occupied, total: monthlyRooms.length })}</span></div>
        <div className="card" style={{ gap: 4, padding: 14 }}><span className="sub small" style={{ fontWeight: 600 }}>{t('rep.onTime')}</span><span style={{ fontSize: 22, fontWeight: 800 }}>{paidCount} / {invs.length}</span><span className="sub small">{t('rep.onTimeNote', { n: invs.length - paidCount })}</span></div>
      </div>
      <button className="btn block" onClick={exportCsv}><Download size={18} />{t('rep.export')}</button>
    </main>
  )
}
