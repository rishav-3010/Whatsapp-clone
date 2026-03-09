# 💬 WhatsApp Clone - Production-Ready Real-Time Chat

A full-stack real-time chat application built with **Node.js**, **Socket.io**, **Redis**, **Neon PostgreSQL**, and **React**.

![Architecture](https://img.shields.io/badge/Architecture-Microservices-blue)
![Node.js](https://img.shields.io/badge/Node.js-v20-green)
![Socket.io](https://img.shields.io/badge/Socket.io-v4.7-black)
![Redis](https://img.shields.io/badge/Redis-v7-red)
![Docker](https://img.shields.io/badge/Docker-Ready-blue)

---

## 🏗️ System Architecture

```
                    ┌─────────────┐
                    │   Clients   │
                    │  (React +   │
                    │  Socket.io) │
                    └──────┬──────┘
                           │ WSS / HTTPS
                    ┌──────▼──────┐
                    │    Nginx    │
                    │ Load Balancer│
                    │ (ip_hash)  │
                    └──────┬──────┘
              ┌────────────┼────────────┐
              │            │            │
        ┌─────▼────┐ ┌────▼─────┐ ┌────▼─────┐
        │ Server 1 │ │ Server 2 │ │ Server N │
        │ Express  │ │ Express  │ │ Express  │
        │+Socket.io│ │+Socket.io│ │+Socket.io│
        └────┬─────┘ └────┬─────┘ └────┬─────┘
             │             │            │
        ┌────▼─────────────▼────────────▼────┐
        │          Redis Cluster              │
        │  (Pub/Sub + Socket.io Adapter)     │
        └───────────────┬────────────────────┘
                        │
                ┌───────▼──────┐
                │ Neon PostgreSQL│
                │  (Messages,   │
                │  Users, Rooms)│
                └──────────────┘
```

---

## ✨ Features

| Feature | Status | Description |
|---------|--------|-------------|
| Real-time messaging | ✅ | WebSocket-based instant message delivery |
| Private & group chats | ✅ | 1:1 conversations and group rooms |
| Message persistence | ✅ | All messages stored in Neon PostgreSQL |
| Redis Pub/Sub | ✅ | Horizontal scaling across multiple servers |
| Typing indicators | ✅ | Real-time "User is typing..." feedback |
| Read receipts | ✅ | ✓ sent → ✓✓ delivered → 🔵✓✓ read |
| Online/offline presence | ✅ | Redis-powered presence tracking |
| Reconnection handling | ✅ | Auto-reconnect with exponential backoff |
| Paginated history | ✅ | Cursor-based pagination for chat history |
| Rate limiting | ✅ | Redis-backed distributed rate limiting |
| JWT authentication | ✅ | Access + refresh token flow |
| Docker ready | ✅ | Multi-stage builds, compose orchestration |

---

## 🚀 Quick Start

### Prerequisites
- Node.js v18+
- Redis (local or Docker)
- Neon PostgreSQL account ([neon.tech](https://neon.tech))

### 1. Clone & Install

```bash
# Install server dependencies
cd server
cp .env.example .env  # Edit with your Neon DB URL
npm install

# Install client dependencies
cd ../client
npm install
```

### 2. Configure Environment

Edit `server/.env`:
```env
DATABASE_URL=postgresql://user:pass@your-host.neon.tech/dbname?sslmode=require
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-strong-secret-key
```

### 3. Initialize Database

```bash
cd server
npm run db:init
```

### 4. Start Development

```bash
# Terminal 1: Start Redis (or use Docker)
redis-server

# Terminal 2: Start server
cd server
npm run dev

# Terminal 3: Start client
cd client
npm run dev
```

Open http://localhost:5173 — register two users, start chatting!

### Docker Deployment

```bash
# Build and start all services
docker-compose up --build

# Scale to 3 server instances
docker-compose up --scale server=3
```

---

## 📁 Project Structure

```
whatsapp-clone/
├── server/
│   └── src/
│       ├── config/          # DB, Redis, Socket.io setup
│       ├── controllers/     # REST API handlers
│       ├── middleware/       # Auth, rate limiting, error handling
│       ├── models/          # SQL queries
│       ├── services/        # Business logic
│       ├── socket/          # WebSocket event handlers
│       ├── routes/          # Express routes
│       ├── utils/           # Logger, helpers
│       ├── db/              # Schema & migrations
│       └── app.js           # Entry point
├── client/
│   └── src/
│       ├── components/      # React UI components
│       ├── context/         # Auth & Socket providers
│       ├── hooks/           # Custom hooks
│       ├── services/        # API & Socket clients
│       ├── pages/           # Route pages
│       └── styles/          # CSS
├── docker-compose.yml
├── nginx.conf
└── README.md
```

---

## 🔌 Socket.io Event Reference

| Direction | Event | Payload |
|-----------|-------|---------|
| C→S | `message:send` | `{ roomId, content, type }` |
| S→C | `message:new` | `{ id, roomId, senderId, content, status, createdAt }` |
| C→S | `typing:start` | `{ roomId }` |
| C→S | `typing:stop` | `{ roomId }` |
| S→C | `typing:update` | `{ roomId, userId, username, isTyping }` |
| C→S | `message:read` | `{ messageId, roomId }` |
| S→C | `message:status` | `{ messageId, status, readBy }` |
| S→C | `presence:update` | `{ userId, isOnline, lastSeen }` |
| C→S | `room:join` | `{ roomId }` |
| C→S | `room:leave` | `{ roomId }` |

---

## 🧠 Backend Concepts Explained

### WebSocket Connection Lifecycle

```
Client                         Server
  │                              │
  │──── HTTP GET /socket.io/ ───▶│  1. Initial HTTP request
  │◀─── 101 Switching Protocols ─│  2. Protocol upgrade to WebSocket
  │                              │
  │◀──────── ping ──────────────│  3. Server sends ping (every 25s)
  │────────── pong ─────────────▶│  4. Client responds with pong
  │                              │     (if no pong in 60s → disconnect)
  │                              │
  │──── message:send ───────────▶│  5. Bidirectional data exchange
  │◀──── message:new ───────────│     (full-duplex, no HTTP overhead)
  │                              │
  │◀──── disconnect ─────────────│  6. Connection close
  │                              │     (server cleans up listeners)
```

**Key points:**
- The initial connection is an HTTP request that gets **upgraded** to WebSocket
- Socket.io adds **heartbeat** (ping/pong) to detect dead connections
- If a heartbeat fails, the server fires `disconnect` and cleans up
- Socket.io can **fall back to HTTP long-polling** if WebSocket is blocked

### Redis Pub/Sub Message Flow

```
User A (Server 1)              Redis              User B (Server 2)
     │                           │                        │
     │── message:send ──▶        │                        │
     │                   │       │                        │
     │   [Persist to DB] │       │                        │
     │                   │       │                        │
     │   io.to(room).emit()      │                        │
     │       │                   │                        │
     │       └── PUBLISH ───────▶│                        │
     │                           │── DELIVER ────▶        │
     │                           │            │           │
     │                           │            └── emit ──▶│
     │◀── message:new (echo) ────│               message:new
```

**Without Redis adapter:** `io.to(room).emit()` only reaches clients on the same server.
**With Redis adapter:** The event is published to Redis, and all server instances subscribed to that channel receive it and deliver to their local clients.

### Handling Concurrency

Node.js uses a **single-threaded event loop**, but it's designed for I/O-heavy workloads:

1. **Event Loop** — All I/O operations (DB queries, Redis commands, socket events) are non-blocking. The event loop processes callbacks one at a time, avoiding race conditions on shared state.

2. **Connection Pooling** — We use `pg.Pool` with max 20 connections. The pool queues requests when all connections are busy, preventing the "too many connections" error.

3. **Race Conditions** — Database operations use `ON CONFLICT DO NOTHING` for idempotent inserts (e.g., read receipts, room memberships). Critical multi-step operations use PostgreSQL **transactions**.

4. **Message Ordering** — Messages are ordered by `created_at` timestamp (database-assigned), ensuring consistent ordering even under high concurrency.

### Avoiding Memory Leaks in Socket.io

Memory leaks are the #1 cause of Node.js server crashes in production WebSocket apps:

| Leak Source | Prevention |
|-------------|------------|
| Dangling listeners | All `socket.on()` listeners are auto-cleaned by Socket.io on `disconnect` |
| Global socket refs | We never store sockets in global arrays/maps — use Socket.io rooms instead |
| Unbounded event handlers | Handlers are registered once per connection, not per event |
| Redis subscriptions | `@socket.io/redis-adapter` manages its own subscription lifecycle |
| Database connections | `pg.Pool` with `idleTimeoutMillis` auto-closes idle connections |
| Typing timeouts | Client-side timeout refs are cleared in `useEffect` cleanup |

---

## 📈 Scaling to 100k Concurrent Users

| Layer | Strategy | Details |
|-------|----------|---------|
| Load Balancer | Nginx ip_hash | Sticky sessions for Socket.io |
| App Servers | 5-10 instances | `docker-compose up --scale server=10` |
| Socket.io | Redis Adapter | Cross-server event broadcasting |
| Database | PgBouncer pool | Connection multiplexing for Neon |
| Redis | Redis Cluster | Shard across 3+ nodes |
| Rate Limiting | Redis-backed | Distributed across instances |
| Storage | S3/R2 | Offload file/image uploads |
| Monitoring | Prometheus + Grafana | Track connections, latency, errors |

### Key Optimizations
1. **Connection handling**: Each Node.js instance can handle 10-20k WebSocket connections
2. **Message batching**: Use Redis Streams for high-throughput message queuing
3. **Read replica**: Route read queries (history) to Neon read replicas
4. **CDN**: Serve static React assets via CloudFront/Cloudflare
5. **Compression**: Enable per-message compression in Socket.io

---

## 🔒 Production Improvements

- [ ] **End-to-end encryption** — Signal Protocol for message privacy
- [ ] **File uploads** — S3/R2 with pre-signed URLs
- [ ] **Push notifications** — Firebase Cloud Messaging for mobile
- [ ] **Message search** — Full-text search with PostgreSQL `tsvector`
- [ ] **Voice/video calls** — WebRTC with TURN/STUN servers
- [ ] **Message reactions** — Emoji reactions on messages
- [ ] **Forwarding & replies** — Reference messages in replies
- [ ] **Admin dashboard** — User management, analytics
- [ ] **CI/CD pipeline** — GitHub Actions → Docker Hub → K8s deploy
- [ ] **Monitoring** — Prometheus metrics, Grafana dashboards, Sentry errors

---

## 📄 License

MIT
