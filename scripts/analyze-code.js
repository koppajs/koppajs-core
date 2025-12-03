#!/usr/bin/env node
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "url";

// Resolve script directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SRC_DIR = path.join(__dirname, "../src");
const OUTPUT_FILE = path.join(__dirname, "../---code_analysis");

// Regex Patterns
const FUNCTION_PATTERN =
  /\bfunction\b|\b\w+\s*=\s*\(?[^=]*\)?\s*=>|\b\w+\s*\([^=]*\)\s*{/g; // Function definitions
const CLASS_PATTERN = /\bclass\s+\w+/g; // Class declarations
const IMPORT_EXPORT_PATTERN = /\b(import|export)\b/g; // Imports & Exports

async function getAllFiles(dir) {
  let files = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files = files.concat(await getAllFiles(fullPath));
    } else {
      files.push(fullPath);
    }
  }
  return files;
}

async function analyzeCode() {
  try {
    globalThis.console.info("🔍 Analyzing source code...");
    const files = await getAllFiles(SRC_DIR);

    let totalLines = 0;
    let totalFiles = files.length;
    let functionCount = 0;
    let classCount = 0;
    let importExportCount = 0;

    for (const file of files) {
      const fileData = await fs.readFile(file, "utf-8");
      const lines = fileData.split("\n").map((line) => line.trim());
      const codeLines = lines.filter(
        (line) =>
          line &&
          !line.startsWith("//") &&
          !line.startsWith("/*") &&
          !line.startsWith("*"),
      );

      totalLines += codeLines.length;
      functionCount += (fileData.match(FUNCTION_PATTERN) || []).length;
      classCount += (fileData.match(CLASS_PATTERN) || []).length;
      importExportCount += (fileData.match(IMPORT_EXPORT_PATTERN) || []).length;
    }

    const report = `
===== CODE ANALYSIS REPORT =====
📂 Total files: ${totalFiles}
📄 Total lines of code (excluding comments/whitespace): ${totalLines}
🔧 Total functions: ${functionCount}
🏛️ Total classes: ${classCount}
📦 Total imports/exports: ${importExportCount}
================================
    `.trim();

    await fs.writeFile(OUTPUT_FILE, report, "utf-8");
    globalThis.console.info(report);
    globalThis.console.info(
      `✅ Analysis completed! Report saved in: ${OUTPUT_FILE}`,
    );
  } catch (error) {
    globalThis.console.error("❌ Error analyzing code:", error.message);
    globalThis.process.exit(1);
  }
}

analyzeCode();
