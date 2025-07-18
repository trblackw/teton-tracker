# ✈️ Teton Tracker

**A modern flight tracking and airport shuttle management application**

Teton Tracker is a comprehensive web application designed for managing airport shuttle services, tracking flights, and monitoring traffic conditions. Built with modern web technologies, it provides real-time flight status updates, route optimization, and an intuitive interface for scheduling and managing airport runs.

## 🌟 Features

### 🛩️ **Flight Management**

- **Global Airport Database** - Access to 7,917+ airports worldwide
- **Real-time Flight Tracking** - Live flight status updates and delay notifications
- **Smart Search** - Search airports by IATA code, name, city, or state
- **Home Base Configuration** - Set your primary airport for quick access

### 🚐 **Shuttle Operations**

- **Run Scheduling** - Schedule pickup and dropoff runs with detailed information
- **Bulk Import** - Parse and import multiple runs from schedule messages
- **Status Management** - Track run status from scheduled to completed
- **Route Planning** - Integration with traffic data for optimal routing

### 🎨 **User Experience**

- **Dark/Light Mode** - Seamless theme switching with system preference support
- **Responsive Design** - Optimized for desktop, tablet, and mobile devices
- **Progressive Web App** - Install and use offline capabilities
- **Modern UI** - Built with shadcn/ui components for consistency

### 📊 **Data & Analytics**

- **Traffic Monitoring** - Real-time traffic conditions and incident reporting
- **Performance Tracking** - Monitor on-time performance and delays
- **Smart Notifications** - Proactive alerts for flight changes and traffic issues

## 🛠️ Tech Stack

- **Runtime:** [Bun](https://bun.sh) - Fast JavaScript runtime and package manager
- **Frontend:** [React 19](https://react.dev) with TypeScript
- **Routing:** [TanStack Router](https://tanstack.com/router) - Type-safe routing
- **Styling:** [Tailwind CSS 4](https://tailwindcss.com) - Utility-first CSS framework
- **UI Components:** [shadcn/ui](https://ui.shadcn.com) - Radix-based component library
- **State Management:** [TanStack Query](https://tanstack.com/query) - Data fetching and caching
- **Theme:** [next-themes](https://github.com/pacocoursey/next-themes) - Theme management
- **Icons:** [Lucide React](https://lucide.dev) - Beautiful & consistent icons

## 🚀 Quick Start

### Prerequisites

- [Bun](https://bun.sh) v1.2.18 or higher

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd teton-tracker
   ```

2. **Install dependencies**

   ```bash
   bun install
   ```

3. **Start development server**

   ```bash
   bun dev
   ```

4. **Open your browser**

   ```
   http://localhost:3000
   ```

5. **[Optional] Populate with test data**

   ```bash
   # Generate realistic mock data for development
   bun run seed

   # This creates:
   # • 20 mock runs with various statuses
   # • 40+ notifications
   # • Realistic Jackson Hole locations and flight data
   ```

   > **Note:** The seed script only works in development environments and creates data for the current user.

### Production Deployment

```bash
# Build the application
bun run build

# Start production server
bun start
```

## 📱 Usage Guide

### Setting Up Your Home Airport

1. Navigate to **Settings** ⚙️
2. Use the **Airport Combobox** to search and select your primary airport
3. Your selection is automatically saved for quick access

### Managing Runs

1. Go to **Add Run** ➕ to schedule new airport transfers
2. Use **Bulk Import** to parse schedule messages and add multiple runs
3. Monitor active runs in **Current Runs** 📋
4. Update run status as they progress

### Monitoring Flight Status

- View real-time flight information including delays and status changes
- Get traffic updates for optimal route planning
- Receive notifications for important changes

## �� Customization

### Navigation Components

The app includes a reusable navigation arrow component for consistent mobile navigation:

```tsx
import { NavigationArrow, BackButton, NextButton, PreviousButton } from '../components/ui/navigation-arrow';

// Basic usage
<NavigationArrow direction="left" variant="back" onClick={() => router.back()} />

// Convenience components
<BackButton onClick={() => router.back()} />
<NextButton onClick={() => nextPage()} />
<PreviousButton onClick={() => prevPage()} />

// With different sizes
<BackButton size="sm" />
<BackButton size="md" />
<BackButton size="lg" />

// Custom styling
<BackButton className="text-blue-600 hover:text-blue-700" />
```

**Navigation Component Props:**

- `direction`: 'left' | 'right' (default: 'left')
- `variant`: 'back' | 'chevron' (default: 'back')
- `size`: 'sm' | 'md' | 'lg' (default: 'md')
- `onClick`: Function to handle navigation
- `disabled`: Boolean to disable the button
- `aria-label`: Custom accessibility label

### Theme Configuration

The application supports:

- **Light Mode** ☀️
- **Dark Mode** 🌙
- **System Preference** 🔄

### API Integration

Configure external services for:

- Flight status updates
- Traffic monitoring
- Route optimization

## 📁 Project Structure

```
teton-tracker/
├── src/
│   ├── components/ui/     # Reusable UI components
│   ├── data/             # Static data files
│   ├── lib/              # Utilities and services
│   ├── routes/           # Application routes
│   └── styles/           # Global styles
├── public/               # Static assets
└── scripts/              # Build and utility scripts
```

## 🔧 Development

### Available Scripts

- `bun dev` - Start development server with hot reload
- `bun start` - Start production server
- `bun run build` - Build application for production
- `bun run format` - Format code with Prettier
- `bun run format:check` - Check code formatting

### Code Quality

- **TypeScript** for type safety
- **Prettier** for consistent code formatting
- **Modern React** patterns with hooks and functional components

## 🤝 Contributing

We welcome contributions! Please feel free to submit issues, feature requests, or pull requests.

### Development Setup

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and test thoroughly
4. Format code: `bun run format`
5. Commit changes: `git commit -m 'Add amazing feature'`
6. Push to branch: `git push origin feature/amazing-feature`
7. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Built with [Bun](https://bun.sh) for blazing-fast performance
- UI components from [shadcn/ui](https://ui.shadcn.com)
- Icons from [Lucide](https://lucide.dev)
- Airport data from comprehensive global database

---

**Made with ❤️ for efficient airport shuttle operations**

## 🗄️ Database Setup

Teton Tracker uses [Railway PostgreSQL](https://railway.app) for data persistence, providing a managed PostgreSQL database with automatic backups and scaling.

### Setup Instructions

1. **Install Railway CLI**

   ```bash
   # Install Railway CLI
   curl -fsSL https://railway.app/install.sh | sh
   ```

2. **Connect to Railway Project**

   ```bash
   # Link to your Railway project
   railway link
   ```

3. **Add PostgreSQL Database**

   ```bash
   # Add PostgreSQL service to your project
   railway add --database postgres
   ```

4. **Configure Environment Variables**

   ```bash
   # Railway automatically provides DATABASE_URL
   # For local development, get the connection string:
   railway variables

   # Add to your .env file
   export DATABASE_URL="postgresql://user:password@host:port/database"
   ```

5. **Initialize Database Schema**

   ```bash
   # Run database setup
   bun run setup-db
   ```

### Database Schema

The application automatically initializes the required tables:

- `users` - User accounts and authentication
- `user_preferences` - User settings and preferences
- `runs` - Historical shuttle runs and schedules
- `notifications` - System notifications and alerts
- `flight_cache` - Cached flight data to reduce API calls

### Database Features

- **Managed PostgreSQL**: Full-featured PostgreSQL database with automatic maintenance
- **Connection Pooling**: Efficient connection management for optimal performance
- **Automatic Backups**: Daily backups with point-in-time recovery
- **Scaling**: Automatic scaling based on usage
- **SSL/TLS**: Secure connections with automatic certificate management
- **Schema Management**: Automatic table creation and indexing

### Local Development

The application connects to your Railway PostgreSQL database locally using the public connection URL. This ensures development parity with production.

### Data Migration

Since this is a new database implementation, no data migration is required. The application will start with a fresh database state.

# Production deployment Sat Jul 12 21:15:34 MDT 2025
