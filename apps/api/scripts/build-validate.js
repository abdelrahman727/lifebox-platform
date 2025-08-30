#!/usr/bin/env node

/**
 * LifeBox API Build Validation Script
 * Validates that the NestJS application built successfully
 */

const fs = require('fs');
const path = require('path');

const requiredFiles = [
  'main.js',
  'app.module.js',
  'app.controller.js'
];

const distDir = path.join(__dirname, '..', 'dist');

console.log('🔍 Validating API build...');
console.log(`📁 Build directory: ${distDir}`);

// Check if dist directory exists
if (!fs.existsSync(distDir)) {
  console.error('❌ Build directory does not exist');
  process.exit(1);
}

// Check required files
const missingFiles = [];
const existingFiles = [];

for (const file of requiredFiles) {
  const filePath = path.join(distDir, file);
  if (fs.existsSync(filePath)) {
    existingFiles.push(file);
  } else {
    missingFiles.push(file);
  }
}

// Calculate build size
const stats = fs.statSync(distDir);
let totalSize = 0;

function calculateSize(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      calculateSize(filePath);
    } else {
      totalSize += stat.size;
    }
  }
}

calculateSize(distDir);
const sizeMB = (totalSize / 1024 / 1024).toFixed(2);

console.log(`✅ Found files: ${existingFiles.join(', ')}`);

if (missingFiles.length > 0) {
  console.log(`❌ Missing files: ${missingFiles.join(', ')}`);
  console.log('Build validation failed!');
  process.exit(1);
}

console.log(`📦 Build size: ${sizeMB}MB`);
console.log('✅ API build validation successful!');