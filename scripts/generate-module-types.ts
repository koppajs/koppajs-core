#!/usr/bin/env node
import { Project, Node, ParameterDeclaration } from 'ts-morph';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SRC_DIR = path.join(__dirname, '../src');
const TYPES_DIR = path.join(SRC_DIR, 'types');

const project = new Project({
  tsConfigFilePath: path.join(__dirname, '../config/tsconfig.morph.json'),
  // useInMemoryFileSystem: false,
  // skipAddingFilesFromTsConfig: true,
});

project.addSourceFilesAtPaths(`${SRC_DIR}/**/*.ts`);
const files = project.getSourceFiles();

console.log('📂 Geladene Dateien:');
files.forEach((file) => console.log('–', file.getBaseName()));

await fs.mkdir(TYPES_DIR, { recursive: true });

for (const file of files) {
  const fileName = file.getBaseNameWithoutExtension();
  if (file.getFilePath().includes('/types/') || fileName === 'types') continue;

  const exports = file.getExportedDeclarations();
  const typeLines: string[] = [];
  const importTypes: Set<string> = new Set();

  exports.forEach((decls, name) => {
    decls.forEach((decl) => {
      if (!name) return;

      if (Node.isFunctionDeclaration(decl)) {
        const sigs = decl.getOverloads().length ? decl.getOverloads() : [decl];
        sigs.forEach((sigDecl) => {
          const sig = sigDecl.getSignature();
          const params = sig.getParameters().map((p) => {
            const firstDecl = p.getDeclarations()[0];
            let pType = 'any';

            if (Node.isParameterDeclaration(firstDecl)) {
              const typeNode = (firstDecl as ParameterDeclaration).getTypeNode();
              if (typeNode) {
                pType = typeNode.getText();
              } else {
                try {
                  const typeChecker = project.getTypeChecker();
                  const type = typeChecker.getTypeAtLocation(firstDecl);
                  pType = type.getText();

                  const symbol = type.getSymbol();
                  if (symbol) {
                    const symbolName = symbol.getName();
                    if (
                      symbol
                        .getDeclarations()?.[0]
                        ?.getSourceFile()
                        .getFilePath()
                        .includes('/types/')
                    ) {
                      importTypes.add(symbolName);
                    }
                  }
                } catch {
                  pType = 'any';
                }
              }
            }

            // Typen extrahieren für Imports
            (pType.match(/\b[A-Z][A-Za-z0-9_]+/g) || []).forEach((t) => importTypes.add(t));

            // Direkt den Originaltext des Parameters übernehmen
            return firstDecl.getText();
          });

          let returnType = 'void';
          const returnNode = sigDecl.getReturnTypeNode?.();
          if (returnNode) {
            returnType = returnNode.getText();
          } else {
            try {
              const type = sig.getReturnType();
              returnType = type.getText();

              const symbol = type.getSymbol();
              if (symbol) {
                const symbolName = symbol.getName();
                if (
                  symbol.getDeclarations()?.[0]?.getSourceFile().getFilePath().includes('/types/')
                ) {
                  importTypes.add(symbolName);
                }
              }
            } catch {
              returnType = 'void';
            }
          }

          (returnType.match(/\b[A-Z][A-Za-z0-9_]+/g) || []).forEach((t) => importTypes.add(t));
          typeLines.push(`export declare function ${name}(${params.join(', ')}): ${returnType};`);
        });
      } else if (Node.isVariableDeclaration(decl)) {
        const type = decl.getType().getText();
        (type.match(/\b[A-Z][A-Za-z0-9_]+/g) || []).forEach((t) => importTypes.add(t));
        typeLines.push(`export declare const ${name}: ${type};`);
      } else if (Node.isClassDeclaration(decl)) {
        const classText = decl.getText().split('{')[0].trim();
        typeLines.push(`export declare ${classText} {}`);
      } else if (Node.isInterfaceDeclaration(decl)) {
        typeLines.push(`export ${decl.getText()}`);
      } else if (Node.isTypeAliasDeclaration(decl)) {
        typeLines.push(`export ${decl.getText()}`);
      }
    });
  });

  if (typeLines.length > 0) {
    const safeTypes = Array.from(importTypes)
      .filter((t) => t !== fileName)
      .filter((t) => /^[A-Z]/.test(t) && !['HTMLElement', 'DocumentFragment', 'Node'].includes(t));
    const importLine =
      safeTypes.length > 0
        ? `import type { ${safeTypes.sort().join(', ')} } from '../types';\n\n`
        : '';

    const outPath = path.join(TYPES_DIR, `${fileName}.types.ts`);
    await fs.writeFile(outPath, importLine + typeLines.join('\n\n'), 'utf-8');
    console.log(`✅ Modul-Typen exportiert: ${fileName}.types.ts`);
  }
}
