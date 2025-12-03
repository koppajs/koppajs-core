#!/usr/bin/env node
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "url";

// ==== Pfade ====

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Projektwurzel = Ordner über dem Skript
const PROJECT_ROOT = path.join(__dirname, "..");
const OUTPUT_FILE = path.join(PROJECT_ROOT, "---code_dump.txt");

// ==== Konfiguration: Ignore-Listen ====

const IGNORE_DIR_NAMES = new Set([
  "node_modules",
  ".git",
  ".hg",
  ".svn",
  ".turbo",
  ".next",
  ".nuxt",
  ".svelte-kit",
  ".angular",
  "dist",
  "build",
  "out",
  "coverage",
  ".cache",
  ".parcel-cache",
  ".vite",
  ".husky",
  ".vercel",
  ".idea",
  ".vscode",
  "tmp",
  "temp",
  ".tmp",
]);

const IGNORE_FILE_PATTERNS = [
  // temporär / generiert
  /\.log$/i,
  /\.tmp$/i,
  /\.temp$/i,
  /\.swp$/i,
  /~$/i,
  /\.bak$/i,
  /\.orig$/i,
  /\.DS_Store$/i,

  // Lockfiles
  /pnpm-lock\.yaml$/i,
  /package-lock\.json$/i,
  /yarn-lock\.txt$/i,

  // custom DUMP files
  /^---.*$/i,
];

// Bekannte Text-Extensions → direkt als Text behandeln
const TEXT_EXTENSIONS = new Set([
  ".js",
  ".cjs",
  ".mjs",
  ".ts",
  ".tsx",
  ".jsx",
  ".json",
  ".md",
  ".markdown",
  ".txt",
  ".html",
  ".htm",
  ".css",
  ".scss",
  ".sass",
  ".less",
  ".yml",
  ".yaml",
  ".xml",
  ".env",
  ".gitignore",
  ".gitattributes",
  ".eslintrc",
  ".prettierrc",
]);

/**
 * Prüft, ob ein Dateiname zu den ignorierten Dateien gehört.
 * @param {string} fileName
 * @returns {boolean}
 */
function shouldIgnoreFile(fileName) {
  return IGNORE_FILE_PATTERNS.some((regex) => regex.test(fileName));
}

/**
 * Ermittelt, ob eine Datei als Textdatei behandelt werden sollte.
 * Zuerst über Extension, sonst optionaler Binär-Check.
 * @param {string} filePath
 * @returns {Promise<"text" | "binary">}
 */
async function detectFileType(filePath) {
  const ext = path.extname(filePath).toLowerCase();

  if (TEXT_EXTENSIONS.has(ext)) {
    return "text";
  }

  // Unbekannte Extension → Binärcheck
  const isBinary = await isBinaryFile(filePath);
  return isBinary ? "binary" : "text";
}

/**
 * Binär-Erkennung: liest nur die ersten N Bytes und sucht Nullbytes.
 * @param {string} filePath
 * @returns {Promise<boolean>}
 */
async function isBinaryFile(filePath) {
  const MAX_BYTES = 8000;
  let handle;

  try {
    handle = await fs.open(filePath, "r");
    const buffer = globalThis.Buffer.alloc(MAX_BYTES);
    const { bytesRead } = await handle.read(buffer, 0, MAX_BYTES, 0);

    for (let i = 0; i < bytesRead; i++) {
      if (buffer[i] === 0) {
        return true; // Nullbyte → vermutlich Binär
      }
    }
    return false;
  } catch (error) {
    globalThis.console.warn(
      `⚠️  Fehler beim Binär-Check von ${filePath}: ${error.message}`,
    );
    // Fail-safe: eher als Binär behandeln, wenn wir nicht lesen können
    return true;
  } finally {
    if (handle) {
      await handle.close();
    }
  }
}

/**
 * Rekursiv alle relevanten Dateien im Projekt sammeln.
 * @param {string} dir
 * @returns {Promise<Array<{ path: string, type: "text" | "binary" }>>}
 */
async function getAllFiles(dir) {
  let result = [];

  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch (error) {
    globalThis.console.warn(
      `⚠️  Kann Verzeichnis nicht lesen: ${dir} (${error.message})`,
    );
    return result;
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    // eigenen Dump nicht wieder einlesen
    if (path.resolve(fullPath) === path.resolve(OUTPUT_FILE)) {
      continue;
    }

    if (entry.isDirectory()) {
      if (IGNORE_DIR_NAMES.has(entry.name) || entry.name.startsWith("---")) {
        continue;
      }
      // Symlinks auf Ordner lieber nicht verfolgen (Zyklenschutz)
      if (entry.isSymbolicLink && entry.isSymbolicLink()) {
        continue;
      }

      const subFiles = await getAllFiles(fullPath);
      result = result.concat(subFiles);
    } else if (entry.isFile()) {
      if (shouldIgnoreFile(entry.name)) {
        continue;
      }

      const type = await detectFileType(fullPath);
      result.push({ path: fullPath, type });
    }
  }

  return result;
}

/**
 * Erstellt den Code-Dump.
 */
async function dumpCode() {
  try {
    globalThis.console.info("🔍 Sammle alle relevanten Dateien im Projekt ...");
    globalThis.console.info(`📁 Projektwurzel: ${PROJECT_ROOT}`);

    const files = await getAllFiles(PROJECT_ROOT);

    globalThis.console.info(`📄 Gefundene Dateien: ${files.length}`);

    let content = "";
    for (const file of files) {
      const relativePath = path.relative(PROJECT_ROOT, file.path);

      if (file.type === "binary") {
        // Nur vermerken, kein Inhalt
        content += `\n\n===BINARY_FILE:${relativePath}===\n[Binärdatei – Inhalt ausgelassen]\n`;
        globalThis.console.info(`🚫 Binärdatei vermerkt: ${relativePath}`);
        continue;
      }

      // Textdatei → Inhalt dumpen
      try {
        const fileData = await fs.readFile(file.path, "utf-8");
        content += `\n\n===FILE:${relativePath}===\n${fileData}`;
      } catch (readError) {
        globalThis.console.warn(
          `⚠️  Datei wird übersprungen: ${relativePath} (Fehler: ${readError.message})`,
        );
      }
    }

    await fs.writeFile(OUTPUT_FILE, content, "utf-8");
    globalThis.console.info(`✅ Code-Dump abgeschlossen: ${OUTPUT_FILE}`);
  } catch (error) {
    globalThis.console.error(
      "❌ Fehler beim Erstellen des Code-Dumps:",
      error.message,
    );
    globalThis.process.exit(1);
  }
}

dumpCode();
