# Technical Specifications

## Technology Stack

### Frontend
- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Custom React components

### Backend
- **Framework**: Next.js API Routes
- **Language**: TypeScript
- **Authentication**: JWT tokens with HTTP-only cookies
- **Password Hashing**: bcryptjs with salt rounds 12

### Database
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Connection**: Direct connection via DATABASE_URL

## Architecture Patterns

### Authentication Flow
1. **Registration**: Email/password → Hash password → Store user → Generate JWT → Set cookie
2. **Login**: Email/password → Verify credentials → Generate JWT → Set cookie
3. **Authorization**: Extract JWT from cookie → Verify token → Fetch user data

### Security Features
- Password hashing with bcryptjs (12 salt rounds)
- JWT tokens with 7-day expiration
- HTTP-only cookies for token storage
- Input validation on all endpoints
- Secure cookie settings (httpOnly, sameSite: strict)

### Database Schema
```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  password  String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  @@map("users")
}
```

### API Endpoints
- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - User authentication
- `GET /api/auth/me` - Get current user profile

### Frontend Routes
- `/` - Home page (auto-redirects based on auth status)
- `/signup` - User registration form
- `/login` - User login form
- `/dashboard` - Protected dashboard (requires authentication)

## Environment Variables
- `DATABASE_URL` - PostgreSQL connection string
- `NEXTAUTH_SECRET` - JWT signing secret
- `NEXTAUTH_URL` - Application base URL

## File Structure
```
src/
├── app/
│   ├── api/auth/
│   │   ├── signup/route.ts
│   │   ├── login/route.ts
│   │   └── me/route.ts
│   ├── signup/page.tsx
│   ├── login/page.tsx
│   ├── dashboard/page.tsx
│   └── page.tsx
├── components/
│   └── AuthForm.tsx
├── lib/
│   ├── prisma.ts
│   └── auth.ts
└── generated/
    └── prisma/
```

