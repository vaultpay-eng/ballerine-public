#!/usr/bin/node
const childProcess = require('node:child_process');
const path = require('node:path');
const fs = require('fs');

// Set the root directory (workflows-service directory)
const rootDir = path.join(__dirname, '..');

const ensureEnvFileIsPresent = () => {
  const envFile = path.join(rootDir, '.env');
  const envExampleFile = path.join(rootDir, '.env.example');
  if (fs.existsSync(envFile)) {
    const destPath = `${envFile}-${new Date().toISOString().replace(/,|:|\s/g, '-')}.backup`;
    fs.copyFileSync(envFile, destPath);
  }
  fs.copyFileSync(envExampleFile, envFile);
};

const run = (cmd, cwd = rootDir) => {
  childProcess.execSync(cmd, { cwd, stdio: 'inherit' });
};

// START
console.log('🏗️ preparing workflows-service');

// Run build command
run('npm run build');

console.log('🍎 preparing environment');

// Ensure .env file is present
ensureEnvFileIsPresent();

// Run generate-salt.sh
const saltScript = path.join(__dirname, 'generate-salt.sh');
if (fs.existsSync(saltScript)) {
  console.log('Generating salt...');
  run('bash ./scripts/generate-salt.sh');
} else {
  console.log('No generate-salt.sh script found. Skipping salt generation.');
}

console.log('✅ All done!');
