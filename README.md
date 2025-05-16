# PocketBudget - Tablet Borrowing Management System

A comprehensive web application for managing tablet borrowing in educational institutions. Built with React, Node.js, and PostgreSQL.

## Features

### Student Management
- Track student information (name, ID, contact details)
- View student borrowing history
- Prevent multiple active borrowings per student

### Tablet Management
- Track tablet inventory with detailed specifications
- Monitor tablet conditions and status
- Record accessories (charger, cable, box)
- Track serial numbers and IMEI

### Borrowing System
- Multi-step borrowing process
- Automatic PDF agreement generation
- Track borrowing dates and expected returns
- Record tablet condition at time of borrowing
- Track accessories being borrowed

### Returns Management
- Process tablet returns
- Record return conditions
- Track missing or damaged accessories
- Update tablet status automatically

### PDF Generation
- Generate usufruct agreements
- Legal-size document formatting
- Dynamic data population
- Professional styling

## Tech Stack

- **Frontend:**
  - React
  - TypeScript
  - TanStack Query (React Query)
  - Tailwind CSS
  - Shadcn UI Components

- **Backend:**
  - Node.js
  - Express
  - PostgreSQL
  - Prisma ORM
  - Zod for validation

- **PDF Generation:**
  - jsPDF
  - html2canvas

## Prerequisites

- Node.js (v16 or higher)
- PostgreSQL
- npm or yarn

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/PocketBudget.git
cd PocketBudget
```

2. Install dependencies:
```bash
# Install server dependencies
npm install

# Install client dependencies
cd client
npm install
```

3. Set up environment variables:
```bash
# Create .env file in root directory
cp .env.example .env

# Create .env file in client directory
cd client
cp .env.example .env
```

4. Configure your environment variables:
```env
# Server .env
DATABASE_URL="postgresql://username:password@localhost:5432/pocketbudget"
NODE_ENV="development"
PORT=3001

# Client .env
VITE_API_URL="http://localhost:3001"
```

5. Set up the database:
```bash
# Run migrations
npx prisma migrate dev

# Seed the database (optional)
npx prisma db seed
```

## Running the Application

1. Start the server:
```bash
npm run dev
```

2. Start the client (in a new terminal):
```bash
cd client
npm run dev
```

The application will be available at:
- Frontend: http://localhost:5173
- Backend: http://localhost:3001

## Development

### Database Migrations
```bash
# Create a new migration
npx prisma migrate dev --name migration_name

# Apply migrations
npx prisma migrate deploy
```

### Code Generation
```bash
# Generate Prisma Client
npx prisma generate

# Generate API types
npm run generate
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Shadcn UI](https://ui.shadcn.com/) for the beautiful UI components
- [Prisma](https://www.prisma.io/) for the excellent ORM
- [TanStack Query](https://tanstack.com/query) for efficient data fetching 