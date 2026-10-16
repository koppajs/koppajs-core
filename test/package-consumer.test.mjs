import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { after, before, test } from 'node:test'
import { fileURLToPath } from 'node:url'

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
