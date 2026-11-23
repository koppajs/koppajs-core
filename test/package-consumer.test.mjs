import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { after, before, test } from 'node:test'
import { fileURLToPath } from 'node:url'

const jsdomModule = import.meta.resolve('jsdom')
const typescriptCli = fileURLToPath(import.meta.resolve('typescript/bin/tsc'))

const repository = fileURLToPath(new URL('../', import.meta.url))
let workspace
let consumer
let installedPackage

function run(command, args, cwd) {
  try {
    return execFileSync(command, args, {
      cwd,
      encoding: 'utf8',
      timeout: 120_000,
      env: { ...process.env, NODE_OPTIONS: '' },
      stdio: ['ignore', 'pipe', 'pipe'],
    })
  } catch (error) {
    throw new Error(
      `${command} ${args.join(' ')} failed:\n${error.stdout ?? ''}\n${error.stderr ?? ''}`,
      { cause: error },
    )
  }
}

before(() => {
  workspace = mkdtempSync(path.join(tmpdir(), 'koppajs-package-'))
  consumer = path.join(workspace, 'consumer')
  mkdirSync(consumer)
  writeFileSync(path.join(consumer, 'package.json'), '{"private":true}')

  const packed = JSON.parse(
    run(
      'npm',
      ['pack', '--ignore-scripts', '--json', '--pack-destination', workspace],
      repository,
    ),
  )
  assert.equal(packed.length, 1)
  run(
    'npm',
    [
      'install',
      '--offline',
      '--ignore-scripts',
      '--no-audit',
      '--no-fund',
      '--package-lock=false',
      path.join(workspace, packed[0].filename),
    ],
    consumer,
  )
  installedPackage = path.join(consumer, 'node_modules/@koppajs/koppajs-core')
})

after(() => {
  if (workspace) rmSync(workspace, { recursive: true, force: true })
})

const assertions = `
assert.equal(typeof Core, 'function', 'Core must be a function');
assert.equal(typeof Core.take, 'function', 'Core.take must be a function');
assert.equal(typeof globalThis.document, 'undefined');
assert.equal(typeof globalThis.HTMLElement, 'undefined');
`

for (const [filename, source] of [
  [
    'consumer.mjs',
    `import assert from 'node:assert/strict';
import { Core } from '@koppajs/koppajs-core';`,
  ],
  [
    'consumer.cjs',
    `const assert = require('node:assert/strict');
const { Core } = require('@koppajs/koppajs-core');`,
  ],
]) {
  test(`packed package exposes Core in ${filename} on ${process.version}`, () => {
    const entry = path.join(consumer, filename)
    writeFileSync(entry, `${source}\n${assertions}`)
    run(process.execPath, [entry], consumer)
  })
}

test(`packed legacy main exposes Core on ${process.version}`, () => {
  const manifest = JSON.parse(
    readFileSync(path.join(installedPackage, 'package.json'), 'utf8'),
  )
  const entry = path.join(consumer, 'legacy.cjs')
  writeFileSync(
    entry,
    `const assert = require('node:assert/strict');
const { Core } = require(${JSON.stringify(path.resolve(installedPackage, manifest.main))});
${assertions}`,
  )
  run(process.execPath, [entry], consumer)
})

for (const format of ['mjs', 'cjs']) {
  test(`packed ${format} mounts precompiled and legacy controllers`, () => {
    const entry = path.join(consumer, `mount.${format}`)
    const load =
      format === 'mjs'
        ? "const { Core } = await import('@koppajs/koppajs-core');"
        : "const { Core } = require('@koppajs/koppajs-core');"
    writeFileSync(
      entry,
      `
${format === 'mjs' ? "import assert from 'node:assert/strict';" : "const assert = require('node:assert/strict');"}
(async () => {
  const { JSDOM } = await import(${JSON.stringify(jsdomModule)});
  const dom = new JSDOM('<!doctype html><body></body>', {
    url: 'http://localhost/', pretendToBeVisual: true,
  });
  for (const key of ['window', 'document', 'customElements', 'HTMLElement',
    'HTMLInputElement', 'HTMLTextAreaElement', 'Element', 'Node', 'Window',
    'Document', 'DocumentFragment', 'Text', 'Comment', 'NodeFilter', 'MutationObserver',
    'Event', 'CustomEvent', 'EventTarget', 'AbortController', 'AbortSignal']) {
    globalThis[key] = dom.window[key];
  }
  globalThis.requestAnimationFrame = dom.window.requestAnimationFrame.bind(dom.window);
  globalThis.cancelAnimationFrame = dom.window.cancelAnimationFrame.bind(dom.window);
  ${load}
  const waitFor = async predicate => {
    const deadline = Date.now() + 3000;
    while (!predicate()) {
      assert.ok(Date.now() < deadline, 'component did not reach expected state');
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  };
  let calls = 0;
  let destroyed = 0;
  Core.take({
    template: '<button ref="action" onclick="increment">{{ count }}</button>',
    style: '',
    script: '(() => { throw new Error("Legacy script must not execute") })()',
    deps: { initial: async () => 7 },
    compiledScript(context, deps) {
      calls++;
      assert.equal(typeof context.$emit, 'function');
      assert.equal(deps.initial, 7);
      return {
        state: { count: deps.initial },
        methods: { increment() { this.count++; } },
        destroyed() { destroyed++; },
      };
    },
  }, 'packed-precompiled');
  Core.take({ template: '<p>{{ message }}</p>', style: '',
    script: '({ state: { message: "legacy works" } })',
  }, 'packed-legacy');
  Core();
  const host = document.createElement('packed-precompiled');
  const legacy = document.createElement('packed-legacy');
  try {
    document.body.append(host, legacy);
    await waitFor(() => host.querySelector('button')?.textContent === '7'
      && legacy.querySelector('p')?.textContent === 'legacy works');
    await host.instance.readyPromise;
    assert.equal(calls, 1);
    assert.equal(host.instance.$refs.action, host.querySelector('button'));
    host.querySelector('button').click();
    await waitFor(() => host.querySelector('button')?.textContent === '8');
    host.remove();
    await waitFor(() => destroyed === 1);
    document.body.append(host);
    await waitFor(() => calls === 2 && host.querySelector('button')?.textContent === '7');
    host.querySelector('button').click();
    await waitFor(() => host.querySelector('button')?.textContent === '8');
  } finally {
    document.body.replaceChildren();
    dom.window.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
`,
    )
    run(process.execPath, [entry], consumer)
  })
}

test('packed declarations expose a typed synchronous controller factory', () => {
  const entry = path.join(consumer, 'contract.mts')
  writeFileSync(
    entry,
    `
import { Core, type ComponentSource, type ComponentContext,
  type ComponentController, type CompiledScript } from '@koppajs/koppajs-core';
const factory: CompiledScript = (context, deps) => {
  const typedContext: ComponentContext = context;
  const typedDeps: Record<string, unknown> | undefined = deps;
  // @ts-expect-error Dependency values are unknown, not any.
  const invalid: number = deps?.value;
  return { state: { typedContext, typedDeps } } satisfies ComponentController;
};
const component: ComponentSource = {
  template: '<p>ready</p>', script: '', style: '', compiledScript: factory,
};
Core.take(component, 'typed-component');
const legacyComponent: ComponentSource = {
  template: '<p>legacy</p>', script: '({ state: {} })', style: '',
};
Core.take(legacyComponent, 'typed-legacy');
// @ts-expect-error Factory state must be an object, not a number.
const invalidState: CompiledScript = () => ({ state: 42 });
// @ts-expect-error Factory must be callable, not unknown index-signature metadata.
const invalidSource: ComponentSource = { template: '', script: '', style: '', compiledScript: 42 };
// @ts-expect-error Factories return a controller synchronously.
const invalidAsync: CompiledScript = async () => ({ state: {} });
// @ts-expect-error Context is typed, not any.
const invalidContext: CompiledScript = (context: number) => ({ state: {} });
factory({ $refs: {}, $emit() {}, $take() {} });
`,
  )
  run(
    process.execPath,
    [
      typescriptCli,
      '--noEmit',
      '--strict',
      '--skipLibCheck',
      '--module',
      'ESNext',
      '--moduleResolution',
      'Bundler',
      '--target',
      'ES2022',
      entry,
    ],
    consumer,
  )
})
