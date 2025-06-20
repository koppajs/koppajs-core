#!/usr/bin/env node
import { Project } from 'ts-morph';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SRC_DIR = path.join(__dirname, '../src');
const DIST_FILE = path.join(__dirname, '../dist/index.d.ts');

const project = new Project({
  tsConfigFilePath: path.join(__dirname, '../config/tsconfig.morph.json'),
});

const files = project.getSourceFiles().filter((f) => !f.getBaseName().endsWith('.d.ts'));

console.log('📂 Geladene Dateien:');
files.forEach((file) => console.log('–', file.getFilePath()));

await fs.mkdir(path.dirname(DIST_FILE), { recursive: true });

const exportLines: string[] = [];
let errorCount = 0;

for (const sourceFile of files) {
  const filePath = sourceFile.getFilePath();
  const fileName = sourceFile.getBaseNameWithoutExtension();

  const isGeneratedTypes = filePath.includes('/types/') && !filePath.endsWith('/types.ts');
  if (isGeneratedTypes) continue;

  const exports = sourceFile.getExportedDeclarations();
  if (exports.size === 0) {
    console.warn(`⚠️  Keine Exporte in: ${fileName}`);
    continue;
  }

  for (const [name, decls] of exports.entries()) {
    let isPublic = false;

    for (const decl of decls) {
      if ('getJsDocs' in decl && typeof decl.getJsDocs === 'function') {
        const docs = decl.getJsDocs();
        const hasPublicTag = docs.some((doc) =>
          doc.getTags().some((tag) => tag.getTagName().toLowerCase() === 'public'),
        );
        if (hasPublicTag) {
          isPublic = true;
          break;
        }
      }
    }

    if (isPublic) {
      const relativePath = path.relative(path.dirname(DIST_FILE), sourceFile.getFilePath());
      const normalizedPath = relativePath.replace(/\\/g, '/').replace(/\.ts$/, '');
      const cleanedPath = normalizedPath.startsWith('src/')
        ? `../${normalizedPath}`
        : normalizedPath;

      const symbolExists = sourceFile.getExportSymbols().some((sym) => sym.getName() === name);
      if (!symbolExists) {
        console.error(`❌ Symbol '${name}' nicht gefunden in ${fileName}`);
        errorCount++;
        continue;
      }

      exportLines.push(`export { ${name} } from '${cleanedPath}';`);
      console.log(`📤 Public export: ${name} from ${fileName}`);
    }
  }
}

if (exportLines.length > 0) {
  await fs.writeFile(DIST_FILE, exportLines.join('\n') + '\n', 'utf-8');
  console.log('✅ index.d.ts geschrieben');
} else {
  console.warn('⚠️  Keine öffentlichen Exporte gefunden. Datei wurde nicht erzeugt.');
}
