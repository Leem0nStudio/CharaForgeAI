#!/usr/bin/env node

const admin = require('firebase-admin');
require('dotenv').config();

console.log('🔥 Firebase Admin Role Manager');
console.log('==============================\n');

// Initialize Firebase Admin with environment variables
const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
};

// Validate configuration
if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
  console.error('❌ Missing Firebase Admin configuration!');
  console.error('Please ensure the following environment variables are set:');
  console.error('- FIREBASE_PROJECT_ID');
  console.error('- FIREBASE_CLIENT_EMAIL');
  console.error('- FIREBASE_PRIVATE_KEY');
  console.error('\nYou can find these in your Firebase Console > Project Settings > Service Accounts');
  process.exit(1);
}

try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  console.log('✅ Firebase Admin initialized successfully');
} catch (error) {
  console.error('❌ Failed to initialize Firebase Admin:', error.message);
  process.exit(1);
}

// Get command line arguments
const args = process.argv.slice(2);
const command = args[0];
const uid = args[1];

// Help function
function showHelp() {
  console.log('Usage:');
  console.log('  node assignAdminRole.js grant <user-uid>    - Grant admin role to user');
  console.log('  node assignAdminRole.js revoke <user-uid>   - Revoke admin role from user');
  console.log('  node assignAdminRole.js check <user-uid>    - Check user\'s admin status');
  console.log('  node assignAdminRole.js list                - List all admin users');
  console.log('  node assignAdminRole.js help                - Show this help message');
  console.log('\nExamples:');
  console.log('  node assignAdminRole.js grant 9BMM9bNrqiagcBZ7IgSIOnH7ah43');
  console.log('  node assignAdminRole.js check 9BMM9bNrqiagcBZ7IgSIOnH7ah43');
}

// Validate UID format
function isValidUID(uid) {
  return uid && typeof uid === 'string' && uid.length >= 10;
}

// Grant admin role
async function grantAdminRole(uid) {
  try {
    console.log(`🔄 Granting admin role to user: ${uid}`);
    
    // First, verify the user exists
    const userRecord = await admin.auth().getUser(uid);
    console.log(`👤 User found: ${userRecord.email || userRecord.displayName || 'Unknown'}`);
    
    // Set admin claim
    await admin.auth().setCustomUserClaims(uid, { admin: true });
    
    console.log('✅ Admin role granted successfully!');
    console.log('⚠️  The user must sign out and sign in again for changes to take effect.');
    
    return true;
  } catch (error) {
    console.error('❌ Error granting admin role:', error.message);
    return false;
  }
}

// Revoke admin role
async function revokeAdminRole(uid) {
  try {
    console.log(`🔄 Revoking admin role from user: ${uid}`);
    
    // First, verify the user exists
    const userRecord = await admin.auth().getUser(uid);
    console.log(`👤 User found: ${userRecord.email || userRecord.displayName || 'Unknown'}`);
    
    // Remove admin claim
    await admin.auth().setCustomUserClaims(uid, { admin: false });
    
    console.log('✅ Admin role revoked successfully!');
    console.log('⚠️  The user must sign out and sign in again for changes to take effect.');
    
    return true;
  } catch (error) {
    console.error('❌ Error revoking admin role:', error.message);
    return false;
  }
}

// Check admin status
async function checkAdminStatus(uid) {
  try {
    console.log(`🔄 Checking admin status for user: ${uid}`);
    
    const userRecord = await admin.auth().getUser(uid);
    console.log(`👤 User: ${userRecord.email || userRecord.displayName || 'Unknown'}`);
    
    const isAdmin = userRecord.customClaims?.admin === true;
    console.log(`🛡️  Admin status: ${isAdmin ? '✅ Admin' : '❌ Not Admin'}`);
    
    if (userRecord.customClaims) {
      console.log('📋 Custom claims:', JSON.stringify(userRecord.customClaims, null, 2));
    }
    
    return isAdmin;
  } catch (error) {
    console.error('❌ Error checking admin status:', error.message);
    return false;
  }
}

// List all admin users
async function listAdminUsers() {
  try {
    console.log('🔄 Listing all admin users...');
    
    const listUsersResult = await admin.auth().listUsers();
    const adminUsers = listUsersResult.users.filter(user => user.customClaims?.admin === true);
    
    if (adminUsers.length === 0) {
      console.log('📭 No admin users found.');
      return;
    }
    
    console.log(`👥 Found ${adminUsers.length} admin user(s):`);
    console.log('=====================================');
    
    adminUsers.forEach((user, index) => {
      console.log(`${index + 1}. UID: ${user.uid}`);
      console.log(`   Email: ${user.email || 'N/A'}`);
      console.log(`   Display Name: ${user.displayName || 'N/A'}`);
      console.log(`   Created: ${user.metadata.creationTime}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Error listing admin users:', error.message);
  }
}

// Main execution
async function main() {
  switch (command) {
    case 'grant':
      if (!isValidUID(uid)) {
        console.error('❌ Please provide a valid user UID');
        showHelp();
        process.exit(1);
      }
      const granted = await grantAdminRole(uid);
      process.exit(granted ? 0 : 1);
      
    case 'revoke':
      if (!isValidUID(uid)) {
        console.error('❌ Please provide a valid user UID');
        showHelp();
        process.exit(1);
      }
      const revoked = await revokeAdminRole(uid);
      process.exit(revoked ? 0 : 1);
      
    case 'check':
      if (!isValidUID(uid)) {
        console.error('❌ Please provide a valid user UID');
        showHelp();
        process.exit(1);
      }
      await checkAdminStatus(uid);
      process.exit(0);
      
    case 'list':
      await listAdminUsers();
      process.exit(0);
      
    case 'help':
    case '--help':
    case '-h':
      showHelp();
      process.exit(0);
      
    default:
      if (!command) {
        console.error('❌ No command provided');
      } else {
        console.error(`❌ Unknown command: ${command}`);
      }
      showHelp();
      process.exit(1);
  }
}

// Run the script
main().catch(error => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});
