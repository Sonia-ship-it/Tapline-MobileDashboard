# MQTT Topic Architecture — TapLine

This document outlines the MQTT communication protocol used for real-time RFID wallet operations.

## Configuration
- **Broker**: `mqtt://157.173.101.159:1883`
- **Team ID**: `TapLine`

## Topic Structure
All topics follow the pattern: `rfid/<team_id>/<action>`

### 1. `rfid/TapLine/status`
- **Direction**: ESP8266 → Backend
- **Purpose**: Sent when the ESP8266 boots up or changes its connectivity status.
- **Payload**:
  ```json
  { "status": "online", "ip": "192.168.1.x" }
  ```

### 2. `rfid/TapLine/scan`
- **Direction**: ESP8266 → Backend
- **Purpose**: Triggered when an RFID card is placed on the reader.
- **Payload**:
  ```json
  { "uid": "8A5B22D1", "present": true }
  ```

### 3. `rfid/TapLine/topup`
- **Direction**: Backend → ESP8266
- **Purpose**: Commands the reader to update the local balance stored on the card sectors (if supported) after a successful database update.
- **Payload**:
  ```json
  { "uid": "8A5B22D1", "amount": 500.00 }
  ```

### 4. `rfid/TapLine/payment`
- **Direction**: Backend → ESP8266
- **Purpose**: Signals a successful debit operation. The reader can then trigger hardware feedback (buzzer/LED) or update card sectors.
- **Payload**:
  ```json
  {
    "uid": "8A5B22D1",
    "amount": 450.00,
    "deducted": 50.00,
    "status": "success"
  }
  ```

## Hardware Implementation Notes
- **Hardware**: ESP8266 (NodeMCU) + MFRC522 RFID Module.
- **Protocol**: MQTT over TCP/IP (WiFi).
- **Security**: Card UIDs are validated against a hashed passcode stored in the MongoDB backend before any payment is processed.
