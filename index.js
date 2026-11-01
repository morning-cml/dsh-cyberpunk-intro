/**
 * dsh-cyberpunk-intro — host half.
 *
 * Serves the one bundled clip at GET /dsh-cyberpunk-intro/intro.mp4, with Range
 * support so the <video> element can stream it. The browser half (client.js)
 * decides when to play it.
 */
import { createReadStream, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

export const name = 'dsh-cyberpunk-intro'
export const inject = ['webServer']

// Prefix routes must not end with a slash: the webserver tests `prefix + '/'`.
const ROUTE = '/dsh-cyberpunk-intro'
const MEDIA_PATH = ROUTE + '/intro.mp4'
const FILE = fileURLToPath(new URL('./media/intro.mp4', import.meta.url))

function fail(res, status, extra = {}) {
  res.writeHead(status, { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store', ...extra })
  res.end(status === 404 ? 'not found' : 'error')
}

function serve(req, res) {
  const path = (typeof req.url === 'string' ? req.url : '').split('?')[0]
  if (path !== MEDIA_PATH || (req.method !== 'GET' && req.method !== 'HEAD')) return fail(res, 404)

  let stats
  try {
    stats = statSync(FILE)
  } catch {
    return fail(res, 404)
  }
  const size = stats.size
  const etag = `"${size.toString(16)}-${Math.round(stats.mtimeMs).toString(16)}"`
  const common = { etag, 'accept-ranges': 'bytes', 'cache-control': 'no-cache' }

  if (req.headers['if-none-match'] === etag) {
    res.writeHead(304, common)
    return res.end()
  }

  let start = 0
  let end = size - 1
  let status = 200
  const range = /^bytes=(\d*)-(\d*)$/.exec(String(req.headers.range ?? '').trim())
  if (range !== null && (range[1] !== '' || range[2] !== '')) {
    if (range[1] === '') {
      start = Math.max(0, size - Number(range[2]))
    } else {
      start = Number(range[1])
      if (range[2] !== '') end = Math.min(Number(range[2]), size - 1)
    }
    if (start > end || start >= size) return fail(res, 416, { 'content-range': `bytes */${size}` })
    status = 206
  }

  res.writeHead(status, {
    ...common,
    'content-type': 'video/mp4',
    'content-length': String(end - start + 1),
    ...(status === 206 ? { 'content-range': `bytes ${start}-${end}/${size}` } : {}),
  })
  if (req.method === 'HEAD') return res.end()

  const stream = createReadStream(FILE, { start, end })
  stream.on('error', () => res.destroy())
  res.on('close', () => stream.destroy())
  stream.pipe(res)
}

export function apply(ctx) {
  ctx.effect(() => ctx.webServer.register({ kind: 'prefix', path: ROUTE, handler: serve }), 'dsh-cyberpunk-intro: media')
}
