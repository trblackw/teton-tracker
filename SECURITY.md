# Security & Access Control

This document outlines the security measures and access control system implemented in Teton Tracker.

## Overview

Teton Tracker implements a comprehensive authorization system that ensures users can only access, modify, or delete data that belongs to them. This prevents unauthorized access between users and maintains data privacy.

## Authentication

- **Identity Provider**: [Clerk.dev](https://clerk.dev) handles user authentication
- **User IDs**: All users have real Clerk user IDs (format: `user_xxxxxxxx`)

## Authorization System

### Core Principles

1. **Resource Ownership**: Every resource (runs, notifications, preferences) is tied to a specific user
2. **Validation at Multiple Layers**: Access control is enforced at both API and database layers
3. **Fail Secure**: When in doubt, access is denied
4. **Clear Error Messages**: Proper HTTP status codes (401, 403, 404) with descriptive messages

### Protected Resources

The following resources are protected by access control:

- **Runs** (`runs` table)
- **Notifications** (`notifications` table)
- **User Preferences** (`user_preferences` table)

### Access Control Functions

Located in `src/lib/access-control.ts`:

#### Core Functions

- `validateResourceOwnership(resourceType, resourceId, userId)` - Throws error if access denied
- `hasResourceAccess(resourceType, resourceId, userId)` - Returns boolean
- `validateMultipleResourceOwnership()` - Validates multiple resources at once

#### Error Types

- `AccessControlError` - User doesn't own the resource (403 Forbidden)
- `ResourceNotFoundError` - Resource doesn't exist (404 Not Found)

#### Helper Functions

- `createAccessControlResponse(error)` - Creates consistent HTTP error responses
- `getUserIdFromRequest(request)` - Extracts user ID from query parameters
- `getUserIdFromBody(request)` - Extracts user ID from request body

## HTTP Status Codes

The system returns appropriate HTTP status codes:

- **200 OK** - Successful operation
- **201 Created** - Resource created successfully
- **400 Bad Request** - Missing required parameters
- **401 Unauthorized** - Missing or invalid authentication
- **403 Forbidden** - User doesn't own the requested resource
- **404 Not Found** - Resource doesn't exist
- **500 Internal Server Error** - Server error
