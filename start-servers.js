#!/usr/bin/env node

import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

console.log('========================================');
console.log('   Mini Inventory System - Startup');
console.log('========================================');
console.log('');

// Check if we're on Windows
const isWindows = process.platform === 'win32';

// Function to check if a command exists
function checkCommand(command) {
  return new Promise((resolve) => {
    const checkCmd = isWindows ? 'where' : 'which';
    const process = spawn(checkCmd, [command], { shell: true });

    process.on('close', (code) => {
      resolve(code === 0);
    });

    process.on('error', () => {
      resolve(false);
    });
  });
}

// Function to start a server
function startServer(name, command, args, options = {}) {
  console.log(`🚀 Starting ${name}...`);

  const child = spawn(command, args, {
    stdio: 'inherit',
    shell: true,
    ...options
  });

  child.on('error', (error) => {
    console.error(`❌ Error starting ${name}:`, error.message);
  });

  child.on('close', (code) => {
    if (code !== 0) {
      console.log(`⚠️  ${name} exited with code ${code}`);
    }
  });

  return child;
}

// Main function
async function main() {
  try {
    // Check dependencies
    console.log('🔍 Checking dependencies...');

    const pipenvExists = await checkCommand('pipenv');
    if (!pipenvExists) {
      console.error('❌ Error: pipenv is not installed or not in PATH');
      console.error('Please install pipenv: pip install pipenv');
      process.exit(1);
    }

    const pnpmExists = await checkCommand('pnpm');
    if (!pnpmExists) {
      console.error('❌ Error: pnpm is not installed or not in PATH');
      console.error('Please install pnpm: npm install -g pnpm');
      process.exit(1);
    }

    console.log('✅ Dependencies check passed');
    console.log('');

    // Check for .env file
    if (!fs.existsSync('.env')) {
      console.log('⚠️  Warning: .env file not found');
      console.log('Please copy env.example to .env and configure your database settings');
      console.log('');
    }

    console.log('🚀 Starting servers...');
    console.log('');
    console.log('📡 Backend will run on: http://localhost:9000');
    console.log('🌐 Frontend will run on: http://localhost:9001');
    console.log('📱 App will be available at: http://localhost:9001');
    console.log('');
    console.log('Press Ctrl+C to stop both servers');
    console.log('');

    // Start backend server
    const backendProcess = startServer(
      'Backend Server',
      'pipenv',
      ['run', 'uvicorn', 'api.main:app', '--reload', '--port', '9000']
    );

    // Wait a moment for backend to start
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Start frontend server
    const frontendProcess = startServer(
      'Frontend Server',
      'pnpm',
      ['dev']
    );

    console.log('');
    console.log('✅ Both servers are starting...');
    console.log('');
    console.log('📋 Server Status:');
    console.log('   - Backend:  http://localhost:9000');
    console.log('   - Frontend: http://localhost:9001');
    console.log('   - App:      http://localhost:9001');
    console.log('');
    console.log('💡 Tips:');
    console.log('   - Check the terminal for server logs');
    console.log('   - Use Ctrl+C to stop the servers');
    console.log('   - Make sure your .env file is configured properly');
    console.log('');

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n🛑 Shutting down servers...');
      backendProcess.kill('SIGINT');
      frontendProcess.kill('SIGINT');
      process.exit(0);
    });

    // Keep the script running
    await new Promise(() => {});

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the main function
main();
