import { useEffect } from 'react'
import { HashRouter, NavLink, Route, Routes, useLocation } from 'react-router-dom'
import { CloudOff, Home as HomeIcon, LayoutGrid, Menu, Plus, ReceiptText, X } from 'lucide-react'
import { StoreProvider, useStore } from './data/store'
import { PrefsProvider, usePrefs } from './lib/prefs'
import { AuthProvider, useAuth } from './lib/auth'
import { LoadProblem, LoginScreen, SetPasswordScreen } from './screens/Auth'
import { ToastProvider } from './components/ui'
import { SheetHost, useSheets } from './components/sheets'
import { PinGate } from './screens/Pin'
import { Splash } from './components/Loading'
import HomeScreen from './screens/Home'
import RoomsScreen from './screens/Rooms'
import BillsScreen from './screens/Bills'
import MoreScreen from './screens/More'
import TenantsScreen from './screens/Tenants'
import ProfileScreen from './screens/Profile'
import HomestayScreen from './screens/Homestay'
import ExpensesScreen from './screens/Expenses'
import ReportScreen from './screens/Report'
import SettingsScreen from './screens/Settings'

function TabBar() {
  const { t } = usePrefs()
  const open = useSheets()
  const cls = ({ isActive }: { isActive: boolean }) => 'tab' + (isActive ? ' active' : '')
  return (
    <nav className="tabbar" aria-label="Menu">
      <NavLink to="/" end className={cls}><HomeIcon size={22} />{t('nav.home')}</NavLink>
      <NavLink to="/kamar" className={cls}><LayoutGrid size={22} />{t('nav.rooms')}</NavLink>
      <button className="fab" aria-label={t('nav.quick')} onClick={() => open({ kind: 'quick' })}><Plus size={26} strokeWidth={2.4} /></button>
      <NavLink to="/tagihan" className={cls}><ReceiptText size={22} />{t('nav.bills')}</NavLink>
      <NavLink to="/lainnya" className={cls}><Menu size={22} />{t('nav.more')}</NavLink>
    </nav>
  )
}

const TAB_ROUTES = ['/', '/kamar', '/tagihan', '/lainnya']

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return null
}

function SyncError() {
  const { syncError, clearSyncError } = useStore()
  const { t } = usePrefs()
  useEffect(() => { if (!syncError) return; const id = setTimeout(clearSyncError, 6000); return () => clearTimeout(id) }, [syncError, clearSyncError])
  if (!syncError) return null
  return (
    <div className="hint warn sync-bar" role="alert">
      <CloudOff size={18} style={{ flex: 'none' }} /><span className="grow">{t('sync.error')}</span>
      <button className="icon-btn" aria-label={t('common.close')} onClick={clearSyncError} style={{ background: 'none', border: 0, color: 'inherit' }}><X size={18} /></button>
    </div>
  )
}

function Shell() {
  const { ready, loadState, loadError, reload } = useStore()
  const { t } = usePrefs()
  const { pathname } = useLocation()
  if (loadState === 'schema-missing' || loadState === 'error') return <LoadProblem schemaMissing={loadState === 'schema-missing'} detail={loadError} onRetry={reload} />
  if (!ready) return <Splash label={t('common.loading')} />
  return (
    <PinGate>
      <SyncError />
      <SheetHost>
        <div className="app">
          <ScrollToTop />
          <div className="page" key={pathname}>
          <Routes>
            <Route path="/" element={<HomeScreen />} />
            <Route path="/kamar" element={<RoomsScreen />} />
            <Route path="/tagihan" element={<BillsScreen />} />
            <Route path="/lainnya" element={<MoreScreen />} />
            <Route path="/penghuni" element={<TenantsScreen />} />
            <Route path="/penghuni/:id" element={<ProfileScreen />} />
            <Route path="/homestay" element={<HomestayScreen />} />
            <Route path="/pengeluaran" element={<ExpensesScreen />} />
            <Route path="/laporan" element={<ReportScreen />} />
            <Route path="/pengaturan" element={<SettingsScreen />} />
            <Route path="*" element={<HomeScreen />} />
          </Routes>
          </div>
          {TAB_ROUTES.includes(pathname) && <TabBar />}
        </div>
      </SheetHost>
    </PinGate>
  )
}

/** Supabase aktif → wajib masuk dulu. Tanpa Supabase (.env kosong) → mode demo di perangkat. */
function AuthGate() {
  const { enabled, loading, session, recovery } = useAuth()
  const { t } = usePrefs()
  if (enabled && loading) return <Splash label={t('common.loading')} />
  if (enabled && recovery && session) return <SetPasswordScreen />
  if (enabled && !session) return <LoginScreen />
  return (
    // key: ganti akun → data dimuat ulang dari awal
    <StoreProvider key={session?.user.id ?? 'demo'} cloud={enabled} ownerName={session?.user.user_metadata?.name as string | undefined}>
      <ToastProvider>
        <HashRouter>
          <Shell />
        </HashRouter>
      </ToastProvider>
    </StoreProvider>
  )
}

export default function App() {
  return (
    <PrefsProvider>
      <AuthProvider>
        <AuthGate />
      </AuthProvider>
    </PrefsProvider>
  )
}
