#!/usr/bin/env node
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Resolve the current script's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SRC_DIR = path.join(__dirname, '../src'); // Adjust this if needed
const OUTPUT_FILE = path.join(__dirname, '../---code_dump');

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

async function dumpCode() {
  try {
    console.info('🔍 Collecting all files from src/ ...');
    const files = await getAllFiles(SRC_DIR);

    let content = '';
    for (const file of files) {
      const fileData = await fs.readFile(file, 'utf-8');
      content += `\n\n===== FILE: ${path.relative(SRC_DIR, file)} =====\n${fileData}`;
    }

    await fs.writeFile(OUTPUT_FILE, content, 'utf-8');
    console.info(`✅ Code dump completed: ${OUTPUT_FILE}`);
  } catch (error) {
    console.error('❌ Error dumping code:', error.message);
    process.exit(1);
  }
}

dumpCode();
