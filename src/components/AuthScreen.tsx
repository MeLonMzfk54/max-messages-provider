import { useState, type FormEvent } from 'react'
import {
  ensureHttpApiReceiving,
  getStateInstance,
  resolveApiHost,
} from '../api/greenApi'
import type { Credentials } from '../types'
import './AuthScreen.css'

interface AuthScreenProps {
  onSuccess: (credentials: Credentials) => void
}

export function AuthScreen({ onSuccess }: AuthScreenProps) {
  const [idInstance, setIdInstance] = useState('')
  const [apiTokenInstance, setApiTokenInstance] = useState('')
  const [apiUrl, setApiUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    setLoading(true)

    const credentials: Credentials = {
      idInstance: idInstance.trim(),
      apiTokenInstance: apiTokenInstance.trim(),
      apiHost: resolveApiHost(idInstance.trim(), apiUrl),
    }

    try {
      const { stateInstance } = await getStateInstance(credentials)

      if (stateInstance !== 'authorized' && stateInstance !== 'suspended') {
        setError(
          `Инстанс в состоянии «${stateInstance}». Авторизуйте его в кабинете GREEN-API.`,
        )
        return
      }

      await ensureHttpApiReceiving(credentials)
      onSuccess(credentials)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Не удалось войти. Проверьте данные инстанса.',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth">
      <div className="auth__pattern" aria-hidden />
      <form className="auth__card" onSubmit={handleSubmit}>
        <div className="auth__logo" aria-hidden>
          <span className="auth__logo-mark">M</span>
        </div>
        <h1 className="auth__title">Вход в MAX</h1>
        <p className="auth__subtitle">
          Введите данные инстанса из личного кабинета GREEN-API
        </p>

        <label className="auth__field">
          <span>idInstance</span>
          <input
            value={idInstance}
            onChange={(e) => setIdInstance(e.target.value)}
            placeholder="3100000000"
            autoComplete="username"
            required
          />
        </label>

        <label className="auth__field">
          <span>apiTokenInstance</span>
          <input
            type="password"
            value={apiTokenInstance}
            onChange={(e) => setApiTokenInstance(e.target.value)}
            placeholder="Токен инстанса"
            autoComplete="current-password"
            required
          />
        </label>

        <label className="auth__field">
          <span>
            apiUrl <em>(необязательно)</em>
          </span>
          <input
            value={apiUrl}
            onChange={(e) => setApiUrl(e.target.value)}
            placeholder="https://3100.api.green-api.com"
          />
        </label>

        {error ? <p className="auth__error">{error}</p> : null}

        <button className="auth__submit" type="submit" disabled={loading}>
          {loading ? 'Проверка…' : 'Войти'}
        </button>
      </form>
    </div>
  )
}
