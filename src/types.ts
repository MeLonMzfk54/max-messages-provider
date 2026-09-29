export interface Credentials {
  idInstance: string
  apiTokenInstance: string
  apiHost: string
}

export interface Chat {
  chatId: string
  phone: string
  name: string
  lastMessage?: string
  lastTimestamp?: number
  unreadCount?: number
}

export interface Message {
  id: string
  chatId: string
  text: string
  timestamp: number
  direction: 'outgoing' | 'incoming'
  senderName?: string
  phone?: string
}

export interface InstanceSettings {
  webhookUrl?: string
  webhookUrlToken?: string
  incomingWebhook?: string
  outgoingWebhook?: string
  outgoingMessageWebhook?: string
  outgoingAPIMessageWebhook?: string
  stateWebhook?: string
}

export interface NotificationBody {
  typeWebhook: string
  timestamp: number
  idMessage: string
  senderData?: {
    chatId: string
    chatName?: string
    sender?: string
    senderName?: string
    senderContactName?: string
    senderPhoneNumber?: number | string
  }
  messageData?: {
    typeMessage: string
    textMessage?: string
    textMessageData?: {
      textMessage?: string
    }
    extendedTextMessageData?: {
      text?: string
    }
  }
}

export interface Notification {
  receiptId: number
  body: NotificationBody
}
