# TapLine — Mobile RFID Wallet System

A premium, real-time mobile dashboard for managing RFID-based digital wallets, built for the Y2 Assessment. This system replaces the traditional web interface with a high-performance cross-platform mobile application.

## 🚀 Architecture
The system follows a distributed IoT architecture:
1. **Hardware Layer**: ESP8266 + MFRC522 reads physical RFID card UIDs.
2. **Communication Layer**: MQTT protocol bridges the hardware and software via a central broker.
3. **Backend Layer**: Node.js/Express server (TapLine) handles logic, security (bcrypt), and persistence.
4. **Data Layer**: MongoDB stores card references, encrypted passcodes, and transaction ledgers.
5. **Dashboard Layer**: React Native (Expo) provides the premium engineering interface for Agents and Salespeople.

## ✨ Core Features

### 👤 Role-Based Access Terminal
- **Agent Terminal**: Authorized to perform card registrations and balance top-ups.
- **Sales Terminal**: Point-of-Sale (POS) interface for processing product/service payments.

### 💳 Digital Wallet Management
- **Instant Scan**: Real-time card detection via MQTT `scan` topic.
- **Secure Payments**: 4-digit security PIN verification for all debit transactions.
- **Glassmorphic UI**: High-end visual representation of card data and balance.

### 📊 System Analytics
- **Global Dashboard**: Summary analytics including total cards, system-wide floating balance, and transaction counts.
- **Filterable Ledger**: Complete transaction history with balance-shift indicators.

## 🛠 Tech Stack
- **Frontend**: React Native, Expo, Reanimated, Expo-Haptics.
- **Backend**: Node.js, Express, Socket.io (Real-time bridge).
- **Communication**: MQTT (Hardware), WebSockets (Dashboard).
- **Database**: MongoDB (Mongoose ODM).

## 📂 Project Structure
```text
Tap_and_Pay/
├── mobile_app/     # React Native (Expo) Dashboard
├── backend/        # Node.js Express Server
├── database/       # System storage and data backups
├── mqtt_topics.md  # Detailed MQTT communication protocol
└── README.md       # Project documentation
```

## 🔐 Terminal Access Credentials
For evaluation and testing, the following secure terminals are pre-configured:
- **Agent Terminal**: `agent01` / `admin111`
- **Sales Terminal**: `sales01` / `pos222`

## ⚙️ Configuration & Setup
1. **Backend**:
   - Navigate to `/backend`
   - Install dependencies: `npm install`
   - Start the server: `npm run dev`
   - The server will connect to MongoDB and the MQTT Broker.

2. **Mobile App**:
   - Navigate to `/mobile`
   - Start Expo: `npx expo start`
   - Open the **Settings** tab (or via the Welcome gear icon) to point the `Backend Gateway` to your server's IP address (e.g., `http://192.168.1.50:8275`).

3. **Terminal Identity**:
   - All transactions are tagged with a `Terminal ID` (the username used during login) for auditing as per the **Y2 Assignment** requirements.

## 📡 MQTT Topic Architecture
The system uses the `TapLine` team namespace:
- `rfid/TapLine/scan`: Incoming UID detection.
- `rfid/TapLine/topup`: Acknowledgement and card balance sync.
- `rfid/TapLine/payment`: Transaction confirmation.

## 🎓 Learning Objectives Met
- Real-time IoT dashboards using MQTT and WebSockets.
- Distributed system architecture implementation.
- Secure financial transaction processing on mobile.
- Hardware-Software integration for fintech applications.

---
**TapLine Systems • Y2 Assessment Project**
