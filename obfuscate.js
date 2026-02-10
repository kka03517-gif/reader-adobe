import JavaScriptObfuscator from 'javascript-obfuscator';
import fs from 'fs';
import path from 'path';

const distDir = './dist/assets';

console.log('Starting obfuscation process...');

// Check if dist directory exists
if (!fs.existsSync(distDir)) {
  console.error('Build directory not found. Make sure to run "vite build" first.');
  process.exit(1);
}

// Get all JS files in dist/assets
const files = fs.readdirSync(distDir).filter(file => file.endsWith('.js'));

if (files.length === 0) {
  console.log('No JavaScript files found to obfuscate.');
  process.exit(0);
}

console.log(`Found ${files.length} JavaScript files to obfuscate...`);

files.forEach(file => {
  const filePath = path.join(distDir, file);
  const code = fs.readFileSync(filePath, 'utf8');
  
  console.log(`Obfuscating: ${file}...`);
  
  const obfuscatedCode = JavaScriptObfuscator.obfuscate(code, {
    compact: true,
    controlFlowFlattening: false,
    deadCodeInjection: false,
    debugProtection: true,
    disableConsoleOutput: true,
    identifierNamesGenerator: 'hexadecimal',
    log: false,
    stringArray: false,
    stringArrayEncoding: ['base64'],
    stringArrayThreshold: 0.75,
    transformObjectKeys: false,
    unicodeEscapeSequence: false
  }).getObfuscatedCode();
  
  fs.writeFileSync(filePath, obfuscatedCode);
  console.log(`✅ Obfuscated: ${file}`);
});

console.log('🎉 All JavaScript files have been obfuscated successfully!');
