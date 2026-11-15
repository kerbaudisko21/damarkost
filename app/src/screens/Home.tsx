import { useMemo, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { DoorOpen, LogOut, Wallet, Wrench } from 'lucide-react'
import { useStore } from '../data/store'
import { usePrefs } from '../lib/prefs'
import { monthSummary } from '../domain/billing'
import { fmtDate, fmtLongDay, periodOf } from '../lib/dates'
import { initials, rp, rpShort } from '../lib/format'
import { roomChip } from '../lib/labels'
import { House, Legend } from '../components/House'
import { LeafDeco, Logo } from '../components/Logo'
import { useRoomViews, useSheets } from '../components/sheets'
import { InstallCard } from '../components/install'
import { stagger } from '../components/Loading'
import { BellButton } from '../components/Reminders'


export default function HomeScreen() {
  const { t, lang } = usePrefs()
  const { data, today } = useStore()
  const open = useSheets()
  const views = useRoomViews()
  const sum = useMemo(() => monthSummary(data, periodOf(today), today), [data, today])
  const unpaid = views.filter((v) => v.key === 'late' || v.key === 'due').sort((a, b) => (a.key === 'late' ? -1 : 1) - (b.key === 'late' ? -1 : 1))
  const guests = views.filter((v) => v.key === 'homestay').length

  const alerts = useMemo(() => {
    const out: { icon: ReactNode; tone: string; title: string; sub: string }[] = []
    for (const l of data.leases) {
      if (!l.plannedEnd || l.endDate) continue
      const tn = data.tenants.find((x) => x.id === l.tenantId), r = data.rooms.find((x) => x.id === l.roomId)
      if (tn && r) out.push({ icon: <LogOut size={20} />, tone: 'due', title: t('home.leaving', { name: tn.name.split(' ')[0], date: fmtDate(l.plannedEnd, lang) }), sub: t('home.leavingSub', { code: r.code }) })
    }
    for (const v of views) {
      if (v.key === 'repair') out.push({ icon: <Wrench size={20} />, tone: 'repair', title: t('home.repair', { code: v.room.code, note: (v.room.repairNote ?? '').toLowerCase() }), sub: t('home.repairSub', { date: fmtDate(v.room.repairUntil!, lang) }) })
      if (v.key === 'empty') out.push({ icon: <DoorOpen size={20} />, tone: 'empty', title: t('home.vacant', { code: v.room.code }), sub: t('home.vacantSub') })
    }
    return out
  }, [data, views, t, lang])

  return (
    <main className="screen">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <Logo />
        <BellButton />
      </div>
      <div className="stack">
        <span className="sub" style={{ fontWeight: 600 }}>{fmtLongDay(today, lang)}</span>
        <span style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.01em' }}>{data.settings.ownerName ? t('home.hello', { name: data.settings.ownerName }) : t('home.helloPlain')}</span>
      </div>

      <InstallCard dismissible />

      <section className="card sky" style={{ padding: '16px 12px 14px' }}>
        <LeafDeco />
        <div className="row" style={{ justifyContent: 'space-between', padding: '0 6px', position: 'relative' }}>
          <span className="section-title">{t('home.house')}</span><span className="sub small" style={{ fontWeight: 600 }}>{t('home.tapRoom')}</span>
        </div>
        <House views={views} onOpen={(roomId) => open({ kind: 'room', roomId })} />
        <Legend keys={['paid', 'due', 'late', 'homestay', 'empty', 'repair']} />
      </section>

      <div className="pills">
        <Link to="/tagihan" className="pill hero"><span className="pill-ic"><Wallet size={18} /></span>{t('home.incomePill', { amount: rpShort(sum.collected, lang), pct: sum.pct })}</Link>
        {unpaid.length > 0 && <Link to="/tagihan" className="pill late">{t('home.unpaidPill', { n: unpaid.length })}</Link>}
        {guests > 0 && <Link to="/homestay" className="pill hs">{t('home.guestPill', { n: guests })}</Link>}
      </div>

      <section className="card soft" style={{ padding: '16px 14px' }}>
        <div className="row" style={{ justifyContent: 'space-between', padding: '0 4px' }}>
          <h2>{t('home.toCollect')}</h2>
          <Link to="/tagihan" className="link-btn">{t('common.seeAll')}</Link>
        </div>
        {unpaid.length === 0 && <div className="card" style={{ border: 0, color: 'var(--good)', fontWeight: 700 }}>{t('home.allPaid')}</div>}
        {unpaid.map((v, i) => (
          <div key={v.room.id} className="row rise" style={{ ...stagger(i), padding: '10px 10px 10px 12px', borderRadius: 20, background: 'var(--surface)' }}>
            <button className="row grow" style={{ border: 0, background: 'none', padding: 0, textAlign: 'left' }} onClick={() => v.invoice && open({ kind: 'pay', invoiceId: v.invoice.id })}>
              <span className="avatar">{initials(v.tenantName ?? '')}</span>
              <span className="stack grow">
                <span className="title">{v.tenantName?.split(' ')[0]} <span className="muted" style={{ fontWeight: 600 }}>· {t('common.room', { code: v.room.code })}</span></span>
                <span className="row" style={{ gap: 8 }}><span className={'chip ' + v.key}>{roomChip(v, t)}</span><span className="sub num" style={{ fontWeight: 700 }}>{rp(v.status?.remaining ?? 0)}</span></span>
              </span>
            </button>
            <button className="btn primary sm" style={{ borderRadius: 999 }} onClick={() => v.invoice && open({ kind: 'wa', invoiceId: v.invoice.id })}>{t('home.remind')}</button>
          </div>
        ))}
      </section>

      {alerts.length > 0 && (
        <section className="stack-lg">
          <h2 className="section-title">{t('home.attention')}</h2>
          {alerts.map((a, i) => (
            <div key={a.title} className="row-btn rise" style={{ ...stagger(i + 3), cursor: 'default' }}>
              <span className={'chip ' + a.tone} style={{ width: 40, height: 40, borderRadius: 12, padding: 0, justifyContent: 'center' }}>{a.icon}</span>
              <span className="stack"><span className="title">{a.title}</span><span className="sub">{a.sub}</span></span>
            </div>
          ))}
        </section>
      )}
      <p className="sub small" style={{ textAlign: 'center', margin: 0 }}>{t('common.demo')}</p>
    </main>
  )
}
