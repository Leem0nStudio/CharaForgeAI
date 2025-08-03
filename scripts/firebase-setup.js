#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔥 Firebase Development Setup');
console.log('=============================\n');

// Check if .env file exists
const envPath = path.join(process.cwd(), '.env');
const envExamplePath = path.join(process.cwd(), '.env.example');

if (!fs.existsSync(envPath)) {
  if (fs.existsSync(envExamplePath)) {
    console.log('📋 Copying .env.example to .env...');
    fs.copyFileSync(envExamplePath, envPath);
    console.log('✅ Created .env file from template\n');
  } else {
    console.log('❌ No .env.example file found');
    process.exit(1);
  }
} else {
  console.log('✅ .env file already exists\n');
}

// Check Firebase configuration
console.log('🔍 Checking Firebase configuration...');

const requiredEnvVars = [
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'NEXT_PUBLIC_FIREBASE_APP_ID',
  'FIREBASE_PROJECT_ID',
  'FIREBASE_CLIENT_EMAIL',
  'FIREBASE_PRIVATE_KEY'
];

const envContent = fs.readFileSync(envPath, 'utf8');
const missingVars = [];

requiredEnvVars.forEach(varName => {
  if (!envContent.includes(varName) || envContent.includes(`${varName}=your_`)) {
    missingVars.push(varName);
  }
});

if (missingVars.length > 0) {
  console.log('⚠️  Missing or incomplete Firebase configuration:');
  missingVars.forEach(varName => {
    console.log(`   - ${varName}`);
  });
  console.log('\n📖 Please update your .env file with your Firebase project credentials.');
  console.log('   You can find these in your Firebase Console > Project Settings > General');
  console.log('   For admin credentials, go to Project Settings > Service Accounts\n');
} else {
  console.log('✅ All Firebase environment variables are configured\n');
}

// Check if Firebase CLI is installed
const { execSync } = require('child_process');

try {
  execSync('firebase --version', { stdio: 'ignore' });
  console.log('✅ Firebase CLI is installed');
  
  // Check if Firebase project is initialized
  if (fs.existsSync(path.join(process.cwd(), 'firebase.json'))) {
    console.log('✅ Firebase project is initialized');
    
    try {
      const result = execSync('firebase projects:list', { encoding: 'utf8', stdio: 'pipe' });
      console.log('✅ Firebase CLI is authenticated');
    } catch (error) {
      console.log('⚠️  Firebase CLI is not authenticated');
      console.log('   Run: firebase login');
    }
  } else {
    console.log('⚠️  Firebase project not initialized');
    console.log('   Run: firebase init');
  }
} catch (error) {
  console.log('❌ Firebase CLI is not installed');
  console.log('   Install with: npm install -g firebase-tools');
}

console.log('\n🚀 Development Setup Commands:');
console.log('==============================');
console.log('1. Install dependencies:     npm install');
console.log('2. Start Firebase emulators: firebase emulators:start');
console.log('3. Start development server: npm run dev');
console.log('4. Assign admin role:        node assignAdminRole.js <user-uid>');

console.log('\n📚 Useful Resources:');
console.log('====================');
console.log('- Firebase Console: https://console.firebase.google.com');
console.log('- Firebase Docs: https://firebase.google.com/docs');
console.log('- Emulator UI: http://localhost:4000 (when emulators are running)');

console.log('\n✨ Setup complete! Happy coding!');