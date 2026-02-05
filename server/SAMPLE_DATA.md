# Sample Data for Database

This document contains sample user data that can be seeded into the database.

## How to Seed Sample Data

Run the following command from the `server` directory:

```bash
npm run seed
```

This will create sample users in your database (only if they don't already exist).

## Sample Users

### Teachers

| Email | Password | Role |
|-------|----------|------|
| teacher@example.com | teach123 | teacher |
| prof.smith@university.edu | password123 | teacher |
| dr.johnson@university.edu | password123 | teacher |
| ms.williams@university.edu | password123 | teacher |

### Students

| Email | Password | Role |
|-------|----------|------|
| student@example.com | stud123 | student |
| alice.student@university.edu | password123 | student |
| bob.student@university.edu | password123 | student |
| charlie.student@university.edu | password123 | student |
| diana.student@university.edu | password123 | student |
| emma.student@university.edu | password123 | student |
| frank.student@university.edu | password123 | student |
| grace.student@university.edu | password123 | student |

## Notes

- All passwords are hashed using bcrypt before being stored in the database
- The seed script will skip users that already exist (based on email + role combination)
- Default users from `.env` file are created automatically when the server starts
- Sample users are only created when you run `npm run seed`

## Testing Login

You can test login with any of the above credentials using:

```bash
POST /api/auth/login
{
  "email": "teacher@example.com",
  "password": "teach123",
  "role": "teacher"
}
```

