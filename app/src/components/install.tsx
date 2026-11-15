import { useEffect, useState } from 'react'
import { ArrowDown, Check, MoreHorizontal, PlusSquare, Share } from 'lucide-react'
import { usePrefs } from '../lib/prefs'
import { Sheet } from './ui'
import { LogoMark } from './Logo'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let deferred: BeforeInstallPromptEvent | null = null
const listeners = new Set<() => void>()
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e as BeforeInstallPromptEvent; listeners.forEach((l) => l()) })
  window.addEventListener('appinstalled', () => { deferred = null; listeners.forEach((l) => l()) })
}

export const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
export const isStandalone = () =>
  (navigator as Navigator & { standalone?: boolean }).standalone === true || matchMedia('(display-mode: standalone)').matches
const isIOSNonSafari = () => isIOS() && /crios|fxios|edgios/i.test(navigator.userAgent)

/** Status pemasangan: sudah terpasang? bisa pasang 1 ketuk (Android/Chrome)? perlu panduan (iPhone)? */
export function useInstall() {
  const [, force] = useState(0)
  useEffect(() => {
    const l = () => force((n) => n + 1)
    listeners.add(l)
    return () => { listeners.delete(l) }
  }, [])
  const installed = isStandalone()
  return {
    installed,
    canPrompt: !installed && !!deferred,
    needsGuide: !installed && !deferred,
    prompt: async () => {
      if (!deferred) return false
      await deferred.prompt()
      const { outcome } = await deferred.userChoice
      deferred = null
      return outcome === 'accepted'
    },
  }
}

/** Panduan bergambar 3 langkah untuk iPhone (Safari tidak punya tombol pasang otomatis). */
export function InstallGuide({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = usePrefs()
  const other = isIOSNonSafari()
  const steps = [
    { icon: other ? <MoreHorizontal size={22} /> : <Share size={22} />, title: t(other ? 'install.s1other' : 'install.s1'), sub: t(other ? 'install.s1otherSub' : 'install.s1Sub') },
    { icon: <PlusSquare size={22} />, title: t('install.s2'), sub: t('install.s2Sub') },
    { icon: <Check size={22} />, title: t('install.s3'), sub: t('install.s3Sub') },
  ]
  return (
    <>
      <Sheet open={open} onClose={onClose} label={t('install.title')}>
        <div className="row">
          <span className="avatar" style={{ width: 56, height: 56, borderRadius: 14, background: 'var(--accent)' }}><LogoMark width={40} height={26} light /></span>
          <span className="stack grow"><h2>{t('install.title')}</h2><span className="sub">{t('install.why')}</span></span>
        </div>
        <ol className="stack-lg" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {steps.map((s, i) => (
            <li key={i} className="row" style={{ padding: 12, borderRadius: 18, background: 'var(--sunken)' }}>
              <span className="avatar round" style={{ background: 'var(--surface)', color: 'var(--softInk)' }}>{s.icon}</span>
              <span className="stack grow"><span className="title">{i + 1}. {s.title}</span><span className="sub">{s.sub}</span></span>
            </li>
          ))}
        </ol>
        <button className="btn primary block" onClick={onClose}>{t('install.ok')}</button>
      </Sheet>
      {open && isIOS() && !other && (
        <div aria-hidden="true" style={{ position: 'fixed', left: '50%', transform: 'translateX(-50%)', bottom: 'calc(env(safe-area-inset-bottom) + 2px)', zIndex: 31, color: '#fff', animation: 'nudge 1.2s ease-in-out infinite' }}>
          <ArrowDown size={34} strokeWidth={3} />
        </div>
      )}
    </>
  )
}

/** Tombol/kartu "Pasang ke Layar Utama": 1 ketuk di Android, panduan di iPhone; hilang setelah terpasang. */
export function InstallCard({ compact = false, dismissible = false }: { compact?: boolean; dismissible?: boolean }) {
  const { t } = usePrefs()
  const inst = useInstall()
  const [guide, setGuide] = useState(false)
  const [hidden, setHidden] = useState(() => dismissible && localStorage.getItem('kc-install-dismissed') === '1')
  if (inst.installed || hidden) return null
  const go = async () => { if (inst.canPrompt) await inst.prompt(); else setGuide(true) }
  return (
    <>
      {compact ? (
        <button className="row-btn flat" style={{ borderRadius: 0, borderBottom: '1px solid var(--line2)', minHeight: 60 }} onClick={go}>
          <span className="avatar" style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--soft)' }}><PlusSquare size={18} /></span>
          <span className="grow stack"><span style={{ fontSize: 15, fontWeight: 700 }}>{t('install.title')}</span><span className="sub">{t(inst.canPrompt ? 'install.oneTap' : 'install.short')}</span></span>
        </button>
      ) : (
        <div className="card soft" style={{ flexDirection: 'row', alignItems: 'center' }}>
          <span className="avatar" style={{ background: 'var(--accent)', borderRadius: 14 }}><LogoMark width={34} height={22} light /></span>
          <span className="stack grow"><span className="title">{t('install.title')}</span><span className="sub small">{t(inst.canPrompt ? 'install.oneTap' : 'install.short')}</span></span>
          <span className="stack" style={{ alignItems: 'flex-end', gap: 2 }}>
            <button className="btn primary sm" onClick={go}>{t(inst.canPrompt ? 'install.now' : 'install.how')}</button>
            {dismissible && <button className="link-btn" style={{ padding: '4px 0', fontSize: 12 }} onClick={() => { localStorage.setItem('kc-install-dismissed', '1'); setHidden(true) }}>{t('install.dismiss')}</button>}
          </span>
        </div>
      )}
      <InstallGuide open={guide} onClose={() => setGuide(false)} />
    </>
  )
}
