// scripts/postbuild.js
// ---------------------------------------------
// Copies the public TypeScript definition file
// into the dist/ directory after build finishes.
// This ensures `package.json -> "types"` points
// to the correct entry point (e.g. dist/index.d.ts).
// ---------------------------------------------

import { copyFileSync } from 'fs';
import { resolve } from 'path';

// Path to the manually maintained public API definitions
const source = resolve('src/types/public.d.ts');

// Destination path in the build output
const destination = resolve('dist/index.d.ts');

// Copy the file into the dist folder
copyFileSync(source, destination);

console.log('✅ Copied public type definitions to dist/index.d.ts');
