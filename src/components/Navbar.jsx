import React, { useState, useRef, useEffect } from 'react';

// Clean SVG Icons matching StockWise Design System
function SettingsIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"></circle>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
    </svg>
  );
}

function DashboardIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="9"></rect>
      <rect x="14" y="3" width="7" height="5"></rect>
      <rect x="14" y="12" width="7" height="9"></rect>
      <rect x="3" y="16" width="7" height="5"></rect>
    </svg>
  );
}

function PortalIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 10v6M2 10l10-5 10 5-10 5z"></path>
      <path d="M6 12v5c3 3 9 3 12 0v-5"></path>
    </svg>
  );
}

function LogOutIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
      <polyline points="16 17 21 12 16 7"></polyline>
      <line x1="21" y1="12" x2="9" y2="12"></line>
    </svg>
  );
}

function ChevronDownIcon({ size = 13 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9"></polyline>
    </svg>
  );
}

function MenuIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="12" x2="21" y2="12"></line>
      <line x1="3" y1="6" x2="21" y2="6"></line>
      <line x1="3" y1="18" x2="21" y2="18"></line>
    </svg>
  );
}

function CloseIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  );
}

export default function Navbar({ activeTab, setActiveTab, currentUser, onLogout, darkMode, setDarkMode }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dropdownRef = useRef(null);
  const mobileRef = useRef(null);

  const isAdmin = currentUser?.role && currentUser.role.toLowerCase() === 'admin';
  const isStudent = currentUser?.role && currentUser.role.toLowerCase() === 'student';
  const isTeacher = currentUser?.role && currentUser.role.toLowerCase() === 'teacher';
  const isVerified = currentUser && Number(currentUser.is_verified) === 1;

  // Close menus when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
      if (mobileRef.current && !mobileRef.current.contains(event.target)) {
        setMobileMenuOpen(false);
      }
    }
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setDropdownOpen(false);
        setMobileMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Prevent background scrolling when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  const avatarInitial = (currentUser?.name || currentUser?.username || currentUser?.role || 'U')[0].toUpperCase();

  const handleMobileNav = (tab) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };

  return (
    <header className="navbar" ref={mobileRef}>
      <div className="navbar-container">
        {/* Brand / Logo */}
        <div className="navbar-brand" onClick={() => handleMobileNav('checkin')}>
          <div className="brand-logo-icon">SA</div>
          <h1 className="brand-title">SmartAttend</h1>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="navbar-nav desktop-only">
          {((isStudent) || (isTeacher)) && (
            <button
              className={`nav-link ${activeTab === 'checkin' ? 'active' : ''}`}
              onClick={() => setActiveTab('checkin')}
            >
              Attendance
            </button>
          )} 
          {isAdmin && (
            <button
              className={`nav-link ${activeTab === 'admin' ? 'active' : ''}`}
              onClick={() => setActiveTab('admin')}
            >
              Admin Dashboard
            </button>
          )}

          {isTeacher && (
            <button
              className={`nav-link ${activeTab === 'teacher' ? 'active' : ''}`}
              onClick={() => setActiveTab('teacher')}
            >
              Teacher Portal
            </button>
          )}

          {isStudent && (
            <button
              className={`nav-link ${activeTab === 'portal' ? 'active' : ''}`}
              onClick={() => setActiveTab('portal')}
            >
              Student Portal
            </button>
          )}
        </nav>

        {/* Desktop User Section */}
        <div className="navbar-user desktop-only">
          {setDarkMode && (
            <div className="theme-toggle-container">
              <button
                className={`theme-toggle-btn ${darkMode ? 'is-dark' : 'is-light'}`}
                onClick={() => setDarkMode(!darkMode)}
                title={`Switch to ${darkMode ? 'Light' : 'Dark'} Mode`}
                aria-label="Toggle Theme"
              >
                <span className="toggle-thumb"></span>
              </button>
            </div>
          )}

          {currentUser ? (
            <div className="navbar-profile-dropdown-wrapper" ref={dropdownRef}>
              <button
                type="button"
                className={`user-badge-info user-badge-clickable ${dropdownOpen ? 'active' : ''}`}
                onClick={() => setDropdownOpen(!dropdownOpen)}
                title="Account Menu"
                aria-haspopup="true"
                aria-expanded={dropdownOpen}
              >
                <div className="user-avatar-wrapper">
                  {currentUser.avatar ? (
                    <img src={currentUser.avatar} alt="Profile" className="user-avatar-img-badge" />
                  ) : (
                    <span className="user-avatar-icon">{avatarInitial}</span>
                  )}
                  {!isVerified && <span className="unverified-dot" title="Email Unverified"></span>}
                </div>
                <div className="user-text">
                  <span className="user-display-name">{currentUser.name || currentUser.username}</span>
                  <span className="user-display-role">{currentUser.role}</span>
                </div>
                <span className={`badge-dropdown-arrow ${dropdownOpen ? 'open' : ''}`}>
                  <ChevronDownIcon />
                </span>
              </button>

              {dropdownOpen && (
                <div className="profile-dropdown-menu">
                  <div className="dropdown-user-header">
                    <div className="dropdown-avatar-circle">
                      {currentUser.avatar ? (
                        <img src={currentUser.avatar} alt="Profile" className="dropdown-avatar-img" />
                      ) : (
                        <span>{avatarInitial}</span>
                      )}
                    </div>
                    <div className="dropdown-user-info">
                      <div className="dropdown-name">{currentUser.name || currentUser.username}</div>
                      <div className="dropdown-email">{currentUser.email || 'No email registered'}</div>
                      <div className="dropdown-status-badge">
                        {isVerified ? (
                          <span className="status-badge-verified">Verified Account</span>
                        ) : (
                          <span className="status-badge-unverified">Unverified Email</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="dropdown-menu-divider"></div>

                  <div className="dropdown-menu-list">
                    <button
                      className={`dropdown-menu-item ${activeTab === 'manage-account' ? 'active' : ''}`}
                      onClick={() => {
                        setDropdownOpen(false);
                        setActiveTab('manage-account');
                      }}
                    >
                      <span className="menu-item-icon"><SettingsIcon /></span>
                      <span className="menu-item-label">Manage Account</span>
                    </button>

                    {isAdmin && (
                      <button
                        className="dropdown-menu-item"
                        onClick={() => {
                          setDropdownOpen(false);
                          setActiveTab('admin');
                        }}
                      >
                        <span className="menu-item-icon"><DashboardIcon /></span>
                        <span className="menu-item-label">Admin Dashboard</span>
                      </button>
                    )}

                    {isTeacher && (
                      <button
                        className="dropdown-menu-item"
                        onClick={() => {
                          setDropdownOpen(false);
                          setActiveTab('teacher');
                        }}
                      >
                        <span className="menu-item-icon"><PortalIcon /></span>
                        <span className="menu-item-label">Teacher Portal</span>
                      </button>
                    )}

                    {isStudent && (
                      <button
                        className="dropdown-menu-item"
                        onClick={() => {
                          setDropdownOpen(false);
                          setActiveTab('portal');
                        }}
                      >
                        <span className="menu-item-icon"><PortalIcon /></span>
                        <span className="menu-item-label">Student Portal</span>
                      </button>
                    )}
                  </div>

                  <div className="dropdown-menu-divider"></div>

                  <button
                    className="dropdown-menu-item dropdown-logout-item"
                    onClick={() => {
                      setDropdownOpen(false);
                      onLogout();
                    }}
                  >
                    <span className="menu-item-icon"><LogOutIcon /></span>
                    <span className="menu-item-label">Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              className={`nav-link ${activeTab === 'signin' ? 'active' : ''}`}
              onClick={() => setActiveTab('signin')}
            >
              Sign In
            </button>
          )}
        </div>

        {/* Mobile Header Controls (Phone UI) */}
        <div className="navbar-mobile-actions mobile-only">
          {setDarkMode && (
            <div className="theme-toggle-container">
              <button
                className={`theme-toggle-btn ${darkMode ? 'is-dark' : 'is-light'}`}
                onClick={() => setDarkMode(!darkMode)}
                title={`Switch to ${darkMode ? 'Light' : 'Dark'} Mode`}
                aria-label="Toggle Theme"
              >
                <span className="toggle-thumb"></span>
              </button>
            </div>
          )}

          <button
            type="button"
            className={`mobile-menu-toggle-btn ${mobileMenuOpen ? 'active' : ''}`}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle Navigation Menu"
            aria-expanded={mobileMenuOpen}
          >
            {currentUser && (
              <div className="mobile-toggle-avatar">
                {currentUser.avatar ? (
                  <img src={currentUser.avatar} alt="" className="mobile-toggle-img" />
                ) : (
                  <span className="mobile-toggle-initial">{avatarInitial}</span>
                )}
                {!isVerified && <span className="mobile-toggle-dot"></span>}
              </div>
            )}
            <span className="mobile-toggle-icon">
              {mobileMenuOpen ? <CloseIcon size={20} /> : <MenuIcon size={20} />}
            </span>
          </button>
        </div>
      </div>

      {/* Mobile Sticky Dropdown Drawer */}
      {mobileMenuOpen && (
        <>
          <div className="mobile-nav-backdrop" onClick={() => setMobileMenuOpen(false)} />
          <div className="mobile-nav-dropdown-drawer">
            {currentUser ? (
              <div className="mobile-profile-card">
                <div className="mobile-profile-avatar-wrap">
                  {currentUser.avatar ? (
                    <img src={currentUser.avatar} alt="Profile" className="dropdown-avatar-img" />
                  ) : (
                    <span>{avatarInitial}</span>
                  )}
                </div>
                <div className="mobile-profile-info">
                  <div className="mobile-profile-name">{currentUser.name || currentUser.username}</div>
                  <div className="mobile-profile-role-line">
                    <span className="mobile-profile-role-tag">{currentUser.role}</span>
                    {currentUser.email && (
                      <span className="mobile-profile-email-text">{currentUser.email}</span>
                    )}
                  </div>
                  <div className="mobile-profile-status">
                    {isVerified ? (
                      <span className="status-badge-verified">Verified Account</span>
                    ) : (
                      <span className="status-badge-unverified">Unverified Email</span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="mobile-guest-card">
                <p>Welcome to SmartAttend</p>
              </div>
            )}

            <div className="mobile-nav-list">
              {((isStudent) || (isTeacher)) && (
                <button
                  className={`mobile-nav-item ${activeTab === 'checkin' ? 'active' : ''}`}
                  onClick={() => handleMobileNav('checkin')}
                >
                  <span className="mobile-nav-icon"><DashboardIcon size={18} /></span>
                  <span className="mobile-nav-text">Attendance Check-in</span>
                </button>
              )}

              {isAdmin && (
                <button
                  className={`mobile-nav-item ${activeTab === 'admin' ? 'active' : ''}`}
                  onClick={() => handleMobileNav('admin')}
                >
                  <span className="mobile-nav-icon"><DashboardIcon size={18} /></span>
                  <span className="mobile-nav-text">Admin Dashboard</span>
                </button>
              )}

              {isTeacher && (
                <button
                  className={`mobile-nav-item ${activeTab === 'teacher' ? 'active' : ''}`}
                  onClick={() => handleMobileNav('teacher')}
                >
                  <span className="mobile-nav-icon"><PortalIcon size={18} /></span>
                  <span className="mobile-nav-text">Teacher Portal</span>
                </button>
              )}

              {isStudent && (
                <button
                  className={`mobile-nav-item ${activeTab === 'portal' ? 'active' : ''}`}
                  onClick={() => handleMobileNav('portal')}
                >
                  <span className="mobile-nav-icon"><PortalIcon size={18} /></span>
                  <span className="mobile-nav-text">Student Portal</span>
                </button>
              )}

              {currentUser && (
                <button
                  className={`mobile-nav-item ${activeTab === 'manage-account' ? 'active' : ''}`}
                  onClick={() => handleMobileNav('manage-account')}
                >
                  <span className="mobile-nav-icon"><SettingsIcon size={18} /></span>
                  <span className="mobile-nav-text">Manage Account</span>
                </button>
              )}
            </div>

            <div className="mobile-nav-divider"></div>

            {currentUser ? (
              <button
                className="mobile-nav-item mobile-nav-item-logout"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onLogout();
                }}
              >
                <span className="mobile-nav-icon"><LogOutIcon size={18} /></span>
                <span className="mobile-nav-text">Sign Out</span>
              </button>
            ) : (
              <button
                className={`mobile-nav-item ${activeTab === 'signin' ? 'active' : ''}`}
                onClick={() => handleMobileNav('signin')}
              >
                <span className="mobile-nav-icon"><LogOutIcon size={18} /></span>
                <span className="mobile-nav-text">Sign In</span>
              </button>
            )}
          </div>
        </>
      )}
    </header>
  );
}

