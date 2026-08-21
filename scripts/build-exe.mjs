import fs from 'fs';
import { execSync } from 'child_process';
import os from 'os';

console.log('Building bundled JS...');
execSync('npm run build', { stdio: 'inherit' });

console.log('Patching CJS for SEA...');
const cjsPath = 'dist/index.cjs';
let cjsCode = fs.readFileSync(cjsPath, 'utf8');
cjsCode = cjsCode.replace(/^#!\/usr\/bin\/env node\n/, '');
cjsCode = 'var __dirname = process.cwd();\n' + cjsCode;
fs.writeFileSync(cjsPath, cjsCode);
execSync('node --experimental-sea-config sea-config.json', { stdio: 'inherit' });

const exeName = os.platform() === 'win32' ? 'igm.exe' : 'igm';

console.log(`Copying Node binary to ${exeName}...`);
fs.copyFileSync(process.execPath, exeName);

console.log('Injecting SEA blob...');
const postjectCmd = `npx postject ${exeName} NODE_SEA_BLOB sea-prep.blob --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2`;
execSync(postjectCmd, { stdio: 'inherit' });

console.log(`\n✅ Standalone executable created: ${exeName}`);
