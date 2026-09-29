import type { Chat, Credentials, Message } from './types'

const CREDENTIALS_KEY = 'max-messages-credentials'

function storageKey(idInstance: string, suffix: string): string {
  return `max-messages:${idInstance}:${suffix}`
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function loadCredentials(): Credentials | null {
  return readJson<Credentials | null>(CREDENTIALS_KEY, null)
}

export function saveCredentials(credentials: Credentials): void {
  localStorage.setItem(CREDENTIALS_KEY, JSON.stringify(credentials))
}

export function clearCredentials(): void {
  localStorage.removeItem(CREDENTIALS_KEY)
}

export function loadChats(idInstance: string): Chat[] {
  return readJson<Chat[]>(storageKey(idInstance, 'chats'), [])
}

export function saveChats(idInstance: string, chats: Chat[]): void {
  localStorage.setItem(storageKey(idInstance, 'chats'), JSON.stringify(chats))
}

export function loadMessages(idInstance: string): Message[] {
  return readJson<Message[]>(storageKey(idInstance, 'messages'), [])
}

export function saveMessages(idInstance: string, messages: Message[]): void {
  localStorage.setItem(
    storageKey(idInstance, 'messages'),
    JSON.stringify(messages),
  )
}

export function loadActiveChatId(idInstance: string): string | null {
  return localStorage.getItem(storageKey(idInstance, 'activeChat'))
}

export function saveActiveChatId(idInstance: string, chatId: string | null): void {
  const key = storageKey(idInstance, 'activeChat')
  if (chatId) localStorage.setItem(key, chatId)
  else localStorage.removeItem(key)
}
