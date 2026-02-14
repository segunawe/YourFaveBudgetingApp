# Setup Instructions - Phase 2 Complete

## Phase 2: Firebase Configuration & Authentication ✅

### Environment Setup

You need to create `.env` files with your Firebase credentials:

#### 1. Frontend `.env` (in project root)
Create a file named `.env` in the project root with:

```env
REACT_APP_FIREBASE_API_KEY=your-api-key-here
REACT_APP_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your-project-id
REACT_APP_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
REACT_APP_FIREBASE_APP_ID=your-app-id

REACT_APP_API_URL=http://localhost:5000/api
```

#### 2. Backend `.env` (in /server directory)
Create a file named `.env` in the `/server` directory with:

```env
PORT=5000
NODE_ENV=development

FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com

PLAID_CLIENT_ID=your-plaid-client-id
PLAID_SECRET=your-plaid-secret
PLAID_ENV=sandbox

FRONTEND_URL=http://localhost:3000
```

**Important Notes:**
- Replace all `your-*` placeholders with your actual Firebase credentials
- For `FIREBASE_PRIVATE_KEY`, make sure to keep the quotes and the `\n` characters
- Copy the private key exactly as it appears in your Firebase Admin SDK JSON file

---

## Running the Application

### Terminal 1 - Backend Server
```bash
cd server
npm run dev
```

The backend will run on `http://localhost:5000`

### Terminal 2 - Frontend App
```bash
npm start
```

The frontend will run on `http://localhost:3000`

---

## Testing Authentication

1. **Start both servers** (backend and frontend)

2. **Open browser** to `http://localhost:3000`

3. **Sign Up:**
   - You'll be redirected to `/login`
   - Click "Sign Up" link
   - Enter your name, email, and password
   - Click "Sign Up" button
   - You'll be redirected to the dashboard

4. **Log Out:**
   - Click "Log Out" button on dashboard
   - You'll be redirected to login page

5. **Log In:**
   - Enter your email and password
   - Click "Log In" button
   - You'll be redirected to the dashboard

---

## Verify Firebase Setup

### Check Firestore
1. Go to Firebase Console > Firestore Database
2. You should see a `users` collection
3. After signing up, you'll see a user document with your UID

### Check Authentication
1. Go to Firebase Console > Authentication
2. You should see your email listed under Users

---

## Troubleshooting

### "Module not found" errors
```bash
# In project root
npm install

# In server directory
cd server
npm install
```

### "Firebase configuration error"
- Check that all environment variables are set correctly
- Ensure `.env` files are in the correct directories
- Restart both servers after updating `.env` files

### "CORS error" or "Network error"
- Make sure backend is running on port 5000
- Check that `FRONTEND_URL` in backend `.env` matches your frontend URL
- Verify `REACT_APP_API_URL` in frontend `.env` is correct

### "Authentication error"
- Verify Firebase credentials are correct
- Check Firebase Console that Email/Password auth is enabled
- Look at browser console and backend terminal for error details

---

## What's Working Now

✅ Firebase Authentication (Email/Password)
✅ User signup with Firestore user document creation
✅ User login
✅ User logout
✅ Protected routes (redirect to login if not authenticated)
✅ Auth state persistence (stays logged in on page refresh)
✅ Backend auth middleware for API protection

---

## Next Steps: Phase 3 - Plaid Integration

Once authentication is working, we'll add:
- Plaid Link button to connect bank accounts
- Account balance display
- Account sync functionality

Let me know when you're ready to proceed!
