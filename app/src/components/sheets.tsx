import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { BedDouble, Receipt, UserPlus, Wallet } from 'lucide-react'
import { useStore } from '../data/store'
import { usePrefs } from '../lib/prefs'
import { roomView, invoiceStatus, type RoomView } from '../domain/billing'
import type { ExpenseCategory, Invoice, PayMethod } from '../domain/types'
import { fmtDate, monthName } from '../lib/dates'
import { fillTemplate, initials, parseRupiah, rp } from '../lib/format'
import { openWhatsApp } from '../lib/wa'
import { roomChip } from '../lib/labels'
import { Choices, Sheet, useToast } from './ui'

type SheetState =
  | { kind: 'pay'; invoiceId: string }
  | { kind: 'wa'; invoiceId: string }
  | { kind: 'room'; roomId: string }
  | { kind: 'tenant'; roomId?: string }
  | { kind: 'expense' }
  | { kind: 'quick' }
  | null

const Ctx = createContext<(s: SheetState) => void>(() => undefined)
export const useSheets = () => useContext(Ctx)

export function useRoomViews(): RoomView[] {
  const { data, today } = useStore()
  return useMemo(() => data.rooms.map((r) => roomView(data, r, today)), [data, today])
}

export function SheetHost({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SheetState>(null)
  const close = useCallback(() => setState(null), [])
  return (
    <Ctx.Provider value={setState}>
      {children}
      {state?.kind === 'pay' && <PaySheet invoiceId={state.invoiceId} onClose={close} />}
      {state?.kind === 'wa' && <WaSheet invoiceId={state.invoiceId} onClose={close} />}
      {state?.kind === 'room' && <RoomSheet roomId={state.roomId} onClose={close} open={setState} />}
      {state?.kind === 'tenant' && <TenantSheet roomId={state.roomId} onClose={close} />}
      {state?.kind === 'expense' && <ExpenseSheet onClose={close} />}
      {state?.kind === 'quick' && <QuickSheet onClose={close} open={setState} />}
    </Ctx.Provider>
  )
}

function useInvoiceContext(invoiceId: string) {
  const { data, today } = useStore()
  const inv = data.invoices.find((i) => i.id === invoiceId) as Invoice
  const lease = data.leases.find((l) => l.id === inv?.leaseId)
  const tenant = data.tenants.find((x) => x.id === lease?.tenantId)
  const room = data.rooms.find((r) => r.id === lease?.roomId)
  const status = inv ? invoiceStatus(inv, data.payments, today, data.settings) : undefined
  return { inv, lease, tenant, room, status, data, today }
}

function PaySheet({ invoiceId, onClose }: { invoiceId: string; onClose: () => void }) {
  const { t, lang } = usePrefs()
  const toast = useToast()
  const { recordPayment, voidPayment } = useStore()
  const { inv, tenant, room, status, today } = useInvoiceContext(invoiceId)
  const [method, setMethod] = useState<PayMethod>('transfer')
  const [amountText, setAmountText] = useState(rp(status?.remaining ?? inv?.amount ?? 0))
  if (!inv || !tenant || !room || !status) return null
  const amount = parseRupiah(amountText)
  const save = () => {
    const pid = recordPayment(inv.id, amount, method)
    onClose()
    toast(t('pay.done', { name: tenant.name.split(' ')[0], method: t(`method.${method}`) }), () => voidPayment(pid))
  }
  return (
    <Sheet open onClose={onClose} label={t('pay.title')}>
      <h2>{t('pay.title')}</h2>
      <div className="row" style={{ padding: 12, borderRadius: 14, background: 'var(--sunken)' }}>
        <span className="avatar round">{initials(tenant.name)}</span>
        <span className="stack"><span className="title">{tenant.name}</span><span className="sub">{t('pay.rentLine', { code: room.code, month: monthName(inv.period, lang) })}</span></span>
      </div>
      <label className="field">{t('pay.amount')}
        <input inputMode="numeric" value={amountText} onChange={(e) => setAmountText(rp(parseRupiah(e.target.value)))} style={{ fontSize: 24, fontWeight: 800, height: 56 }} />
      </label>
      {status.lateFee > 0 && <div className="hint warn">{t('bills.lateFee', { amount: rp(status.lateFee) })}</div>}
      <div className="stack-lg">
        <span className="field">{t('pay.method')}</span>
        <Choices value={method} onChange={setMethod} options={(['cash', 'transfer', 'qris'] as PayMethod[]).map((m) => ({ value: m, label: t(`method.${m}`) }))} />
      </div>
      <div className="kv"><span>{t('pay.date')}</span><span>{t('common.today')}, {fmtDate(today, lang, true)}</span></div>
      <button className="btn primary block" disabled={amount <= 0} onClick={save}>{t('pay.mark')}</button>
    </Sheet>
  )
}

function WaSheet({ invoiceId, onClose }: { invoiceId: string; onClose: () => void }) {
  const { t, lang } = usePrefs()
  const { inv, tenant, room, status, data } = useInvoiceContext(invoiceId)
  if (!inv || !tenant || !room || !status) return null
  const isReceipt = status.state === 'paid'
  const tpl = data.settings.templates[isReceipt ? 'receipt' : 'reminder'][lang]
  const text = fillTemplate(tpl, {
    nama: tenant.name.split(' ')[0], kamar: room.code, bulan: monthName(inv.period, lang).split(' ')[0],
    nominal: rp(isReceipt ? inv.amount : status.remaining), jatuh_tempo: fmtDate(inv.dueDate, lang),
    rekening: data.settings.bankAccount, kos: data.settings.propertyName,
    tanggal_bayar: status.lastPayment ? fmtDate(status.lastPayment.paidAt, lang, true) : '',
  })
  return (
    <Sheet open onClose={onClose} label={t(isReceipt ? 'wa.receipt' : 'wa.reminder')}>
      <div className="stack"><h2>{t(isReceipt ? 'wa.receipt' : 'wa.reminder')}</h2><span className="sub">{t('wa.to', { name: tenant.name, phone: tenant.phone })}</span></div>
      <div style={{ padding: '14px 16px', borderRadius: '16px 16px 16px 4px', background: 'var(--bubble)', fontSize: 15, lineHeight: '22px', whiteSpace: 'pre-line' }}>{text}</div>
      <span className="sub">{t('wa.hint')}</span>
      <button className="btn primary block" onClick={() => { openWhatsApp(tenant.phone, text); onClose() }}>{t('wa.open')}</button>
    </Sheet>
  )
}

function RoomSheet({ roomId, onClose, open }: { roomId: string; onClose: () => void; open: (s: SheetState) => void }) {
  const { t, lang } = usePrefs()
  const nav = useNavigate()
  const { data, today, updateRoom } = useStore()
  const room = data.rooms.find((r) => r.id === roomId)
  if (!room) return null
  const v = roomView(data, room, today)
  const tenant = v.lease ? data.tenants.find((x) => x.id === v.lease!.tenantId) : undefined
  const unpaid = v.status && v.status.state !== 'paid'
  return (
    <Sheet open onClose={onClose} label={t('common.room', { code: room.code })}>
      <div className="row">
        <span className="stack grow"><span className="sub" style={{ fontWeight: 600 }}>{t('common.floor', { n: room.floor })} · {t(`mode.${room.rentMode}`)}{room.label ? ` · ${room.label}` : ''}</span><span style={{ fontSize: 22, fontWeight: 800 }}>{t('common.room', { code: room.code })}</span></span>
        <span className={'chip ' + v.key}>{roomChip(v, t)}</span>
      </div>
      {tenant && v.lease && (
        <>
          <div className="row" style={{ padding: 12, borderRadius: 14, background: 'var(--sunken)' }}>
            <span className="avatar round">{initials(tenant.name)}</span>
            <span className="stack"><span className="title">{tenant.name}</span><span className="sub">{tenant.phone} · {t('rooms.tenantSince', { date: fmtDate(v.lease.startDate, lang, true) })}</span></span>
          </div>
          <div className="facts">
            <div className="fact"><span>{t('rooms.rentMonth')}</span><span>{rp(v.lease.rent)}</span></div>
            <div className="fact"><span>{t('rooms.dueDate')}</span><span>{t('rooms.everyDay', { n: v.lease.dueDay })}</span></div>
          </div>
          {unpaid && v.invoice && (
            <div className="btn-row">
              <button className="btn wa" onClick={() => open({ kind: 'wa', invoiceId: v.invoice!.id })}>{t('rooms.remindWa')}</button>
              <button className="btn primary" onClick={() => open({ kind: 'pay', invoiceId: v.invoice!.id })}>{t('rooms.record')}</button>
            </div>
          )}
          <button className="btn block" onClick={() => { onClose(); nav(`/penghuni/${tenant.id}`) }}>{t('rooms.profile')}</button>
        </>
      )}
      {v.key === 'homestay' && (
        <>
          <div className="hint">{t('rooms.homestayNow', { name: v.guestName ?? '' })}</div>
          <button className="btn primary block" onClick={() => { onClose(); nav('/homestay') }}>{t('rooms.openHomestay')}</button>
        </>
      )}
      {v.key === 'empty' && (
        <>
          <div className="hint">{t('rooms.basePrice', { price: rp(room.basePrice) })}</div>
          {room.rentMode !== 'daily' && <button className="btn primary block" onClick={() => open({ kind: 'tenant', roomId: room.id })}>{t('rooms.fill')}</button>}
          {room.rentMode !== 'monthly' && <button className="btn block" onClick={() => { onClose(); nav('/homestay') }}>{t('rooms.openHomestay')}</button>}
        </>
      )}
      {v.key === 'repair' && (
        <>
          <div className="hint">{t('rooms.repairUntil', { note: room.repairNote ?? t('state.repair'), date: fmtDate(room.repairUntil!, lang) })}</div>
          <button className="btn block" onClick={() => { updateRoom(room.id, { repairUntil: undefined, repairNote: undefined }); onClose() }}>{t('rooms.markFixed')}</button>
        </>
      )}
    </Sheet>
  )
}

function TenantSheet({ roomId, onClose }: { roomId?: string; onClose: () => void }) {
  const { t } = usePrefs()
  const toast = useToast()
  const { data, today, addTenant } = useStore()
  const views = data.rooms.map((r) => roomView(data, r, today))
  const free = views.filter((v) => v.key === 'empty' && v.room.rentMode !== 'daily').map((v) => v.room)
  const [room, setRoom] = useState(roomId ?? free[0]?.id ?? '')
  const sel = data.rooms.find((r) => r.id === room)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [start, setStart] = useState(today)
  const [rentText, setRentText] = useState(rp(sel?.basePrice ?? 0))
  const valid = name.trim().length > 1 && phone.replace(/\D/g, '').length >= 9 && !!sel
  const save = () => {
    if (!sel) return
    const rent = parseRupiah(rentText)
    addTenant({ name, phone, roomId: sel.id, startDate: start, rent, deposit: rent })
    onClose()
    toast(t('tenant.saved'))
  }
  return (
    <Sheet open onClose={onClose} label={t('tenant.new')}>
      <div className="stack"><h2>{t('tenant.new')}</h2><span className="sub">{t('tenant.newNote')}</span></div>
      {free.length === 0 ? <div className="hint warn">{t('tenant.noRoom')}</div> : (
        <>
          <label className="field">{t('tenant.name')}<input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('tenant.namePh')} autoComplete="name" /></label>
          <label className="field">{t('tenant.phone')}<input type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="08xx-xxxx-xxxx" /></label>
          <div className="stack-lg">
            <span className="field">{t('tenant.room')}</span>
            <Choices value={room} onChange={(id) => { setRoom(id); const r = data.rooms.find((x) => x.id === id); if (r) setRentText(rp(r.basePrice)) }} options={free.map((r) => ({ value: r.id, label: `${r.code} · ${rp(r.basePrice)}` }))} />
          </div>
          <div className="grid2">
            <label className="field">{t('tenant.start')}<input type="date" value={start} onChange={(e) => setStart(e.target.value)} /></label>
            <label className="field">{t('tenant.rent')}<input inputMode="numeric" value={rentText} onChange={(e) => setRentText(rp(parseRupiah(e.target.value)))} /></label>
          </div>
          <button className="btn primary block" disabled={!valid} onClick={save}>{t('common.save')}</button>
        </>
      )}
    </Sheet>
  )
}

function ExpenseSheet({ onClose }: { onClose: () => void }) {
  const { t } = usePrefs()
  const toast = useToast()
  const { today, addExpense, voidExpense } = useStore()
  const [cat, setCat] = useState<ExpenseCategory>('elec')
  const [amountText, setAmountText] = useState('')
  const [note, setNote] = useState('')
  const amount = parseRupiah(amountText)
  const save = () => {
    const id = addExpense({ date: today, category: cat, amount, note: note.trim() })
    onClose()
    toast(t('exp.saved', { cat: t(`cat.${cat}`) }), () => voidExpense(id))
  }
  return (
    <Sheet open onClose={onClose} label={t('exp.add')}>
      <h2>{t('exp.add')}</h2>
      <div className="stack-lg">
        <span className="field">{t('exp.category')}</span>
        <Choices value={cat} onChange={setCat} options={(['elec', 'water', 'wifi', 'clean', 'repair', 'other'] as ExpenseCategory[]).map((c) => ({ value: c, label: t(`cat.${c}`) }))} />
      </div>
      <label className="field">{t('exp.amount')}<input inputMode="numeric" placeholder="Rp0" value={amountText} onChange={(e) => setAmountText(parseRupiah(e.target.value) ? rp(parseRupiah(e.target.value)) : '')} style={{ fontSize: 22, fontWeight: 800, height: 54 }} /></label>
      <label className="field">{t('exp.note')}<input value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('exp.notePh')} /></label>
      <button className="btn primary block" disabled={amount <= 0} onClick={save}>{t('common.save')}</button>
    </Sheet>
  )
}

function QuickSheet({ onClose, open }: { onClose: () => void; open: (s: SheetState) => void }) {
  const { t } = usePrefs()
  const nav = useNavigate()
  const items = [
    { icon: <Wallet size={22} />, tone: 'paid', title: t('quick.payment'), sub: t('quick.paymentSub'), go: () => { onClose(); nav('/tagihan') } },
    { icon: <UserPlus size={22} />, tone: 'empty', title: t('quick.tenant'), sub: t('quick.tenantSub'), go: () => open({ kind: 'tenant' }) },
    { icon: <BedDouble size={22} />, tone: 'homestay', title: t('quick.booking'), sub: t('quick.bookingSub'), go: () => { onClose(); nav('/homestay?baru=1') } },
    { icon: <Receipt size={22} />, tone: 'due', title: t('quick.expense'), sub: t('quick.expenseSub'), go: () => open({ kind: 'expense' }) },
  ]
  return (
    <Sheet open onClose={onClose} label={t('quick.title')}>
      <h2>{t('quick.title')}</h2>
      <div className="stack-lg">
        {items.map((it) => (
          <button key={it.title} className="row-btn" onClick={it.go}>
            <span className={'chip ' + it.tone} style={{ width: 44, height: 44, borderRadius: 12, justifyContent: 'center', padding: 0 }}>{it.icon}</span>
            <span className="stack"><span style={{ fontSize: 16, fontWeight: 700 }}>{it.title}</span><span className="sub">{it.sub}</span></span>
          </button>
        ))}
      </div>
    </Sheet>
  )
}
