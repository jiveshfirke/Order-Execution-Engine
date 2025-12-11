# Order Execution Engine

A high-performance, event-driven order execution engine built with Node.js, Fastify, and BullMQ. It simulates DEX routing (Raydium vs Meteora) and handles concurrent order execution with real-time WebSocket status updates.

## Features

- **Smart DEX Routing:** Automatically compares prices between Raydium and Meteora (Mock) to execute at the best price.
- **High Concurrency:** Utilizes BullMQ + Redis to handle multiple simultaneous orders without blocking the main thread.
- **Real-Time Updates:** WebSocket streaming of the entire lifecycle (`pending` → `routing` → `building` → `submitted` → `confirmed`).
- **Fault Tolerance:** Implements exponential back-off retry logic to handle simulated network failures and slippage errors.
- **Live Dashboard:** Includes a built-in visual dashboard to monitor order flow in real-time.

## Tech Stack

- **Runtime:** Node.js (v20+) + TypeScript
- **API Server:** Fastify (HTTP + WebSocket)
- **Queue/State:** BullMQ + Redis
- **Testing:** Jest + Supertest

---

## Design Decisions (Requirement)

### Why Market Orders?
I chose to implement **Market Orders** to strictly prioritize the architectural demonstration of the Order Execution Engine and Routing logic. Market orders allow for immediate execution flow testing without the latency overhead and complexity of long-running "price watcher" processes required for Limit Orders.

### Extensibility to Limit/Sniper Orders
This engine is designed as a modular, event-driven state machine. To support Limit or Sniper orders, we would simply add a **"Price Watcher Service"**.
1. This service would monitor chain prices independently.
2. When a target price is hit, it pushes a job to the existing 'order-queue'.
3. The existing worker picks it up and executes it using the exact same logic pipeline built here.

---

## Setup & Installation

### 1. Prerequisites
Ensure you have **Node.js** and **Docker** installed.

### 2. Install Dependencies
```bash
npm install
```

### 3. Start Infrastructure

Start the Redis and PostgreSQL instances using Docker:

```bash
docker compose up -d
```

### 4. Run the Engine

Start the backend server (API + Worker):

```bash
npx ts-node src/server.ts
```

The server will start at `http://localhost:3000`.

-----

## Usage & Testing

### 1. The Visual Dashboard (Recommended)

Open **`http://localhost:3000`** in your browser.

  - Enter an amount and token pair.
  - Click **EXECUTE ORDER**.
  - Watch the live logs scroll as the engine processes the trade in real-time.

### 2. Automated Tests

Run the Jest test suite (covers Routing, Queue, and WebSocket logic):

```bash
npm test
```

### 3. Manual Testing (Postman)

Import the `postman_collection.json` file included in this repository into Postman.

#### **Step A: Submit Order**

  - **POST** `/api/orders/execute`
  - **Body:** `{ "amount": 10, "tokenPair": "SOL-USDC", "type": "market" }`
  - **Returns:** `{ "orderId": "..." }`

#### **Step B: Listen for Updates**

  - **WebSocket** `ws://localhost:3000/ws/orders/:orderId`
  - Connect and wait for status events:
    ```json
    { "status": "routing" }
    { "status": "confirmed", "data": { "txHash": "...", "finalPrice": 102.5 } }
    ```

-----

## Project Structure

```
.
├── src
│   ├── engine       # DEX Routing Logic
│   ├── public       # Dashboard Frontend (HTML)
│   ├── scripts      # Load testing scripts
│   ├── server.ts    # API & WebSocket Entry point
│   └── worker.ts    # Background Queue Processor
├── tests            # Jest Unit & Integration Tests
├── docker-compose.yml
└── README.md
```