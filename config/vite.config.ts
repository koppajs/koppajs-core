import path from "node:path"
import { fileURLToPath } from "node:url"
import { defineConfig } from "vite"
import pkg from "../package.json" with { type: "json" }

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * Minimal package.json shape required by this build config.
 * Optional fields allow adding runtime deps later without refactoring.
 */
type PkgJson = {
  name: string
  dependencies?: Record<string, string>
  peerDependencies?: Record<string, string>
}

const pkgJson = pkg as unknown as PkgJson

/**
 * Derives a stable global library name from the package name.
 * Mainly relevant for non-ESM consumers.
 */
const getLibraryName = () =>
  pkgJson.name
    .replace(/^@.*\//, "")
    .replace(/[-_/](\w)/g, (_, c) => c.toUpperCase())
    .replace(/^\w/, (c) => c.toUpperCase())

/**
 * Runtime dependencies are expected to be provided by the consumer
 * and should therefore not be bundled into the core library.
 */
const externals = [
  ...Object.keys(pkgJson.dependencies ?? {}),
  ...Object.keys(pkgJson.peerDependencies ?? {}),
]

export default defineConfig({
  build: {
    // Hidden sourcemaps keep memory usage low while preserving debug ability
    sourcemap: "hidden",
    minify: true,

    lib: {
      entry: path.resolve(__dirname, "../src/index.ts"),
      name: getLibraryName(),
      formats: ["es", "cjs"],
      fileName: (format) => `index.${format}.js`,
    },

    rollupOptions: {
      external: externals,
    },
  },
})
