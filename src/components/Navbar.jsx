import React from 'react';

export default function Navbar({ activeTab, setActiveTab, currentUser, onLogout, darkMode, setDarkMode }) {
  const isAdmin = currentUser?.role && currentUser.role.toLowerCase() === 'admin';

  return (
    <header className="navbar">
      <div className="navbar-brand" onClick={() => setActiveTab('checkin')}>
        <div className="brand-logo-icon">SA</div>
        <h1 className="brand-title">SmartAttend</h1>
        {/* <span className="badge-subtitle">Student Attendance</span> */}
      </div>

      <nav className="navbar-nav">
        <button
          className={`nav-link ${activeTab === 'checkin' ? 'active' : ''}`}
          onClick={() => setActiveTab('checkin')}
        >
          Attendance
        </button>

        {isAdmin && (
          <button
            className={`nav-link ${activeTab === 'admin' ? 'active' : ''}`}
            onClick={() => setActiveTab('admin')}
          >
            Admin Dashboard
          </button>
        )}

        {currentUser && currentUser.role && currentUser.role.toLowerCase() === 'teacher' && (
          <button
            className={`nav-link ${activeTab === 'teacher' ? 'active' : ''}`}
            onClick={() => setActiveTab('teacher')}
          >
            Teacher Portal
          </button>
        )}

        {currentUser && currentUser.role && currentUser.role.toLowerCase() === 'student' && (
          <button
            className={`nav-link ${activeTab === 'portal' ? 'active' : ''}`}
            onClick={() => setActiveTab('portal')}
          >
            Student Portal
          </button>
        )}
      </nav>

      <div className="navbar-user">
        {/* Dark Mode Toggle Switch matching StockWise */}
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
          <>
            <div className="user-badge-info">
              <span className="user-avatar-icon">{currentUser.role ? currentUser.role[0].toUpperCase() : 'U'}</span>
              <div className="user-text">
                <span className="user-display-name">{currentUser.name || currentUser.username}</span>
                <span className="user-display-role">{currentUser.role}</span>
              </div>
            </div>

            <button className="btn-logout" onClick={onLogout} title="Sign Out">
              Sign Out
            </button>
          </>
        ) : (
          <button
            className={`nav-link ${activeTab === 'signin' ? 'active' : ''}`}
            onClick={() => setActiveTab('signin')}
          >
            Sign In
          </button>
        )}
      </div>
    </header>
  );
}
