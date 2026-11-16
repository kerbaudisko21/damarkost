import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { usePrefs } from '../lib/prefs'
import { LogoMark } from './Logo'

/** Pasang overlay langsung di <body>: elemen fixed di dalam halaman yang sedang beranimasi
 *  (transform) akan menempel ke halaman, bukan ke layar — itu sebabnya form dulu muncul di paling bawah. */
export function Overlay({ children }: { children: ReactNode }) {
  return createPortal(children, document.body)
}

/** Jumlah lembar yang terbuka; halaman di belakangnya dikunci agar tidak ikut tergulir. */
let openSheets = 0
function lockScroll() {
  openSheets++
  document.documentElement.classList.add('sheet-open')
  return () => { openSheets = Math.max(0, openSheets - 1); if (!openSheets) document.documentElement.classList.remove('sheet-open') }
}

/* ---------- Lembar bawah ---------- */
export function Sheet({ open, onClose, children, label }: { open: boolean; onClose: () => void; children: ReactNode; label: string }) {
  const [closing, setClosing] = useState(false)
  const timer = useRef<number | undefined>(undefined)
  // Tutup dengan animasi turun; tombol aksi di dalam lembar tetap boleh memanggil onClose langsung.
  const requestClose = useCallback(() => {
    if (closing) return
    setClosing(true)
    timer.current = window.setTimeout(() => { setClosing(false); onClose() }, 190)
  }, [closing, onClose])
  useEffect(() => () => window.clearTimeout(timer.current), [])
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') requestClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, requestClose])
  useEffect(() => (open ? lockScroll() : undefined), [open])
  if (!open) return null
  return (
    <Overlay>
      <div className="sheet-wrap" role="dialog" aria-modal="true" aria-label={label}>
        <button className={'sheet-backdrop' + (closing ? ' out' : '')} aria-label="×" onClick={requestClose} />
        <div className={'sheet' + (closing ? ' out' : '')}>
          <div className="sheet-handle" />
          {children}
        </div>
      </div>
    </Overlay>
  )
}

/* ---------- Toast dengan tombol Urungkan ---------- */
interface ToastMsg { text: string; undo?: () => void }
const ToastCtx = createContext<(text: string, undo?: () => void) => void>(() => undefined)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState<ToastMsg | null>(null)
  const timer = useRef<number | undefined>(undefined)
  const { t } = usePrefs()
  const show = useCallback((text: string, undo?: () => void) => {
    window.clearTimeout(timer.current)
    setMsg({ text, undo })
    timer.current = window.setTimeout(() => setMsg(null), 4500)
  }, [])
  return (
    <ToastCtx.Provider value={show}>
      {children}
      {msg && (
        <div className="toast" role="status">
          <span className="grow">{msg.text}</span>
          {msg.undo && <button onClick={() => { msg.undo?.(); setMsg(null) }}>{t('common.undo')}</button>}
        </div>
      )}
    </ToastCtx.Provider>
  )
}
export const useToast = () => useContext(ToastCtx)

/* ---------- Header sub-layar ---------- */
export function SubHeader({ title, back = '/lainnya', action }: { title: string; back?: string; action?: ReactNode }) {
  const { t } = usePrefs()
  const nav = useNavigate()
  return (
    <div className="topbar">
      <button className="icon-btn" aria-label={t('common.back')} onClick={() => (window.history.length > 1 ? nav(-1) : nav(back))}>
        <ChevronLeft size={24} />
      </button>
      <LogoMark width={40} height={26} />
      <h1>{title}</h1>
      {action}
    </div>
  )
}

export function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return <button className="switch" role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)} />
}

export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="seg" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map((o) => (
        <button key={o.value} className={o.value === value ? 'on' : ''} aria-pressed={o.value === value} onClick={() => onChange(o.value)}>{o.label}</button>
      ))}
    </div>
  )
}

export function Choices<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="pills">
      {options.map((o) => (
        <button key={o.value} className={'choice' + (o.value === value ? ' on' : '')} aria-pressed={o.value === value} onClick={() => onChange(o.value)}>{o.label}</button>
      ))}
    </div>
  )
}

export function MenuLink({ to, icon, label, sub }: { to: string; icon: ReactNode; label: string; sub: string }) {
  return (
    <Link to={to} className="row-btn flat" style={{ borderRadius: 0, borderBottom: '1px solid var(--line2)', minHeight: 60 }}>
      <span className="avatar" style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--soft)' }}>{icon}</span>
      <span className="grow stack"><span style={{ fontSize: 15, fontWeight: 700 }}>{label}</span><span className="sub">{sub}</span></span>
    </Link>
  )
}
