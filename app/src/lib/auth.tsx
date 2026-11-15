import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'

interface Auth {
  /** true bila Supabase dikonfigurasi (.env) → aplikasi butuh login; false = mode demo */
  enabled: boolean
  loading: boolean
  session: Session | null
  /** pengguna datang dari tautan "lupa kata sandi" → harus membuat kata sandi baru */
  recovery: boolean
  signIn: (email: string, password: string) => Promise<string | null>
  signOut: () => Promise<void>
  sendReset: (email: string) => Promise<string | null>
  setNewPassword: (password: string) => Promise<string | null>
}

const Ctx = createContext<Auth | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(!!supabase)
  const [recovery, setRecovery] = useState(false)

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setLoading(false) })
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s)
      if (event === 'PASSWORD_RECOVERY') setRecovery(true)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  const value = useMemo<Auth>(() => ({
    enabled: !!supabase, loading, session, recovery,
    signIn: async (email, password) => {
      const { error } = await supabase!.auth.signInWithPassword({ email: email.trim(), password })
      return error ? error.message : null
    },
    signOut: async () => {
      await supabase!.auth.signOut()
      try { sessionStorage.removeItem('kc-unlocked') } catch { /* abaikan */ }
    },
    sendReset: async (email) => {
      const { error } = await supabase!.auth.resetPasswordForEmail(email.trim(), { redirectTo: window.location.origin + '/' })
      return error ? error.message : null
    },
    setNewPassword: async (password) => {
      const { error } = await supabase!.auth.updateUser({ password })
      if (!error) setRecovery(false)
      return error ? error.message : null
    },
  }), [loading, session, recovery])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAuth(): Auth {
  const a = useContext(Ctx)
  if (!a) throw new Error('useAuth must be used inside AuthProvider')
  return a
}
