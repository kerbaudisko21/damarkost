import { useStore } from '../data/store'
import { usePrefs } from '../lib/prefs'
import { rp } from '../lib/format'
import { roomChip } from '../lib/labels'
import { House, Legend } from '../components/House'
import { LeafDeco } from '../components/Logo'
import { useRoomViews, useSheets } from '../components/sheets'

export default function RoomsScreen() {
  const { t } = usePrefs()
  const { data } = useStore()
  const open = useSheets()
  const views = useRoomViews()
  const count = (k: string) => views.filter((v) => v.key === k).length
  const occ = views.filter((v) => v.lease).length
  return (
    <main className="screen">
      <div className="stack">
        <h1 className="page-title">{t('nav.rooms')}</h1>
        <span className="sub" style={{ fontSize: 14 }}>{t('rooms.summary', { occ, empty: count('empty'), repair: count('repair'), hs: count('homestay') })}</span>
      </div>
      <section className="card sky" style={{ padding: '18px 12px 14px' }}>
        <LeafDeco />
        <House views={views} onOpen={(roomId) => open({ kind: 'room', roomId })} />
        <Legend keys={['paid', 'due', 'late', 'homestay', 'empty', 'repair']} />
      </section>
      <div className="stack-lg">
        {[...views].sort((a, b) => a.room.code.localeCompare(b.room.code)).map((v) => {
          const r = v.room
          const label = v.tenantName ?? (v.key === 'homestay' ? v.guestName : t(`state.${v.key}`))
          return (
            <button key={r.id} className="row-btn" onClick={() => open({ kind: 'room', roomId: r.id })}>
              <span className={'badge-win win ' + v.key} style={{ height: 46 }}>{r.code}</span>
              <span className="stack grow">
                <span className="title">{label}</span>
                <span className="sub small">{r.label ? `${r.label} · ` : ''}{t(`mode.${r.rentMode}`)} · {r.rentMode === 'daily' ? rp(r.nightlyPrice) + ' ' + t('common.perNight') : rp(v.lease?.rent ?? r.basePrice)}</span>
              </span>
              <span className={'chip ' + v.key}>{roomChip(v, t)}</span>
            </button>
          )
        })}
      </div>
      <p className="sub small" style={{ textAlign: 'center', margin: 0 }}>{data.settings.propertyName} · {data.rooms.length} {t('nav.rooms').toLowerCase()}</p>
    </main>
  )
}
