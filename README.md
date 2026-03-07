# 🏦 PoolVest — Private Group Investment Tracker

> A premium full-stack mobile application for tracking group investments in Indian stocks. Built for a pool of 10 members investing ₹1,000/month each.

---

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Backend Setup](#-backend-setup)
- [Mobile App Setup](#-mobile-app-setup)
- [Running the App](#-running-the-app)
- [API Endpoints](#-api-endpoints)
- [Building the APK](#-building-the-apk)
- [Deployment](#-deployment)
- [Default Credentials](#-default-credentials)

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🔐 **JWT Authentication** | Phone + password login with role-based access (Admin / Member) |
| 📈 **Stock Portfolio** | Track NSE stocks with real-time prices via Yahoo Finance |
| 💰 **Contribution Tracking** | Monthly ₹1,000 contribution management with paid/unpaid status |
| 🎁 **Dividend Tracking** | Record and distribute dividend income per member |
| 📊 **Portfolio Dashboard** | Interactive charts (growth line chart, allocation pie chart) |
| 👥 **Member Management** | View all 10 members with their portfolio breakdown |
| 📄 **PDF Reports** | Generate monthly portfolio reports |
| ⚡ **Real-time Prices** | Auto-refresh stock prices via Celery scheduled tasks |
| 🌙 **Premium Dark UI** | Glassmorphism, gradients, fintech-grade design |

---

## 🛠 Tech Stack

### Backend
- **Django 5.1** + Django REST Framework 3.15
- **SimpleJWT** — Token authentication
- **PostgreSQL** (production) / **SQLite** (development)
- **Celery + Redis** — Background task queue
- **yfinance** — Yahoo Finance stock data
- **ReportLab** — PDF generation

### Mobile
- **React Native (Expo SDK 52)**
- **React Navigation 7** — Tab + Stack navigation
- **Zustand 5** — Lightweight state management
- **react-native-chart-kit** — Portfolio charts
- **expo-linear-gradient** — Gradient UI elements
- **dayjs** — Date formatting

---

## 📁 Project Structure

```
PoolVest/
├── backend/                    # Django REST API
│   ├── manage.py
│   ├── requirements.txt
│   ├── .env
│   ├── Procfile               # Deployment config
│   ├── poolvest/              # Django project
│   │   ├── settings.py
│   │   ├── urls.py
│   │   ├── celery.py
│   │   └── ...
│   ├── accounts/              # User auth & member management
│   ├── investments/           # Stock purchases & prices
│   ├── contributions/         # Monthly contribution tracking
│   ├── dividends/             # Dividend income tracking
│   ├── portfolio/             # Portfolio analytics & dashboard
│   └── reports/               # PDF report generation
│
└── mobile/                    # React Native (Expo) app
    ├── App.js
    ├── package.json
    ├── app.json
    ├── src/
    │   ├── theme/colors.js    # Design system
    │   ├── config/api.js      # Axios + JWT interceptors
    │   ├── store/             # Zustand stores
    │   ├── navigation/        # React Navigation
    │   ├── components/        # Reusable UI components
    │   └── screens/           # App screens
    └── assets/                # Icons & splash
```

---

## 🔧 Backend Setup

### Prerequisites
- Python 3.12+
- pip

### Installation

```bash
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run migrations
python manage.py makemigrations accounts investments contributions dividends portfolio reports
python manage.py migrate

# Seed sample data
python manage.py seed_data

# Start server
python manage.py runserver
```

The API will be available at `http://localhost:8000/api/`

### Environment Variables (`.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `DEBUG` | `True` | Debug mode |
| `SECRET_KEY` | auto-generated | Django secret key |
| `DATABASE_URL` | SQLite | Database connection string |
| `REDIS_URL` | `redis://localhost:6379` | Redis for Celery |

### Celery (Optional — for scheduled tasks)

```bash
# Terminal 1: Start Celery worker
celery -A poolvest worker -l info

# Terminal 2: Start Celery beat (scheduler)
celery -A poolvest beat -l info
```

---

## 📱 Mobile App Setup

### Prerequisites
- Node.js 18+
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- Android device or emulator

### Installation

```bash
cd mobile

# Install dependencies
npm install

# Start Expo development server
npx expo start
```

### Connecting to Backend

Edit `src/config/api.js` and set the `baseURL`:

```javascript
// For Android emulator:
baseURL: 'http://10.0.2.2:8000/api'

// For physical device (use your computer's IP):
baseURL: 'http://192.168.x.x:8000/api'

// For iOS simulator:
baseURL: 'http://localhost:8000/api'
```

---

## 🏃 Running the App

### Quick Start (Development)

```bash
# Terminal 1: Backend
cd backend && source venv/bin/activate && python manage.py runserver

# Terminal 2: Mobile
cd mobile && npx expo start
```

Then scan the QR code with **Expo Go** app on your Android device, or press `a` to open in Android emulator.

---

## 📡 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/accounts/login/` | Login (phone + password) |
| POST | `/api/accounts/register/` | Register new member |
| POST | `/api/accounts/logout/` | Logout (blacklist token) |
| POST | `/api/accounts/token/refresh/` | Refresh JWT token |
| GET | `/api/accounts/me/` | Current user profile |
| GET | `/api/accounts/members/` | List all members |

### Investments
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/investments/stocks/` | List all stock purchases |
| POST | `/api/investments/stocks/` | Add stock purchase (admin) |
| GET | `/api/investments/stocks/summary/` | Stock summary grouped by symbol |
| POST | `/api/investments/stocks/refresh_prices/` | Refresh stock prices (admin) |

### Contributions
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/contributions/` | List contributions |
| PUT | `/api/contributions/{id}/` | Update contribution status (admin) |
| POST | `/api/contributions/generate/` | Generate monthly records (admin) |
| GET | `/api/contributions/summary/` | Contribution summary |

### Dividends
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dividends/` | List dividends |
| POST | `/api/dividends/` | Record dividend (admin) |
| GET | `/api/dividends/summary/` | Dividend summary |

### Portfolio & Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/portfolio/dashboard/` | Aggregated dashboard data |
| GET | `/api/portfolio/growth/` | Portfolio growth over time |

### Reports
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/reports/monthly/` | Download monthly PDF report |

---

## 📦 Building the APK

### Using EAS Build (Recommended)

```bash
cd mobile

# Install EAS CLI
npm install -g eas-cli

# Login to Expo account
eas login

# Build APK (preview profile)
eas build -p android --profile preview
```

This generates a downloadable `.apk` file from the Expo build servers.

### Local Build

```bash
# Generate native Android project
npx expo prebuild --platform android

# Build APK
cd android && ./gradlew assembleRelease
```

The APK will be at `android/app/build/outputs/apk/release/app-release.apk`

---

## 🚀 Deployment

### Backend (Render / Railway)

1. Push the `backend/` folder to a Git repository
2. Create a new Web Service on [Render](https://render.com) or [Railway](https://railway.app)
3. Set environment variables:
   - `DATABASE_URL` → PostgreSQL connection string
   - `SECRET_KEY` → Strong random key
   - `DEBUG` → `False`
   - `REDIS_URL` → Redis connection string
4. Build command: `pip install -r requirements.txt && python manage.py migrate`
5. Start command: `gunicorn poolvest.wsgi --bind 0.0.0.0:$PORT`

### `Procfile` (included)
```
web: gunicorn poolvest.wsgi --bind 0.0.0.0:$PORT
worker: celery -A poolvest worker -l info
beat: celery -A poolvest beat -l info
```

---

## 🔑 Default Credentials

After running `python manage.py seed_data`:

| Role | Phone | Password |
|------|-------|----------|
| **Admin** | `9999999999` | `admin123` |
| Member 1 | `9000000001` | `member123` |
| Member 2 | `9000000002` | `member123` |
| ... | ... | ... |
| Member 9 | `9000000009` | `member123` |

### Sample Data Included
- 5 stocks: TCS, Reliance, HDFC Bank, Infosys, Wipro
- 6 months of contributions
- 3 dividend entries
- 90 days of portfolio snapshots

---

## 📸 App Screens

| Screen | Description |
|--------|-------------|
| **Login** | Gradient background, phone/password auth, demo credentials |
| **Dashboard** | Portfolio value, growth chart, allocation pie chart, stock holdings |
| **Investments** | Stock list, P/L summary, add/delete stocks (admin) |
| **Members** | All members with contribution & portfolio breakdown |
| **Dividends** | Dividend history, per-member share |
| **Profile** | User info, stats, PDF download, logout |

---

## 🎨 Design System

- **Background:** Dark Navy `#0F172A`
- **Surface:** `#1E293B`
- **Accent:** Blue-Teal `#3B82F6`
- **Profit:** Green `#10B981`
- **Loss:** Red `#EF4444`
- **Cards:** Glassmorphism with blur and subtle borders
- **Typography:** System fonts with weighted hierarchy

---

Built with ❤️ by PoolVest Team
