import type { CSSProperties } from 'react'
import { LogoMark, Wordmark } from './Logo'

/** Layar pembuka saat data kos dimuat (IndexedDB sekarang, Supabase nanti). */
export function Splash({ label }: { label: string }) {
  return (
    <div className="splash" role="status" aria-live="polite" aria-label={label}>
      <span className="leaf-deco" style={{ position: 'static', opacity: 1 }}><LogoMark width={110} height={68} /></span>
      <Wordmark size={26} />
      <span className="dots" aria-hidden="true"><i /><i /><i /></span>
      <span className="sub">{label}</span>
    </div>
  )
}

/** Blok abu berkilau untuk isi yang sedang dimuat. */
export function Skeleton({ h = 16, w = '100%', r }: { h?: number; w?: number | string; r?: number }) {
  return <span className="skeleton" aria-hidden="true" style={{ display: 'block', height: h, width: w, borderRadius: r }} />
}

/** Gaya urutan muncul untuk item daftar (dipakai bersama kelas .rise / .win). */
export const stagger = (i: number): CSSProperties => ({ ['--i' as string]: i } as CSSProperties)
