import { useState, type FormEvent } from 'react'
import { checkAccount, normalizePhone, phoneToChatId } from '../api/greenApi'
import type { Chat, Credentials } from '../types'
import './NewChatModal.css'

interface NewChatModalProps {
  credentials: Credentials
  onClose: () => void
  onCreate: (chat: Chat) => void
}

export function NewChatModal({ credentials, onClose, onCreate }: NewChatModalProps) {
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')

    const digits = normalizePhone(phone)
    if (digits.length < 11 || digits.length > 12) {
      setError('Введите номер в международном формате, например 79991234567')
      return
    }

    setLoading(true)

    try {
      const result = await checkAccount(credentials, Number(digits))

      if (result.status === false) {
        setError(result.reason || 'Не удалось проверить номер')
        return
      }

      if (!result.exist) {
        setError('Аккаунт MAX на этом номере не найден')
        return
      }

      const chatId = result.chatId || phoneToChatId(digits)
      onCreate({
        chatId,
        phone: digits,
        name: digits,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : ''
      if (message.toLowerCase().includes('limit')) {
        setError(message)
        return
      }

      onCreate({
        chatId: phoneToChatId(digits),
        phone: digits,
        name: digits,
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label="Новый чат">
      <button className="modal__backdrop" type="button" aria-label="Закрыть" onClick={onClose} />
      <form className="modal__card" onSubmit={handleSubmit}>
        <h2>Новый чат</h2>
        <p>Введите номер телефона получателя в международном формате</p>
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="79991234567"
          autoFocus
          inputMode="tel"
        />
        {error ? <p className="modal__error">{error}</p> : null}
        <div className="modal__actions">
          <button type="button" className="modal__secondary" onClick={onClose}>
            Отмена
          </button>
          <button type="submit" className="modal__primary" disabled={loading}>
            {loading ? 'Создание…' : 'Создать'}
          </button>
        </div>
      </form>
    </div>
  )
}
