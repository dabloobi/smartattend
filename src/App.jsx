import { useState, useEffect } from 'react'
import Navbar from './components/Navbar'
import SignIn from './components/SignIn'
import AdminDashboard from './components/AdminDashboard'
import Attendance from './components/Attendance'
import StudentPortal from './components/StudentPortal'
import TeacherPortal from './components/TeacherPortal'
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

      <main className="main-content">
        {activeTab === 'checkin' && (
          <Attendance currentUser={currentUser} onLoginSuccess={handleLoginSuccess} setActiveTab={setActiveTab} />
        )}

        {activeTab === 'signin' && (
          <SignIn onLoginSuccess={handleLoginSuccess} />
        )}

        {activeTab === 'admin' && <AdminDashboard />}

        {activeTab === 'teacher' && <TeacherPortal currentUser={currentUser} />}

        {activeTab === 'portal' && <StudentPortal currentUser={currentUser} />}
      </main>
    </div>
  )
}

export default App
