# ORCHESTRA — Tech Stack & Software Engineering

---

## SLIDE 1: Overview Arsitektur

**Monorepo** TypeScript: `backend/` (NestJS) + `frontend/` (Next.js)

```
Next.js 16 + React 19 + TailwindCSS 4
        │ REST + WebSocket (Socket.IO)
NestJS 11 (10 modules) + Prisma ORM + PostgreSQL
        │
Notion API · GitHub Webhooks · Zoom API · Gemini AI
```

---

## SLIDE 2: Backend — NestJS Modular Architecture

10 module dengan **Dependency Injection** penuh:

| Module | Tanggung Jawab |
|---|---|
| AuthModule | JWT + bcrypt + Passport strategy |
| PrismaModule | DB lifecycle, connection management |
| UserModule | User CRUD |
| NotionModule | Notion SDK wrapper, schema normalization |
| GithubModule | Webhook ingestion, PR→task sync |
| ZoomModule | OAuth token cache, meeting, transcript pull |
| GeminiModule | AI prompt + Zod-validated JSON parsing |
| SummariesModule | Draft→approve→sync pipeline |
| MeetingsModule | Meeting log persistence |
| TranscriptsModule | In-memory VTT transcript store |

**SE Patterns**: Dependency Injection, Single Responsibility, Interface Segregation (exports)

---

## SLIDE 3: Database — Prisma ORM + PostgreSQL

- **Prisma 5** — type-safe auto-generated client dari schema
- **Prisma Migrate** — versioned, reproducible migrations
- **9 model**: User, Project, ProjectMember, ProjectMessage (encrypted), MeetingLog, ProjectRepository, GithubBranchLink, GithubActivity, TaskBranchSync
- Composite unique constraints (`@@unique`) mencegah duplicate
- JSON columns untuk flexible schema storage

---

## SLIDE 4: Security — Multi-Layer

| Layer | Implementasi |
|---|---|
| Password | bcrypt hash (salt 10) |
| Auth | JWT signed, expires 1d |
| API Keys | env vars, never exposed |
| Webhooks | HMAC-SHA256 + timingSafeEqual |
| Chat | AES-256-CBC + random IV per message |
| Access Control | RBAC project-based segregation |

---

## SLIDE 5: Real-Time — WebSocket Gateway Pattern

```
Client → joinProject → Room "project-{id}"
GitHub/Zoom webhook → Service → gateway.emitToProject()
                                  → broadcast ke room
```

- Room-based pub/sub — events terisolasi per project
- Emitter decoupled dari listener

---

## SLIDE 6: AI Pipeline — Gemini + Zod

```
Zoom VTT transcript
    │
    ▼
Notion schema context (auto-fetch child DBs)
    │
    ▼
Gemini 2.0 Flash → JSON output
    │
    ▼
Zod safeParse() → validated drafts
    │
    ▼
User review → Approve → Sync to Notion
```

- **Schema-aware prompting** — Gemini diberi struktur DB sebelum analisis
- **Zod runtime validation** — mencegah malformed data
- **Mock mode** (`MOCK_GEMINI=true`) untuk dev/testing

---

## SLIDE 7: External Integrations

- **Notion**: Official SDK, schema normalization, page CRUD, multi-property completion (checkbox/status/select)
- **GitHub**: Webhook ingestion (push, PR, issues, review), signature verification, auto task completion (PR merged+approved → Notion done)
- **Zoom**: Server-to-server OAuth, token caching (refresh 60s before expiry), webhook `recording.completed` → auto-pull transcript → auto-generate drafts

---

## SLIDE 8: Frontend — Next.js 16

- Next.js 16 App Router + React 19 + TailwindCSS 4
- `socket.io-client` untuk real-time
- TypeScript strict end-to-end (backend DTO → frontend props)

---

## SLIDE 9: Testing Strategy

Jest — unit + e2e, 10+ spec files:

- **Service tests**: business logic terisolasi (mocked deps)
- **Controller tests**: HTTP request/response contract
- **Gateway tests**: WebSocket event handling
- **E2E**: full NestJS boot + supertest

---

## SLIDE 10: SE Summary

| Pattern | Penerapan |
|---|---|
| Modular Monolith | 10 modules, siap split ke microservices |
| Dependency Injection | Loose coupling, high testability |
| Repository Pattern | Prisma ORM abstraction |
| Gateway Pattern | WebSocket decoupled dari business logic |
| Pipeline Pattern | Transcript → AI → Validate → Draft → Approve → Sync |
| Defense in Depth | Auth + Encryption + Signature + RBAC |
