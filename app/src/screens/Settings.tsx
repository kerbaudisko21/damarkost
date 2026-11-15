import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Bell, LogOut, Pencil } from 'lucide-react'
import { useAuth } from '../lib/auth'
import type { DictKey } from '../lib/i18n'
import { enableNotifications, pushState, type PushResult } from '../lib/push'
import { useStore } from '../data/store'
import { usePrefs } from '../lib/prefs'
import type { Lang, RentMode } from '../domain/types'
import { activeLeaseForRoom } from '../domain/billing'
import { addMonths, monthName, periodOf } from '../lib/dates'
import { parseRupiah, rp } from '../lib/format'
import { Segmented, Sheet, SubHeader, Switch, useToast } from '../components/ui'
import { PinSetup } from './Pin'

const MODES: RentMode[] = ['monthly', 'daily', 'both']
const MSG: Record<PushResult, DictKey> = {
  unsupported: 'notif.unsupported', denied: 'notif.denied', local: 'notif.local', subscribed: 'notif.subscribed', 'install-first': 'notif.installFirst',
}

/** Ubah harga bulanan/harian, tipe, dan jenis sewa satu kamar (opsional: semua kamar setipe). */
function RoomEditSheet({ roomId, onClose }: { roomId: string; onClose: () => void }) {
  const { t, lang } = usePrefs()
  const toast = useToast()
  const { data, today, updateRoom, updateLease } = useStore()
  const room = data.rooms.find((r) => r.id === roomId)!
  const [label, setLabel] = useState(room.label ?? '')
  const [mode, setMode] = useState<RentMode>(room.rentMode)
  const [monthly, setMonthly] = useState(room.basePrice ? rp(room.basePrice) : '')
  const [nightly, setNightly] = useState(room.nightlyPrice ? rp(room.nightlyPrice) : '')
  const [allSameType, setAllSameType] = useState(false)
  const [applyTenant, setApplyTenant] = useState(false)
  const lease = activeLeaseForRoom(data, room.id, today)
  const tenant = lease ? data.tenants.find((x) => x.id === lease.tenantId) : undefined
  const sameType = data.rooms.filter((r) => r.id !== room.id)
  const nextMonth = monthName(addMonths(periodOf(today), 1), lang)
  const money = (v: string) => (parseRupiah(v) ? rp(parseRupiah(v)) : '')

  const save = () => {
    const patch = { label: label.trim() || undefined, rentMode: mode, basePrice: parseRupiah(monthly), nightlyPrice: parseRupiah(nightly) }
    updateRoom(room.id, patch)
    if (allSameType) for (const r of sameType) updateRoom(r.id, {
      ...(mode !== 'daily' ? { basePrice: patch.basePrice } : {}),
      ...(mode !== 'monthly' ? { nightlyPrice: patch.nightlyPrice } : {}),
    })
    if (applyTenant && lease && patch.basePrice) updateLease(lease.id, { rent: patch.basePrice })
    onClose()
    toast(t('room.saved', { code: room.code }))
  }

  return (
    <Sheet open onClose={onClose} label={t('room.edit', { code: room.code })}>
      <div className="stack"><h2>{t('room.edit', { code: room.code })}</h2><span className="sub">{t('common.floor', { n: room.floor })}</span></div>
      <label className="field">{t('room.label')}<input value={label} onChange={(e) => setLabel(e.target.value)} placeholder={t('room.labelPh')} /></label>
      <div className="stack-lg"><span className="field">{t('room.mode')}</span>
        <Segmented value={mode} onChange={setMode} options={MODES.map((m) => ({ value: m, label: t(`mode.${m}`) }))} />
      </div>
      <div className="grid2">
        {mode !== 'daily' && <label className="field">{t('room.monthly')}<input inputMode="numeric" placeholder="Rp0" value={monthly} onChange={(e) => setMonthly(money(e.target.value))} /></label>}
        {mode !== 'monthly' && <label className="field">{t('room.nightly')}<input inputMode="numeric" placeholder="Rp0" value={nightly} onChange={(e) => setNightly(money(e.target.value))} /></label>}
      </div>
      {sameType.length > 0 && (
        <div className="row"><span className="grow" style={{ fontSize: 14 }}>{t('room.applyAll', { n: sameType.length + 1 })}</span><Switch on={allSameType} onChange={setAllSameType} label={t('room.applyAll', { n: sameType.length + 1 })} /></div>
      )}
      {lease && tenant && mode !== 'daily' && parseRupiah(monthly) !== lease.rent && (
        <div className="row" style={{ padding: 12, borderRadius: 14, background: 'var(--sunken)' }}>
          <span className="stack grow"><span style={{ fontSize: 14, fontWeight: 700 }}>{t('room.applyTenant', { name: tenant.name.split(' ')[0] })}</span><span className="sub small">{t('room.applyTenantNote', { old: rp(lease.rent), month: nextMonth })}</span></span>
          <Switch on={applyTenant} onChange={setApplyTenant} label={t('room.applyTenant', { name: tenant.name })} />
        </div>
      )}
      <span className="sub small">{t('room.priceNote')}</span>
      <button className="btn primary block" onClick={save}>{t('common.save')}</button>
    </Sheet>
  )
}

export default function SettingsScreen() {
  const { t, theme, setTheme, lang, setLang } = usePrefs()
  const toast = useToast()
  const { data, updateSettings, resetDemo, mode } = useStore()
  const { session, signOut } = useAuth()
  const s = data.settings
  const [pinSetup, setPinSetup] = useState(false)
  const [editRoom, setEditRoom] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const { hash } = useLocation()
  useEffect(() => { if (hash === '#notif') setTimeout(() => document.getElementById('notif')?.scrollIntoView({ block: 'start' }), 50) }, [hash])
  const [notifMsg, setNotifMsg] = useState<DictKey | null>(() => (pushState() === 'granted' ? 'notif.on' : pushState() === 'denied' ? 'notif.denied' : null))
  const [tplKind, setTplKind] = useState<'reminder' | 'receipt'>('reminder')
  const setTpl = (text: string) => updateSettings({ templates: { ...s.templates, [tplKind]: { ...s.templates[tplKind], [lang as Lang]: text } } })

  return (
    <main className="screen sub">
      <SubHeader title={t('set.title')} />

      <section className="card">
        <h2>{t('set.display')}</h2>
        <Segmented value={theme} onChange={setTheme} options={[{ value: 'light', label: t('set.light') }, { value: 'dark', label: t('set.dark') }]} />
        <Segmented value={lang} onChange={setLang} options={[{ value: 'id', label: 'Bahasa Indonesia' }, { value: 'en', label: 'English' }]} />
      </section>

      <section className="card">
        <h2>{t('set.info')}</h2>
        <label className="field">{t('set.owner')}<input value={s.ownerName} autoComplete="name" onChange={(e) => updateSettings({ ownerName: e.target.value })} /></label>
        <label className="field">{t('set.name')}<input value={s.propertyName} onChange={(e) => updateSettings({ propertyName: e.target.value })} /></label>
        <label className="field">{t('set.bank')}<input value={s.bankAccount} onChange={(e) => updateSettings({ bankAccount: e.target.value })} /></label>
      </section>

      <section className="card">
        <h2>{t('set.billing')}</h2>
        <Segmented value={s.billingMode} onChange={(v) => updateSettings({ billingMode: v })} options={[{ value: 'entry', label: t('set.perEntry') }, { value: 'fixed', label: t('set.fixed') }]} />
        <span className="sub">{s.billingMode === 'entry' ? t('set.entryHelp') : t('set.fixedHelp')}</span>
        {s.billingMode === 'fixed' && (
          <>
            <label className="field">{t('set.fixedDay')}<input type="number" inputMode="numeric" min={1} max={28} value={s.fixedDay} onChange={(e) => updateSettings({ fixedDay: Math.min(28, Math.max(1, Number(e.target.value) || 1)) })} /></label>
            <div className="row"><span className="grow">{t('set.prorata')}</span><Switch on={s.prorata} onChange={(v) => updateSettings({ prorata: v })} label={t('set.prorata')} /></div>
          </>
        )}
        <div className="divider" />
        <div className="row"><span className="stack grow"><span className="title">{t('set.lateFee')}</span><span className="sub small">{t('set.lateFeeNote')}</span></span><Switch on={s.lateFeeEnabled} onChange={(v) => updateSettings({ lateFeeEnabled: v })} label={t('set.lateFee')} /></div>
        {s.lateFeeEnabled && (
          <div className="grid2">
            <label className="field">{t('set.grace')}<input type="number" inputMode="numeric" min={0} value={s.graceDays} onChange={(e) => updateSettings({ graceDays: Math.max(0, Number(e.target.value) || 0) })} /></label>
            <label className="field">{t('set.perDay')}<input inputMode="numeric" value={rp(s.lateFeePerDay)} onChange={(e) => updateSettings({ lateFeePerDay: parseRupiah(e.target.value) })} /></label>
          </div>
        )}
      </section>

      <section className="card" style={{ gap: 4 }}>
        <h2 style={{ marginBottom: 6 }}>{t('set.rooms')}</h2>
        {[...data.rooms].sort((a, b) => a.code.localeCompare(b.code)).map((r) => (
          <button key={r.id} className="row" onClick={() => setEditRoom(r.id)} aria-label={t('room.editAria', { code: r.code })}
            style={{ padding: '10px 0', border: 0, borderTop: '1px solid var(--line2)', background: 'none', textAlign: 'left', width: '100%' }}>
            <span style={{ width: 40, fontWeight: 800 }}>{r.code}</span>
            <span className="stack grow">
              <span className="sub small">{t('common.floor', { n: r.floor })}{r.label ? ` · ${r.label}` : ''}</span>
              <span className={'chip ' + (r.rentMode === 'monthly' ? 'paid' : r.rentMode === 'daily' ? 'homestay' : 'archived')} style={{ alignSelf: 'flex-start' }}>{t(`mode.${r.rentMode}`)}</span>
            </span>
            <span className="stack" style={{ alignItems: 'flex-end', fontSize: 13 }}>
              {r.rentMode !== 'daily' && <span className="num" style={{ fontWeight: 700 }}>{r.basePrice ? `${rp(r.basePrice)} ${t('common.perMonth')}` : t('room.noPrice')}</span>}
              {r.rentMode !== 'monthly' && <span className="num muted">{r.nightlyPrice ? `${rp(r.nightlyPrice)} ${t('common.perNight')}` : t('room.noPrice')}</span>}
            </span>
            <Pencil size={16} style={{ color: 'var(--ink2)', flex: 'none' }} />
          </button>
        ))}
        <span className="sub small" style={{ marginTop: 6 }}>{t('set.roomsNote')}</span>
      </section>

      <section className="card">
        <h2>{t('set.homestay')}</h2>
        <div className="grid2">
          <label className="field">Check-in<input value={s.checkInTime} onChange={(e) => updateSettings({ checkInTime: e.target.value })} /></label>
          <label className="field">Check-out<input value={s.checkOutTime} onChange={(e) => updateSettings({ checkOutTime: e.target.value })} /></label>
        </div>
        <div className="row"><span className="grow">{t('set.ktp')}</span><Switch on={s.requireGuestKtp} onChange={(v) => updateSettings({ requireGuestKtp: v })} label={t('set.ktp')} /></div>
        <span className="sub" style={{ fontWeight: 600 }}>{t('set.sources')}</span>
        <div className="pills">
          {data.sources.map((x) => <span key={x.id} className="chip" style={{ background: x.color, color: '#fff', height: 32, padding: '0 12px' }}>{x.name} · {x.commissionPct}%</span>)}
        </div>
      </section>

      <section className="card">
        <h2>{t('set.templates')}</h2>
        <Segmented value={tplKind} onChange={setTplKind} options={[{ value: 'reminder', label: t('set.tplReminder') }, { value: 'receipt', label: t('set.tplReceipt') }]} />
        <label className="field"><span className="sr-only">{t('set.templates')}</span><textarea rows={6} value={s.templates[tplKind][lang]} onChange={(e) => setTpl(e.target.value)} /></label>
        <span className="sub small">{t('set.tplVars')}</span>
      </section>

      <section className="card" id="notif">
        <h2>{t('notif.title')}</h2>
        <span className="sub">{t('notif.body')}</span>
        {notifMsg && <div className={'hint' + (notifMsg === 'notif.denied' || notifMsg === 'notif.unsupported' ? ' warn' : '')}>{t(notifMsg)}</div>}
        {pushState() !== 'granted' || !notifMsg ? (
          <button className="btn primary block" disabled={busy} aria-busy={busy} onClick={async () => { setBusy(true); try { setNotifMsg(MSG[await enableNotifications()]) } finally { setBusy(false) } }}>{busy ? <span className="spinner" /> : <Bell size={18} />}{busy ? t('common.working') : t('notif.enable')}</button>
        ) : null}
      </section>

      <section className="card">
        <h2>{t('set.security')}</h2>
        <div className="row">
          <span className="stack grow"><span className="title">{t('set.pin')}</span><span className="sub small">{t('set.pinNote')}</span></span>
          <Switch on={s.pinEnabled} onChange={(v) => (v ? setPinSetup(true) : updateSettings({ pinEnabled: false, pinHash: undefined }))} label={t('set.pin')} />
        </div>
      </section>

      {mode === 'cloud' ? (
        <section className="card">
          <h2>{t('auth.account')}</h2>
          <span className="title" style={{ wordBreak: 'break-all' }}>{session?.user.email}</span>
          <span className="sub">{t('auth.cloud')}</span>
          <button className="btn danger block" onClick={() => { if (window.confirm(t('auth.signOutConfirm'))) signOut() }}><LogOut size={18} />{t('auth.signOut')}</button>
        </section>
      ) : (
        <section className="card">
          <h2>{t('set.data')}</h2>
          <span className="sub">{t('common.demo')}</span>
          <button className="btn danger block" onClick={() => { if (window.confirm(t('set.resetConfirm'))) { resetDemo(); toast(t('set.resetDone')) } }}>{t('set.reset')}</button>
        </section>
      )}

      {editRoom && <RoomEditSheet roomId={editRoom} onClose={() => setEditRoom(null)} />}

      {pinSetup &&<PinSetup onDone={(hash) => { setPinSetup(false); if (hash) { updateSettings({ pinEnabled: true, pinHash: hash }); toast(t('pin.saved')) } }} />}
    </main>
  )
}
