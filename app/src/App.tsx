import { useEffect } from 'react'
import { HashRouter, NavLink, Route, Routes, useLocation } from 'react-router-dom'
import { Home as HomeIcon, LayoutGrid, Menu, Plus, ReceiptText } from 'lucide-react'
import { StoreProvider, useStore } from './data/store'
import { PrefsProvider, usePrefs } from './lib/prefs'
import { ToastProvider } from './components/ui'
import { SheetHost, useSheets } from './components/sheets'
import { PinGate } from './screens/Pin'
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

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return null
}

function Shell() {
  const { ready } = useStore()
  if (!ready) return null
  return (
    <PinGate>
      <SheetHost>
        <div className="app">
          <ScrollToTop />
          <Routes>
            <Route path="/" element={<><HomeScreen /><TabBar /></>} />
            <Route path="/kamar" element={<><RoomsScreen /><TabBar /></>} />
            <Route path="/tagihan" element={<><BillsScreen /><TabBar /></>} />
            <Route path="/lainnya" element={<><MoreScreen /><TabBar /></>} />
            <Route path="/penghuni" element={<TenantsScreen />} />
            <Route path="/penghuni/:id" element={<ProfileScreen />} />
            <Route path="/homestay" element={<HomestayScreen />} />
            <Route path="/pengeluaran" element={<ExpensesScreen />} />
            <Route path="/laporan" element={<ReportScreen />} />
            <Route path="/pengaturan" element={<SettingsScreen />} />
            <Route path="*" element={<><HomeScreen /><TabBar /></>} />
          </Routes>
        </div>
      </SheetHost>
    </PinGate>
  )
}

export default function App() {
  return (
    <PrefsProvider>
      <StoreProvider>
        <ToastProvider>
          <HashRouter>
            <Shell />
          </HashRouter>
        </ToastProvider>
      </StoreProvider>
    </PrefsProvider>
  )
}
