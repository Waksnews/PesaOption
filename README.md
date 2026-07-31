# CryptonicHub Monorepo (PesaOption)

Production-ready monorepo architecture for **CryptonicHub**, featuring a separate **Frontend** (React + Vite) designed for independent deployment on Vercel, and a **Backend** (Express + Node/TypeScript) designed for independent deployment on Render or Cloud Run.

---

## 📁 Repository Structure

```text
├── frontend/                  # React 19 + Vite + Tailwind CSS Frontend Application
│   ├── src/                   # React components, stores, hooks, and context
│   │   ├── components/        # Trading charts, order execution, auth & views
│   │   ├── context/           # Global application state & API providers
│   │   ├── hooks/             # Custom SSE real-time hook
│   │   ├── lib/               # Base API client with VITE_API_BASE_URL support
│   │   └── stores/            # Zustand state stores (wallets, notifications, etc.)
│   ├── index.html             # Single Page Application entry HTML
│   ├── vite.config.ts         # Vite configuration with proxy settings
│   ├── vercel.json            # Deployment configuration for Vercel
│   ├── package.json           # Frontend dependencies & scripts
│   ├── tsconfig.json          # Frontend TypeScript configuration
│   └── .env.example           # Frontend environment variable definitions
│
├── backend/                   # Node.js + Express API Server
│   ├── server.ts              # Main Express API server entry point
│   ├── server/                # In-memory JSON database & SMS service
│   ├── src/                   # Express controllers, routes, and services
│   │   ├── controllers/       # Password reset & payment controllers
│   │   ├── routes/            # M-Pesa, IntaSend, Webhooks, Auth API routes
│   │   └── services/          # IntaSend, Africa's Talking, SMTP email services
│   ├── migrations/            # SQL migration scripts for database persistence
│   ├── render.yaml            # Render Web Service deployment configuration
│   ├── Procfile               # Heroku/Render process declaration
│   ├── package.json           # Backend dependencies & build scripts
│   ├── tsconfig.json          # Backend TypeScript configuration
│   └── .env.example           # Backend environment variable definitions
│
├── README.md                  # Project documentation
├── .gitignore                 # Git ignore rules
├── metadata.json              # Platform metadata
└── package.json               # Monorepo workspace configuration
```

---

## 🚀 Independent Deployments

### 1. Frontend (Vercel)
- **Root Directory**: `frontend`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Environment Variables**:
  - `VITE_API_BASE_URL`: URL of your deployed backend service (e.g. `https://cryptonichub-backend.onrender.com`). If left blank, local/Vercel rewrites will proxy `/api/*` routes.

### 2. Backend (Render / Cloud Run)
- **Root Directory**: `backend`
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`
- **Environment Variables**:
  - `PORT`: Set by platform (defaults to `3000` or `10000`)
  - `GEMINI_API_KEY`: API key for Gemini Market AI insights
  - `INTASEND_PUBLISHABLE_KEY` & `INTASEND_SECRET_KEY`: IntaSend payment keys
  - `INTASEND_WEBHOOK_SECRET`: Secret for verifying payment webhooks
  - `AT_USERNAME` & `AT_API_KEY`: Africa's Talking SMS credentials
  - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`: SMTP email credentials for password resets

---

## 🛠 Local Development

To run the full stack locally from the monorepo root:

```bash
# Install dependencies across all workspace packages
npm install

# Start backend server
npm run dev
```

To run individual subprojects independently:

```bash
# Frontend only
cd frontend
npm install
npm run dev

# Backend only
cd backend
npm install
npm run dev
```

---

## 🔐 Key Features Preserved
- **Authentication**: JWT-backed security with password hash, strength validation, and recovery keys.
- **Payment Processing**: IntaSend card & M-Pesa deposits and withdrawals.
- **SMS Gateway**: Africa's Talking SMS notification dispatch for trading alerts.
- **SMTP Email Service**: Password reset email dispatching with secure tokens.
- **Real-time SSE**: Server-Sent Events stream live market tick prices to connected clients.
