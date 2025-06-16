#!/usr/bin/env node
import { Project } from 'ts-morph';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Stabile Pfadauflösung relativ zum Skript
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SRC_DIR = path.join(__dirname, '../src');
const DIST_FILE = path.join(__dirname, '../dist/types.d.ts');

const project = new Project({
  useInMemoryFileSystem: false,
  skipAddingFilesFromTsConfig: true,
});

project.addSourceFilesAtPaths(`${SRC_DIR}/**/*.ts`);
const files = project.getSourceFiles();

console.log('📂 Geladene Dateien:');
files.forEach((file) => console.log('–', file.getFilePath()));

await fs.mkdir(path.dirname(DIST_FILE), { recursive: true });

const exportLines: string[] = [];

for (const sourceFile of files) {
  const filePath = sourceFile.getFilePath();
  const fileName = sourceFile.getBaseNameWithoutExtension();

  if (filePath.includes('/types/') || fileName === 'types') continue;

  const exports = sourceFile.getExportedDeclarations();

  if (exports.size === 0) {
    console.warn(`⚠️  Keine Exporte gefunden in: ${fileName}`);
  }

  exports.forEach((decls, name) => {
    console.log(`🔍 Gefundener Export: ${name} in ${fileName}`);

    let isPublic = false;

    for (const decl of decls) {
      if ('getJsDocs' in decl && typeof decl.getJsDocs === 'function') {
        const docs = decl.getJsDocs();
        const hasPublicTag = docs.some((doc) =>
          doc.getTags().some((tag) => tag.getTagName() === 'public'),
        );
        if (hasPublicTag) {
          isPublic = true;
          break;
        }
      }
    }

    if (isPublic) {
      const relativePath = path
        .relative(path.dirname(DIST_FILE), sourceFile.getFilePath())
        .replace(/\\/g, '/')
        .replace(/\.ts$/, '');
      exportLines.push(`export { ${name} } from './${relativePath}';`);
      console.log(`📤 Public export: ${name} from ${fileName}`);
    }
  });
}

await fs.writeFile(DIST_FILE, exportLines.join('\n'), 'utf-8');
console.log('✅ Öffentliche API geschrieben: dist/types.d.ts');
