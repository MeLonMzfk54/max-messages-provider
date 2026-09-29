import { useState } from 'react'
import { AuthScreen } from './components/AuthScreen'
import { ChatApp } from './components/ChatApp'
import {
  clearCredentials,
  loadCredentials,
  saveCredentials,
} from './storage'
import type { Credentials } from './types'

export default function App() {
  const [credentials, setCredentials] = useState<Credentials | null>(() =>
    loadCredentials(),
  )

  const handleLogin = (next: Credentials) => {
    saveCredentials(next)
    setCredentials(next)
  }

  const handleLogout = () => {
    clearCredentials()
    setCredentials(null)
  }

  if (!credentials) {
    return <AuthScreen onSuccess={handleLogin} />
  }

  return <ChatApp credentials={credentials} onLogout={handleLogout} />
}
