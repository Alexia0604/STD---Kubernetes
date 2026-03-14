# 🚀 Distributed Platform — Chat, CMS & AI Services

A full-stack distributed platform deployed on Kubernetes, comprising three independent microservice groups: a **real-time chat application**, a **headless CMS (Payload)** for a travel blog, and an **AI-powered backend**. All services communicate over a shared Docker/Kubernetes network and are containerized for cloud-native deployment.

---

## 📐 Architecture Overview

```
                        ┌────────────────────────────────────────────┐
                        │              Kubernetes Cluster             │
                        │                                             │
                        │   ┌─────────┐    ┌───────────┐             │
                        │   │  Nginx  │    │Payload CMS│ (port 80)   │
                        │   │ (p. 88) │    │  x5 pods  │             │
                        │   └────┬────┘    └─────┬─────┘             │
                        │        │               │                   │
                        │   ┌────▼────────────────▼───┐              │
                        │   │         MongoDB          │              │
                        │   └──────────┬──────────────┘              │
                        │              │                              │
                        │   ┌──────────▼──────────┐                  │
                        │   │   Chat Backend x12  │                  │
                        │   │   (Spring Boot)     │                  │
                        │   └──────────┬──────────┘                  │
                        │              │                              │
                        │   ┌──────────▼──────────┐                  │
                        │   │       Redis          │  Pub/Sub         │
                        │   └─────────────────────┘                  │
                        │                                             │
                        │   ┌─────────┐    ┌───────────┐             │
                        │   │IA Front │    │ IA Backend│             │
                        │   │ (p.3001)│    │ (p. 5001) │             │
                        │   └────┬────┘    └─────┬─────┘             │
                        │        └───────┬────────┘                  │
                        │           ┌────▼────┐                      │
                        │           │ Apache  │ (port 5000)          │
                        │           └─────────┘                      │
                        └────────────────────────────────────────────┘
```

---

## 🧩 Services

### 💬 Chat Application (`/chat`)

A real-time chat application built with **Spring Boot** and **React**, backed by MongoDB for persistence and Redis for Pub/Sub message distribution across multiple backend pods.

| Component | Technology | Port |
|---|---|---|
| Backend | Spring Boot 3.4.5 / Java 17 | 8080 |
| Frontend | React | 3000 (ext. 90) |
| Reverse Proxy | Nginx | 88 |
| Database | MongoDB 6 | 27017 |
| Message Broker | Redis 7 | 6379 |

**Key Features:**
- WebSocket communication via STOMP protocol (SockJS)
- Redis Pub/Sub for horizontal scalability — messages broadcast across **12 backend replicas**
- `POD_NAME` environment variable injected for pod-aware logging
- Messages persisted in MongoDB, ordered by timestamp

**Tech Stack:**
- `spring-boot-starter-websocket` + STOMP
- `spring-boot-starter-data-mongodb`
- `spring-boot-starter-data-redis` with Lettuce client
- Jackson with JavaTimeModule for `LocalDateTime` serialization
- Lombok

---

### 📝 CMS — Travel Blog (`/cms/travelblog`)

A **Payload CMS** instance serving as a headless backend for a travel blog. Runs with **pnpm** on Node 18 and connects to the shared MongoDB instance.

| Component | Technology | Port |
|---|---|---|
| CMS | Payload CMS (Node 18) | 3000 (ext. 80) |
| Database | MongoDB 6 (shared) | 27017 |

**Kubernetes:** Deployed with **5 replicas**, with `DATABASE_URI` and `PAYLOAD_SECRET` injected via ConfigMap.

---

### 🤖 AI Service (`/IA`)

An AI-powered microservice with a Node.js backend, an Apache reverse proxy, and a React frontend.

| Component | Technology | Port |
|---|---|---|
| Backend | Node.js | 5001 |
| Proxy | Apache | 5000 |
| Frontend | React (served by Nginx) | 80 (ext. 3001) |

---

## ☸️ Kubernetes Deployment

All services are deployed on a Kubernetes cluster. Manifests are located in `/kubernetes/`.

### Replica Configuration

| Service | Replicas | Exposure |
|---|---|---|
| `chat-backend` | **12** | ClusterIP (internal only) |
| `nginx` | **3** | NodePort `30088` |
| `payload-cms` | **5** | NodePort `30080` |
| `chat-frontend` | 1 | NodePort `30090` |
| `ia-frontend` | 1 | NodePort `30301` |
| `apache` | 1 | NodePort `30500` |
| `mongodb` | 1 | ClusterIP |
| `redis` | 1 | ClusterIP |

### Node Ports Summary

| NodePort | Service |
|---|---|
| `30080` | Payload CMS |
| `30088` | Nginx (Chat WebSocket proxy) |
| `30090` | Chat Frontend |
| `30301` | IA Frontend |
| `30500` | Apache (IA proxy) |

### Storage (PVCs)

| PVC | Size | Used by |
|---|---|---|
| `mongo-data` | 100Mi | MongoDB |
| `chat-frontend-claim1` | 100Mi | Chat Frontend |
| `payload-node-modules` | 100Mi | Payload CMS |

---

## 🐳 Running Locally with Docker Compose

### Prerequisites

- Docker & Docker Compose
- `.env` file for Payload CMS (see `/cms/travelblog/.env`)

### Start All Services

```bash
docker-compose up --build
```

### Service URLs (local)

| Service | URL |
|---|---|
| Payload CMS | http://localhost:80 |
| Chat Frontend | http://localhost:90 |
| Chat WebSocket Proxy (Nginx) | http://localhost:88 |
| IA Frontend | http://localhost:3001 |
| IA Backend | http://localhost:5001 |
| Apache (IA proxy) | http://localhost:5000 |

---

## ⚙️ Configuration

### Chat Backend (`application.properties`)

```properties
spring.data.mongodb.uri=mongodb://mongodb:27017/chatdb
server.port=8080
spring.redis.host=redis
spring.redis.port=6379
```

These values are overridden at runtime via environment variables in Docker Compose and Kubernetes.

### Payload CMS (ConfigMap)

```yaml
DATABASE_URI: mongodb://mongodb:27017/travelblog
PAYLOAD_SECRET: <secret>
```

### Nginx — WebSocket Proxy

The Nginx instance proxies WebSocket connections from external clients to the `chat-backend` service:

```nginx
location /chat-websocket {
    proxy_pass http://backend;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
}
```

---

## 📦 Docker Images

Pre-built images used in Kubernetes:

| Image | Service |
|---|---|
| `alexia0604/chat-backend:latest` | Chat Spring Boot backend |
| `alexia0604/chat-frontend:latest` | Chat React frontend |
| `alexia0604/payload:latest` | Payload CMS |
| `alexia0604/ia-backend:latest` | AI Node.js backend |
| `alexia0604/ia-frontend:latest` | AI React frontend |
| `alexia0604/ia-apache:latest` | AI Apache proxy |

---

## 🗂️ Project Structure

```
.
├── chat/
│   ├── backend/          # Spring Boot application
│   │   ├── src/
│   │   ├── Dockerfile
│   │   └── pom.xml
│   ├── frontend/         # React application
│   ├── nginx/
│   │   └── nginx.conf
│   └── docker-compose.yml
├── cms/
│   └── travelblog/       # Payload CMS project
├── IA/
│   ├── backend/          # Node.js AI backend
│   ├── frontend/         # React frontend
│   └── apache/           # Apache reverse proxy
├── kubernetes/           # Kubernetes manifests
│   ├── chat-backend-deployment.yaml
│   ├── chat-backend-service.yaml
│   ├── nginx-deployment.yaml
│   ├── redis-deployment.yaml
│   ├── mongodb-deployment.yaml
│   └── ...
└── docker-compose.yml    # Full stack compose file
```
