# KadalThunai (கடல் துணை)

> **Your Trusted Companion at Sea**

A smart fisheries resource management platform for Tamil Nadu fishermen and fisheries department officials.

## Project Structure

```
KadalThunai/
├── backend/    ← Node.js + Express + MongoDB REST API
├── mobile/     ← React Native + Expo (Fisherman + Officer mobile app)
├── admin/      ← Vite + React (Admin web dashboard)
└── README.md
```

## Quick Start

### Backend

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your MongoDB URI and secrets
npm run dev
```

### Mobile

```bash
cd mobile
npm install
npx expo start
```

### Admin

```bash
cd admin
npm install
npm run dev
```

## Tech Stack

| Layer | Technology |
|---|---|
| Mobile | React Native, Expo SDK |
| Backend | Node.js, Express.js |
| Database | MongoDB (local via Compass) |
| Offline DB | expo-sqlite |
| Maps | OpenStreetMap via react-native-maps UrlTile |
| Weather | OpenWeatherMap API |
| Fish Prices | FMPIS / data.gov.in |
| i18n | English + Tamil |
| Auth | JWT + Refresh Tokens |

## Features

- Fisherman safety & SOS emergency system
- Smart fishing zone recommendations with offline map cache
- Catch recording and revenue tracking (offline-first)
- Weather alerts with offline cache
- Government scheme notifications
- Sea incident and complaint reporting
- Digital compass navigation
- Fish market price intelligence
- Role-based access (Fisherman / Fisheries Officer / Admin)
- Automatic offline → online synchronization

## Future Enhancements

- LoRa-based SOS communication
- Firebase Cloud Messaging (FCM) push notifications
- Cloudinary image uploads
- AI-powered fishing zone prediction
- Tamil voice assistant
