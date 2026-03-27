import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import pkg from './package.json' with { type: 'json' }

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

type PkgJson = {
  name: string
  dependencies?: Record<string, string>
  peerDependencies?: Record<string, string>
}

const pkgJson = pkg as unknown as PkgJson

const getLibraryName = () =>
  pkgJson.name
    .replace(/^@.*\//, '')
    .replace(/[-_/](\w)/g, (_, c) => c.toUpperCase())
    .replace(/^\w/, (c) => c.toUpperCase())

const externals = [
  ...Object.keys(pkgJson.dependencies ?? {}),
  ...Object.keys(pkgJson.peerDependencies ?? {}),
]

export default defineConfig({
  build: {
    sourcemap: 'hidden',
    minify: true,
    lib: {
      entry: path.resolve(__dirname, './src/index.ts'),
      name: getLibraryName(),
      formats: ['es', 'cjs'],
      fileName: (format) => `index.${format}.js`,
    },
    rollupOptions: {
      external: externals,
    },
  },
})
