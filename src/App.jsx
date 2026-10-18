import { useState, useEffect } from 'react'
import Navbar from './components/Navbar'
import SignIn from './components/SignIn'
import AdminDashboard from './components/AdminDashboard'
import Attendance from './components/Attendance'
import StudentPortal from './components/StudentPortal'
import TeacherPortal from './components/TeacherPortal'
import ManageAccount from './components/ManageAccount'
import { getProfile } from './services/api'
import './App.css'

function App() {
  // Theme state matching StockWise 1:1
  const [darkMode, setDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem('smartattend_theme')
    return savedTheme ? savedTheme === 'dark' : true
  })

  useEffect(() => {
    localStorage.setItem('smartattend_theme', darkMode ? 'dark' : 'light')
  }, [darkMode])

  // Session user state
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('smartattend_user')
      return savedUser ? JSON.parse(savedUser) : null
    } catch (e) {
      return null
    }
  })

  // Auto-sync session profile with backend to keep is_verified, email, avatar fresh
  useEffect(() => {
    if (currentUser?.id || currentUser?.username) {
      getProfile(currentUser.id, currentUser.username)
        .then((res) => {
          if (res?.status === 'success' && res.user) {
            const updated = { ...currentUser, ...res.user };
            setCurrentUser(updated);
            localStorage.setItem('smartattend_user', JSON.stringify(updated));
          }
        })
        .catch(() => {});
    }
  }, []);

  const [activeTab, setActiveTab] = useState(() => {
    try {
      const savedTab = localStorage.getItem('smartattend_tab')
      if (savedTab) return savedTab
    } catch (e) {}

    const savedUserStr = localStorage.getItem('smartattend_user')
    if (savedUserStr) {
      const u = JSON.parse(savedUserStr)
      if (u.role && u.role.toLowerCase() === 'admin') return 'admin'
      if (u.role && u.role.toLowerCase() === 'teacher') return 'teacher'
      if (u.role && u.role.toLowerCase() === 'student') return 'portal'
    }
    return 'checkin'
  })

  useEffect(() => {
    localStorage.setItem('smartattend_tab', activeTab)
  }, [activeTab])

  const handleLoginSuccess = (user) => {
    setCurrentUser(user)
    localStorage.setItem('smartattend_user', JSON.stringify(user))

    const role = user.role ? user.role.toLowerCase() : ''
    if (role === 'admin') {
      setActiveTab('admin')
    } else if (role === 'teacher') {
      setActiveTab('teacher')
    } else {
      setActiveTab('portal')
    }
  }

  const handleLogout = () => {
    setCurrentUser(null)
    localStorage.removeItem('smartattend_user')
    localStorage.removeItem('smartattend_tab')
    localStorage.removeItem('smartattend_token')
    setActiveTab('checkin')
  }

  const handleBackFromAccount = () => {
    if (currentUser) {
      const role = currentUser.role ? currentUser.role.toLowerCase() : ''
      if (role === 'admin') setActiveTab('admin')
      else if (role === 'teacher') setActiveTab('teacher')
      else setActiveTab('portal')
    } else {
      setActiveTab('checkin')
    }
  }

  const isVerified = Boolean(currentUser && Number(currentUser.is_verified) === 1)

  return (
    <div className={`app-container ${darkMode ? 'theme-dark' : 'theme-light'}`}>
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={currentUser}
        onLogout={handleLogout}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
      />

      {/* GLOBAL PERSISTENT NOTICE: Action Required if email is unverified */}
      {currentUser && !isVerified && activeTab !== 'manage-account' && (
        <div className="global-verify-notice-bar">
          <div className="global-verify-content">
            <span className="global-verify-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
            </span>
            <div className="global-verify-text">
              <strong>Notice: Please Verify Your Email Address</strong>
              <span>
                Your account ({currentUser.name || currentUser.username}) is not verified yet. 
                {currentUser.email ? ` (Registered: ${currentUser.email})` : ' No email registered.'}
              </span>
            </div>
          </div>
          <button
            className="global-verify-action-btn"
            onClick={() => setActiveTab('manage-account')}
          >
            Verify Email Now &rarr;
          </button>
        </div>
      )}

      <main className="main-content">
        {activeTab === 'checkin' && (
          <Attendance currentUser={currentUser} onLoginSuccess={handleLoginSuccess} setActiveTab={setActiveTab} />
        )}

        {activeTab === 'signin' && (
          <SignIn onLoginSuccess={handleLoginSuccess} />
        )}

        {activeTab === 'admin' && <AdminDashboard />}

        {activeTab === 'teacher' && <TeacherPortal currentUser={currentUser} />}

        {activeTab === 'portal' && <StudentPortal currentUser={currentUser} onUserUpdate={setCurrentUser} />}

        {activeTab === 'manage-account' && (
          <ManageAccount
            currentUser={currentUser}
            onUserUpdate={setCurrentUser}
            onBack={handleBackFromAccount}
            darkMode={darkMode}
          />
        )}
      </main>
    </div>
  )
}

export default App
