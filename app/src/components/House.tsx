import type { RoomView } from '../domain/billing'
import { usePrefs } from '../lib/prefs'
import { roomChip, roomTag, STATE_DOT } from '../lib/labels'
import { stagger } from './Loading'

/** Denah kamar berupa rumah 2 lantai. Setiap kamar = jendela berwarna status. */
export function House({ views, onOpen }: { views: RoomView[]; onOpen: (roomId: string) => void }) {
  const { t, lang } = usePrefs()
  const floors = [...new Set(views.map((v) => v.room.floor))].sort((a, b) => b - a)
  return (
    <div className="house">
      <svg viewBox="0 0 340 70" width="100%" height="60" preserveAspectRatio="none" aria-hidden="true" style={{ display: 'block' }}>
        <path d="M24 68 170 8 316 68Z" fill="var(--roof)" />
        <path d="M12 70 170 6 328 70" fill="none" stroke="var(--wood)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        <rect x="159" y="32" width="22" height="20" rx="2" fill="var(--facade)" stroke="var(--wood)" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="house-body">
        {floors.map((floor, fi) => {
          const rooms = views.filter((v) => v.room.floor === floor).sort((a, b) => a.room.code.localeCompare(b.room.code))
          const ground = fi === floors.length - 1
          const cells: (RoomView | 'door')[] = ground && rooms.length < 5 ? [...rooms.slice(0, 2), 'door', ...rooms.slice(2)] : rooms
          return (
            <div key={floor} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span className="house-floor-label">{t('common.floor', { n: floor }).toUpperCase()}</span>
              <div className="house-row" style={{ gridTemplateColumns: `repeat(${Math.max(5, cells.length)}, minmax(0, 1fr))` }}>
                {cells.map((c, i) =>
                  c === 'door' ? (
                    <div key={'door' + i} className="door" aria-hidden="true"><span /><span /><span /></div>
                  ) : (
                    <button key={c.room.id + c.key} style={stagger(fi * 5 + i)} className={'win ' + c.key} onClick={() => onOpen(c.room.id)} aria-label={`${t('common.room', { code: c.room.code })}, ${roomChip(c, t)}`}>
                      <b>{c.room.code}</b>
                      <small>{roomTag(c, t, lang)}</small>
                    </button>
                  ),
                )}
              </div>
              {!ground && <div className="house-divider" />}
            </div>
          )
        })}
      </div>
      <div className="house-ground" />
      <svg width="34" height="74" viewBox="0 0 34 74" aria-hidden="true" style={{ position: 'absolute', left: -6, bottom: 3 }}>
        <path d="M17 74V12" stroke="var(--leaf)" strokeWidth="2.5" />
        <path d="M17 22c-9-4-12-13-8-20 8 3 11 12 8 20zM17 34c9-4 13-13 9-21-8 4-11 13-9 21zM17 48c-10-3-15-11-12-19 9 2 13 11 12 19zM17 60c10-2 15-10 13-18-9 2-14 10-13 18z" fill="var(--leaf)" />
      </svg>
      <svg width="44" height="40" viewBox="0 0 44 40" aria-hidden="true" style={{ position: 'absolute', right: -8, bottom: 3 }}>
        <path d="M22 40c3-14 11-22 22-24-2 13-11 22-22 24zM22 40c-3-14-11-22-22-24 2 13 11 22 22 24zM22 40c-2-16 0-28 0-36 4 8 4 24 0 36z" fill="var(--leaf2)" />
      </svg>
    </div>
  )
}

export function Legend({ keys }: { keys: RoomView['key'][] }) {
  const { t } = usePrefs()
  return (
    <div className="legend">
      {keys.map((k) => (
        <span key={k}>
          <i style={k === 'empty' ? { border: `1.5px dashed ${STATE_DOT[k]}` } : { background: STATE_DOT[k] }} />
          {t(`state.${k}`)}
        </span>
      ))}
    </div>
  )
}
