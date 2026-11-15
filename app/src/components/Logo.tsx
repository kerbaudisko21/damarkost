/** Tanda logo Damar Kost (rumah + daun), warnanya mengikuti tema lewat CSS variable. */
export function LogoMark({ width = 52, height = 32, light = false }: { width?: number; height?: number; light?: boolean }) {
  const wood = light ? '#D9B48C' : 'var(--wood)'
  const leaf = light ? '#C9D7A8' : 'var(--leaf)'
  const leaf2 = light ? '#A9BE86' : 'var(--leaf2)'
  const door = light ? '#B8926A' : 'var(--door)'
  return (
    <svg width={width} height={height} viewBox="14 4 214 128" fill="none" aria-hidden="true">
      <path d="M92 70 152 22 214 70" stroke={wood} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M110 66v58h96V66" stroke={wood} strokeWidth="5" />
      <rect x="141" y="42" width="18" height="18" stroke={wood} strokeWidth="4" />
      <rect x="164" y="84" width="26" height="40" fill={door} />
      <path d="M36 128h190" stroke={wood} strokeWidth="5" strokeLinecap="round" />
      <path d="M62 126V54" stroke={leaf} strokeWidth="4" />
      <path d="M62 66c-12-6-16-18-10-28 10 4 14 16 10 28zM62 80c12-6 18-18 12-30-10 6-14 18-12 30zM62 96c-14-4-22-14-18-26 12 2 18 14 18 26zM62 108c14-2 22-12 20-24-12 2-20 12-20 24zM62 56c-6-8-6-18 0-24 6 6 6 16 0 24z" fill={leaf} />
      <path d="M80 126c4-20 16-32 32-36-2 18-14 32-32 36zM40 126c-6-14-2-28 8-36 6 14 2 28-8 36z" fill={leaf2} />
    </svg>
  )
}

export function Wordmark({ size = 18 }: { size?: number }) {
  return (
    <span style={{ display: 'flex', flexDirection: 'column', gap: 3, lineHeight: 1 }}>
      <span style={{ fontFamily: 'var(--serif)', fontSize: size, fontWeight: 700, letterSpacing: '0.06em', color: 'var(--leaf)' }}>DAMAR</span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--wood)' }}>
        <span style={{ width: size * 0.66, height: 1.5, background: 'currentColor' }} />
        <span style={{ fontFamily: 'var(--serif)', fontSize: size / 2, fontWeight: 600, letterSpacing: '0.45em' }}>KOST</span>
        <span style={{ width: size * 0.66, height: 1.5, background: 'currentColor' }} />
      </span>
    </span>
  )
}

export function Logo() {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 10 }} aria-label="Damar Kost" role="img">
      <LogoMark />
      <Wordmark />
    </span>
  )
}

export function LeafDeco() {
  return (
    <svg className="leaf-deco" width="120" height="90" viewBox="0 0 120 90" aria-hidden="true">
      <path d="M60 90C62 50 84 18 120 6 116 46 94 78 60 90zM60 90C46 62 22 46 0 44c6 26 30 44 60 46z" fill="var(--leaf2)" />
    </svg>
  )
}
