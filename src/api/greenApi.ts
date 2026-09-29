import type {
  Credentials,
  InstanceSettings,
  Notification,
} from '../types'

function buildUrl(credentials: Credentials, method: string, suffix = ''): string {
  const { idInstance, apiTokenInstance, apiHost } = credentials
  const path = `/waInstance${idInstance}/${method}/${apiTokenInstance}${suffix}`

  if (import.meta.env.DEV) {
    return `/green-api/${apiHost}${path}`
  }

  return `https://${apiHost}${path}`
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const text = await response.text()
    throw new Error(text || `HTTP ${response.status}`)
  }

  const contentType = response.headers.get('content-type') ?? ''
  if (!contentType.includes('application/json')) {
    const text = await response.text()
    if (!text) return null as T
    return JSON.parse(text) as T
  }

  return (await response.json()) as T
}

export function resolveApiHost(idInstance: string, apiUrl?: string): string {
  if (apiUrl?.trim()) {
    try {
      return new URL(apiUrl.trim()).host
    } catch {
      return apiUrl.trim().replace(/^https?:\/\//, '').replace(/\/$/, '')
    }
  }

  return `${idInstance.slice(0, 4)}.api.green-api.com`
}

export async function getStateInstance(
  credentials: Credentials,
): Promise<{ stateInstance: string }> {
  const response = await fetch(buildUrl(credentials, 'getStateInstance'))
  return handleResponse(response)
}

export async function getSettings(
  credentials: Credentials,
): Promise<InstanceSettings> {
  const response = await fetch(buildUrl(credentials, 'getSettings'))
  return handleResponse(response)
}

export async function setSettings(
  credentials: Credentials,
  settings: InstanceSettings,
): Promise<{ saveSettings: boolean }> {
  const response = await fetch(buildUrl(credentials, 'setSettings'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  })
  return handleResponse(response)
}

export async function ensureHttpApiReceiving(
  credentials: Credentials,
): Promise<{ updated: boolean }> {
  const current = await getSettings(credentials)
  const needsUpdate =
    Boolean(current.webhookUrl) ||
    current.incomingWebhook !== 'yes'

  if (!needsUpdate) {
    return { updated: false }
  }

  await setSettings(credentials, {
    webhookUrl: '',
    webhookUrlToken: '',
    incomingWebhook: 'yes',
    outgoingMessageWebhook: 'yes',
    outgoingAPIMessageWebhook: 'yes',
    stateWebhook: 'yes',
  })

  return { updated: true }
}

export async function checkAccount(
  credentials: Credentials,
  phoneNumber: number,
): Promise<{ exist: boolean; chatId: string; status?: boolean; reason?: string }> {
  const response = await fetch(buildUrl(credentials, 'checkAccount'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phoneNumber }),
  })
  return handleResponse(response)
}

export async function sendMessage(
  credentials: Credentials,
  chatId: string,
  message: string,
): Promise<{ idMessage: string }> {
  const response = await fetch(buildUrl(credentials, 'sendMessage'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chatId, message }),
  })
  return handleResponse(response)
}

export async function receiveNotification(
  credentials: Credentials,
  receiveTimeout = 5,
  signal?: AbortSignal,
): Promise<Notification | null> {
  const response = await fetch(
    `${buildUrl(credentials, 'receiveNotification')}?receiveTimeout=${receiveTimeout}`,
    { signal },
  )

  if (response.status === 200) {
    const text = await response.text()
    if (!text || text === 'null') return null
    return JSON.parse(text) as Notification
  }

  if (response.status === 204) return null

  return handleResponse(response)
}

export async function deleteNotification(
  credentials: Credentials,
  receiptId: number,
  signal?: AbortSignal,
): Promise<{ result: boolean }> {
  const response = await fetch(
    buildUrl(credentials, 'deleteNotification', `/${receiptId}`),
    { method: 'DELETE', signal },
  )
  return handleResponse(response)
}

export function normalizePhone(input: string): string {
  return input.replace(/\D/g, '')
}

export function phoneToChatId(phone: string): string {
  return `${normalizePhone(phone)}@c.us`
}
