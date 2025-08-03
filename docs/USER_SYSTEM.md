# User System Documentation

## Overview

This document describes the comprehensive user system implemented for the Firebase Studio development environment. The system includes authentication, user management, permissions, and administrative features.

## Architecture

### Components

1. **Authentication Provider** (`src/lib/auth/AuthProvider.tsx`)
   - Google OAuth integration
   - Automatic user document creation
   - Admin claims management
   - Error handling and toast notifications

2. **User Router** (`src/lib/trpc/routers/user.ts`)
   - Complete CRUD operations
   - User statistics
   - Preferences management
   - Data pack management

3. **Firebase Configuration**
   - Client-side configuration with emulator support
   - Server-side admin configuration
   - Environment variable validation

4. **Security Rules** (`firestore.rules`)
   - Enhanced validation
   - Privacy controls
   - Admin permissions
   - Development environment support

## Features

### User Authentication

- **Google OAuth**: Seamless sign-in with Google accounts
- **Automatic User Creation**: User documents are automatically created in Firestore upon first sign-in
- **Admin Claims**: Support for admin roles with custom claims
- **Session Management**: Proper session handling with token validation

### User Profile Management

- **Profile Information**: Display name, email, photo URL
- **User Statistics**: Characters created, collections, likes, etc.
- **Preferences**: Theme, notifications, privacy settings
- **Account Security**: Account deletion with confirmation

### Admin System

- **Role Management**: Grant/revoke admin roles
- **User Administration**: View and manage all users
- **System Permissions**: Enhanced permissions for admin users

### Data Management

- **User Data**: Comprehensive user profiles with preferences
- **Data Packs**: Install/uninstall system for user content
- **Statistics**: Track user activity and engagement
- **Privacy Controls**: Public/private profile settings

## Setup Instructions

### 1. Environment Configuration

Copy the example environment file:
```bash
cp .env.example .env
```

Update the `.env` file with your Firebase project credentials:

```env
# Firebase Client Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Firebase Admin Configuration
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=your_service_account_email
FIREBASE_PRIVATE_KEY="your_private_key"
```

### 2. Firebase Setup

Run the setup script to verify your configuration:
```bash
npm run firebase:setup
```

### 3. Firestore Security Rules

Deploy the enhanced security rules:
```bash
firebase deploy --only firestore:rules
```

### 4. Admin User Setup

Grant admin privileges to a user:
```bash
npm run admin:grant <user-uid>
```

## API Endpoints

### User Management

#### `user.getUser`
- **Type**: Private Procedure (Query)
- **Description**: Get current user data with auto-corrections
- **Returns**: Complete user profile

#### `user.updateUser`
- **Type**: Private Procedure (Mutation)
- **Input**: `{ displayName: string, preferences?: object }`
- **Description**: Update user profile information

#### `user.updatePreferences`
- **Type**: Private Procedure (Mutation)
- **Input**: `{ theme?, notifications?, privacy? }`
- **Description**: Update user preferences

#### `user.getUserStats`
- **Type**: Private Procedure (Query)
- **Description**: Get user statistics and activity data
- **Returns**: Stats including characters, collections, likes, etc.

#### `user.deleteUser`
- **Type**: Private Procedure (Mutation)
- **Description**: Soft delete user account and associated data

#### `user.getTopCreators`
- **Type**: Public Procedure (Query)
- **Input**: `{ limit?: number }`
- **Description**: Get top creators by likes (public profiles only)

### Data Pack Management

#### `user.installDataPack`
- **Type**: Private Procedure (Mutation)
- **Input**: `{ packId: string }`
- **Description**: Install a data pack for the user

#### `user.uninstallDataPack`
- **Type**: Private Procedure (Mutation)
- **Input**: `{ packId: string }`
- **Description**: Uninstall a data pack (except core pack)

## Security Features

### Firestore Rules

- **User Data Protection**: Users can only access their own data
- **Admin Permissions**: Admins have elevated access
- **Validation**: Comprehensive data validation
- **Privacy Controls**: Respect user privacy settings

### Authentication Security

- **Token Validation**: Server-side token verification
- **Session Management**: Secure session handling
- **Error Handling**: Proper error responses and logging

## Development Features

### Emulator Support

The system supports Firebase emulators for local development:

```bash
# Start emulators
npm run firebase:emulators

# Development with emulators
FIRESTORE_EMULATOR_HOST=localhost:8080
FIREBASE_AUTH_EMULATOR_HOST=localhost:9099
FIREBASE_STORAGE_EMULATOR_HOST=localhost:9199
```

### Admin Tools

#### Role Management
```bash
# Grant admin role
npm run admin:grant <user-uid>

# Revoke admin role
npm run admin:revoke <user-uid>

# Check admin status
npm run admin:check <user-uid>

# List all admins
npm run admin:list
```

### Development Collections

Special Firestore collections for development:
- `/dev/{document}` - Development data
- `/test/{document}` - Test data
- `/logs/{document}` - System logs (admin only)

## User Schema

### User Document Structure

```typescript
interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  purchasedPacks: string[];
  installedPacks: string[];
  subscriptionTier: 'free' | 'premium' | 'enterprise';
  totalLikes: number;
  isActive: boolean;
  preferences: {
    theme: 'light' | 'dark' | 'system';
    notifications: boolean;
    privacy: 'public' | 'private';
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### User Statistics

```typescript
interface UserStats {
  totalLikes: number;
  charactersCreated: number;
  collectionsCreated: number;
  installedPacks: number;
  subscriptionTier: string;
  memberSince: Timestamp;
}
```

## Error Handling

### Client-Side Errors

- **Toast Notifications**: User-friendly error messages
- **Loading States**: Proper loading indicators
- **Validation**: Form validation with helpful messages

### Server-Side Errors

- **TRPC Errors**: Structured error responses
- **Logging**: Comprehensive error logging
- **Graceful Degradation**: Fallback behaviors

## Best Practices

### Security

1. **Never expose private keys** in client-side code
2. **Validate all inputs** on both client and server
3. **Use proper authentication** for all protected routes
4. **Implement rate limiting** for sensitive operations

### Performance

1. **Cache user data** appropriately
2. **Use proper indexing** in Firestore
3. **Implement pagination** for large datasets
4. **Optimize queries** with proper where clauses

### User Experience

1. **Provide clear feedback** for all operations
2. **Handle offline states** gracefully
3. **Implement proper loading states**
4. **Use progressive enhancement**

## Troubleshooting

### Common Issues

#### Authentication Errors
- Check Firebase configuration
- Verify environment variables
- Ensure proper domain configuration

#### Permission Errors
- Verify Firestore rules deployment
- Check user authentication status
- Validate admin claims

#### Emulator Issues
- Ensure emulators are running
- Check port configurations
- Verify emulator environment variables

### Debug Tools

```bash
# Check Firebase setup
npm run firebase:setup

# Verify admin status
npm run admin:check <user-uid>

# List all admins
npm run admin:list
```

## Migration Guide

### From Previous System

1. **Backup existing data**
2. **Deploy new Firestore rules**
3. **Update environment variables**
4. **Run user data migration** (if needed)
5. **Test authentication flow**
6. **Verify admin permissions**

## Support

For issues or questions:

1. Check the troubleshooting section
2. Review Firebase console logs
3. Verify environment configuration
4. Check Firestore rules and permissions

## Changelog

### v2.0.0 (Current)
- Complete user system overhaul
- Enhanced security rules
- Admin management tools
- Emulator support
- Comprehensive error handling
- User preferences system
- Statistics tracking

### v1.0.0 (Previous)
- Basic authentication
- Simple user management
- Basic Firestore rules