import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertCircle, Bell, CalendarCheck, Clock, LogIn, LogOut, Wrench } from 'lucide-react'
import { useStore } from '../data/store'
import { usePrefs } from '../lib/prefs'
import { badgeCount, computeReminders, type Reminder, type ReminderKind } from '../domain/reminders'
import { fmtDate } from '../lib/dates'
import { rp } from '../lib/format'
import { setBadge } from '../lib/push'
import { Sheet } from './ui'
import { useSheets } from './sheets'
import { stagger } from './Loading'

const ICON: Record<ReminderKind, ReactNode> = {
  late: <AlertCircle size={20} />, due: <Clock size={20} />, checkin: <LogIn size={20} />, checkout: <LogOut size={20} />, leaving: <CalendarCheck size={20} />, repair: <Wrench size={20} />,
}
const TONE: Record<ReminderKind, string> = { late: 'late', due: 'due', checkin: 'homestay', checkout: 'homestay', leaving: 'empty', repair: 'repair' }

export function useReminders(): Reminder[] {
  const { data, today } = useStore()
  return useMemo(() => computeReminders(data, today), [data, today])
}

/** Lonceng di kanan atas Beranda + angka badge di ikon aplikasi. */
export function BellButton() {
  const { t } = usePrefs()
  const items = useReminders()
  const count = badgeCount(items)
  const [open, setOpen] = useState(false)
  useEffect(() => { setBadge(count) }, [count])
  return (
    <>
      <button className="icon-btn" onClick={() => setOpen(true)} aria-label={t('rem.aria', { n: count })}
        style={{ position: 'relative', width: 44, height: 44, borderRadius: 999, background: 'var(--soft)', color: 'var(--softInk)' }}>
        <Bell size={21} />
        {count > 0 && (
          <span key={count} className="badge-pop" aria-hidden="true" style={{ position: 'absolute', top: 2, right: 2, minWidth: 18, height: 18, padding: '0 5px', borderRadius: 999, background: 'var(--late-dot)', color: '#fff', fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--bg)', boxSizing: 'content-box' }}>{count}</span>
        )}
      </button>
      {open && <ReminderSheet items={items} onClose={() => setOpen(false)} />}
    </>
  )
}

function ReminderSheet({ items, onClose }: { items: Reminder[]; onClose: () => void }) {
  const { t, lang } = usePrefs()
  const nav = useNavigate()
  const openSheet = useSheets()
  const text = (r: Reminder): [string, string] => {
    const first = r.name.split(' ')[0]
    switch (r.kind) {
      case 'late': return [t('rem.late', { name: first, n: r.days }), t('rem.billSub', { code: r.roomCode, amount: rp(r.amount ?? 0) })]
      case 'due': return [r.days === 0 ? t('rem.dueToday', { name: first }) : t('rem.dueIn', { name: first, n: r.days }), t('rem.billSub', { code: r.roomCode, amount: rp(r.amount ?? 0) })]
      case 'checkin': return [r.days === 0 ? t('rem.inToday', { name: first }) : t('rem.inTomorrow', { name: first }), t('rem.roomSub', { code: r.roomCode })]
      case 'checkout': return [r.days === 0 ? t('rem.outToday', { name: first }) : t('rem.outTomorrow', { name: first }), t('rem.roomSub', { code: r.roomCode })]
      case 'leaving': return [t('rem.leaving', { name: first, date: fmtDate(r.date!, lang) }), t('rem.leavingSub', { code: r.roomCode })]
      case 'repair': return [t('rem.repair', { code: r.roomCode }), t('rem.repairSub', { date: fmtDate(r.date!, lang) })]
    }
  }
  const act = (r: Reminder) => {
    if (r.invoiceId) { openSheet({ kind: r.kind === 'late' ? 'wa' : 'pay', invoiceId: r.invoiceId }); onClose(); return }
    if (r.bookingId) { onClose(); nav('/homestay'); return }
    onClose(); nav('/kamar')
  }
  return (
    <Sheet open onClose={onClose} label={t('rem.title')}>
      <div className="stack"><h2>{t('rem.title')}</h2><span className="sub">{t('rem.sub')}</span></div>
      {items.length === 0 && <div className="hint">{t('rem.none')}</div>}
      <div className="stack-lg">
        {items.map((r, i) => {
          const [title, sub] = text(r)
          return (
            <button key={r.id} className="row-btn rise" style={stagger(i)} onClick={() => act(r)}>
              <span className={'chip ' + TONE[r.kind]} style={{ width: 40, height: 40, borderRadius: 12, padding: 0, justifyContent: 'center' }}>{ICON[r.kind]}</span>
              <span className="stack grow"><span className="title">{title}</span><span className="sub small">{sub}</span></span>
            </button>
          )
        })}
      </div>
      <button className="btn block" onClick={() => { onClose(); nav('/pengaturan#notif') }}>{t('rem.settings')}</button>
    </Sheet>
  )
}
