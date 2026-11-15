import { useState, type FormEvent, type ReactNode } from 'react'
import { Eye, EyeOff, RefreshCw } from 'lucide-react'
import { useAuth } from '../lib/auth'
import { usePrefs } from '../lib/prefs'
import { LogoMark, Wordmark } from '../components/Logo'
import type { DictKey } from '../lib/i18n'

/** Bingkai layar sebelum masuk: logo di atas, isi di kartu. */
function AuthFrame({ children }: { children: ReactNode }) {
  return (
    <main className="auth">
      <div className="auth-brand rise">
        <LogoMark width={120} height={74} />
        <Wordmark size={28} />
      </div>
      <section className="card auth-card rise" style={{ ['--i' as string]: 1 }}>{children}</section>
    </main>
  )
}

function errKey(msg: string): DictKey | null {
  const m = msg.toLowerCase()
  if (m.includes('invalid login') || m.includes('invalid credentials')) return 'auth.badLogin'
  if (m.includes('failed to fetch') || m.includes('network')) return 'auth.offline'
  return null
}

function Password({ label, value, onChange, autoComplete }: { label: string; value: string; onChange: (v: string) => void; autoComplete: string }) {
  const { t } = usePrefs()
  const [show, setShow] = useState(false)
  return (
    <label className="field">{label}
      <span className="pw">
        <input type={show ? 'text' : 'password'} value={value} onChange={(e) => onChange(e.target.value)} autoComplete={autoComplete} required />
        <button type="button" className="pw-eye" aria-label={t('auth.show')} aria-pressed={show} onClick={() => setShow((s) => !s)}>
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </span>
    </label>
  )
}

export function LoginScreen() {
  const { t } = usePrefs()
  const { signIn, sendReset } = useAuth()
  const [mode, setMode] = useState<'login' | 'forgot'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true); setError(null)
    const err = mode === 'login' ? await signIn(email, password) : await sendReset(email)
    setBusy(false)
    if (err) { const k = errKey(err); setError(k ? t(k) : err); return }
    if (mode === 'forgot') setSent(true)
  }

  const swap = (m: 'login' | 'forgot') => { setMode(m); setError(null); setSent(false) }

  return (
    <AuthFrame>
      <form className="stack-lg" onSubmit={submit} noValidate={false}>
        <div className="stack">
          <h1 style={{ fontSize: 22 }}>{mode === 'login' ? t('auth.welcome') : t('auth.forgotTitle')}</h1>
          <span className="sub">{mode === 'login' ? t('auth.sub') : t('auth.forgotSub')}</span>
        </div>
        <label className="field">{t('auth.email')}
          <input type="email" inputMode="email" autoComplete="username" autoCapitalize="none" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        {mode === 'login' && <Password label={t('auth.password')} value={password} onChange={setPassword} autoComplete="current-password" />}
        {error && <div className="hint warn" role="alert">{error}</div>}
        {sent && <div className="hint" role="status">{t('auth.linkSent')}</div>}
        <button className="btn primary block" type="submit" disabled={busy || !email || (mode === 'login' && !password)} aria-busy={busy}>
          {busy ? <><span className="spinner" />{t('common.working')}</> : mode === 'login' ? t('auth.signIn') : t('auth.sendLink')}
        </button>
        <button type="button" className="btn ghost block" onClick={() => swap(mode === 'login' ? 'forgot' : 'login')}>
          {mode === 'login' ? t('auth.forgot') : t('auth.backToLogin')}
        </button>
      </form>
    </AuthFrame>
  )
}

/** Muncul setelah membuka tautan "lupa kata sandi" dari email. */
export function SetPasswordScreen() {
  const { t } = usePrefs()
  const { setNewPassword } = useAuth()
  const [a, setA] = useState('')
  const [b, setB] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (a.length < 8) return setError(t('auth.tooShort'))
    if (a !== b) return setError(t('auth.mismatch'))
    setBusy(true); setError(null)
    const err = await setNewPassword(a)
    setBusy(false)
    if (err) setError(err)
  }

  return (
    <AuthFrame>
      <form className="stack-lg" onSubmit={submit}>
        <div className="stack">
          <h1 style={{ fontSize: 22 }}>{t('auth.newTitle')}</h1>
          <span className="sub">{t('auth.newSub')}</span>
        </div>
        <Password label={t('auth.newPassword')} value={a} onChange={setA} autoComplete="new-password" />
        <Password label={t('auth.repeat')} value={b} onChange={setB} autoComplete="new-password" />
        {error && <div className="hint warn" role="alert">{error}</div>}
        <button className="btn primary block" type="submit" disabled={busy || !a || !b} aria-busy={busy}>
          {busy ? <><span className="spinner" />{t('common.working')}</> : t('common.save')}
        </button>
      </form>
    </AuthFrame>
  )
}

/** Login berhasil tapi data tidak bisa dimuat (tabel belum dibuat / gangguan jaringan). */
export function LoadProblem({ schemaMissing, detail, onRetry }: { schemaMissing: boolean; detail: string | null; onRetry: () => void }) {
  const { t } = usePrefs()
  const { signOut } = useAuth()
  return (
    <AuthFrame>
      <div className="stack-lg">
        <div className="stack">
          <h1 style={{ fontSize: 22 }}>{schemaMissing ? t('setup.title') : t('setup.error')}</h1>
          <span className="sub">{schemaMissing ? t('setup.body') : detail}</span>
        </div>
        <button className="btn primary block" onClick={onRetry}><RefreshCw size={18} />{t('setup.retry')}</button>
        <button className="btn ghost block" onClick={() => signOut()}>{t('auth.signOut')}</button>
      </div>
    </AuthFrame>
  )
}
