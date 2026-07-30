// components/Navbar/Navbar.tsx
import '@/styles/components/navBar.css'
import React, { useEffect, useState, useCallback } from 'react'
import swasNavbarIcon from '@/assets/icons/swasNavbarIcon.svg'
import faviconSwas from '@/assets/icons/favicon-swas.svg'
import { NotifSheet } from '@/components/NotifSheet'
import { getBranchNameForNavbar } from '@/utils/api/getBranchName'
import { PickupProvider } from '@/context/PickupContext'
import { NAV_ITEMS, type NavPage } from '@/constants/navigation'

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
export default function Navbar({ activePage, setActivePage, isCollapsed, onToggleCollapse, onLogout }: NavbarProps) {
  const [branchName, setBranchName] = useState<string | null>(null)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

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
    setIsMobileMenuOpen(false) // Close mobile menu on page change
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
            
            {/* Branch name - now beside logo */}
            <div className="nav-branch-name">
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
                  <button className="nav-footer-btn" aria-label="Notifications">
                    <i className="bi-bell"></i>
                    <span className="nav-label">Notifications</span>
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
                <span className="nav-label">Logout</span>
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