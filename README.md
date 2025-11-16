# Holiday Planner

A full-stack collaborative vacation planning application with AI-powered assistance. Plan trips with your partner, manage activities, track budgets, and get intelligent recommendations.

## Features

### Core Functionality
- **Interactive Calendar** - Month, week, day, and agenda views with drag-and-drop scheduling
- **Activity Management** - Create, edit, and organize activities with categories, costs, and details
- **Real-Time Collaboration** - Multiple users can plan together simultaneously
- **AI Travel Assistant** - Chat with Claude AI for recommendations, travel times, and itinerary help
- **Budget Tracking** - Automatic budget calculations with category and daily breakdowns
- **Multi-User Support** - Share trips via email or unique links
- **Dark/Light Mode** - Automatic theme switching based on system preferences

### Activity Features
- Color-coded categories (Lodging, Dining, Activities, Transport, Other)
- Location tracking and mapping
- Cost tracking with currency support
- Priority levels (High, Medium, Low)
- Booking URLs and confirmation numbers
- Notes and descriptions
- Comment threads for discussion

### AI Capabilities
- Answer questions about your itinerary
- Suggest activities based on destination
- Calculate travel times between locations
- Recommend restaurants and attractions
- Generate packing lists
- Provide local travel tips

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript
- **Styling**: Tailwind CSS, Radix UI components
- **Calendar**: React Big Calendar with drag-and-drop
- **Authentication**: NextAuth.js with multiple providers
- **Database**: PostgreSQL with Prisma ORM
- **AI**: Anthropic Claude API
- **Real-Time**: Socket.io (planned feature)
- **Deployment**: Vercel-ready

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL database
- Anthropic API key (for AI features)
- Optional: Google/GitHub OAuth credentials

## Setup Instructions

### 1. Clone the Repository

```bash
git clone <repository-url>
cd holiday-planner
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment Variables

Create a `.env` file in the root directory:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/holiday_planner?schema=public"

# NextAuth Configuration
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-generate-with-openssl-rand-base64-32"

# OAuth Providers (Optional)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"

# Anthropic Claude API
ANTHROPIC_API_KEY="your-anthropic-api-key"

# App Configuration
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 4. Set Up the Database

```bash
# Generate Prisma Client
npx prisma generate

# Run database migrations
npx prisma db push

# (Optional) Open Prisma Studio to view/edit data
npx prisma studio
```

### 5. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
holiday-planner/
├── app/                      # Next.js App Router
│   ├── api/                  # API routes
│   │   ├── auth/            # Authentication endpoints
│   │   ├── trips/           # Trip management
│   │   ├── activities/      # Activity CRUD
│   │   └── chat/            # AI chatbot
│   ├── auth/                # Auth pages (signin, signup)
│   ├── dashboard/           # Main dashboard
│   ├── trips/[id]/          # Trip detail pages
│   ├── layout.tsx           # Root layout
│   ├── page.tsx             # Landing page
│   └── globals.css          # Global styles
├── components/              # React components
│   ├── activities/          # Activity components
│   ├── budget/              # Budget tracking
│   ├── calendar/            # Calendar components
│   ├── chat/                # AI chatbot UI
│   ├── layout/              # Layout components
│   └── trips/               # Trip components
├── lib/                     # Utility libraries
│   ├── auth/                # Auth configuration
│   ├── prisma/              # Prisma client
│   └── utils/               # Helper functions
├── prisma/                  # Database schema
│   └── schema.prisma        # Prisma schema definition
├── types/                   # TypeScript type definitions
└── public/                  # Static assets
```

## Key Features Implementation

### Authentication
- Email/password authentication with bcrypt hashing
- OAuth support for Google and GitHub
- Protected routes with middleware
- Session management with JWT tokens

### Calendar System
- Powered by React Big Calendar
- Support for multiple view types (month, week, day, agenda)
- Click-to-create activities
- Color-coded by category
- Responsive on all devices

### AI Integration
- Context-aware responses using trip data
- Conversational history stored in database
- Real-time chat interface
- Powered by Claude 3.5 Sonnet

### Database Schema
- Users with authentication
- Trips with ownership and sharing
- Activities with full details
- Collaborators with role-based access
- Chat messages with conversation history
- Budget tracking

## Development Roadmap

### Implemented Features ✅
- User authentication (email/password, OAuth)
- Trip creation and management
- Calendar interface with multiple views
- Activity CRUD operations
- AI chatbot integration
- Budget tracking
- Dark/light mode
- Responsive design

### Planned Features 🚧
- Real-time collaboration with WebSockets
- Drag-and-drop activity rescheduling
- PDF/email export
- Activity templates database
- Direct booking integrations
- Mobile app (React Native)
- Collaborative editing indicators
- Activity suggestions based on destination
- Weather integration
- Flight and hotel search

## License

MIT License - feel free to use this project for personal or commercial purposes.

---

**Happy Planning! 🌴✈️**