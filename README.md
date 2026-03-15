# Digital Legacy Manager – Secure After-Life Data Vault

A secure, full-stack web application for managing personal digital assets and defining controlled access based on predefined conditions.

## Project Structure

```
digital-legacy-manager/
├── backend/
│   ├── src/
│   │   ├── models/          # Database models (User, VaultItem, TrustedContact, Trigger)
│   │   ├── routes/          # API routes (auth, vault, contacts, triggers)
│   │   ├── controllers/     # Business logic
│   │   ├── middleware/      # Authentication and other middleware
│   │   ├── utils/           # Encryption and helper functions
│   │   └── server.js        # Express server setup
│   ├── package.json
│   ├── .env.example
│   └── .gitignore
├── frontend/
│   ├── src/
│   │   ├── components/      # React components (Login, Register, VaultManager, etc.)
│   │   ├── pages/           # Page components
│   │   ├── services/        # API client and service functions
│   │   ├── App.jsx
│   │   ├── index.jsx
│   │   ├── App.css
│   │   └── index.css
│   ├── public/
│   │   └── index.html
│   ├── package.json
│   ├── .env.example
│   └── .gitignore
└── README.md
```

## Features

- **User Authentication**: Secure login and registration with JWT tokens
- **Digital Vault**: Store and manage encrypted digital assets (documents, notes, media, credentials)
- **Trusted Contacts**: Add and manage trusted contacts with different roles
- **Access Triggers**: Define time-based or inactivity-based triggers for automatic access control
- **Encryption**: AES-256-GCM encryption for sensitive data
- **Activity Logging**: Track all user activities and access events

## Technology Stack

- **Frontend**: React, React Router, Axios
- **Backend**: Node.js, Express.js
- **Database**: MongoDB
- **Authentication**: JWT (JSON Web Tokens)
- **Encryption**: Node.js crypto module (AES-256-GCM)

## Installation

### Database Setup

#### Option A: MongoDB Atlas (Cloud - Recommended for Sharing)
1. Create a free account at [mongodb.com/cloud/atlas](https://mongodb.com/cloud/atlas)
2. Create a new cluster (free tier available)
3. Create a database user with a password
4. Get your connection string (looks like: `mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/digital-legacy-manager?retryWrites=true&w=majority`)
5. Update `MONGODB_URI` in your `.env` file with this connection string

#### Option B: Local MongoDB
1. Install MongoDB Community Edition on your machine
2. Ensure MongoDB is running on `localhost:27017`
3. Use the default connection string in `.env`: `mongodb://localhost:27017/digital-legacy-manager`

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file based on `.env.example`:
   ```bash
   cp .env.example .env
   ```

4. Update the `.env` file with your configuration:
   - Set MongoDB URI
   - Set JWT secret
   - Set encryption key (32 characters)

5. Start the backend server:
   ```bash
   npm run dev
   ```

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file based on `.env.example`:
   ```bash
   cp .env.example .env
   ```

4. Start the development server:
   ```bash
   npm start
   ```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### Vault
- `GET /api/vault` - Get all vault items
- `POST /api/vault` - Create new vault item
- `GET /api/vault/:id` - Get specific vault item
- `PUT /api/vault/:id` - Update vault item
- `DELETE /api/vault/:id` - Delete vault item

### Contacts
- `GET /api/contacts` - Get all trusted contacts
- `POST /api/contacts` - Create new contact
- `PUT /api/contacts/:id` - Update contact
- `DELETE /api/contacts/:id` - Delete contact

### Triggers
- `GET /api/triggers` - Get all triggers
- `POST /api/triggers` - Create new trigger
- `PUT /api/triggers/:id` - Update trigger
- `DELETE /api/triggers/:id` - Delete trigger

## Running the Application

Make sure MongoDB is running on your system (localhost:27017 by default).

1. Start the backend server (from the backend directory):
   ```bash
   npm run dev
   ```

2. In another terminal, start the frontend server (from the frontend directory):
   ```bash
   npm start
   ```

3. Open your browser and navigate to `http://localhost:3000`

## Testing

- Register a new account or login with existing credentials
- Create vault items and manage them
- Add trusted contacts
- Set up access triggers
- Monitor activity logs

## Future Enhancements

- Biometric authentication
- Mobile application support
- Legal validation of digital inheritance
- Advanced notification system
- Audit trails and detailed logging
- Video messages for beneficiaries
- Integration with legal documents
- Cloud storage integration

## License

MIT License
