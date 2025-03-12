import path from "path";
import { fileURLToPath } from "url";
import { defineConfig } from "vite";
import packageJson from "../package.json" assert { type: "json" };
import { nodeResolve } from "@rollup/plugin-node-resolve";
import commonJS from "@rollup/plugin-commonjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const getLibraryName = () => {
    if (!packageJson.name) {
        throw new Error("Name property in package.json is missing.");
    }

    return packageJson.name
        .replace(/^@.*\//, "") // Remove namespace (e.g., "@koppajs/")
        .replace(/[-_/](\w)/g, (_, char) => char.toUpperCase()) // Convert "-" and "_" to PascalCase
        .replace(/^\w/, (char) => char.toUpperCase()); // Capitalize the first letter
};
  
const libName = getLibraryName();

export default defineConfig({
    plugins: [nodeResolve(), commonJS()],
    build: {
      minify: "terser",
      sourcemap: true,
      reportCompressedSize: true,
      lib: {
        entry: path.resolve(__dirname, "../src/index.ts"), // Ensure this file exists
        name: libName,
        formats: ["es", "cjs"],
        fileName: (format) => `index.${format}.js`,
      },
      rollupOptions: {
        // Ensure no HTML entry is required
        input: path.resolve(__dirname, "../src/index.ts"), // Make sure this file exists!
        external: ["uuid"], // List dependencies that should NOT be bundled
        output: {
          globals: {
            uuid: "uuid",
          },
        },
      },
    },
    resolve: {
      preserveSymlinks: true,
      alias: [
        { find: "@", replacement: path.resolve(__dirname, "./src") },
        { find: "~", replacement: path.resolve(__dirname, "./src") },
      ],
    },
});