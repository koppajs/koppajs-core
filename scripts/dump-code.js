#!/usr/bin/env node
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Resolve the current script's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SRC_DIR = path.join(__dirname, '../src'); // Adjust this if needed
const OUTPUT_FILE = path.join(__dirname, '../---code_dump');

/**
 * Checks if a file is binary by scanning the first 8000 bytes for null bytes (\x00).
 * @param {string} filePath - The path to the file.
 * @returns {Promise<boolean>} - Returns true if the file is binary, otherwise false.
 */
async function isBinaryFile(filePath) {
  try {
    const buffer = await fs.readFile(filePath);
    for (let i = 0; i < Math.min(buffer.length, 8000); i++) {
      if (buffer[i] === 0) {
        return true;
      } // Null byte found → Binary file
    }
    return false;
  } catch (error) {
    console.warn(`⚠️ Error checking ${filePath}: ${error.message}`);
    return true; // Fail-safe: Mark as binary if it cannot be read
  }
}

/**
 * Recursively collects all text-based files in a directory.
 * @param {string} dir - The directory to scan.
 * @returns {Promise<string[]>} - A list of text-based files.
 */
async function getAllFiles(dir) {
  let files = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files = files.concat(await getAllFiles(fullPath));
    } else {
      const isBinary = await isBinaryFile(fullPath);
      if (!isBinary) {
        files.push(fullPath);
      } else {
        console.info(`🚫 Skipping binary file: ${entry.name}`);
      }
    }
  }
  return files;
}

/**
 * Generates a code dump of all text-based files.
 */
async function dumpCode() {
  try {
    console.info('🔍 Collecting all text-based files from src/ ...');
    const files = await getAllFiles(SRC_DIR);

    let content = '';
    for (const file of files) {
      try {
        const fileData = await fs.readFile(file, 'utf-8');
        content += `\n\n===== FILE: ${path.relative(SRC_DIR, file)} =====\n${fileData}`;
      } catch (readError) {
        console.warn(`⚠️ Skipping file: ${file} (Error: ${readError.message})`);
      }
    }

    await fs.writeFile(OUTPUT_FILE, content, 'utf-8');
    console.info(`✅ Code dump completed: ${OUTPUT_FILE}`);
  } catch (error) {
    console.error('❌ Error dumping code:', error.message);
    process.exit(1);
  }
}

dumpCode();
