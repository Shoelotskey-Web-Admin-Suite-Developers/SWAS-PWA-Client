import '@/App.css'
import '@/index.css'
import { useState, useEffect } from 'react'
import Navbar from '@/components/Navbar'
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

import { Toaster } from 'sonner'

function App() {
  // ───────────── STATES ─────────────
  const [activePage, setActivePage] = useState<
    | 'serviceRequest'
    | 'operations'
    | 'payment'
    | 'central-view'
    | 'customer-information'
    | 'branches'
    | 'analytics'
    | 'appointments'
    | 'announcements'
  >('serviceRequest')

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
    <div className="h-screen flex flex-col">
      <div className="shrink-0">
        <Navbar
          activePage={activePage}
          setActivePage={setActivePage}
          onLogout={handleLogout}
        />
      </div>

      <div className="flex-1 overflow-y-auto">{pages[activePage]}</div>
      <Toaster
        position="top-center"
        richColors
        toastOptions={{
          style: { top: '60px' } // offset below navbar height
        }}
      />

    </div>
  )
}

export default App
