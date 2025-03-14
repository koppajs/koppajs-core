import path from "path";
import { fileURLToPath } from "url";
import { defineConfig } from "vite";
import packageJson from "../package.json" assert { type: "json" };
import { nodeResolve } from "@rollup/plugin-node-resolve";
import commonJS from "@rollup/plugin-commonjs";
import terser from "@rollup/plugin-terser"; // Minifizierung für ES und CJS

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Wandelt den Package-Namen in PascalCase um.
 * @returns {string} Der konvertierte Name der Bibliothek.
 */
const getLibraryName = () => {
  if (!packageJson.name) {
    throw new Error("Name property in package.json is missing.");
  }

  return packageJson.name
    .replace(/^@.*\//, "") // Entfernt Namespace (e.g., "@koppajs/")
    .replace(/[-_/](\w)/g, (_, char) => char.toUpperCase()) // Konvertiert "-" und "_" in PascalCase
    .replace(/^\w/, (char) => char.toUpperCase()); // Erster Buchstabe groß
};

const libName = getLibraryName();

export default defineConfig({
  plugins: [nodeResolve(), commonJS()],
  build: {
    minify: "terser",
    sourcemap: true,
    reportCompressedSize: true,
    lib: {
      entry: path.resolve(__dirname, "../src/index.ts"),
      name: libName,
      formats: ["es", "cjs"],
    },
    rollupOptions: {
      input: path.resolve(__dirname, "../src/index.ts"),
      external: [], // Hier externe Abhängigkeiten hinzufügen, falls nötig
      output: {
        dir: path.resolve(__dirname, "../dist"), // Zielverzeichnis
        entryFileNames: "index.[format].js", // Dynamische Benennung
        sourcemap: true,
        plugins: [terser()], // Minifizierung für ES und CJS
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
