import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { MessageCircle, Phone, Wallet } from 'lucide-react'
import { useStore } from '../data/store'
import { usePrefs } from '../lib/prefs'
import { invoiceStatus, roomView } from '../domain/billing'
import { fmtDate, monthName } from '../lib/dates'
import { initials, parseRupiah, rp } from '../lib/format'
import { roomChip } from '../lib/labels'
import { waLink } from '../lib/wa'
import { Choices, Sheet, SubHeader, useToast } from '../components/ui'
import { useSheets } from '../components/sheets'

export default function ProfileScreen() {
  const { id } = useParams()
  const { t, lang } = usePrefs()
  const nav = useNavigate()
  const toast = useToast()
  const open = useSheets()
  const { data, today, checkout } = useStore()
  const tenant = data.tenants.find((x) => x.id === id)
  const lease = data.leases.filter((l) => l.tenantId === id).sort((a, b) => b.startDate.localeCompare(a.startDate))[0]
  const room = data.rooms.find((r) => r.id === lease?.roomId)
  const [co, setCo] = useState(false)
  const [coDate, setCoDate] = useState(today)
  const [mode, setMode] = useState<'full' | 'part'>('full')
  const [cut, setCut] = useState('')
  const [reason, setReason] = useState('')
  if (!tenant || !lease || !room) return <main className="screen sub"><SubHeader title={t('profile.title')} /></main>

  const v = !tenant.archivedAt ? roomView(data, room, today) : undefined
  const history = data.invoices
    .filter((i) => i.leaseId === lease.id)
    .sort((a, b) => b.period.localeCompare(a.period))
    .slice(0, 6)
    .map((inv) => ({ inv, st: invoiceStatus(inv, data.payments, today, data.settings) }))
  const onTime = history.filter((h) => h.st.lastPayment && h.st.lastPayment.paidAt <= h.inv.dueDate).length
  const owing = history.filter((h) => h.st.state !== 'paid').reduce((a, h) => a + h.st.remaining, 0)
  const current = history[0]

  const confirmCheckout = () => {
    checkout(lease.id, coDate, mode === 'part' ? parseRupiah(cut) : 0, reason)
    setCo(false)
    toast(t('checkout.done'))
    nav('/penghuni')
  }

  return (
    <main className="screen sub">
      <SubHeader title={t('profile.title')} back="/penghuni" />
      <div className="stack" style={{ alignItems: 'center', textAlign: 'center', gap: 8 }}>
        <span className="avatar round" style={{ width: 72, height: 72, fontSize: 24 }}>{initials(tenant.name)}</span>
        <span style={{ fontSize: 22, fontWeight: 800 }}>{tenant.name}</span>
        <span className="sub" style={{ fontSize: 14 }}>{t('common.room', { code: room.code })} · {t('common.floor', { n: room.floor })}{room.label ? ` · ${room.label}` : ''}</span>
        {v && <span className={'chip ' + v.key}>{roomChip(v, t)}</span>}
      </div>

      {!tenant.archivedAt && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
          <a className="btn wa" style={{ flexDirection: 'column', height: 'auto', padding: '12px 4px', fontSize: 13 }} href={waLink(tenant.phone, '')} target="_blank" rel="noopener"><MessageCircle size={20} />WhatsApp</a>
          <a className="btn" style={{ flexDirection: 'column', height: 'auto', padding: '12px 4px', fontSize: 13 }} href={`tel:${tenant.phone.replace(/\D/g, '')}`}><Phone size={20} />{t('profile.call')}</a>
          <button className="btn primary" style={{ flexDirection: 'column', height: 'auto', padding: '12px 4px', fontSize: 13 }} disabled={!current || current.st.state === 'paid'} onClick={() => current && open({ kind: 'pay', invoiceId: current.inv.id })}><Wallet size={20} />{t('rooms.record')}</button>
        </div>
      )}

      <section className="card">
        <h2>{t('profile.rent')}</h2>
        <div className="facts">
          <div className="fact"><span>{t('rooms.rentMonth')}</span><span>{rp(lease.rent)}</span></div>
          <div className="fact"><span>{t('rooms.dueDate')}</span><span>{t('rooms.everyDay', { n: lease.dueDay })}</span></div>
          <div className="fact"><span>{t('profile.movedIn')}</span><span>{fmtDate(lease.startDate, lang, true)}</span></div>
          <div className="fact"><span>{t('profile.depositHeld')}</span><span>{rp(lease.deposit)}</span></div>
        </div>
      </section>

      <section className="card">
        <h2>{t('profile.personal')}</h2>
        <div className="kv"><span>{t('tenant.phone')}</span><span>{tenant.phone}</span></div>
        <div className="kv"><span>{t('profile.job')}</span><span>{tenant.job || '—'}</span></div>
        <div className="kv"><span>{t('profile.hometown')}</span><span>{tenant.hometown || '—'}</span></div>
        <div className="kv"><span>{t('profile.emergency')}</span><span>{tenant.emergency || '—'}</span></div>
      </section>

      <section className="card" style={{ gap: 4 }}>
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 6 }}><h2>{t('profile.history')}</h2><span className="sub small" style={{ fontWeight: 600 }}>{onTime}/{history.length}</span></div>
        {history.map(({ inv, st }) => (
          <div key={inv.id} className="row" style={{ padding: '10px 0', borderTop: '1px solid var(--line2)' }}>
            <span className="stack grow">
              <span style={{ fontSize: 14, fontWeight: 700 }}>{monthName(inv.period, lang)}</span>
              <span className="sub small">{st.lastPayment ? t('profile.paidOn', { date: fmtDate(st.lastPayment.paidAt, lang), method: t(`method.${st.lastPayment.method}`) }) : t('profile.notPaid')}</span>
            </span>
            <span className={'chip ' + st.state}>{st.state === 'paid' ? t('state.paid') : st.state === 'late' ? t('state.lateDays', { n: st.daysLate }) : t('state.due')}</span>
          </div>
        ))}
      </section>

      {!tenant.archivedAt && <button className="btn danger block" onClick={() => setCo(true)}>{t('profile.checkout')}</button>}

      <Sheet open={co} onClose={() => setCo(false)} label={t('checkout.title', { name: tenant.name.split(' ')[0] })}>
        <div className="stack"><h2>{t('checkout.title', { name: tenant.name.split(' ')[0] })}</h2><span className="sub">{t('checkout.sub', { code: room.code })}</span></div>
        <label className="field">{t('checkout.date')}<input type="date" value={coDate} onChange={(e) => setCoDate(e.target.value)} /></label>
        <div className="stack-lg">
          <span className="field">{t('tenant.deposit')} {rp(lease.deposit)}</span>
          <Choices value={mode} onChange={setMode} options={[{ value: 'full', label: t('checkout.full') }, { value: 'part', label: t('checkout.part') }]} />
        </div>
        {mode === 'part' && (
          <div className="grid2">
            <label className="field">{t('checkout.cut')}<input inputMode="numeric" placeholder="Rp0" value={cut} onChange={(e) => setCut(parseRupiah(e.target.value) ? rp(parseRupiah(e.target.value)) : '')} /></label>
            <label className="field">{t('checkout.reason')}<input value={reason} onChange={(e) => setReason(e.target.value)} /></label>
          </div>
        )}
        {owing > 0 && <div className="hint warn">{t('checkout.owing', { amount: rp(owing) })}</div>}
        <button className="btn block" style={{ background: 'var(--bad)', borderColor: 'var(--bad)', color: '#fff' }} onClick={confirmCheckout}>{t('checkout.confirm')}</button>
      </Sheet>
    </main>
  )
}
