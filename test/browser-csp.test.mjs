import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { access, mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { test } from 'node:test'
import { setTimeout as delay } from 'node:timers/promises'
import { fileURLToPath } from 'node:url'

async function waitFor(read, label) {
  const deadline = Date.now() + 15_000
  while (Date.now() < deadline) {
    const result = await read()
    if (result) return result
    await delay(30)
  }
  throw new Error(`Timed out: ${label}`)
}

async function chromeExecutable() {
  const candidates = process.env.CHROME_BIN
    ? [process.env.CHROME_BIN]
    : [
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        '/Applications/Chromium.app/Contents/MacOS/Chromium',
        '/usr/bin/chromium',
        '/usr/bin/chromium-browser',
        '/usr/bin/google-chrome',
      ]
  for (const candidate of candidates) {
    try {
      await access(candidate)
      return candidate
    } catch {
      // Try the next installed browser; never download one.
    }
  }
  throw new Error(
    'Install-free CSP acceptance needs existing Chrome/Chromium; set CHROME_BIN to its executable',
  )
}

async function stop(child) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return
  const exited = once(child, 'exit')
  child.kill('SIGTERM')
  const force = setTimeout(() => child.kill('SIGKILL'), 2000)
  try {
    await exited
  } finally {
    clearTimeout(force)
  }
}

async function connect(url) {
  const socket = new WebSocket(url)
  await once(socket, 'open')
  let next = 0
  const pending = new Map()
  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data)
    const request = pending.get(message.id)
    if (!request) return
    pending.delete(message.id)
    if (message.error) request.reject(new Error(JSON.stringify(message.error)))
    else request.resolve(message.result)
  })
  return {
    close: () => socket.close(),
    send(method, params = {}) {
      return new Promise((resolve, reject) => {
        const id = ++next
        pending.set(id, { resolve, reject })
        socket.send(JSON.stringify({ id, method, params }))
      })
    },
  }
}

test(
  'real browser enforces CSP while precompiled controllers mount and update',
  { timeout: 60_000 },
  async () => {
    const executable = await chromeExecutable()
    const profile = await mkdtemp(path.join(tmpdir(), 'koppajs-csp-chrome-'))
    let server
    let browser
    let client
    try {
      server = spawn(
        process.execPath,
        [fileURLToPath(new URL('./browser-csp-server.mjs', import.meta.url))],
        {
          env: { ...process.env, PORT: '0' },
          stdio: ['ignore', 'pipe', 'pipe'],
        },
      )
      let output = ''
      server.stdout.on('data', (chunk) => {
        output += chunk
      })
      server.stderr.on('data', (chunk) => {
        output += chunk
      })
      const base = await waitFor(
        () => output.match(/http:\/\/127\.0\.0\.1:\d+\//)?.[0],
        'fixture server: ' + output,
      )
      const response = await fetch(base)
      assert.equal(response.status, 200)
      assert.match(response.headers.get('content-security-policy'), /script-src 'self';/)
      browser = spawn(
        executable,
        [
          '--headless=new',
          '--disable-gpu',
          '--no-first-run',
          '--no-default-browser-check',
          '--remote-debugging-port=0',
          `--user-data-dir=${profile}`,
          'about:blank',
        ],
        { stdio: 'ignore' },
      )
      const port = await waitFor(async () => {
        try {
          return (await readFile(path.join(profile, 'DevToolsActivePort'), 'utf8')).split(
            '\n',
          )[0]
        } catch (error) {
          if (error.code !== 'ENOENT') throw error
        }
      }, 'Chrome debugging port')
      const tabs = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()
      client = await connect(tabs.find((tab) => tab.type === 'page').webSocketDebuggerUrl)
      const evaluate = async (expression) => {
        const result = await client.send('Runtime.evaluate', {
          expression,
          returnByValue: true,
        })
        if (result.exceptionDetails)
          throw new Error(JSON.stringify(result.exceptionDetails))
        return result.result.value
      }
      await client.send('Page.navigate', { url: base })
      await waitFor(
        () =>
          evaluate("['pass', 'fail'].includes(document.documentElement.dataset.result)"),
        'CSP mount/update/reconnect',
      )
      assert.match(await evaluate('document.body.innerText'), /PASS: mount/)
      assert.deepEqual(
        JSON.parse(await evaluate("document.querySelector('#details').textContent"))
          .violations,
        [],
      )
      await client.send('Page.navigate', { url: base + '?legacy=1' })
      await waitFor(
        () => evaluate("document.documentElement.dataset.result === 'fail'"),
        'negative CSP control',
      )
      await waitFor(
        () => evaluate("document.querySelector('#details').textContent.includes('eval')"),
        'CSP eval violation evidence',
      )
      assert.match(
        await evaluate("document.querySelector('#details').textContent"),
        /script-src/,
      )
    } finally {
      client?.close()
      await stop(browser)
      await stop(server)
      await rm(profile, { recursive: true, force: true })
    }
  },
)
