# Setup Guide

## Prerequisites

- Node.js 18+ (recommended: 20+)
- npm 9+

## Environment Variables

Create a `.env` file in the project root:

```env
DATABASE_URL="file:./dev.db"
NEXTAUTH_SECRET="your-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"
```

### Variable Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Database connection string. SQLite for dev, PostgreSQL for production |
| `NEXTAUTH_SECRET` | Yes | Secret key for session encryption. Generate with `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Yes | Base URL of the application |

## Installation

```bash
# Install dependencies
npm install

# Push schema to database (creates tables)
npx prisma db push

# Seed demo data
npx tsx prisma/seed.ts

# Start development server
npm run dev
```

## Database

### Development (SQLite)

SQLite is used by default for zero-config local development. The database file is created at `prisma/dev.db`.

```env
DATABASE_URL="file:./dev.db"
```

### Production (PostgreSQL)

For production, switch to PostgreSQL:

1. Update `prisma/schema.prisma`:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```

2. Update `.env`:
   ```env
   DATABASE_URL="postgresql://user:password@host:5432/rdfinancial"
   ```

3. Run migrations:
   ```bash
   npx prisma migrate deploy
   ```

## Demo Account

After seeding, log in with:

- **Email**: `admin@powerplantenergy.com.au`
- **Password**: `admin123`

The seed creates:
- Organization: Power Plant Energy
- Admin user with full access
- Australian chart of accounts (50+ accounts)
- GST tax rates
- R&D pipeline stages
- R&D advice content
- Cloud providers (AWS, GCP, Azure, OpenAI, Anthropic)

## Development

```bash
# Start dev server
npm run dev

# Type check
npx tsc --noEmit

# View database
npx prisma studio

# Reset database
rm prisma/dev.db && npx prisma db push && npx tsx prisma/seed.ts
```

## Deployment

### Build

```bash
npm run build
npm start
```

### Docker (recommended)

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### Key Considerations

- Set `NEXTAUTH_SECRET` to a strong random value in production
- Set `NEXTAUTH_URL` to your production domain
- Use PostgreSQL for production workloads
- Configure file storage (local `uploads/` for dev, S3 for production)
- Enable HTTPS in production
