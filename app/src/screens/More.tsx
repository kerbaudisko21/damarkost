import { useMemo } from 'react'
import { BarChart3, BedDouble, ReceiptText, Settings as SettingsIcon, Users } from 'lucide-react'
import { useStore } from '../data/store'
import { usePrefs } from '../lib/prefs'
import { monthSummary } from '../domain/billing'
import { monthName, periodOf } from '../lib/dates'
import { rp } from '../lib/format'
import { MenuLink, Switch } from '../components/ui'
import { InstallCard } from '../components/install'

export default function MoreScreen() {
  const { t, lang, theme, setTheme, setLang } = usePrefs()
  const { data, today } = useStore()
  const period = periodOf(today)
  const sum = useMemo(() => monthSummary(data, period, today), [data, period, today])
  const active = data.leases.filter((l) => !l.endDate).length
  return (
    <main className="screen">
      <h1 className="page-title">{t('more.title')}</h1>
      <section className="card">
        <div className="row" style={{ justifyContent: 'space-between' }}><h2>{t('more.summary', { month: monthName(period, lang).split(' ')[0] })}</h2><span className="sub">{t('more.toDate')}</span></div>
        <div className="kv"><span>{t('more.income')}</span><span className="num">{rp(sum.collected)}</span></div>
        <div className="kv"><span>{t('more.homestay')}</span><span className="num">{rp(sum.homestayNet)}</span></div>
        <div className="kv"><span>{t('more.expenses')}</span><span className="num">{rp(-sum.expenses)}</span></div>
        <div className="divider" />
        <div className="kv" style={{ alignItems: 'baseline' }}><span style={{ color: 'var(--ink)', fontWeight: 800 }}>{t('more.profit')}</span><span className="num" style={{ fontSize: 20, fontWeight: 800, color: 'var(--good)' }}>{rp(sum.profit)}</span></div>
      </section>

      <section className="card">
        <div className="row">
          <span className="stack grow"><span className="title">{t('more.dark')}</span><span className="sub small">{t('more.darkNote')}</span></span>
          <Switch on={theme === 'dark'} onChange={(v) => setTheme(v ? 'dark' : 'light')} label={t('more.dark')} />
        </div>
        <div className="row">
          <span className="title grow">{t('more.language')}</span>
          <div className="seg" style={{ width: 128 }}>
            <button className={lang === 'id' ? 'on' : ''} aria-pressed={lang === 'id'} onClick={() => setLang('id')}>ID</button>
            <button className={lang === 'en' ? 'on' : ''} aria-pressed={lang === 'en'} onClick={() => setLang('en')}>EN</button>
          </div>
        </div>
      </section>

      <section className="card" style={{ padding: 0, gap: 0, overflow: 'hidden' }}>
        <InstallCard compact />
        <MenuLink to="/homestay" icon={<BedDouble size={18} />} label={t('menu.homestay')} sub={t('menu.homestaySub')} />
        <MenuLink to="/penghuni" icon={<Users size={18} />} label={t('menu.tenants')} sub={t('menu.tenantsSub', { n: active })} />
        <MenuLink to="/pengeluaran" icon={<ReceiptText size={18} />} label={t('menu.expenses')} sub={t('menu.expensesSub', { amount: rp(sum.expenses) })} />
        <MenuLink to="/laporan" icon={<BarChart3 size={18} />} label={t('menu.report')} sub={t('menu.reportSub')} />
        <MenuLink to="/pengaturan" icon={<SettingsIcon size={18} />} label={t('menu.settings')} sub={t('menu.settingsSub')} />
      </section>
      <p className="sub small" style={{ textAlign: 'center', margin: 0 }}>{t('common.demo')}</p>
    </main>
  )
}
