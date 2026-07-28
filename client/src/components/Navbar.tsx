// components/Navbar/Navbar.tsx
import '@/styles/components/navBar.css'
import React, { useEffect, useState, useCallback, useRef } from 'react'
import swasLogo from '@/assets/images/SWAS-Logo-Small.png'
import NotifIcon from '@/components/icons/NotifIcon'
import { useDropdownHandlers } from '@/hooks/useDropdownHandlers'
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

type DropdownState = {
  operations: boolean
  database: boolean
  user: boolean
  mobile: boolean
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

// Constants
const NAV_ITEMS = {
  serviceRequest: { label: 'Service Request', page: 'serviceRequest' },
  operations: { label: 'Operations', page: 'operations' },
  payment: { label: 'Payment & Pickup', page: 'payment' },
  centralView: { label: 'Central View', page: 'central-view' },
  customerInformation: { label: 'Customer Information', page: 'customer-information' },
  branches: { label: 'Branches', page: 'branches' },
  analytics: { label: 'Analytics', page: 'analytics' },
  appointments: { label: 'Appointments', page: 'appointments' },
  announcements: { label: 'Announcements', page: 'announcements' },
} as const

// Sub-components
const ChevronIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg 
    className={className || 'dropdown-caret'} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth={2} 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    aria-hidden="true"
  >
    <polyline points="6 9 12 15 18 9" />
  </svg>
)

const DropdownTrigger: React.FC<{
  label: string
  isOpen: boolean
  onToggle: () => void
  onKeyDown: (e: React.KeyboardEvent) => void
  isActive: boolean
  ref?: React.RefObject<HTMLDivElement>
  children?: React.ReactNode
}> = ({ label, isOpen, onToggle, onKeyDown, isActive, ref, children }) => (
  <li className={`dropdown ${isOpen ? 'dropdown-open' : ''} ${isActive ? 'nav-active' : ''}`}>
    <div
      ref={ref}
      role="button"
      tabIndex={0}
      aria-haspopup="true"
      aria-expanded={isOpen}
      onKeyDown={onKeyDown}
      onClick={onToggle}
      className="dropdown-trigger"
    >
      <h3>{label}</h3>
      <ChevronIcon />
    </div>
    {isOpen && (
      <div className="dropdown-menu" role="menu">
        <div className="dropdown-items">
          {children}
        </div>
      </div>
    )}
  </li>
)

const DropdownItem: React.FC<{
  label: string
  onClick: () => void
  closeMenu?: () => void
}> = ({ label, onClick, closeMenu }) => {
  const handleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    onClick()
    closeMenu?.()
  }, [onClick, closeMenu])

  return (
    <a 
      href="#" 
      className="dropdown-item" 
      onClick={handleClick}
      role="menuitem"
    >
      {label}
    </a>
  )
}

const NavLink: React.FC<{
  label: string
  isActive: boolean
  onClick: () => void
  closeMenu?: () => void
}> = ({ label, isActive, onClick, closeMenu }) => {
  const handleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    onClick()
    closeMenu?.()
  }, [onClick, closeMenu])

  return (
    <li className={isActive ? 'nav-active' : ''}>
      <a 
        href="#" 
        onClick={handleClick}
        aria-current={isActive ? 'page' : undefined}
        className="nav-link"
      >
        <h3>{label}</h3>
      </a>
    </li>
  )
}

// Main component
export default function Navbar({ activePage, setActivePage, onLogout }: NavbarProps) {
  // State
  const [dropdowns, setDropdowns] = useState<DropdownState>({
    operations: false,
    database: false,
    user: false,
    mobile: false,
  })
  const [branchName, setBranchName] = useState<string | null>(null)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  
  // Refs for focus management
  const mobileMenuRef = useRef<HTMLDivElement>(null)
  const mobileTriggerRef = useRef<HTMLDivElement>(null)

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

  // Close all dropdowns on Escape
  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setDropdowns({ operations: false, database: false, user: false, mobile: false })
        setIsMobileMenuOpen(false)
        // Return focus to trigger element
        mobileTriggerRef.current?.focus()
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [])

  // Focus trap for mobile menu
  useEffect(() => {
    if (isMobileMenuOpen && mobileMenuRef.current) {
      const focusableElements = mobileMenuRef.current.querySelectorAll(
        'a[href], button:not([disabled]), [tabindex="0"]'
      )
      if (focusableElements.length > 0) {
        (focusableElements[0] as HTMLElement).focus()
      }
    }
  }, [isMobileMenuOpen])

  // Handlers
  const toggleDropdown = useCallback((key: keyof DropdownState) => {
    setDropdowns(prev => ({
      ...prev,
      [key]: !prev[key],
      // Close other dropdowns when opening one
      ...Object.keys(prev).reduce((acc, k) => ({
        ...acc,
        [k]: k === key ? !prev[key] : false
      }), {})
    }))
  }, [])

  const handleDropdownKeyDown = useCallback((e: React.KeyboardEvent, key: keyof DropdownState) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      toggleDropdown(key)
    }
  }, [toggleDropdown])

  const handlePageChange = useCallback((page: NavPage) => {
    setActivePage(page)
    setIsMobileMenuOpen(false)
    setDropdowns({ operations: false, database: false, user: false, mobile: false })
  }, [setActivePage])

  const toggleMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(prev => !prev)
    setDropdowns({ operations: false, database: false, user: false, mobile: false })
  }, [])

  // Check if any dropdown is active
  const isDropdownActive = useCallback((dropdownKey: keyof DropdownState) => {
    return dropdowns[dropdownKey]
  }, [dropdowns])

  // Render dropdown content helpers
  const renderOperationsDropdown = (closeMenu?: () => void) => (
    <>
      {visibility.showOperations && (
        <DropdownItem 
          label="Operations" 
          onClick={() => handlePageChange('operations')}
          closeMenu={closeMenu}
        />
      )}
      {visibility.showPayments && (
        <DropdownItem 
          label="Payment & Pickup" 
          onClick={() => handlePageChange('payment')}
          closeMenu={closeMenu}
        />
      )}
    </>
  )

  const renderDatabaseDropdown = (closeMenu?: () => void) => (
    <>
      <DropdownItem 
        label="Central View" 
        onClick={() => handlePageChange('central-view')}
        closeMenu={closeMenu}
      />
      <DropdownItem 
        label="Customer Information" 
        onClick={() => handlePageChange('customer-information')}
        closeMenu={closeMenu}
      />
      <DropdownItem 
        label="Branches" 
        onClick={() => handlePageChange('branches')}
        closeMenu={closeMenu}
      />
    </>
  )

  const renderUserDropdown = (closeMenu?: () => void) => (
    <>
      <DropdownItem 
        label="Appointments" 
        onClick={() => handlePageChange('appointments')}
        closeMenu={closeMenu}
      />
      <DropdownItem 
        label="Announcements" 
        onClick={() => handlePageChange('announcements')}
        closeMenu={closeMenu}
      />
    </>
  )

  const renderNavLinks = (closeMenu?: () => void) => (
    <>
      {visibility.showServiceRequest && (
        <NavLink 
          label="Service Request" 
          isActive={activePage === 'serviceRequest'}
          onClick={() => handlePageChange('serviceRequest')}
          closeMenu={closeMenu}
        />
      )}
      
      {/* Operations Dropdown */}
      {(visibility.showOperations || visibility.showPayments) && (
        <DropdownTrigger
          label="Operations"
          isOpen={isDropdownActive('operations')}
          onToggle={() => toggleDropdown('operations')}
          onKeyDown={(e) => handleDropdownKeyDown(e, 'operations')}
          isActive={activePage === 'operations' || activePage === 'payment'}
        >
          {renderOperationsDropdown(closeMenu)}
        </DropdownTrigger>
      )}

      {/* Database Dropdown */}
      {visibility.showDatabaseView && (
        <DropdownTrigger
          label="Database View"
          isOpen={isDropdownActive('database')}
          onToggle={() => toggleDropdown('database')}
          onKeyDown={(e) => handleDropdownKeyDown(e, 'database')}
          isActive={['central-view', 'customer-information', 'branches'].includes(activePage)}
        >
          {renderDatabaseDropdown(closeMenu)}
        </DropdownTrigger>
      )}

      {visibility.showAnalytics && (
        <NavLink 
          label="Analytics" 
          isActive={activePage === 'analytics'}
          onClick={() => handlePageChange('analytics')}
          closeMenu={closeMenu}
        />
      )}

      {/* User Management Dropdown */}
      {visibility.showUserManagement && (
        <DropdownTrigger
          label="User Management"
          isOpen={isDropdownActive('user')}
          onToggle={() => toggleDropdown('user')}
          onKeyDown={(e) => handleDropdownKeyDown(e, 'user')}
          isActive={['appointments', 'announcements'].includes(activePage)}
        >
          {renderUserDropdown(closeMenu)}
        </DropdownTrigger>
      )}
    </>
  )

  // Mobile render
  const renderMobileNav = () => (
    <div className="navBar-contents-p2-mobile">
      <ul>
        {visibility.showNotifSheet && (
          <li className="notif-sheet-item">
            <NotifSheet>
              <a href="#" className="notif-btn" aria-label="Notifications">
                <NotifIcon />
              </a>
            </NotifSheet>
          </li>
        )}
        <li>
          <div
            ref={mobileTriggerRef}
            className={`burger-icon ${isMobileMenuOpen ? 'open' : ''}`}
            onClick={toggleMobileMenu}
            role="button"
            tabIndex={0}
            aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isMobileMenuOpen}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                toggleMobileMenu()
              }
            }}
          >
            <div className="line" />
            <div className="line" />
            <div className="line" />
          </div>

          {isMobileMenuOpen && (
            <div className="burger-dropdown" ref={mobileMenuRef} role="dialog" aria-label="Mobile navigation menu">
              <ul>
                {renderNavLinks(() => setIsMobileMenuOpen(false))}
                <li className="mobile-logout-item">
                  <a 
                    href="#" 
                    onClick={(e) => {
                      e.preventDefault()
                      onLogout()
                      setIsMobileMenuOpen(false)
                    }}
                    className="mobile-logout-link"
                  >
                    Log Out
                  </a>
                </li>
              </ul>
            </div>
          )}
        </li>
      </ul>
    </div>
  )

  return (
    <PickupProvider>
      <header className="navBar" role="navigation" aria-label="Main navigation">
        <div className="navBar-contents">
          {/* Left section */}
          <div className="navBar-contents-p1">
            <img src={swasLogo} alt="SWAS Logo - Service Window Automation System" className="nav-logo" />
            <div className="nav-BranchName">
              <h3>{branchName ? `${branchName}` : "Branch: Loading..."}</h3>
            </div>
            <a 
              onClick={(e) => { e.preventDefault(); onLogout() }} 
              href="#" 
              role="button"
              className="logout-link"
              aria-label="Log out of your account"
            >
              <h4 className="regular">Log Out</h4>
            </a>
          </div>

          {/* Desktop nav */}
          <div className="navBar-contents-p2">
            <ul>
              {renderNavLinks()}
              {visibility.showNotifSheet && (
                <li className="notif-sheet-item">
                  <NotifSheet>
                    <a href="#" className="notif-btn" aria-label="Notifications">
                      <NotifIcon />
                    </a>
                  </NotifSheet>
                </li>
              )}
            </ul>
          </div>

          {/* Tablet nav */}
          <div className="navBar-contents-p2-tablet">
            <ul>
              {visibility.showServiceRequest && (
                <NavLink 
                  label="Service Request" 
                  isActive={activePage === 'serviceRequest'}
                  onClick={() => handlePageChange('serviceRequest')}
                />
              )}
              {(visibility.showOperations || visibility.showPayments) && (
                <DropdownTrigger
                  label="Operations"
                  isOpen={isDropdownActive('operations')}
                  onToggle={() => toggleDropdown('operations')}
                  onKeyDown={(e) => handleDropdownKeyDown(e, 'operations')}
                  isActive={activePage === 'operations' || activePage === 'payment'}
                >
                  {renderOperationsDropdown()}
                </DropdownTrigger>
              )}
              {visibility.showNotifSheet && (
                <li className="notif-sheet-item">
                  <NotifSheet>
                    <a href="#" className="notif-btn" aria-label="Notifications">
                      <NotifIcon />
                    </a>
                  </NotifSheet>
                </li>
              )}
              {renderMobileNav()}
            </ul>
          </div>

          {/* Mobile brand */}
          <div className="navBar-contents-p1-mobile">
            <img src={swasLogo} alt="SWAS Logo" className="nav-logo-mobile" />
          </div>

          <div className="nav-BranchName-mobile">
            <h3>{branchName ? `Branch: ${branchName}` : "Branch: Loading..."}</h3>
          </div>

          {renderMobileNav()}
        </div>
      </header>
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