# UAE MESS SYSTEM

An official UAE Room & Mess Expense Tracker & Settlement Portal featuring GDRFA Visa validation, PDF statement generation, dual currency support (AED/BDT), and Firebase Firestore real-time group expense management.

## 📁 Repository Structure

```
.
├── src/
│   ├── assets/              # App assets (logos, icons, wallpapers)
│   ├── components/          # React components (Dashboard, Modals, Reports, Chat, etc.)
│   │   └── index.ts         # Centralized export barrel for components
│   ├── data/                # Initial seed data & defaults
│   ├── hooks/               # Reusable custom React hooks (online status, haptics, window size)
│   │   └── index.ts         # Centralized export barrel for hooks
│   ├── lib/                 # Third-party integrations (Firebase Firestore & Auth initialization)
│   ├── services/            # External services (Google Sheets sync, GDRFA Visa verification)
│   │   └── index.ts         # Centralized export barrel for services
│   ├── utils/               # Utility functions (Currency conversion, cycle calculations, math evaluator, haptics)
│   │   └── index.ts         # Centralized export barrel for utils
│   ├── types.ts             # Global TypeScript type declarations
│   ├── vite-env.d.ts        # Vite environment declarations
│   ├── App.tsx              # Main application component & layout state
│   ├── main.tsx             # Application entry point
│   └── index.css            # Global CSS styling with Tailwind CSS
├── public/                  # Static assets, Web App Manifest & Service Worker
├── server.ts                # Express backend server with Vite integration
├── package.json             # Project dependencies and scripts
└── vite.config.ts           # Vite build configuration
```

## 🚀 Getting Started

### Prerequisites

- Node.js (v18+)
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd <repository-folder>
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Copy `.env.example` to `.env` and fill in any required variables:
   ```bash
   cp .env.example .env
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Build for production:
   ```bash
   npm run build
   ```

6. Start production server:
   ```bash
   npm start
   ```

## ✨ Key Features

- **Mess & Room Settlement**: Calculate equal and customized share calculations for daily mess meals and utilities.
- **Dual Currency Support**: Switch seamlessly between UAE Dirham (AED) and Bangladeshi Taka (BDT) with live rate conversion.
- **GDRFA Visa Verification**: Embedded UAE visa status check tool for flatmates.
- **PDF Export & Reports**: Generate clean printable PDF statements and share directly with group members.
- **Firebase Sync & Realtime Chat**: Realtime Firestore sync for expenses, rent, utilities, and room chat.
- **Google Sheets Backup**: Sync expense logs directly to external Google Sheets.
