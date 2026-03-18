# TapLine Database Architecture

The TapLine system utilizes **MongoDB** for persistent storage. This directory contains the schema definitions and sample data structures used by the backend.

## 🗄 Collections Overview

### 1. `Users`
Stores authorized Agent and Seller credentials.
- `username`: Unique identifier for login.
- `password`: Hashed using bcrypt.
- `role`: `agent` or `sales`.
- `name`: Full name of the operator.
- `terminalId`: A unique ID assigned for transaction auditing.

### 2. `Cards`
The core ledger for physical RFID tags.
- `uid`: Unique Hardware ID from the RFID chip.
- `holderName`: Assigned name of the card owner.
- `balance`: Current floating balance.
- `passcode`: Hashed 6-digit security PIN.
- `passcodeSet`: Boolean flag.

### 3. `Transactions`
A permanent audit log of all financial movements.
- `uid`: The card involved.
- `type`: `topup` (Credit) or `debit` (Payment).
- `amount`: Transaction value.
- `balanceBefore`: Snapshot before processing.
- `balanceAfter`: Snapshot after processing.
- `terminalId`: Which Agent/Seller performed the action.
- `timestamp`: UTC ISO 8601.

## 📥 Data Backup & Restore
To export your current database for submission:
```bash
mongodump --db TapLine --out ./database/backups/
```
