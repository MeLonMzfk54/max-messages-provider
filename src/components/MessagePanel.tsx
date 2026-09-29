import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import type { Message } from '../types'
import './MessagePanel.css'

interface MessagePanelProps {
  title: string
  subtitle: string
  messages: Message[]
  onSend: (text: string) => Promise<void>
}

function formatTime(timestamp: number): string {
  return new Intl.DateTimeFormat('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestamp))
}

export function MessagePanel({ title, subtitle, messages, onSend }: MessagePanelProps) {
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const node = listRef.current
    if (!node) return
    node.scrollTop = node.scrollHeight
  }, [messages])

  const submit = async () => {
    const value = text.trim()
    if (!value || sending) return

    setSending(true)
    try {
      await onSend(value)
      setText('')
    } finally {
      setSending(false)
    }
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    void submit()
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      void submit()
    }
  }

  return (
    <section className="panel">
      <header className="panel__header">
        <div className="panel__avatar" aria-hidden>
          {title.slice(0, 1)}
        </div>
        <div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
      </header>

      <div className="panel__messages" ref={listRef}>
        {messages.length === 0 ? (
          <div className="panel__empty">Напишите первое сообщение</div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`bubble bubble--${message.direction}`}
            >
              <p>{message.text}</p>
              <time>{formatTime(message.timestamp)}</time>
            </div>
          ))
        )}
      </div>

      <form className="panel__composer" onSubmit={handleSubmit}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Введите сообщение"
          rows={1}
        />
        <button type="submit" disabled={sending || !text.trim()} aria-label="Отправить">
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
            <path
              fill="currentColor"
              d="M3.4 20.6 21 12 3.4 3.4l.1 6.8L15 12 3.5 13.8z"
            />
          </svg>
        </button>
      </form>
    </section>
  )
}
