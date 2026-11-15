import { useMemo, useState } from 'react'
import { useStore } from '../data/store'
import { usePrefs } from '../lib/prefs'
import { invoiceStatus } from '../domain/billing'
import { fmtDate, monthName, periodOf } from '../lib/dates'
import { initials, rp } from '../lib/format'
import { Choices } from '../components/ui'
import { useSheets } from '../components/sheets'
import { stagger } from '../components/Loading'

type Filter = 'unpaid' | 'paid' | 'all'

export default function BillsScreen() {
  const { t, lang } = usePrefs()
  const { data, today } = useStore()
  const open = useSheets()
  const [filter, setFilter] = useState<Filter>('unpaid')
  const period = periodOf(today)
  const rows = useMemo(() => data.invoices
    .filter((i) => i.period === period)
    .map((inv) => {
      const lease = data.leases.find((l) => l.id === inv.leaseId)!
      const tenant = data.tenants.find((x) => x.id === lease.tenantId)!
      const room = data.rooms.find((r) => r.id === lease.roomId)!
      return { inv, tenant, room, st: invoiceStatus(inv, data.payments, today, data.settings) }
    })
    .sort((a, b) => {
      const rank = { late: 0, partial: 1, due: 2, paid: 3 }
      return rank[a.st.state] - rank[b.st.state] || a.inv.dueDate.localeCompare(b.inv.dueDate)
    }), [data, period, today])
  const unpaid = rows.filter((r) => r.st.state !== 'paid'), paid = rows.filter((r) => r.st.state === 'paid')
  const shown = filter === 'unpaid' ? unpaid : filter === 'paid' ? paid : rows
  const collected = rows.reduce((a, r) => a + Math.min(r.st.paidSum, r.inv.amount), 0)
  const target = rows.reduce((a, r) => a + r.inv.amount, 0)
  const chipText = (r: (typeof rows)[number]) =>
    r.st.state === 'paid' ? t('state.paid') : r.st.state === 'late' ? t('state.lateDays', { n: r.st.daysLate }) : `${t('state.due')} · ${r.st.daysLeft === 0 ? t('state.dueToday') : t('state.dueIn', { n: r.st.daysLeft })}`

  return (
    <main className="screen">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h1 className="page-title">{t('bills.title')}</h1>
        <span className="chip archived" style={{ fontSize: 14, padding: '6px 12px' }}>{monthName(period, lang)}</span>
      </div>
      <div className="grid2">
        <div className="card" style={{ gap: 4, padding: 14 }}><span className="sub" style={{ fontWeight: 600 }}>{t('bills.in')}</span><span className="num" style={{ fontSize: 18, fontWeight: 800, color: 'var(--good)' }}>{rp(collected)}</span></div>
        <div className="card" style={{ gap: 4, padding: 14 }}><span className="sub" style={{ fontWeight: 600 }}>{t('bills.out')}</span><span className="num" style={{ fontSize: 18, fontWeight: 800, color: 'var(--bad)' }}>{rp(target - collected)}</span></div>
      </div>
      <Choices value={filter} onChange={setFilter} options={[
        { value: 'unpaid', label: t('bills.unpaid', { n: unpaid.length }) },
        { value: 'paid', label: t('bills.paid', { n: paid.length }) },
        { value: 'all', label: t('bills.all') },
      ]} />
      {shown.length === 0 && <div className="empty-note">{t('bills.none')}</div>}
      <div className="stack-lg">
        {shown.map((r, i) => (
          <div key={r.inv.id} className="card rise" style={{ ...stagger(i), padding: 14 }}>
            <div className="row">
              <span className="avatar round">{initials(r.tenant.name)}</span>
              <span className="stack grow"><span className="title">{r.tenant.name}</span><span className="sub">{t('bills.dueLine', { code: r.room.code, date: fmtDate(r.inv.dueDate, lang) })}</span></span>
              <span className="amount">{rp(r.st.state === 'paid' ? r.inv.amount : r.st.remaining)}</span>
            </div>
            <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <span className={'chip ' + r.st.state}>{chipText(r)}</span>
              {r.st.state === 'paid' ? (
                <button className="btn sm" onClick={() => open({ kind: 'wa', invoiceId: r.inv.id })}>{t('bills.receipt')}</button>
              ) : (
                <span className="row" style={{ gap: 8 }}>
                  <button className="btn wa sm" onClick={() => open({ kind: 'wa', invoiceId: r.inv.id })}>{t('bills.remind')}</button>
                  <button className="btn primary sm" onClick={() => open({ kind: 'pay', invoiceId: r.inv.id })}>{t('rooms.record')}</button>
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}
