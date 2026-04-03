import { useState, useEffect, createContext, useContext } from 'react'
import * as store from '../store'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [loggedIn, setLoggedIn] = useState(false)
  const [role, setRoleState] = useState('staff')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoggedIn(store.isSetup())
    setRoleState(store.getRole())
    setLoading(false)
  }, [])

  function login(pin) {
    if (pin !== store.getPin()) return false
    setLoggedIn(true)
    setRoleState(store.getRole())
    return true
  }

  function setup(name, pin, selectedRole) {
    store.setUserName(name)
    store.setPin(pin)
    store.setRole(selectedRole)
    setRoleState(selectedRole)
    setLoggedIn(true)
  }

  function logout() {
    setLoggedIn(false)
  }

  function switchRole(newRole) {
    store.setRole(newRole)
    setRoleState(newRole)
  }

  return (
    <AuthContext.Provider value={{
      user: loggedIn ? { name: store.getUserName() } : null,
      role,
      isAdmin: role === 'admin',
      loading,
      loggedIn,
      login,
      setup,
      logout,
      switchRole,
      isFirstTime: !store.isSetup(),
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
