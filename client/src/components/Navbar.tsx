// components/Navbar/Navbar.tsx
import '@/styles/components/navBar.css'
import React, { useEffect, useState, useCallback } from 'react'
import swasNavbarIcon from '@/assets/icons/swasNavbarIcon.svg'
import faviconSwas from '@/assets/icons/favicon-swas.svg'
import NotifIcon from '@/components/icons/NotifIcon'
import { NotifSheet } from '@/components/NotifSheet'
import { getBranchNameForNavbar } from '@/utils/api/getBranchName'
import { PickupProvider } from '@/context/PickupContext'

// Types
type NavPage = 
  | 'serviceRequest' 
  | 'operations' 
  | 'payment' 
  | 'central-view' 
  | 'customer-information' 
  | 'branches' 
  | 'analytics' 
  | 'appointments' 
  | 'announcements'

type NavbarProps = {
  activePage: NavPage
  setActivePage: React.Dispatch<React.SetStateAction<NavPage>>
  onLogout: () => void
}

type Visibility = {
  showServiceRequest: boolean
  showOperations: boolean
  showPayments: boolean
  showDatabaseView: boolean
  showAnalytics: boolean
  showUserManagement: boolean
  showNotifSheet: boolean
}

// Navigation items configuration
const NAV_ITEMS: Array<{
  id: NavPage
  label: string
  icon: string
  visibilityKey: keyof Visibility
}> = [
  { id: 'serviceRequest', label: 'Service Request', icon: 'bi-receipt-cutoff', visibilityKey: 'showServiceRequest' },
  { id: 'operations', label: 'Operations', icon: 'bi-truck', visibilityKey: 'showOperations' },
  { id: 'payment', label: 'Payments', icon: 'bi-credit-card', visibilityKey: 'showPayments' },
  { id: 'central-view', label: 'Central View', icon: 'bi-database', visibilityKey: 'showDatabaseView' },
  { id: 'customer-information', label: 'Customers', icon: 'bi-person-lines-fill', visibilityKey: 'showDatabaseView' },
  { id: 'branches', label: 'Branches', icon: 'bi-shop-window', visibilityKey: 'showDatabaseView' },
  { id: 'analytics', label: 'Analytics', icon: 'bi-bar-chart-line', visibilityKey: 'showAnalytics' },
  { id: 'appointments', label: 'Appointments', icon: 'bi-calendar4-week', visibilityKey: 'showUserManagement' },
  { id: 'announcements', label: 'Announcements', icon: 'bi-megaphone', visibilityKey: 'showUserManagement' },
]

const NavLink: React.FC<{
  label: string
  isActive: boolean
  onClick: () => void
  icon: string
}> = ({ label, isActive, onClick, icon }) => {
  const handleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    onClick()
  }, [onClick])

  return (
    <li className={isActive ? 'nav-active' : ''}>
      <a 
        href="#" 
        onClick={handleClick}
        aria-current={isActive ? 'page' : undefined}
        className="nav-link"
      >
        <i className={icon}></i>
        <span className="nav-label">{label}</span>
      </a>
    </li>
  )
}

// Main component
export default function Navbar({ activePage, setActivePage, onLogout }: NavbarProps) {
  const [branchName, setBranchName] = useState<string | null>(null)
  const [isCollapsed, setIsCollapsed] = useState(false)

  // Get visibility based on user role
  const visibility = useVisibility()

  // Fetch branch name
  useEffect(() => {
    let mounted = true
    async function fetchBranchName() {
      const name = await getBranchNameForNavbar()
      if (mounted) setBranchName(name)
    }
    fetchBranchName()
    return () => { mounted = false }
  }, [])

  const handlePageChange = useCallback((page: NavPage) => {
    setActivePage(page)
  }, [setActivePage])

  const toggleCollapse = useCallback(() => {
    setIsCollapsed(prev => !prev)
  }, [])

  // Filter visible items based on user role
  const visibleItems = NAV_ITEMS.filter(item => visibility[item.visibilityKey])

  return (
    <PickupProvider>
      <nav className={`navBar ${isCollapsed ? 'collapsed' : ''}`} role="navigation" aria-label="Main navigation">
        <div className="navBar-contents">
          {/* Logo section - SWAS text removed */}
          <div className="navBar-header">
            <div className="nav-logo-wrapper">
              <img 
                src={faviconSwas} 
                alt="SWAS Logo" 
                className={`nav-logo-icon ${isCollapsed ? 'collapsed-logo' : 'expanded-logo'}`}
              />
              <img 
                src={swasNavbarIcon} 
                alt="SWAS Favicon" 
                className={`nav-logo-favicon ${isCollapsed ? 'collapsed-favicon' : 'expanded-favicon'}`}
              />
            </div>
            {/* SWAS text removed */}
            <button 
              className="collapse-toggle"
              onClick={toggleCollapse}
              aria-label={isCollapsed ? 'Expand navigation' : 'Collapse navigation'}
            >
              <i className={`bi ${isCollapsed ? 'bi-chevron-right' : 'bi-chevron-left'}`}></i>
            </button>
          </div>

          {/* Branch name */}
          {!isCollapsed && (
            <div className="nav-branch-name">
              <span>{branchName ? `${branchName}` : "Loading..."}</span>
            </div>
          )}

          {/* Navigation links */}
          <div className="navBar-links">
            <ul>
              {visibleItems.map(item => (
                <NavLink 
                  key={item.id}
                  label={item.label}
                  isActive={activePage === item.id}
                  onClick={() => handlePageChange(item.id)}
                  icon={item.icon}
                />
              ))}
            </ul>
          </div>

          {/* Bottom section */}
          <div className="navBar-footer">
            {visibility.showNotifSheet && (
              <div className="nav-footer-item">
                <NotifSheet>
                  <button className="nav-footer-btn" aria-label="Notifications">
                    <i className="bi-bell"></i>
                    {!isCollapsed && <span className="nav-label">Notifications</span>}
                  </button>
                </NotifSheet>
              </div>
            )}
            <div className="nav-footer-item">
              <button 
                className="nav-footer-btn logout-btn"
                onClick={onLogout}
                aria-label="Log out"
              >
                <i className="bi-box-arrow-in-right"></i>
                {!isCollapsed && <span className="nav-label">Logout</span>}
              </button>
            </div>
          </div>
        </div>
      </nav>
    </PickupProvider>
  )
}

// Custom hook for visibility rules
function useVisibility(): Visibility {
  const sessionPosition = (sessionStorage.getItem('position') || '').toLowerCase()
  const sessionBranchType = (sessionStorage.getItem('branch_type') || '').toUpperCase()

  // Default: show everything
  let visibility: Visibility = {
    showServiceRequest: true,
    showOperations: true,
    showPayments: true,
    showDatabaseView: true,
    showAnalytics: true,
    showUserManagement: true,
    showNotifSheet: true,
  }

  const pos = sessionPosition
  const bt = sessionBranchType

  // Role-based visibility rules
  if (pos === 'superadmin' && bt === 'A') {
    // All access
  } else if (pos === 'manager' && bt === 'B') {
    // Full access
  } else if (pos === 'staff' && bt === 'B') {
    visibility = {
      ...visibility,
      showDatabaseView: false,
    }
  } else if (pos === 'manager' && bt === 'W') {
    visibility = {
      ...visibility,
      showServiceRequest: false,
      showPayments: false,
      showUserManagement: false,
    }
  } else if (pos === 'staff' && bt === 'W') {
    visibility = {
      ...visibility,
      showServiceRequest: false,
      showPayments: false,
      showDatabaseView: false,
      showUserManagement: false,
    }
  }

  return visibility
}