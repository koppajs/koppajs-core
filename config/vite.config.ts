import path from "path";
import { fileURLToPath } from "url";
import { defineConfig } from "vite";
import packageJson from "../package.json" assert { type: "json" };
import { nodeResolve } from "@rollup/plugin-node-resolve";
import commonJS from "@rollup/plugin-commonjs";
import terser from "@rollup/plugin-terser"; // Minification for both ES and CJS outputs

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Converts the package name to PascalCase.
 * @returns {string} The library name formatted in PascalCase.
 */
const getLibraryName = () => {
  if (!packageJson.name) {
    throw new Error("The 'name' property is missing in package.json.");
  }

  return packageJson.name
    .replace(/^@.*\//, "") // Remove the namespace (e.g., "@namespace/")
    .replace(/[-_/](\w)/g, (_, char) => char.toUpperCase()) // Convert characters following '-' or '_' to uppercase
    .replace(/^\w/, (char) => char.toUpperCase()); // Capitalize the first letter
};

const libName = getLibraryName();

export default defineConfig({
  plugins: [nodeResolve(), commonJS()],
  build: {
    minify: "terser", // Use Terser for code minification
    sourcemap: true,  // Enable generation of source maps
    reportCompressedSize: true, // Report the compressed sizes of the output files
    lib: {
      entry: path.resolve(__dirname, "../src/index.ts"), // Library entry point
      name: libName, // Library name in PascalCase
      formats: ["es", "cjs"], // Output formats: ES module and CommonJS
    },
    rollupOptions: {
      input: path.resolve(__dirname, "../src/index.ts"), // Rollup input file
      external: [], // Specify external dependencies here if needed
      output: {
        dir: path.resolve(__dirname, "../dist"), // Output directory for build artifacts
        entryFileNames: "index.[format].js", // Dynamic file naming based on the module format
        plugins: [terser()], // Apply Terser plugin for additional minification during output
      },
    },
  },
  resolve: {
    preserveSymlinks: true,
    alias: [
      { find: "@", replacement: path.resolve(__dirname, "../src") },
      { find: "~", replacement: path.resolve(__dirname, "../src") },
    ],
  },
});
