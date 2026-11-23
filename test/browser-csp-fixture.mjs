import { Core } from '/runtime.mjs'
import { controller, metrics } from '/controller.mjs'

const status = document.querySelector('#status')
const details = document.querySelector('#details')
const fixture = document.querySelector('#fixture')
const violations = []
window.addEventListener('securitypolicyviolation', (event) => {
  violations.push({ directive: event.effectiveDirective, blockedURI: event.blockedURI })
  details.textContent = JSON.stringify(violations, null, 2)
  status.textContent = 'FAIL: CSP violation'
  document.documentElement.dataset.result = 'fail'
})
function check(condition, message) {
  if (!condition) throw new Error(message)
}
const waitFor = async (predicate) => {
  const deadline = performance.now() + 4000
  while (!predicate()) {
    if (performance.now() > deadline) throw new Error('Timed out waiting for lifecycle')
    await new Promise((resolve) => setTimeout(resolve, 16))
  }
}
const legacy = new URLSearchParams(location.search).has('legacy')
Core.take(
  {
    template: '<button ref="action" type="button">Increment</button>',
    script: '({ state: { count: 7 } })',
    style: '',
    deps: { initial: async () => (await import('/dependency.mjs')).initial },
    ...(!legacy && { compiledScript: controller }),
  },
  'csp-acceptance',
)
Core()
let runs = 0

async function run() {
  const rerun = document.querySelector('#rerun')
  rerun.disabled = true
  status.textContent = 'RUNNING'
  document.documentElement.dataset.result = 'running'
  const before = { ...metrics }
  const host = document.createElement('csp-acceptance')
  async function mount(expectedMounts) {
    fixture.append(host)
    await waitFor(() => metrics.mounted === before.mounted + expectedMounts)
    await host.instance.readyPromise
    const button = host.querySelector('button')
    check(host.instance.state.count === 7, 'Incorrect dependency state')
    check(
      host.instance.$refs.action === button && button.dataset.mounted === 'true',
      'Incorrect mounted ref',
    )
    const clicks = metrics.clicks
    const windowEvents = metrics.windowEvents
    button.click()
    window.dispatchEvent(new Event('csp-probe'))
    check(
      metrics.clicks === clicks + 1 && metrics.windowEvents === windowEvents + 1,
      'Listeners must fire exactly once',
    )
    check(host.instance.state.count === 9, 'Structured events must update live state')
    return { button, state: host.instance.state }
  }
  async function unmount(retained, expectedDestroyed) {
    host.remove()
    await waitFor(
      () =>
        metrics.destroyed === before.destroyed + expectedDestroyed &&
        host.instance === undefined,
    )
    const clicks = metrics.clicks
    const windowEvents = metrics.windowEvents
    retained.button.click()
    window.dispatchEvent(new Event('csp-probe'))
    check(
      metrics.clicks === clicks && metrics.windowEvents === windowEvents,
      'Detached button/window listeners leaked',
    )
    check(retained.state.count === 9, 'Destroyed controller changed after cleanup')
  }
  try {
    const first = await mount(1)
    await unmount(first, 1)
    const second = await mount(2)
    await unmount(second, 2)
    check(
      metrics.factories === before.factories + 2,
      'Factory must run once per connection',
    )
    check(violations.length === 0, 'Unexpected CSP violation')
    runs++
    details.textContent = JSON.stringify({ runs, metrics, violations }, null, 2)
    status.textContent = 'PASS: mount, dependency, click, teardown and reconnect'
    document.documentElement.dataset.result = 'pass'
  } catch (error) {
    status.textContent = 'FAIL: ' + error.message
    details.textContent = JSON.stringify(
      { error: error.message, metrics, violations },
      null,
      2,
    )
    document.documentElement.dataset.result = 'fail'
  } finally {
    host.remove()
    rerun.disabled = false
  }
}
document.querySelector('#rerun').addEventListener('click', run)
await run()
