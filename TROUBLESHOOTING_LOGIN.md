# Troubleshooting Login Issues

## Common Login Errors and Solutions

### 1. "Cannot connect to server" Error

**Problem**: Backend server is not running or not accessible.

**Solution**:
```bash
# Make sure backend is running
cd server
npm run dev
```

You should see:
```
Connected to MongoDB
API running on http://localhost:5000
```

### 2. "Invalid credentials" Error

**Problem**: Wrong email, password, or role selected.

**Solution**: Use the default test accounts:
- **Teacher**: `teacher@example.com` / `teach123`
- **Student**: `student@example.com` / `stud123`

**Important**: Make sure you:
1. Select the correct role (Teacher or Student) before logging in
2. Use the exact email and password (case-sensitive for password)
3. The email must match the role selected

### 3. MongoDB Connection Error

**Problem**: MongoDB is not running or connection string is wrong.

**Solution**:
1. Make sure MongoDB is installed and running
2. Check `server/.env` file exists with correct `MONGODB_URI`
3. Default local MongoDB: `mongodb://localhost:27017/mern-auth`

### 4. Network/CORS Error

**Problem**: Frontend can't reach backend due to CORS or proxy issues.

**Solution**:
1. Check `client/vite.config.ts` has proxy configured:
   ```ts
   proxy: {
     '/api': 'http://localhost:5000'
   }
   ```
2. Make sure both frontend (port 5173) and backend (port 5000) are running
3. Restart both servers

### 5. "Request failed" Generic Error

**Problem**: Generic error that doesn't show specific issue.

**Solution**: 
- Check browser console (F12) for detailed error
- Check backend console for error logs
- The improved error handling will now show more specific messages

## Step-by-Step Debugging

### Step 1: Verify Backend is Running
```bash
# In server directory
cd server
npm run dev
```

Check for:
- ✅ "Connected to MongoDB"
- ✅ "API running on http://localhost:5000"
- ✅ No error messages

### Step 2: Test Backend Directly
Open browser and go to:
- `http://localhost:5000/health` - Should return `{"ok":true,"status":"healthy"}`
- `http://localhost:5000/` - Should show API info

### Step 3: Verify Frontend Proxy
Make sure `client/vite.config.ts` has:
```ts
server: {
  proxy: {
    '/api': 'http://localhost:5000'
  }
}
```

### Step 4: Check Browser Console
1. Open browser DevTools (F12)
2. Go to Console tab
3. Try to login
4. Look for error messages - they will now be more detailed

### Step 5: Verify User Exists
The backend should auto-create default users. If not:
```bash
cd server
npm run seed
```

## Quick Fix Checklist

- [ ] Backend server is running on port 5000
- [ ] Frontend server is running on port 5173
- [ ] MongoDB is running and connected
- [ ] Using correct credentials:
  - Teacher: `teacher@example.com` / `teach123`
  - Student: `student@example.com` / `stud123`
- [ ] Selected the correct role before logging in
- [ ] Browser console shows no CORS errors
- [ ] Network tab shows the request reaching the backend

## Still Having Issues?

1. **Check Backend Logs**: Look at the server console for error messages
2. **Check Browser Network Tab**: See if the request is being sent and what response you get
3. **Verify Environment**: Make sure `.env` file exists in `server/` folder
4. **Clear Browser Cache**: Sometimes cached data causes issues
5. **Restart Everything**: Stop both servers and restart them

## Test Credentials

If default users don't work, you can register a new account:
1. Click "Sign Up" tab
2. Select role (Teacher or Student)
3. Enter email and password
4. Click "Create account"
5. Then try logging in with those credentials

