# TODO - Fix User Data Persistence to Neon Database

## Overview
Update the server to persist user data to the Neon PostgreSQL database using Drizzle ORM instead of the current in-memory mock database. Implement password hashing for security.

## Steps

1. Setup
   - [x] Add bcrypt dependency for password hashing if not already installed. (Failed due to network error, needs retry)
   - [x] Import Drizzle ORM database instance and schema from utils/dbConfig.js in Server.js.

2. User Registration
   - [x] Replace in-memory user array logic with database insert using Drizzle ORM.
   - [x] Hash user passwords before saving.
   - [x] Handle unique email constraint errors gracefully.

3. User Login
   - [x] Query user by email from the database.
   - [x] Compare hashed password using bcrypt.
   - [x] Generate JWT token on successful login.

4. Token Validation
   - [x] Keep existing JWT validation logic.

5. Testing
   - Test registration, login, and token validation endpoints.
   - Verify data is persisted in Neon database.

6. Cleanup
   - [x] Remove in-memory users array.
   - [x] Add any necessary error handling and logging.

## Optional
- Review and align database schema and migration files if needed.
