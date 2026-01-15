#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const srcDir = path.resolve(process.cwd(), "src");
const distDir = path.resolve(process.cwd(), "dist");

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.isFile() && p.endsWith(".d.ts")) {
      const rel = path.relative(srcDir, p);
      const out = path.join(distDir, rel);
      fs.mkdirSync(path.dirname(out), { recursive: true });
      fs.copyFileSync(p, out);
    }
  }
}

walk(srcDir);
console.info("✅ Copied src/**/*.d.ts → dist/");
