import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const staticMode = process.argv.includes('--static')
const port = Number(process.env.GANTT_BENCHMARK_PORT || 1899)
const chromePath = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

function emit(payload) {
  console.log(JSON.stringify(payload, null, 2))
}

function fail(message) {
  console.error(message)
  process.exit(1)
}

function delay(ms) {
  return new Promise(resolveDelay => setTimeout(resolveDelay, ms))
}

async function waitForHttp(url, timeoutMs = 30000) {
  const startedAt = Date.now()
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url)
      if (response.ok) return
    } catch (error) {
      // Server is not ready yet.
    }
    await delay(500)
  }
  fail(`Timed out waiting for ${url}`)
}

function spawnProcess(command, args, options = {}) {
  const child = spawn(command, args, {
    cwd: root,
    stdio: ['ignore', 'pipe', 'pipe'],
    ...options
  })
  child.stdout.on('data', chunk => {
    if (process.env.GANTT_BENCHMARK_DEBUG) process.stdout.write(chunk)
  })
  child.stderr.on('data', chunk => {
    if (process.env.GANTT_BENCHMARK_DEBUG) process.stderr.write(chunk)
  })
  return child
}

async function launchChrome() {
  const userDataDir = mkdtempSync(resolve(tmpdir(), 'gantt-benchmark-chrome-'))
  const chrome = spawn(chromePath, [
    '--headless=new',
    '--disable-gpu',
    '--disable-extensions',
    '--no-first-run',
    `--user-data-dir=${userDataDir}`,
    '--remote-debugging-port=0',
    'about:blank'
  ], {
    stdio: ['ignore', 'ignore', 'pipe']
  })

  let stderr = ''
  const wsUrl = await new Promise((resolveWs, rejectWs) => {
    const timer = setTimeout(() => rejectWs(new Error('Timed out waiting for Chrome DevTools endpoint')), 15000)
    chrome.stderr.on('data', chunk => {
      stderr += String(chunk)
      const match = stderr.match(/DevTools listening on (ws:\/\/[^\s]+)/)
      if (match) {
        clearTimeout(timer)
        resolveWs(match[1])
      }
    })
    chrome.on('exit', code => {
      clearTimeout(timer)
      rejectWs(new Error(`Chrome exited before DevTools was ready: ${code}`))
    })
  })

  return {
    chrome,
    wsUrl,
    cleanup() {
      chrome.kill('SIGTERM')
      rmSync(userDataDir, { recursive: true, force: true })
    }
  }
}

class CdpClient {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl)
    this.nextId = 1
    this.pending = new Map()
    this.ready = new Promise((resolveReady, rejectReady) => {
      this.ws.addEventListener('open', resolveReady, { once: true })
      this.ws.addEventListener('error', rejectReady, { once: true })
    })
    this.ws.addEventListener('message', event => {
      const message = JSON.parse(String(event.data))
      if (!message.id || !this.pending.has(message.id)) return
      const { resolveCall, rejectCall } = this.pending.get(message.id)
      this.pending.delete(message.id)
      if (message.error) rejectCall(new Error(message.error.message))
      else resolveCall(message.result)
    })
  }

  async send(method, params = {}) {
    await this.ready
    const id = this.nextId++
    this.ws.send(JSON.stringify({ id, method, params }))
    return new Promise((resolveCall, rejectCall) => {
      this.pending.set(id, { resolveCall, rejectCall })
    })
  }

  close() {
    this.ws.close()
  }
}

async function createPage(browserWsUrl, url) {
  const versionUrl = browserWsUrl.replace(/^ws:/, 'http:').replace(/\/devtools\/browser\/.+$/, '/json/new?' + encodeURIComponent(url))
  const response = await fetch(versionUrl, { method: 'PUT' })
  if (!response.ok) fail(`Unable to create Chrome target: ${response.status}`)
  const target = await response.json()
  const client = new CdpClient(target.webSocketDebuggerUrl)
  await client.send('Page.enable')
  await client.send('Runtime.enable')
  return client
}

async function evaluate(client, expression) {
  const result = await client.send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true
  })
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text || 'Runtime.evaluate failed')
  }
  return result.result.value
}

async function waitForExpression(client, expression, timeoutMs = 30000) {
  const startedAt = Date.now()
  while (Date.now() - startedAt < timeoutMs) {
    if (await evaluate(client, expression)) return
    await delay(500)
  }
  fail(`Timed out waiting for expression: ${expression}`)
}

async function runBrowserBenchmark() {
  const server = spawnProcess('npm', ['run', 'serve', '--', '--host', '127.0.0.1', '--port', String(port)])
  const chromeSession = await launchChrome()
  let client = null
  try {
    await waitForHttp(`http://127.0.0.1:${port}/`)
    client = await createPage(chromeSession.wsUrl, `http://127.0.0.1:${port}/#/performance-benchmark`)
    await waitForExpression(client, "Boolean(document.querySelector('.benchmark-page .vg-scroll'))")

    const benchmark = await evaluate(client, `new Promise(resolve => {
      const vm = document.querySelector('.benchmark-page').__vue__;
      vm.rowCount = 10000;
      vm.linkCount = 1000;
      vm.scaleKey = '15m';
      vm.consoleEnabled = false;
      vm.applyBenchmark();
      requestAnimationFrame(() => requestAnimationFrame(async () => {
        const scroll = document.querySelector('.benchmark-page .vg-scroll');
        const frames = [];
        let last = performance.now();
        for (let index = 0; index < 24; index += 1) {
          scroll.scrollLeft += 800;
          await new Promise(requestAnimationFrame);
          const now = performance.now();
          frames.push(now - last);
          last = now;
        }
        const metric = vm.metric;
        resolve({
          scenario: 'performance-benchmark',
          metric,
          maxFrameDuration: Math.max(...frames),
          longFrameCount: frames.filter(value => value > 120).length
        });
      }));
    })`)

    const denseClient = await createPage(chromeSession.wsUrl, `http://127.0.0.1:${port}/#/dense-visible-tasks`)
    await waitForExpression(denseClient, "Boolean(document.querySelector('.dense-demo-page .vg-scroll'))")
    const dense = await evaluate(denseClient, `new Promise(resolve => {
      requestAnimationFrame(() => requestAnimationFrame(async () => {
        const page = document.querySelector('.dense-demo-page');
        const vm = page.__vue__;
        const scroll = page.querySelector('.vg-scroll');
        const frames = [];
        let last = performance.now();
        for (let index = 0; index < 24; index += 1) {
          scroll.scrollLeft += 1200;
          await new Promise(requestAnimationFrame);
          const now = performance.now();
          frames.push(now - last);
          last = now;
        }
        resolve({
          scenario: 'dense-visible-tasks',
          metric: vm.metric,
          maxFrameDuration: Math.max(...frames),
          longFrameCount: frames.filter(value => value > 120).length
        });
      }));
    })`)
    denseClient.close()

    const result = {
      mode: 'browser',
      thresholds: {
        maxLongFrameCount: 0,
        maxFrameDurationMs: 120
      },
      scenarios: [benchmark, dense]
    }

    emit(result)
    const failed = result.scenarios.some(item => item.longFrameCount > 0 || item.maxFrameDuration > 120)
    if (failed) process.exit(1)
  } finally {
    if (client) client.close()
    chromeSession.cleanup()
    server.kill('SIGTERM')
  }
}

function runStaticBenchmarkSmoke() {
  emit({
    mode: 'static',
    scenarios: [
      { name: 'performance-benchmark', route: '/performance-benchmark' },
      { name: 'dense-visible-tasks', route: '/dense-visible-tasks' }
    ],
    thresholds: {
      maxLongFrameCount: 0,
      maxFrameDurationMs: 120
    }
  })
}

if (staticMode) {
  runStaticBenchmarkSmoke()
} else {
  runBrowserBenchmark().catch(error => fail(error.stack || error.message))
}
