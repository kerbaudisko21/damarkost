import { useState, type ReactNode } from 'react'
import { Delete } from 'lucide-react'
import { useStore } from '../data/store'
import { usePrefs } from '../lib/prefs'
import { LogoMark } from '../components/Logo'

/** Hash PIN dengan SHA-256 + garam tetap per perangkat (cukup untuk kunci layar; bukan pengganti login). */
export async function hashPin(pin: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('damarkost:' + pin))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

const SESSION_KEY = 'kc-unlocked'

function Keypad({ title, status, error, onComplete }: { title: string; status: string; error?: string; onComplete: (pin: string) => void }) {
  const { t } = usePrefs()
  const [pin, setPin] = useState('')
  const press = (d: string) => {
    if (pin.length >= 4) return
    const next = pin + d
    setPin(next)
    if (next.length === 4) setTimeout(() => { onComplete(next); setPin('') }, 120)
  }
  return (
    <div className="pin" role="dialog" aria-modal="true" aria-label={title}>
      <LogoMark width={96} height={60} light />
      <div className="stack" style={{ alignItems: 'center', textAlign: 'center', gap: 6 }}>
        <span className="serif" style={{ fontSize: 24, fontWeight: 700 }}>{title}</span>
        <span role="status" style={{ fontSize: 15, opacity: 0.75 }}>{error || status}</span>
      </div>
      <div className="pin-dots" aria-hidden="true">{[0, 1, 2, 3].map((i) => <span key={i} className={i < pin.length ? 'on' : ''} />)}</div>
      <div className="pin-pad">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'].map((k) =>
          k === '' ? <span key="blank" /> : k === 'del'
            ? <button key="del" className="ghost" aria-label={t('pin.del')} onClick={() => setPin(pin.slice(0, -1))}><Delete size={26} /></button>
            : <button key={k} onClick={() => press(k)}>{k}</button>,
        )}
      </div>
    </div>
  )
}

/** Menahan aplikasi di balik layar PIN bila PIN aktif (sekali per sesi). */
export function PinGate({ children }: { children: ReactNode }) {
  const { data } = useStore()
  const { t } = usePrefs()
  const [unlocked, setUnlocked] = useState(() => sessionStorage.getItem(SESSION_KEY) === '1')
  const [error, setError] = useState('')
  if (!data.settings.pinEnabled || !data.settings.pinHash || unlocked) return <>{children}</>
  return (
    <Keypad title={data.settings.ownerName ? t('pin.hello', { name: data.settings.ownerName }) : t('home.helloPlain')} status={t('pin.enter')} error={error} onComplete={async (pin) => {
      if ((await hashPin(pin)) === data.settings.pinHash) { sessionStorage.setItem(SESSION_KEY, '1'); setUnlocked(true) } else setError(t('pin.wrong'))
    }} />
  )
}

/** Alur membuat PIN baru: isi, lalu ulangi. */
export function PinSetup({ onDone }: { onDone: (hash: string | null) => void }) {
  const { t } = usePrefs()
  const [first, setFirst] = useState<string | null>(null)
  const [error, setError] = useState('')
  return (
    <>
      <Keypad title={t('set.pinSet')} status={first ? t('pin.confirm') : t('pin.create')} error={error} onComplete={async (pin) => {
        if (!first) { setFirst(pin); setError(''); return }
        if (pin !== first) { setFirst(null); setError(t('pin.mismatch')); return }
        sessionStorage.setItem(SESSION_KEY, '1')
        onDone(await hashPin(pin))
      }} />
      <button className="btn" style={{ position: 'fixed', zIndex: 51, left: '50%', transform: 'translateX(-50%)', bottom: 'calc(env(safe-area-inset-bottom) + 24px)', background: 'transparent', color: '#F4F1E6', border: 0 }} onClick={() => onDone(null)}>{t('common.cancel')}</button>
    </>
  )
}
