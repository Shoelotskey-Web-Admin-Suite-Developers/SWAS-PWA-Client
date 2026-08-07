// components/Navbar/Navbar.tsx
import '@/styles/components/navBar.css'
import React, { useEffect, useState, useCallback } from 'react'
import swasNavbarIcon from '@/assets/icons/swasNavbarIcon.svg'
import faviconSwas from '@/assets/icons/favicon-swas.svg'
import avatarSuperAdmin from '@/assets/images/avatarSuperAdmin.png'
import avatarBranch from '@/assets/images/avatarBranch.png'
import avatarWarehouse from '@/assets/images/avatarWarehouse.png'
import { NotifSheet } from '@/components/NotifSheet'
import { getBranchNameForNavbar } from '@/utils/api/getBranchName'
import { PickupProvider, usePickupRows } from '@/context/PickupContext'
import { NAV_ITEMS, type NavPage } from '@/constants/navigation'
import { useAppointmentUpdates } from '@/hooks/useAppointmentUpdates'
import { getAppointmentsPending } from '@/utils/api/getAppointmentsPending'

type NavbarProps = {
  activePage: NavPage
  setActivePage: React.Dispatch<React.SetStateAction<NavPage>>
  isCollapsed: boolean
  onToggleCollapse: () => void
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

// Badge component for stacked notifications
const NotificationBadgeStack: React.FC<{
  warningCount: number
  pendingCount: number
}> = ({ warningCount, pendingCount }) => {
  const hasWarnings = warningCount > 0
  const hasPending = pendingCount > 0
  
  if (!hasWarnings && !hasPending) return null

  return (
    <div className="notification-badge-stack">
      {hasWarnings && (
        <span className="badge-warning">{warningCount > 99 ? '99+' : warningCount}</span>
      )}
      {hasPending && (
        <span className="badge-pending">{pendingCount > 99 ? '99+' : pendingCount}</span>
      )}
    </div>
  )
}

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

// Component that provides warning count to Navbar
function NavbarWithWarnings(props: NavbarProps) {
  const pickupRows = usePickupRows()
  const [pendingCount, setPendingCount] = useState(0)
  const { changes: appointmentChanges } = useAppointmentUpdates()

  // Calculate warnings count
  const warnings = pickupRows.filter(row =>
    row.pickupNotice &&
    (row.allowanceDays < 0 || row.allowanceDays <= 3)
  )

  const warningCount = warnings.length

  // Fetch pending appointments count
  const fetchPendingCount = useCallback(async () => {
    try {
      const data = await getAppointmentsPending()
      const items = data || []
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const upcoming = items.filter((appt: any) => {
        if (!appt.date_for_inquiry) return true
        const d = new Date(appt.date_for_inquiry)
        d.setHours(0, 0, 0, 0)
        return d >= today
      })
      setPendingCount(upcoming.length)
    } catch (err) {
      console.error("Failed to fetch pending appointments count:", err)
    }
  }, [])

  // Initial fetch and refresh on changes
  useEffect(() => {
    fetchPendingCount()
  }, [fetchPendingCount])

  useEffect(() => {
    if (appointmentChanges) {
      const t = setTimeout(() => fetchPendingCount(), 300)
      return () => clearTimeout(t)
    }
  }, [appointmentChanges, fetchPendingCount])

  // Render Navbar with counts
  return <NavbarComponent {...props} warningCount={warningCount} pendingCount={pendingCount} />
}

// Main Navbar Component
function NavbarComponent({ 
  activePage, 
  setActivePage, 
  isCollapsed, 
  onToggleCollapse, 
  onLogout,
  warningCount = 0,
  pendingCount = 0
}: NavbarProps & { warningCount?: number; pendingCount?: number }) {
  const [branchName, setBranchName] = useState<string | null>(null)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // Get visibility based on user role
  const visibility = useVisibility()

  // Get branch type from session storage
  const branchType = (sessionStorage.getItem('branch_type') || '').toUpperCase()

  // Get the appropriate avatar based on branch type
  const getAvatar = () => {
    if (branchType === 'A') return avatarSuperAdmin
    if (branchType === 'B') return avatarBranch
    if (branchType === 'W') return avatarWarehouse
    return avatarBranch // default fallback
  }

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
    setIsMobileMenuOpen(false)
  }, [setActivePage])

  const toggleMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(prev => !prev)
  }, [])

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.classList.add('menu-open')
    } else {
      document.body.classList.remove('menu-open')
    }
    return () => {
      document.body.classList.remove('menu-open')
    }
  }, [isMobileMenuOpen])

  // Filter visible items based on user role
  const visibleItems = NAV_ITEMS.filter(item => visibility[item.visibilityKey])

  // Determine if labels should be shown
  const showLabels = !isCollapsed || isMobileMenuOpen

  // Determine which badges to show based on role
  const showWarningBadge = true // Warnings shown for all roles
  const showPendingBadge = visibility.showPendingAppointments !== false // Default true

  const warningCountToShow = showWarningBadge ? warningCount : 0
  const pendingCountToShow = showPendingBadge ? pendingCount : 0

  return (
    <PickupProvider>
      {/* Mobile Hamburger Button */}
      <button 
        className={`mobile-hamburger ${isMobileMenuOpen ? 'hidden' : ''}`}
        onClick={toggleMobileMenu}
        aria-label="Open menu"
      >
        <span className="hamburger-line"></span>
        <span className="hamburger-line"></span>
        <span className="hamburger-line"></span>
      </button>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div className="mobile-overlay" onClick={toggleMobileMenu}></div>
      )}

      <nav 
        className={`navBar ${isCollapsed ? 'collapsed' : ''} ${isMobileMenuOpen ? 'mobile-open' : ''}`} 
        role="navigation" 
        aria-label="Main navigation"
      >
        <div className="navBar-contents">
          {/* Logo section with branch name */}
          <div className="navBar-header">
            <div className="nav-logo-wrapper">
              <img 
                src={faviconSwas} 
                alt="SWAS Logo" 
                className="nav-logo-icon"
              />
              <img 
                src={swasNavbarIcon} 
                alt="SWAS Favicon" 
                className="nav-logo-favicon"
              />
            </div>
            
            {/* Branch name - shown when expanded */}
            <div className={`nav-branch-name ${!showLabels ? 'hidden' : ''}`}>
              <span>{branchName ? `${branchName}` : "Loading..."}</span>
            </div>
            
            {/* Close button on mobile - top right */}
            <button 
              className="mobile-close-btn"
              onClick={toggleMobileMenu}
              aria-label="Close menu"
            >
              <i className="bi bi-x-lg"></i>
            </button>

            <button 
              className="collapse-toggle desktop-only"
              onClick={onToggleCollapse}
              aria-label={isCollapsed ? 'Expand navigation' : 'Collapse navigation'}
            >
              <i className={`bi ${isCollapsed ? 'bi-chevron-right' : 'bi-chevron-left'}`}></i>
            </button>
          </div>

          {/* Navigation links - This will take remaining space and be scrollable */}
          <div className="navBar-links-wrapper">
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
          </div>

          {/* Bottom section - Fixed at bottom */}
          <div className="navBar-footer">
            {visibility.showNotifSheet && (
              <div className="nav-footer-item">
                <NotifSheet>
                  <button className="nav-footer-btn notification-btn" aria-label="Notifications">
                    <div className="notification-icon-wrapper">
                      <i className="bi-bell"></i>
                      <NotificationBadgeStack 
                        warningCount={warningCountToShow}
                        pendingCount={pendingCountToShow}
                      />
                    </div>
                    <span className="nav-label">Notifications</span>
                  </button>
                </NotifSheet>
              </div>
            )}
            
            {/* User section - Avatar + Branch Name + Logout */}
            <div className="nav-footer-user">
              {/* Container for user info - only shown when expanded */}
              <div className={`user-info-container ${!showLabels ? 'collapsed' : ''}`}>
                {/* Avatar - click to expand when collapsed */}
                <div 
                  className="user-avatar" 
                  onClick={isCollapsed ? onToggleCollapse : undefined}
                  style={{ cursor: isCollapsed ? 'pointer' : 'default' }}
                  role="button"
                  aria-label={isCollapsed ? "Expand navigation" : "User avatar"}
                >
                  <img 
                    src={getAvatar()} 
                    alt={`${branchType} avatar`}
                    className="avatar-image"
                  />
                </div>
                
                {/* Branch name - uses nav-label class for consistent styling */}
                <span className={`nav-label footer-branch-name ${!showLabels ? 'hidden' : ''}`}>
                  {branchName ? `${branchName}` : "Loading..."}
                </span>
                
                {/* Logout icon - only shown when expanded (like branch name/nav-label) */}
                {showLabels && (
                  <button 
                    className="nav-footer-btn logout-btn"
                    onClick={onLogout}
                    aria-label="Log out"
                  >
                    <i className="bi-box-arrow-in-right"></i>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>
    </PickupProvider>
  )
}

// Export the wrapped component
export default function Navbar(props: NavbarProps) {
  return (
    <PickupProvider>
      <NavbarWithWarnings {...props} />
    </PickupProvider>
  )
}

// Custom hook for visibility rules
function useVisibility(): Visibility & { showPendingAppointments?: boolean } {
  const sessionPosition = (sessionStorage.getItem('position') || '').toLowerCase()
  const sessionBranchType = (sessionStorage.getItem('branch_type') || '').toUpperCase()

  // Default: show everything
  let visibility: Visibility & { showPendingAppointments?: boolean } = {
    showServiceRequest: true,
    showOperations: true,
    showPayments: true,
    showDatabaseView: true,
    showAnalytics: true,
    showUserManagement: true,
    showNotifSheet: true,
    showPendingAppointments: true,
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
      showPendingAppointments: false,
    }
  } else if (pos === 'staff' && bt === 'W') {
    visibility = {
      ...visibility,
      showServiceRequest: false,
      showPayments: false,
      showDatabaseView: false,
      showUserManagement: false,
      showPendingAppointments: false,
    }
  }

  return visibility
}