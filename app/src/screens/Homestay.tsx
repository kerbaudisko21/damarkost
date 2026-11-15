import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { useStore } from '../data/store'
import { usePrefs } from '../lib/prefs'
import { barPlacement, bookingCommission, bookingNet, bookingTotal, findConflict, nights, nightsInPeriod } from '../domain/homestay'
import type { Booking } from '../domain/types'
import { addDays, fmtDate, fmtLongDay, fromISO, monthName, periodOf, weekdayShort } from '../lib/dates'
import { parseRupiah, rp, rpShort } from '../lib/format'
import { openWhatsApp } from '../lib/wa'
import { Choices, Sheet, SubHeader, useToast } from '../components/ui'
import { LeafDeco } from '../components/Logo'

const DAYS = 14

export default function HomestayScreen() {
  const { t, lang } = usePrefs()
  const toast = useToast()
  const { data, today, addBooking, setBookingStatus } = useStore()
  const [params, setParams] = useSearchParams()
  const hsRooms = data.rooms.filter((r) => r.rentMode !== 'monthly').sort((a, b) => a.code.localeCompare(b.code))
  const live = data.bookings.filter((b) => b.status !== 'cancelled')
  const [selId, setSelId] = useState<string | null>(null)
  const sel = data.bookings.find((b) => b.id === selId)
  const addOpen = params.get('baru') === '1'
  const period = periodOf(today)

  const net = live.reduce((a, b) => a + Math.round((bookingNet(b) * nightsInPeriod(b, period)) / Math.max(1, nights(b))), 0)
  const nightsBooked = live.reduce((a, b) => a + nightsInPeriod(b, period), 0)
  const days = Array.from({ length: DAYS }, (_, i) => addDays(today, i))
  const src = (id: string) => data.sources.find((s) => s.id === id)

  const todayRows = hsRooms.map((r) => {
    const cur = live.find((b) => b.roomId === r.id && b.status !== 'out' && b.checkIn <= today && today < b.checkOut)
    const repair = r.repairUntil && r.repairUntil >= today
    if (repair) return { r, title: r.repairNote ?? t('state.repair'), sub: t('rooms.repairUntil', { note: t('state.repair'), date: fmtDate(addDays(r.repairUntil!, 1), lang) }), chip: t('state.repair'), cls: 'repair', booking: undefined }
    if (cur) return { r, title: t('hs.staying', { name: cur.guestName.split(' ')[0] }), sub: t('hs.stayingSub', { source: src(cur.sourceId)?.name ?? '', date: fmtDate(cur.checkOut, lang), time: data.settings.checkOutTime }), chip: t('hs.occupied'), cls: 'homestay', booking: cur }
    return { r, title: t('hs.ready'), sub: t('hs.readySub'), chip: t('state.empty'), cls: 'empty', booking: undefined }
  })
  const upcoming = live.filter((b) => b.status !== 'out' && b.checkOut > today).sort((a, b) => a.checkIn.localeCompare(b.checkIn))

  const payChip = (b: Booking) => b.paid === 'paid' ? ['paid', t('pay.full')] : b.paid === 'dp' ? ['due', t('pay.dp', { amount: rp(b.dpAmount) })] : ['late', t('pay.unpaid')]

  return (
    <main className="screen sub">
      <SubHeader title="Homestay" action={<button className="icon-btn solid" aria-label={t('hs.new')} onClick={() => setParams({ baru: '1' })}><Plus size={20} /></button>} />
      {hsRooms.length === 0 && <div className="hint">{t('hs.none')}</div>}

      {hsRooms.length > 0 && (
        <>
          <section className="card sky">
            <LeafDeco />
            <span className="sub" style={{ fontWeight: 700, position: 'relative' }}>{t('hs.today', { date: fmtLongDay(today, lang) })}</span>
            {todayRows.map((row) => (
              <button key={row.r.id} className="row-btn flat" style={{ position: 'relative' }} onClick={() => row.booking && setSelId(row.booking.id)}>
                <span className={'badge-win win ' + row.cls} style={{ height: 42, width: 42 }}>{row.r.code}</span>
                <span className="stack grow"><span className="title">{row.title}</span><span className="sub small">{row.sub}</span></span>
                <span className={'chip ' + row.cls}>{row.chip}</span>
              </button>
            ))}
          </section>

          <div className="pills">
            <span className="pill hero" style={{ paddingLeft: 16 }}>{t('hs.netPill', { amount: rpShort(net, lang), month: monthName(period, lang).split(' ')[0] })}</span>
            <span className="pill soft">{t('hs.nightsPill', { n: nightsBooked })}</span>
          </div>

          <section className="card" style={{ padding: '16px 14px' }}>
            <div className="row" style={{ justifyContent: 'space-between' }}><h2>{t('hs.calendar')}</h2><span className="sub small" style={{ fontWeight: 600 }}>{fmtDate(days[0], lang)} – {fmtDate(days[DAYS - 1], lang)}</span></div>
            <div className="cal">
              <span />
              <div className="cal-days">
                {days.map((d) => {
                  const wd = fromISO(d).getDay()
                  return <span key={d} className={'cal-day' + (d === today ? ' today' : wd === 0 || wd === 6 ? ' wk' : '')}><small>{weekdayShort(d, lang)}</small><b>{fromISO(d).getDate()}</b></span>
                })}
              </div>
              {hsRooms.map((r) => (
                <RoomLane key={r.id} code={r.code} bookings={live.filter((b) => b.roomId === r.id)} repairUntil={r.repairUntil} start={today} color={(id) => src(id)?.color ?? 'var(--wood)'} onOpen={setSelId} repairLabel={t('hs.repair')} />
              ))}
            </div>
            <div className="legend" style={{ padding: 0 }}>
              {data.sources.map((s) => <span key={s.id}><i style={{ background: s.color }} />{s.name}</span>)}
            </div>
          </section>

          <section className="stack-lg">
            <h2 className="section-title">{t('hs.bookings')}</h2>
            {upcoming.length === 0 && <div className="empty-note">{t('hs.noBookings')}</div>}
            {upcoming.map((b) => {
              const room = data.rooms.find((r) => r.id === b.roomId)!
              const [pc, pt] = payChip(b)
              return (
                <button key={b.id} className="row-btn" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }} onClick={() => setSelId(b.id)}>
                  <span className="row">
                    <span className="badge-win win homestay" style={{ height: 40, width: 40 }}>{room.code}</span>
                    <span className="stack grow"><span className="title">{b.guestName}</span><span className="sub small">{fmtDate(b.checkIn, lang)}–{fmtDate(b.checkOut, lang)} · {t('hs.nights', { n: nights(b) })}</span></span>
                    <span className="amount">{rp(bookingTotal(b))}</span>
                  </span>
                  <span className="row" style={{ gap: 6 }}>
                    <span className="chip" style={{ background: src(b.sourceId)?.color, color: '#fff' }}>{src(b.sourceId)?.name}</span>
                    <span className={'chip ' + pc}>{pt}</span>
                  </span>
                </button>
              )
            })}
          </section>
        </>
      )}

      {sel && (
        <Sheet open onClose={() => setSelId(null)} label={sel.guestName}>
          <BookingDetail b={sel} onClose={() => setSelId(null)} onStatus={(s) => {
            setBookingStatus(sel.id, s)
            setSelId(null)
            toast(s === 'in' ? t('hs.checkedIn') : s === 'out' ? t('hs.checkedOut') : t('hs.cancelled'), () => setBookingStatus(sel.id, sel.status))
          }} />
        </Sheet>
      )}

      {addOpen && (
        <Sheet open onClose={() => setParams({})} label={t('hs.new')}>
          <NewBooking defaultRoom={hsRooms[0]?.id} onDone={(ok) => { setParams({}); if (ok) toast(t('hs.saved')) }} addBooking={addBooking} />
        </Sheet>
      )}
    </main>
  )
}

function RoomLane({ code, bookings, repairUntil, start, color, onOpen, repairLabel }: {
  code: string; bookings: Booking[]; repairUntil?: string; start: string; color: (id: string) => string; onOpen: (id: string) => void; repairLabel: string
}) {
  const repair = repairUntil && repairUntil >= start ? barPlacement({ checkIn: start, checkOut: addDays(repairUntil, 1) }, start, DAYS) : null
  return (
    <>
      <span className="badge-win win homestay" style={{ height: 38, width: 38, fontSize: 13 }}>{code}</span>
      <div className="cal-lane">
        {repair && <span className="cal-bar repair" style={{ gridColumn: `${repair.col} / span ${repair.span}`, display: 'flex', alignItems: 'center' }}>{repairLabel}</span>}
        {bookings.map((b) => {
          const p = barPlacement(b, start, DAYS)
          if (!p) return null
          return (
            <button key={b.id} className="cal-bar" aria-label={`${b.guestName}, ${b.checkIn} – ${b.checkOut}`} onClick={() => onOpen(b.id)}
              style={{ gridColumn: `${p.col} / span ${p.span}`, background: color(b.sourceId), opacity: b.status === 'out' ? 0.45 : 1, ...(p.clippedStart ? { borderTopLeftRadius: 2, borderBottomLeftRadius: 2 } : {}) }}>
              {b.guestName.split(' ')[0]}
            </button>
          )
        })}
      </div>
    </>
  )
}

function BookingDetail({ b, onStatus, onClose }: { b: Booking; onStatus: (s: Booking['status']) => void; onClose: () => void }) {
  const { t, lang } = usePrefs()
  const { data } = useStore()
  const room = data.rooms.find((r) => r.id === b.roomId)!
  const s = data.sources.find((x) => x.id === b.sourceId)
  const next = b.status === 'booked' ? 'in' : b.status === 'in' ? 'out' : null
  const waText = t('hs.waText', { name: b.guestName.split(' ')[0], kos: data.settings.propertyName, code: room.code, from: fmtDate(b.checkIn, lang), to: fmtDate(b.checkOut, lang), n: nights(b), time: data.settings.checkInTime })
  return (
    <>
      <div className="row">
        <span className="badge-win win homestay" style={{ height: 44, width: 44 }}>{room.code}</span>
        <span className="stack grow"><span style={{ fontSize: 19, fontWeight: 800 }}>{b.guestName}</span><span className="sub">{b.guestPhone} · {b.guests}×</span></span>
        <span className="chip" style={{ background: s?.color, color: '#fff' }}>{s?.name}</span>
      </div>
      <div className="facts">
        <div className="fact"><span>{t('hs.in')}</span><span>{fmtDate(b.checkIn, lang)} · {data.settings.checkInTime}</span></div>
        <div className="fact"><span>{t('hs.out')}</span><span>{fmtDate(b.checkOut, lang)} · {data.settings.checkOutTime}</span></div>
      </div>
      <div className="stack" style={{ padding: '12px 14px', borderRadius: 14, background: 'var(--sunken)', gap: 6 }}>
        <div className="kv"><span>{t('hs.calc', { n: nights(b), rate: rp(b.rate) })}</span><span>{rp(bookingTotal(b))}</span></div>
        <div className="kv"><span>{t('hs.commission', { source: s?.name ?? '', pct: b.commissionPct })}</span><span>{rp(-bookingCommission(b))}</span></div>
        <div className="divider" />
        <div className="kv"><span style={{ color: 'var(--ink)', fontWeight: 800 }}>{t('hs.net')}</span><span style={{ color: 'var(--good)' }}>{rp(bookingNet(b))}</span></div>
      </div>
      <div className="btn-row">
        <button className="btn wa" onClick={() => { openWhatsApp(b.guestPhone, waText); onClose() }}>{t('hs.waGuest')}</button>
        <button className="btn primary" disabled={!next} onClick={() => next && onStatus(next)}>{next === 'in' ? t('hs.checkin') : next === 'out' ? t('hs.checkout') : t('hs.done')}</button>
      </div>
      {b.status === 'booked' && <button className="btn danger block" onClick={() => onStatus('cancelled')}>{t('hs.cancel')}</button>}
    </>
  )
}

function NewBooking({ defaultRoom, onDone, addBooking }: { defaultRoom?: string; onDone: (ok: boolean) => void; addBooking: ReturnType<typeof useStore>['addBooking'] }) {
  const { t, lang } = usePrefs()
  const { data, today } = useStore()
  const hsRooms = data.rooms.filter((r) => r.rentMode !== 'monthly')
  const [roomId, setRoomId] = useState(defaultRoom ?? '')
  const room = data.rooms.find((r) => r.id === roomId)
  const [checkIn, setIn] = useState(addDays(today, 1))
  const [checkOut, setOut] = useState(addDays(today, 3))
  const [guestName, setName] = useState('')
  const [guestPhone, setPhone] = useState('')
  const [guests, setGuests] = useState(1)
  const [sourceId, setSource] = useState(data.sources[0]?.id ?? 'direct')
  const [rateText, setRate] = useState(rp(room?.nightlyPrice ?? 0))
  const [paid, setPaid] = useState<Booking['paid']>('unpaid')
  const rate = parseRupiah(rateText)
  const n = nights({ checkIn, checkOut })
  const src = data.sources.find((s) => s.id === sourceId)
  const total = n * rate, netAmt = total - Math.round((total * (src?.commissionPct ?? 0)) / 100)
  const conflict = useMemo(() => (room && n > 0 ? findConflict(data.bookings, { roomId: room.id, checkIn, checkOut }) : undefined), [data.bookings, room, checkIn, checkOut, n])
  const repairClash = room?.repairUntil && checkIn <= room.repairUntil
  const valid = !!room && n > 0 && !conflict && !repairClash && guestName.trim().length > 1 && rate > 0
  const save = () => {
    if (!room) return
    const res = addBooking({ roomId: room.id, guestName: guestName.trim(), guestPhone: guestPhone.trim(), guests, checkIn, checkOut, rate, sourceId, paid, dpAmount: paid === 'dp' ? rate : 0 })
    onDone(res.ok)
  }
  return (
    <>
      <h2>{t('hs.new')}</h2>
      <div className="stack-lg">
        <span className="field">{t('tenant.room')}</span>
        <Choices value={roomId} onChange={(id) => { setRoomId(id); const r = data.rooms.find((x) => x.id === id); if (r) setRate(rp(r.nightlyPrice)) }} options={hsRooms.map((r) => ({ value: r.id, label: `${r.code} · ${rp(r.nightlyPrice)}` }))} />
      </div>
      <div className="grid2">
        <label className="field">{t('hs.in')}<input type="date" value={checkIn} min={today} onChange={(e) => setIn(e.target.value)} /></label>
        <label className="field">{t('hs.out')}<input type="date" value={checkOut} min={addDays(checkIn, 1)} onChange={(e) => setOut(e.target.value)} /></label>
      </div>
      {n <= 0 ? <div className="hint warn">{t('hs.invalid')}</div>
        : conflict ? <div className="hint warn">{t('hs.conflict', { name: conflict.guestName, from: fmtDate(conflict.checkIn, lang), to: fmtDate(conflict.checkOut, lang) })}</div>
        : repairClash ? <div className="hint warn">{t('rooms.repairUntil', { note: room?.repairNote ?? t('state.repair'), date: fmtDate(addDays(room!.repairUntil!, 1), lang) })}</div>
        : room && <div className="hint">{t('hs.free', { code: room.code })}</div>}
      <label className="field">{t('hs.guest')}<input value={guestName} onChange={(e) => setName(e.target.value)} placeholder={t('hs.guestPh')} /></label>
      <div className="grid2">
        <label className="field">{t('hs.phone')}<input type="tel" inputMode="tel" value={guestPhone} onChange={(e) => setPhone(e.target.value)} placeholder="08xx" /></label>
        <label className="field">{t('hs.guests')}<input type="number" inputMode="numeric" min={1} max={6} value={guests} onChange={(e) => setGuests(Math.max(1, Number(e.target.value) || 1))} /></label>
      </div>
      <div className="stack-lg">
        <span className="field">{t('hs.source')}</span>
        <Choices value={sourceId} onChange={setSource} options={data.sources.map((s) => ({ value: s.id, label: s.name }))} />
      </div>
      <div className="grid2">
        <label className="field">{t('hs.rate')}<input inputMode="numeric" value={rateText} onChange={(e) => setRate(rp(parseRupiah(e.target.value)))} /></label>
        <div className="stack-lg">
          <span className="field">{t('hs.payment')}</span>
          <Choices value={paid} onChange={setPaid} options={[{ value: 'unpaid', label: t('pay.unpaid') }, { value: 'dp', label: 'DP' }, { value: 'paid', label: t('pay.full') }]} />
        </div>
      </div>
      <div className="stack" style={{ padding: '12px 14px', borderRadius: 14, background: 'var(--sunken)', gap: 6 }}>
        <div className="kv"><span>{t('hs.calc', { n: Math.max(0, n), rate: rp(rate) })}</span><span>{rp(Math.max(0, total))}</span></div>
        <div className="kv"><span>{t('hs.netAfter', { pct: src?.commissionPct ?? 0 })}</span><span style={{ color: 'var(--good)' }}>{rp(Math.max(0, netAmt))}</span></div>
      </div>
      <button className="btn primary block" disabled={!valid} onClick={save}>{t('common.save')}</button>
    </>
  )
}
