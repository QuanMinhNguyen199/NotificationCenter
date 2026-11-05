import fs from 'node:fs'
import path from 'node:path'
import type { Connect, Plugin } from 'vite'

// Công cụ tạm: lưu màu biểu đồ dùng chung cho mọi người mở trang (GET/PUT /api/chart-colors).
// Chỉ nhận đúng các khóa màu đã biết với mã hex 6 chữ số; không có xác thực, chỉ dùng trong mạng nội bộ.
const KEYS = ['bar', 'barDim', 'barHover', 'sent', 'overdue', 'dueSoon', 'dueSoonInk', 'inTerm', 'inTermInk']
const HEX = /^#[0-9a-f]{6}$/i
const FILE = path.resolve(__dirname, 'chart-colors.json')

function read() {
  try {
    return JSON.parse(fs.readFileSync(FILE, 'utf8'))
  } catch {
    return { colors: {}, updatedAt: null }
  }
}

const handler: Connect.NextHandleFunction = (req, res, next) => {
  if (!req.url?.startsWith('/api/chart-colors')) return next()
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  if (req.method === 'GET') return res.end(JSON.stringify(read()))
  if (req.method !== 'PUT') {
    res.statusCode = 405
    return res.end('{"error":"method"}')
  }
  let body = ''
  req.on('data', (c) => {
    body += c
    if (body.length > 4096) req.destroy()
  })
  req.on('end', () => {
    try {
      const input = JSON.parse(body)?.colors ?? {}
      const colors: Record<string, string> = {}
      for (const k of KEYS) if (typeof input[k] === 'string' && HEX.test(input[k])) colors[k] = input[k].toUpperCase()
      const data = { colors, updatedAt: new Date().toISOString() }
      fs.writeFileSync(FILE, JSON.stringify(data, null, 2))
      res.end(JSON.stringify(data))
    } catch {
      res.statusCode = 400
      res.end('{"error":"invalid"}')
    }
  })
}

export function chartColorsApi(): Plugin {
  return {
    name: 'chart-colors-api',
    configureServer(server) {
      server.middlewares.use(handler)
    },
    configurePreviewServer(server) {
      server.middlewares.use(handler)
    },
  }
}
