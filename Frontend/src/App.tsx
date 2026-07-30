import React, { useState, useEffect } from 'react'
import LoginComponent from './components/LoginComponent'
import RegisterComponent from './components/RegisterComponent'
import AdminDashboard from './components/AdminDashboard'
import DirectorDashboard from './components/DirectorDashboard'
import CashierDashboard from './components/CashierDashboard'
import AccountComponent from './components/AccountComponent'
import Navbar from './components/Navbar'

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [userRole, setUserRole] = useState('')
  const [username, setUsername] = useState('')
  const [fullName, setFullName] = useState('')
  const [showRegister, setShowRegister] = useState(false)
  const [activeTab, setActiveTab] = useState('dashboard')

  useEffect(() => {
    const storedRole = localStorage.getItem('userRole')
    const storedUsername = localStorage.getItem('username')
    const storedFullName = localStorage.getItem('fullName')
    
    if (storedRole && storedUsername) {
      setIsAuthenticated(true)
      setUserRole(storedRole)
      setUsername(storedUsername)
      setFullName(storedFullName || '')
    }
  }, [])

  const handleLogin = (role: string, user: string, name: string) => {
    setIsAuthenticated(true)
    setUserRole(role)
    setUsername(user)
    setFullName(name)
  }

  const handleLogout = () => {
    localStorage.clear()
    setIsAuthenticated(false)
    setUserRole('')
    setUsername('')
    setFullName('')
  }

  const handleRegister = () => {
    setShowRegister(false)
  }

  const renderDashboard = () => {
    switch (userRole) {
      case 'ROLE_ADMIN':
        return <AdminDashboard onLogout={handleLogout} />
      case 'ROLE_DIRECTOR':
        return <DirectorDashboard onLogout={handleLogout} />
      case 'ROLE_CASHIER':
        return <CashierDashboard onLogout={handleLogout} />
      case 'ROLE_USER':
        return <AccountComponent activeTab={activeTab} setActiveTab={setActiveTab} onLogout={handleLogout} />
      default:
        return null
    }
  }

  if (!isAuthenticated) {
    if (showRegister) {
      return (
        <RegisterComponent 
          onRegister={handleRegister} 
          onShowLogin={() => setShowRegister(false)} 
        />
      )
    }
    return (
      <div>
        <LoginComponent onLogin={handleLogin} onShowSignUp={() => setShowRegister(true)} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar 
        isLoggedIn={isAuthenticated} 
        onLogout={handleLogout} 
        username={username} 
        userRole={userRole}
        fullName={fullName}
        onTabChange={setActiveTab}
      />
      <div className="pt-[67px]">
        {renderDashboard()}
      </div>
    </div>
  )
}
