# Digital Legacy Manager - Development Instructions

## Project Overview
This is a full-stack MERN application for managing personal digital assets and defining controlled access based on predefined conditions.

## Project Structure

### Backend (Node.js + Express + MongoDB)
- Location: `backend/`
- Entry point: `src/server.js`
- Key modules:
  - `models/`: MongoDB schemas (User, VaultItem, TrustedContact, Trigger)
  - `routes/`: API endpoints
  - `middleware/`: Authentication and error handling
  - `utils/`: Encryption utilities
  - `controllers/`: Business logic

### Frontend (React)
- Location: `frontend/`
- Entry point: `src/index.jsx`
- Key components:
  - Login/Register: Authentication
  - VaultManager: Digital asset management
  - TrustedContacts: Contact management
  - TriggerManager: Access trigger configuration

## Development Workflow

### Backend Development
1. Ensure MongoDB is running (localhost:27017)
2. Navigate to backend directory: `cd backend`
3. Install dependencies: `npm install`
4. Configure `.env` file with required variables
5. Start development server: `npm run dev`
6. Server runs on http://localhost:5000

### Frontend Development
1. Navigate to frontend directory: `cd frontend`
2. Install dependencies: `npm install`
3. Configure `.env` file with API URL
4. Start development server: `npm start`
5. App runs on http://localhost:3000

## Key Files to Remember

- Backend: `backend/src/server.js` (main server file)
- Frontend: `frontend/src/App.jsx` (main app component)
- Database Models: `backend/src/models/`
- API Routes: `backend/src/routes/`
- React Components: `frontend/src/components/`
- Services: `frontend/src/services/` (API client)

## Environment Variables

### Backend (.env)
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/digital-legacy-manager
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRE=7d
ENCRYPTION_KEY=your_32_char_encryption_key_123456
SMTP_EMAIL=your_email@gmail.com
SMTP_PASSWORD=your_app_password
SMTP_SERVICE=gmail
NODE_ENV=development
```

### Frontend (.env)
```
REACT_APP_API_URL=http://localhost:5000/api
```

## Important Commands

### Backend
- `npm run dev` - Start development server with nodemon
- `npm start` - Start production server
- `npm test` - Run tests

### Frontend
- `npm start` - Start development server
- `npm build` - Build for production
- `npm test` - Run tests

## Core Features to Implement/Test

1. User Authentication (JWT-based)
2. Encrypted Vault Storage (AES-256-GCM)
3. Trusted Contact Management
4. Time-based and Inactivity-based Triggers
5. Access Control and Logging
6. Activity Tracking

## Common Development Tasks

- Adding new API endpoint: Create route in `backend/src/routes/`, update `server.js`
- Adding new component: Create in `frontend/src/components/`, update routing in `App.jsx`
- Modifying database schema: Update model in `backend/src/models/`
- Creating new service: Add to `frontend/src/services/index.js`

## Testing the Application

1. Register a new user account
2. Create vault items with different types
3. Add trusted contacts
4. Configure access triggers
5. Verify encryption/decryption
6. Test trigger activation
7. Check activity logs

## Debugging Tips

- Backend errors: Check terminal output from `npm run dev`
- Frontend errors: Check browser console (F12)
- MongoDB connection: Verify MongoDB is running and connection string is correct
- API issues: Use browser DevTools Network tab to inspect requests
- Encryption issues: Verify ENCRYPTION_KEY length (must be 32 chars for AES-256)

## Performance Considerations

- Use pagination for large vault item lists
- Cache trusted contacts list
- Optimize database queries with proper indexes
- Compress media files before storage
- Implement lazy loading for vault items

## Security Best Practices

- Always encrypt sensitive data before storing
- Use HTTPS in production
- Validate all user inputs
- Implement rate limiting on auth endpoints
- Use secure password hashing (bcryptjs)
- Rotate encryption keys periodically
- Validate JWT tokens on protected routes
