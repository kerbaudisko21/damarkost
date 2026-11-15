import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Lang, Theme } from '../domain/types'
import { DICT, type DictKey } from './i18n'

const KEY = 'kc-prefs'

interface Prefs {
  theme: Theme
  lang: Lang
  setTheme: (t: Theme) => void
  setLang: (l: Lang) => void
  t: (key: DictKey, vars?: Record<string, string | number>) => string
}

const Ctx = createContext<Prefs | null>(null)

function load(): { theme?: Theme; lang?: Lang } {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}') } catch { return {} }
}

export function PrefsProvider({ children }: { children: ReactNode }) {
  const saved = load()
  const systemDark = typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches
  const [theme, setThemeState] = useState<Theme>(saved.theme ?? (systemDark ? 'dark' : 'light'))
  const [lang, setLangState] = useState<Lang>(saved.lang ?? 'id')

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.documentElement.lang = lang
    const meta = document.querySelector('meta[name="theme-color"]')
    meta?.setAttribute('content', theme === 'dark' ? '#14150F' : '#FBF9F3')
    try { localStorage.setItem(KEY, JSON.stringify({ theme, lang })) } catch { /* abaikan */ }
  }, [theme, lang])

  const t = useCallback((key: DictKey, vars?: Record<string, string | number>) => {
    const entry = DICT[key]
    let s: string = entry ? entry[lang === 'en' ? 1 : 0] : key
    if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v))
    return s
  }, [lang])

  const value = useMemo<Prefs>(() => ({ theme, lang, setTheme: setThemeState, setLang: setLangState, t }), [theme, lang, t])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function usePrefs(): Prefs {
  const p = useContext(Ctx)
  if (!p) throw new Error('usePrefs must be used inside PrefsProvider')
  return p
}
