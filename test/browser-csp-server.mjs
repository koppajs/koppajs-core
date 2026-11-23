import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'

const routes = new Map([
  ['/', ['browser-csp.html', 'text/html; charset=utf-8']],
  ['/fixture.mjs', ['browser-csp-fixture.mjs', 'text/javascript; charset=utf-8']],
  ['/controller.mjs', ['browser-csp-controller.mjs', 'text/javascript; charset=utf-8']],
  ['/dependency.mjs', ['browser-csp-dependency.mjs', 'text/javascript; charset=utf-8']],
  ['/runtime.mjs', ['../dist/index.es.js', 'text/javascript; charset=utf-8']],
])
const port = Number(process.env.PORT ?? 4178)
const server = createServer(async (request, response) => {
  const route = routes.get(new URL(request.url, 'http://localhost').pathname)
  response.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; object-src 'none'; base-uri 'none'",
  )
  response.setHeader('Cache-Control', 'no-store')
  response.setHeader('X-Content-Type-Options', 'nosniff')
  if (!route) {
    response.writeHead(404).end('Not found')
    return
  }
  try {
    const content = await readFile(new URL(route[0], import.meta.url))
    response.writeHead(200, { 'Content-Type': route[1] }).end(content)
  } catch (error) {
    console.error('CSP fixture failed to read ' + route[0], error)
    response.writeHead(500).end('Build the runtime first: corepack pnpm run build')
  }
})
server.on('error', (error) => {
  console.error(error)
  process.exitCode = 1
})
server.listen(port, '127.0.0.1', () => {
  console.log('CSP acceptance: http://127.0.0.1:' + server.address().port + '/')
  console.log('Negative control (expected CSP failure): add ?legacy=1')
})
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close())
