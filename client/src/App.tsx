import '@/App.css'
import '@/index.css'
import { useEffect, useState, type CSSProperties } from 'react'
import Navbar from '@/components/Navbar'
import PageHeader from '@/components/PageHeader'
import SRM from '@/pages/srm'
import Operations from '@/pages/operations/operations'
import Payment from '@/pages/operations/payment'
import CentralView from '@/pages/database-view/CentralView'
import CustomerInformation from '@/pages/database-view/CustomerInformation'
import Branches from '@/pages/database-view/Branches'
import Analytics from '@/pages/analytics/analytics'
import Appointments from '@/pages/user-management/appointments'
import Announcements from '@/pages/user-management/announcements'
import Login from '@/pages/auth/login'
import { type NavPage } from '@/constants/navigation'

import { Toaster } from 'sonner'

function App() {
  // ───────────── STATES ─────────────
  const [activePage, setActivePage] = useState<NavPage>('serviceRequest')
  const [isNavCollapsed, setIsNavCollapsed] = useState(false)

  const [user, setUser] = useState<{
    user_id: string
    branch_id: string
    position: string
  } | null>(null)

  // ───────────── AUTO-LOGIN ─────────────
  useEffect(() => {
    const token = sessionStorage.getItem('token')
    if (token) {
      const user_id = sessionStorage.getItem('user_id')
      const branch_id = sessionStorage.getItem('branch_id')
      const position = sessionStorage.getItem('position')

      if (user_id && branch_id && position) {
        setUser({ user_id, branch_id, position })
      } else {
        handleLogout()
      }
    }
  }, [])

  // ───────────── HANDLERS ─────────────
  const handleLogout = () => {
    sessionStorage.clear()
    setUser(null)
    setIsNavCollapsed(false)
  }

  const handleToggleNavbar = () => {
    setIsNavCollapsed(prev => !prev)
  }

  // ───────────── PAGES MAP (no JSX.Element typing) ─────────────
  const pages = {
    serviceRequest: <SRM />,
    operations: <Operations />,
    payment: <Payment />,
    'central-view': <CentralView />,
    'customer-information': <CustomerInformation />,
    branches: <Branches />,
    analytics: <Analytics />,
    appointments: <Appointments />,
    announcements: <Announcements />,
  }

  // ───────────── CONDITIONAL RENDER ─────────────
  if (!user) {
    return (
      <Login onLogin={(userData) => setUser(userData)} />
    )
  }

  return (
    <div
      className="app-shell"
      style={{ '--sidebar-width': isNavCollapsed ? 'var(--nb-width-collapsed)' : 'var(--nb-width)' } as CSSProperties}
    >
      <div className="app-nav">
        <Navbar
          activePage={activePage}
          setActivePage={setActivePage}
          isCollapsed={isNavCollapsed}
          onToggleCollapse={handleToggleNavbar}
          onLogout={handleLogout}
        />
      </div>

      <div className={`app-content-shell ${activePage === 'serviceRequest' || activePage === 'payment' ? 'app-content-shell--overlay' : 'app-content-shell--flow'}`}>
        <PageHeader activePage={activePage} />
        <main className="app-main-content">{pages[activePage]}</main>
      </div>
      <Toaster
        position="top-center"
        richColors
        toastOptions={{
          style: { top: '60px' } // keep toasts clear of the navbar
        }}
      />

    </div>
  )
}

export default App
