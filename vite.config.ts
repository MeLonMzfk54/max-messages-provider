import react from '@vitejs/plugin-react'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { defineConfig, type Plugin } from 'vite'

function greenApiProxy(): Plugin {
  return {
    name: 'green-api-proxy',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/green-api/')) {
          next()
          return
        }

        try {
          await proxyGreenApi(req, res)
        } catch (error) {
          console.error('[green-api-proxy]', error)
          res.statusCode = 502
          res.end('Bad Gateway')
        }
      })
    },
  }
}

async function proxyGreenApi(req: IncomingMessage, res: ServerResponse) {
  const url = req.url ?? ''
  const match = url.match(/^\/green-api\/([^/]+)(\/.*)?$/)
  if (!match) {
    res.statusCode = 400
    res.end('Invalid proxy path')
    return
  }

  const host = match[1]
  const targetPath = match[2] ?? '/'
  const targetUrl = `https://${host}${targetPath}`

  const headers: Record<string, string> = {}
  for (const [key, value] of Object.entries(req.headers)) {
    if (value == null) continue
    if (key === 'host' || key === 'origin' || key === 'referer') continue
    headers[key] = Array.isArray(value) ? value.join(',') : value
  }
  headers.host = host

  const chunks: Buffer[] = []
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
  }
  const body = chunks.length ? Buffer.concat(chunks) : undefined

  const upstream = await fetch(targetUrl, {
    method: req.method,
    headers,
    body: req.method === 'GET' || req.method === 'HEAD' ? undefined : body,
  })

  res.statusCode = upstream.status
  upstream.headers.forEach((value, key) => {
    if (key.toLowerCase() === 'transfer-encoding') return
    res.setHeader(key, value)
  })

  const buffer = Buffer.from(await upstream.arrayBuffer())
  res.end(buffer)
}

export default defineConfig({
  plugins: [react(), greenApiProxy()],
})
