#!/usr/bin/env node

/**
 * This script helps identify files that still use CommonJS patterns
 * in a project that's being converted to ES Modules
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name in ES module
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

// Pattern to match require() and module.exports
const commonJSPatterns = [
  /\brequire\s*\(['"]/g,      // require('...')
  /\bmodule\.exports\b/g,     // module.exports
  /\bexports\.\w+\s*=/g       // exports.something =
];

// Files and directories to exclude
const excludePaths = [
  'node_modules',
  'coverage',
  '.git',
  'pnpm-lock.yaml',
  'package-lock.json'
];

// File extensions to check
const extensions = ['.js', '.mjs'];

const results = [];

/**
 * Check a file for CommonJS patterns
 */
function checkFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');

    // Check if file contains CommonJS patterns
    for (const pattern of commonJSPatterns) {
      if (pattern.test(content)) {
        results.push({
          file: filePath,
          pattern: pattern.toString()
        });
        break; // Found a pattern, no need to check others
      }
    }
  } catch (error) {
    console.error(`Error reading file ${filePath}: ${error.message}`);
  }
}

/**
 * Recursively scan directory for JS files
 */
function scanDirectory(dir) {
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      // Skip excluded paths
      if (excludePaths.some(exclude => fullPath.includes(exclude))) {
        continue;
      }

      if (entry.isDirectory()) {
        scanDirectory(fullPath);
      } else if (entry.isFile() && extensions.includes(path.extname(entry.name))) {
        checkFile(fullPath);
      }
    }
  } catch (error) {
    console.error(`Error scanning directory ${dir}: ${error.message}`);
  }
}

// Start scanning from root directory
console.log('Scanning for CommonJS patterns...');
scanDirectory(rootDir);

// Display results
if (results.length === 0) {
  console.log('No CommonJS patterns found! Your project is fully converted to ES Modules.');
} else {
  console.log(`Found ${results.length} files with CommonJS patterns that need to be converted:`);
  results.forEach(result => {
    console.log(`- ${result.file} (${result.pattern})`);
  });
}
