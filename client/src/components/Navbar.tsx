import '@/styles/components/navBar.css'
import React, { useEffect, useState } from 'react'
import swasLogo from '@/assets/images/SWAS-Logo-Small.png'
import NotifIcon from '@/components/icons/NotifIcon'
import { useDropdownHandlers } from '@/hooks/useDropdownHandlers'
import { NotifSheet } from "@/components/NotifSheet"
import { getBranchNameForNavbar } from "@/utils/api/getBranchName"
import { PickupProvider } from "@/context/PickupContext"

type NavbarProps = {
  activePage: 'serviceRequest' | 'operations' | 'payment' | 'central-view' | 'customer-information' | 'branches' | 'analytics' | 'appointments' | 'announcements'
  setActivePage: React.Dispatch<React.SetStateAction<'serviceRequest' | 'operations' | 'payment' | 'central-view' | 'customer-information' | 'branches' | 'analytics' | 'appointments' | 'announcements'>>
  onLogout: () => void
}

export default function Navbar({ activePage, setActivePage, onLogout }: NavbarProps) {
  const [opDropdown, setOpDropdown] = useState(false)
  const [dbDropdown, setDbDropdown] = useState(false)
  const [userDropdown, setUserDropdown] = useState(false)

  const opDropdownHandlers = useDropdownHandlers(setOpDropdown)
  const dbDropdownHandlers = useDropdownHandlers(setDbDropdown)
  const userDropdownHandlers = useDropdownHandlers(setUserDropdown)

  const [isOpen, setIsOpen] = useState(false)
  const toggleMenu = () => setIsOpen(prev => !prev)

  const [branchName, setBranchName] = useState<string | null>(null)

  useEffect(() => {
    async function fetchBranchName() {
      const name = await getBranchNameForNavbar()
      setBranchName(name)
    }
    fetchBranchName()
  }, [])

  // Close all dropdowns when activePage changes
  useEffect(() => {
    setOpDropdown(false)
    setDbDropdown(false)
    setUserDropdown(false)
  }, [activePage])

  return (
    <PickupProvider>
      <div className='navBar'>
        <div className='navBar-contents'>
          <div className='navBar-contents-p1'>
            <img src={swasLogo} alt="SWAS Logo" />
            <div className='nav-BranchName'><h3>{branchName ? `${branchName}` : "Branch: Loading..."}</h3></div>
            <a onClick={onLogout} href=""><h4 className='regular'>Log Out</h4></a>
          </div>

          <div className='navBar-contents-p2'>
            <ul>
              <li>
                <a href="#" onClick={e => { e.preventDefault(); setActivePage('serviceRequest') }}>
                  <h3>Service Request</h3>
                </a>
              </li>

              {/* Operations dropdown */}
              <li className={`dropdown ${opDropdown ? "dropdown-open" : ""}`}>
                <div {...opDropdownHandlers}>
                  <h3>Operations</h3>
                  {opDropdown && (
                    <div className="dropdown-menu">
                      <div className='dropdown-items'>
                        <div className='dropdown-item' onClick={e => { e.preventDefault(); setActivePage('operations') }}><a href="">Operations</a></div>
                        <div className='dropdown-item' onClick={e => { e.preventDefault(); setActivePage('payment') }}><a href="">Payment & Pickup</a></div>
                      </div>
                    </div>
                  )}
                </div>
              </li>

              {/* Database View dropdown */}
              <li className={`dropdown ${dbDropdown ? "dropdown-open" : ""}`}>
                <div {...dbDropdownHandlers}>
                  <h3>Database View</h3>
                  {dbDropdown && (
                    <div className="dropdown-menu">
                      <div className='dropdown-items'>
                        <div className='dropdown-item' onClick={e => { e.preventDefault(); setActivePage('central-view') }}><a href="">Central View</a></div>
                        <div className='dropdown-item' onClick={e => { e.preventDefault(); setActivePage('customer-information') }}><a href="">Customer Information</a></div>
                        <div className='dropdown-item' onClick={e => { e.preventDefault(); setActivePage('branches') }}><a href="">Branches</a></div>
                      </div>
                    </div>
                  )}
                </div>
              </li>

              <li><a href="" onClick={e => { e.preventDefault(); setActivePage('analytics') }}><h3>Analytics</h3></a></li>

              {/* User Management dropdown */}
              <li className={`dropdown ${userDropdown ? "dropdown-open" : ""}`}>
                <div {...userDropdownHandlers}>
                  <h3>User Management</h3>
                  {userDropdown && (
                    <div className="dropdown-menu">
                      <div className='dropdown-items'>
                        <div className='dropdown-item' onClick={e => { e.preventDefault(); setActivePage('appointments') }}><a href="">Appointments</a></div>
                        <div className='dropdown-item' onClick={e => { e.preventDefault(); setActivePage('announcements') }}><a href="">Announcements</a></div>
                      </div>
                    </div>
                  )}
                </div>
              </li>

              <li><NotifSheet><a href="#"><NotifIcon /></a></NotifSheet></li>
            </ul>
          </div>

          {/* Tablet and Mobile nav simplified similarly (you can also break into smaller components if needed) */}

          {/* Tablet version */}
          <div className='navBar-contents-p2-tablet'>
            <div>
              <ul>
                <li><a href="" onClick={e => { e.preventDefault(); setActivePage('serviceRequest'); setIsOpen(false);   }}><h3>Service Request</h3></a></li>

                <li className={`dropdown ${opDropdown ? "dropdown-open" : ""}`}>
                  <div {...opDropdownHandlers}>
                    <h3>Operations</h3>
                    {opDropdown && (
                      <div className="dropdown-menu">
                        <div className='dropdown-items'>
                          <div className='dropdown-item' onClick={e => { e.preventDefault(); setActivePage('operations'); setIsOpen(false); }}><a href="">Operations</a></div>
                          <div className='dropdown-item' onClick={e => { e.preventDefault(); setActivePage('payment'); setIsOpen(false); }}><a href="">Payment & Pickup</a></div>
                        </div>
                      </div>
                    )}
                  </div>
                </li>

                <li><NotifSheet><a href="#"><NotifIcon /></a></NotifSheet></li>

                <li>
                  <div className={`burger-icon ${isOpen ? 'open' : ''}`} onClick={toggleMenu}>
                    <div className="line"></div>
                    <div className="line"></div>
                    <div className="line"></div>
                  </div>

                  {isOpen && (
                    <div className="burger-dropdown">
                      <ul>
                        <li className={`dropdown ${dbDropdown ? "dropdown-open" : ""}`}>
                          <div onClick={() => setDbDropdown(prev => !prev)}>
                            <h3>Database View</h3>
                            {dbDropdown && (
                              <div className='dropdown-tablet'>
                                <a href="" onClick={e => { e.preventDefault(); setActivePage('central-view'); setIsOpen(false); }}>Central View</a>
                                <a href="" onClick={e => { e.preventDefault(); setActivePage('customer-information'); setIsOpen(false); }}>Customer Information</a>
                                <a href="" onClick={e => { e.preventDefault(); setActivePage('branches'); setIsOpen(false); }}>Branches</a>
                              </div>
                            )}
                          </div>
                        </li>
                        <li><a href="#" onClick={e => { e.preventDefault(); setActivePage('analytics'); setIsOpen(false); }}><h3>Analytics</h3></a></li>
                        <li className={`dropdown ${userDropdown ? "dropdown-open" : ""}`}>
                          <div onClick={() => setUserDropdown(prev => !prev)}>
                            <h3>User Management</h3>
                            {userDropdown && (
                              <div className='dropdown-tablet'>
                                <a href="" onClick={e => { e.preventDefault(); setActivePage('appointments'); setIsOpen(false); }}>Appointments</a>
                                <a href="" onClick={e => { e.preventDefault(); setActivePage('announcements'); setIsOpen(false); }}>Announcements</a>
                              </div>
                            )}
                          </div>
                        </li>
                      </ul>
                    </div>
                  )}
                </li>
              </ul>
            </div>
          </div>

          {/* Mobile version */}
          <div className='navBar-contents-p1-mobile'>
            <img src={swasLogo} alt="SWAS Logo" />
          </div>

          <div className='nav-BranchName-mobile'><h3>{branchName ? `Branch: ${branchName}` : "Branch: Loading..."}</h3></div>

          <div className='navBar-contents-p2-mobile'>
            <ul>
              <li><NotifSheet><a href="#"><NotifIcon /></a></NotifSheet></li>
              <li>
                <div className={`burger-icon ${isOpen ? 'open' : ''}`} onClick={toggleMenu}>
                  <div className="line"></div>
                  <div className="line"></div>
                  <div className="line"></div>
                </div>

                {isOpen && (
                  <div className="burger-dropdown">
                    <ul>
                      <li><a href="" onClick={e => { 
                        e.preventDefault(); 
                        setActivePage('serviceRequest');
                        setIsOpen(false); 
                        }}><h3>Service Request</h3></a></li>

                      <li className={`dropdown ${opDropdown ? "dropdown-open" : ""}`}>
                        <div onClick={() => setOpDropdown(prev => !prev)}>
                          <h3>Operations</h3>
                          {opDropdown && (
                            <div className='dropdown-tablet'>
                              <a href="" onClick={e => { 
                                e.preventDefault(); 
                                setActivePage('operations');
                                setIsOpen(false); 
                                }}>Operations</a>
                              <a href="" onClick={e => { 
                                e.preventDefault(); 
                                setActivePage('payment');
                                setIsOpen(false);  
                                }}>Payment & Pickup</a>
                            </div>
                          )}
                        </div>
                      </li>

                      <li className={`dropdown ${dbDropdown ? "dropdown-open" : ""}`}>
                        <div onClick={() => setDbDropdown(prev => !prev)}>
                          <h3>Database View</h3>
                          {dbDropdown && (
                            <div className='dropdown-tablet'>
                              <a href="" onClick={e => { e.preventDefault(); setActivePage('central-view'); setIsOpen(false); }}>Central View</a>
                              <a href="" onClick={e => { e.preventDefault(); setActivePage('customer-information'); setIsOpen(false); }}>Customer Information</a>
                              <a href="" onClick={e => { e.preventDefault(); setActivePage('branches'); setIsOpen(false); }}>Branches</a>
                            </div>
                          )}
                        </div>
                      </li>

                      <li><a href="#" onClick={e => { e.preventDefault(); setActivePage('analytics'); setIsOpen(false);  }}><h3>Analytics</h3></a></li>

                      <li className={`dropdown ${userDropdown ? "dropdown-open" : ""}`}>
                        <div onClick={() => setUserDropdown(prev => !prev)}>
                          <h3>User Management</h3>
                          {userDropdown && (
                            <div className='dropdown-tablet'>
                              <a href="" onClick={e => { e.preventDefault(); setActivePage('appointments'); setIsOpen(false); }}>Appointments</a>
                              <a href="" onClick={e => { e.preventDefault(); setActivePage('announcements'); setIsOpen(false); }}>Announcements</a>
                            </div>
                          )}
                        </div>
                      </li>

                      <li><a onClick={onLogout} href="">Log Out</a></li>
                    </ul>
                  </div>
                )}
              </li>
            </ul>
          </div>
        </div>

        <svg width="100%" height="7">
          <line x1="0" y1="5" x2="100%" y2="5" stroke="#797979" strokeWidth="3" strokeDasharray="13 8" />
        </svg>
      </div>
    </PickupProvider>
  )
}
