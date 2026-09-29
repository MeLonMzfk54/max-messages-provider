import { useCallback, useEffect, useMemo, useState } from 'react'
import { ensureHttpApiReceiving, sendMessage } from '../api/greenApi'
import { useNotifications } from '../hooks/useNotifications'
import {
  loadActiveChatId,
  loadChats,
  loadMessages,
  saveActiveChatId,
  saveChats,
  saveMessages,
} from '../storage'
import type { Chat, Credentials, Message } from '../types'
import { MessagePanel } from './MessagePanel'
import { NewChatModal } from './NewChatModal'
import './ChatApp.css'

interface ChatAppProps {
  credentials: Credentials
  onLogout: () => void
}

function formatChatTime(timestamp?: number): string {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  const now = new Date()
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()

  if (sameDay) {
    return new Intl.DateTimeFormat('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(date)
  }

  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
  }).format(date)
}

function sortChats(chats: Chat[]): Chat[] {
  return [...chats].sort(
    (a, b) => (b.lastTimestamp ?? 0) - (a.lastTimestamp ?? 0),
  )
}

function findChatIndex(chats: Chat[], chatId: string, phone?: string): number {
  const byId = chats.findIndex((chat) => chat.chatId === chatId)
  if (byId >= 0) return byId
  if (!phone) return -1
  return chats.findIndex((chat) => chat.phone === phone)
}

function applyMessageToChats(
  chats: Chat[],
  message: Message,
  options: { bumpUnread: boolean; name?: string },
): Chat[] {
  const index = findChatIndex(chats, message.chatId, message.phone)
  const existing = index >= 0 ? chats[index] : undefined

  const nextChat: Chat = existing
    ? {
        ...existing,
        chatId: message.chatId || existing.chatId,
        phone: message.phone || existing.phone,
        name: options.name || existing.name,
        lastMessage: message.text,
        lastTimestamp: message.timestamp,
        unreadCount: options.bumpUnread
          ? (existing.unreadCount ?? 0) + 1
          : existing.unreadCount ?? 0,
      }
    : {
        chatId: message.chatId,
        phone: message.phone || message.chatId.replace(/@c\.us$/, ''),
        name: options.name || message.senderName || message.chatId,
        lastMessage: message.text,
        lastTimestamp: message.timestamp,
        unreadCount: options.bumpUnread ? 1 : 0,
      }

  const rest = chats.filter((_, i) => i !== index)
  return sortChats([nextChat, ...rest])
}

export function ChatApp({ credentials, onLogout }: ChatAppProps) {
  const instanceId = credentials.idInstance

  const [chats, setChats] = useState<Chat[]>(() => loadChats(instanceId))
  const [activeChatId, setActiveChatId] = useState<string | null>(() =>
    loadActiveChatId(instanceId),
  )
  const [messages, setMessages] = useState<Message[]>(() =>
    loadMessages(instanceId),
  )
  const [showNewChat, setShowNewChat] = useState(false)
  const [sendError, setSendError] = useState('')
  const [statusNote, setStatusNote] = useState('')

  useEffect(() => {
    let cancelled = false

    const prepare = async () => {
      try {
        const { updated } = await ensureHttpApiReceiving(credentials)
        if (!cancelled && updated) {
          setStatusNote(
            'Получение входящих включено. После смены настроек инстанс может перезапускаться до 1–2 минут.',
          )
        }
      } catch (error) {
        console.error('Failed to ensure receiving settings:', error)
      }
    }

    void prepare()
    return () => {
      cancelled = true
    }
  }, [credentials])

  useEffect(() => {
    saveChats(instanceId, chats)
  }, [instanceId, chats])

  useEffect(() => {
    saveMessages(instanceId, messages)
  }, [instanceId, messages])

  useEffect(() => {
    saveActiveChatId(instanceId, activeChatId)
  }, [instanceId, activeChatId])

  const activeChat = useMemo(
    () => chats.find((chat) => chat.chatId === activeChatId) ?? null,
    [chats, activeChatId],
  )

  const activeMessages = useMemo(
    () =>
      messages
        .filter((message) => {
          if (message.chatId === activeChatId) return true
          if (!activeChat) return false
          return Boolean(message.phone) && message.phone === activeChat.phone
        })
        .sort((a, b) => a.timestamp - b.timestamp),
    [messages, activeChatId, activeChat],
  )

  const openChat = useCallback((chatId: string) => {
    setActiveChatId(chatId)
    setSendError('')
    setChats((prev) =>
      prev.map((chat) =>
        chat.chatId === chatId ? { ...chat, unreadCount: 0 } : chat,
      ),
    )
  }, [])

  const upsertChat = useCallback((chat: Chat) => {
    setChats((prev) => {
      const existingIndex = findChatIndex(prev, chat.chatId, chat.phone)
      if (existingIndex >= 0) {
        return sortChats(
          prev.map((item, index) =>
            index === existingIndex
              ? {
                  ...item,
                  chatId: chat.chatId || item.chatId,
                  name: chat.name || item.name,
                  phone: chat.phone || item.phone,
                }
              : item,
          ),
        )
      }
      return sortChats([chat, ...prev])
    })
  }, [])

  const handleIncoming = useCallback(
    (message: Message) => {
      setChats((prevChats) => {
        const matchedIndex = findChatIndex(prevChats, message.chatId, message.phone)
        const matched = matchedIndex >= 0 ? prevChats[matchedIndex] : undefined
        const resolvedChatId = matched?.chatId || message.chatId
        const resolvedPhone = matched?.phone || message.phone
        const isActive =
          activeChatId === resolvedChatId || activeChatId === message.chatId
        const bumpUnread = message.direction === 'incoming' && !isActive

        const normalized: Message = {
          ...message,
          chatId: resolvedChatId,
          phone: resolvedPhone,
        }

        setMessages((prevMessages) => {
          if (prevMessages.some((item) => item.id === normalized.id)) {
            return prevMessages
          }
          return [...prevMessages, normalized]
        })

        return applyMessageToChats(prevChats, normalized, {
          bumpUnread,
          name: message.senderName,
        })
      })
    },
    [activeChatId],
  )

  const handleChatHint = useCallback(
    (chatId: string, name: string, phone?: string) => {
      setChats((prev) => {
        const existingIndex = findChatIndex(prev, chatId, phone)
        if (existingIndex >= 0) {
          const existing = prev[existingIndex]
          const nextName = name || existing.name
          const nextPhone = phone || existing.phone
          if (
            existing.name === nextName &&
            existing.phone === nextPhone &&
            existing.chatId === chatId
          ) {
            return prev
          }

          return sortChats(
            prev.map((item, index) =>
              index === existingIndex
                ? {
                    ...item,
                    chatId,
                    name: nextName,
                    phone: nextPhone,
                  }
                : item,
            ),
          )
        }

        return sortChats([
          {
            chatId,
            phone: phone || chatId.replace(/@c\.us$/, ''),
            name,
          },
          ...prev,
        ])
      })
    },
    [],
  )

  useNotifications({
    credentials,
    onMessage: handleIncoming,
    onChatHint: handleChatHint,
  })

  const handleCreateChat = (chat: Chat) => {
    upsertChat(chat)
    openChat(chat.chatId)
    setShowNewChat(false)
  }

  const handleSend = async (text: string) => {
    if (!activeChat) return
    setSendError('')

    try {
      const { idMessage } = await sendMessage(
        credentials,
        activeChat.chatId,
        text,
      )

      const message: Message = {
        id: idMessage,
        chatId: activeChat.chatId,
        phone: activeChat.phone,
        text,
        timestamp: Date.now(),
        direction: 'outgoing',
      }

      setMessages((prev) => [...prev, message])
      setChats((prev) =>
        applyMessageToChats(prev, message, { bumpUnread: false }),
      )
    } catch (err) {
      setSendError(
        err instanceof Error ? err.message : 'Не удалось отправить сообщение',
      )
      throw err
    }
  }

  return (
    <div className="chat">
      <aside className="chat__sidebar">
        <div className="chat__sidebar-top">
          <div className="chat__brand">
            <span className="chat__brand-mark">M</span>
            <strong>MAX</strong>
          </div>
          <button type="button" className="chat__logout" onClick={onLogout}>
            Выйти
          </button>
        </div>

        <button
          type="button"
          className="chat__new"
          onClick={() => setShowNewChat(true)}
        >
          + Новый чат
        </button>

        <div className="chat__list">
          {chats.length === 0 ? (
            <p className="chat__list-empty">Нет чатов. Создайте новый.</p>
          ) : (
            chats.map((chat) => (
              <button
                key={chat.chatId}
                type="button"
                className={
                  chat.chatId === activeChatId
                    ? 'chat__item chat__item--active'
                    : 'chat__item'
                }
                onClick={() => openChat(chat.chatId)}
              >
                <span className="chat__item-avatar" aria-hidden>
                  {chat.name.slice(0, 1)}
                </span>
                <span className="chat__item-body">
                  <span className="chat__item-row">
                    <strong>{chat.name}</strong>
                    <time>{formatChatTime(chat.lastTimestamp)}</time>
                  </span>
                  <span className="chat__item-row">
                    <small>
                      {chat.lastMessage || chat.phone || 'Нет сообщений'}
                    </small>
                    {(chat.unreadCount ?? 0) > 0 ? (
                      <span className="chat__badge">{chat.unreadCount}</span>
                    ) : null}
                  </span>
                </span>
              </button>
            ))
          )}
        </div>
      </aside>

      {activeChat ? (
        <div className="chat__main">
          <MessagePanel
            title={activeChat.name}
            subtitle={activeChat.phone}
            messages={activeMessages}
            onSend={handleSend}
          />
          {sendError ? <div className="chat__toast">{sendError}</div> : null}
          {statusNote ? (
            <div className="chat__toast chat__toast--info">{statusNote}</div>
          ) : null}
        </div>
      ) : (
        <div className="chat__placeholder">
          <div className="chat__placeholder-card">
            <span className="chat__brand-mark chat__brand-mark--lg">M</span>
            <h1>MAX Messages</h1>
            <p>Выберите чат или создайте новый, чтобы начать переписку</p>
            {statusNote ? <p className="chat__placeholder-note">{statusNote}</p> : null}
          </div>
        </div>
      )}

      {showNewChat ? (
        <NewChatModal
          credentials={credentials}
          onClose={() => setShowNewChat(false)}
          onCreate={handleCreateChat}
        />
      ) : null}
    </div>
  )
}
