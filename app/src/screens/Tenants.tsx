import { useState } from 'react'
import { Link } from 'react-router-dom'
import { UserPlus } from 'lucide-react'
import { useStore } from '../data/store'
import { usePrefs } from '../lib/prefs'
import { roomView } from '../domain/billing'
import { fmtDate } from '../lib/dates'
import { initials } from '../lib/format'
import { roomChip } from '../lib/labels'
import { Segmented, SubHeader } from '../components/ui'
import { useSheets } from '../components/sheets'
import { stagger } from '../components/Loading'

export default function TenantsScreen() {
  const { t, lang } = usePrefs()
  const { data, today } = useStore()
  const open = useSheets()
  const [tab, setTab] = useState<'active' | 'archive'>('active')
  const active = data.tenants.filter((x) => !x.archivedAt)
  const archived = data.tenants.filter((x) => x.archivedAt)
  const list = tab === 'active' ? active : archived
  return (
    <main className="screen sub">
      <SubHeader title={t('tenants.title')} action={<button className="icon-btn solid" aria-label={t('tenant.new')} onClick={() => open({ kind: 'tenant' })}><UserPlus size={20} /></button>} />
      <Segmented value={tab} onChange={setTab} options={[{ value: 'active', label: t('tenants.active', { n: active.length }) }, { value: 'archive', label: t('tenants.archive', { n: archived.length }) }]} />
      <div className="stack-lg">
        {list.map((tn, i) => {
          const lease = data.leases.filter((l) => l.tenantId === tn.id).sort((a, b) => b.startDate.localeCompare(a.startDate))[0]
          const room = data.rooms.find((r) => r.id === lease?.roomId)
          const v = room && !tn.archivedAt ? roomView(data, room, today) : undefined
          const incomplete = !tn.emergency
          return (
            <Link key={tn.id} to={`/penghuni/${tn.id}`} className="row-btn rise" style={stagger(i)}>
              <span className="avatar round" style={tn.archivedAt ? { background: 'var(--sunken)', color: 'var(--ink2)' } : undefined}>{initials(tn.name)}</span>
              <span className="stack grow">
                <span className="title">{tn.name}</span>
                <span className="sub">{room ? t('common.room', { code: room.code }) : ''}{lease ? ' · ' + (tn.archivedAt ? `${fmtDate(lease.startDate, lang, true)} – ${fmtDate(tn.archivedAt, lang, true)}` : t('rooms.tenantSince', { date: fmtDate(lease.startDate, lang, true) })) : ''}</span>
              </span>
              <span className="stack" style={{ alignItems: 'flex-end' }}>
                {v ? <span className={'chip ' + v.key}>{roomChip(v, t)}</span> : <span className="chip archived">{lease?.depositStatus === 'deducted' ? t('checkout.part') : t('checkout.full')}</span>}
                {!tn.archivedAt && incomplete && <span className="small" style={{ color: 'var(--due-ink)', fontWeight: 600 }}>{t('tenants.incomplete')}</span>}
              </span>
            </Link>
          )
        })}
      </div>
      {tab === 'archive' && <div className="hint">{t('tenants.archiveNote')}</div>}
    </main>
  )
}
