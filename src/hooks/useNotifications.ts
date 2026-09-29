import { useEffect, useRef } from 'react'
import { deleteNotification, normalizePhone, receiveNotification } from '../api/greenApi'
import type { Credentials, Message, NotificationBody } from '../types'

function extractText(body: NotificationBody): string | null {
  const data = body.messageData
  if (!data) return null

  if (data.textMessageData?.textMessage) {
    return data.textMessageData.textMessage
  }

  if (data.extendedTextMessageData?.text) {
    return data.extendedTextMessageData.text
  }

  if (typeof data.textMessage === 'string' && data.textMessage) {
    return data.textMessage
  }

  return null
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'))
      return
    }

    const timer = window.setTimeout(resolve, ms)
    const onAbort = () => {
      window.clearTimeout(timer)
      reject(new DOMException('Aborted', 'AbortError'))
    }

    signal?.addEventListener('abort', onAbort, { once: true })
  })
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException
    ? error.name === 'AbortError'
    : error instanceof Error && error.name === 'AbortError'
}

interface UseNotificationsOptions {
  credentials: Credentials | null
  onMessage: (message: Message) => void
  onChatHint?: (chatId: string, name: string, phone?: string) => void
}

let activePollId = 0

export function useNotifications({
  credentials,
  onMessage,
  onChatHint,
}: UseNotificationsOptions) {
  const onMessageRef = useRef(onMessage)
  const onChatHintRef = useRef(onChatHint)

  onMessageRef.current = onMessage
  onChatHintRef.current = onChatHint

  const idInstance = credentials?.idInstance ?? ''
  const apiTokenInstance = credentials?.apiTokenInstance ?? ''
  const apiHost = credentials?.apiHost ?? ''

  useEffect(() => {
    if (!idInstance || !apiTokenInstance || !apiHost) return

    const credentialsSnapshot: Credentials = {
      idInstance,
      apiTokenInstance,
      apiHost,
    }

    const pollId = ++activePollId
    const controller = new AbortController()

    const processNotification = async (body: NotificationBody) => {
      const type = body.typeWebhook
      const isIncoming = type === 'incomingMessageReceived'
      const isOutgoingApi = type === 'outgoingAPIMessageReceived'
      const isOutgoingPhone = type === 'outgoingMessageReceived'

      if (!isIncoming && !isOutgoingApi && !isOutgoingPhone) return

      const text = extractText(body)
      if (!text) return

      const chatId = body.senderData?.chatId
      if (!chatId) return

      const phoneRaw = body.senderData?.senderPhoneNumber
      const phone = phoneRaw != null ? normalizePhone(String(phoneRaw)) : undefined

      const name =
        body.senderData?.senderContactName ||
        body.senderData?.senderName ||
        body.senderData?.chatName ||
        phone ||
        chatId

      onChatHintRef.current?.(chatId, name, phone)

      if (isOutgoingApi) return

      const timestampMs =
        body.timestamp > 1e12 ? body.timestamp : body.timestamp * 1000

      onMessageRef.current({
        id: body.idMessage,
        chatId,
        text,
        timestamp: timestampMs,
        direction: isIncoming ? 'incoming' : 'outgoing',
        senderName: name,
        phone,
      })
    }

    const poll = async () => {
      while (pollId === activePollId && !controller.signal.aborted) {
        try {
          const notification = await receiveNotification(
            credentialsSnapshot,
            25,
            controller.signal,
          )

          if (pollId !== activePollId || controller.signal.aborted) break

          if (notification) {
            try {
              await processNotification(notification.body)
            } finally {
              if (!controller.signal.aborted) {
                await deleteNotification(
                  credentialsSnapshot,
                  notification.receiptId,
                  controller.signal,
                )
              }
            }
            continue
          }

          await sleep(1000, controller.signal)
        } catch (error) {
          if (isAbortError(error) || pollId !== activePollId) break
          console.error('Polling error:', error)
          try {
            await sleep(5000, controller.signal)
          } catch {
            break
          }
        }
      }
    }

    void poll()

    return () => {
      if (activePollId === pollId) {
        activePollId += 1
      }
      controller.abort()
    }
  }, [idInstance, apiTokenInstance, apiHost])
}
