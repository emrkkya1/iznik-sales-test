#!/usr/bin/env node
const { execSync } = require('child_process');
const path = require('path');

const seedDir = path.join(__dirname, '..', 'supabase', 'seed-data');
const files = [
  '001_products.sql',
  '002_locations.sql',
  '003_branch_products.sql',
  '004_prices.sql',
  '005_auth_users.sql',
];

console.log('Applying seed data...\n');

files.forEach((file) => {
  const filePath = path.join(seedDir, file);
  console.log(`Applying ${file}...`);
  try {
    execSync(`supabase db execute --file "${filePath}"`, {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..'),
    });
    console.log(`✓ ${file} applied\n`);
  } catch (error) {
    console.error(`✗ Failed to apply ${file}`);
    process.exit(1);
  }
});

console.log('Seed data applied successfully!');
