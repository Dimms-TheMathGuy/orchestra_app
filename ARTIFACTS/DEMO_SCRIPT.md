# Orchestra Backend Demo Script

## Prerequisites
- Docker DB running: `docker start orchestra-db`
- Backend running: `npm run start:dev` (in `backend/`)
- Seed data applied (one-time setup, see bottom)

---

## 1. Auth

### Register
```cmd
curl -X POST http://localhost:3000/auth/register -H "Content-Type: application/json" -d "{\"email\": \"demo@test.com\", \"password\": \"demo123\", \"name\": \"Demo User\"}"
```

### Login
```cmd
curl -X POST http://localhost:3000/auth/login -H "Content-Type: application/json" -d "{\"email\": \"demo@test.com\", \"password\": \"demo123\"}"
```

---

## 2. Zoom Integration

### Schedule a Meeting
```cmd
curl -X POST http://localhost:3000/zoom/meetings -H "Content-Type: application/json" -d "{\"topic\": \"Q3 Roadmap Discussion\", \"start_time\": \"2026-05-14T10:00:00+07:00\", \"duration_minutes\": 30, \"agenda\": \"Plan Q3 deliverables and assign tasks\"}"
```

### List Meetings
```cmd
curl http://localhost:3000/zoom/meetings
```

### Retrieve Transcript (requires meeting with cloud recording completed)
```cmd
curl http://localhost:3000/zoom/meetings/MEETING_ID/transcript
```

---

## 3. AI Note Taker (Transcript → Gemini → Draft → Notion)

### Upload Transcript
```cmd
curl -X POST http://localhost:3000/transcripts -H "Content-Type: application/json" -d "{\"meetingId\": \"test-meeting-123\", \"text\": \"Alice: Let's discuss Q3 roadmap. We need to launch the new dashboard by end of May.\\nBob: I agree. Also the authentication bug is critical, we should fix it before launch.\\nAlice: Sarah can handle the bug, John can own the dashboard launch.\\nBob: Sounds good. Let's target May 31st for both.\"}"
```

### Fetch Notion Schema
```cmd
curl http://localhost:3000/notion/schema/e8853bb0ad05827ab29f813660b1f47e
```

### Generate Drafts
```cmd
curl -X POST http://localhost:3000/summaries/test-meeting-123 -H "Content-Type: application/json" -d "{\"blockId\": \"e8853bb0ad05827ab29f813660b1f47e\"}"
```

### View Drafts
```cmd
curl http://localhost:3000/summaries/test-meeting-123
```

### Approve a Draft (use draftId from previous response)
```cmd
curl -X POST http://localhost:3000/summaries/test-meeting-123/drafts/DRAFT_ID/approve
```

---

## 4. GitHub → Notion Sync

### Link Notion Task to Branch
```cmd
curl -X POST http://localhost:3000/api/github/demo-project-1/task-branch-sync -H "Content-Type: application/json" -d "{\"repoId\": \"demo-repo-1\", \"taskId\": \"35e53bb0ad058098979bd21afbaee3a3\", \"branchName\": \"feature/demo\", \"targetBranch\": \"main\", \"databaseId\": \"35d53bb0-ad05-805a-a2bd-cf6c350b849a\", \"completionPropertyName\": \"Status\", \"completionPropertyType\": \"status\", \"completionValue\": \"Done\"}"
```

### Simulate PR Opened (syncState → IN_REVIEW)
```cmd
curl -X POST http://localhost:3000/api/github/webhook -H "Content-Type: application/json" -H "x-github-event: pull_request" -d "{\"action\": \"opened\", \"repository\": {\"owner\": {\"login\": \"demo-org\"}, \"name\": \"demo-repo\"}, \"pull_request\": {\"id\": 10, \"number\": 10, \"html_url\": \"https://github.com/demo-org/demo-repo/pull/10\", \"title\": \"Demo PR\", \"head\": {\"ref\": \"feature/demo\"}, \"base\": {\"ref\": \"main\"}, \"user\": {\"login\": \"demo-user\"}, \"created_at\": \"2026-05-13T00:00:00Z\"}}"
```

### Simulate PR Merged (syncState → DONE, Notion updated)
```cmd
curl -X POST http://localhost:3000/api/github/webhook -H "Content-Type: application/json" -H "x-github-event: pull_request" -d "{\"action\": \"closed\", \"repository\": {\"owner\": {\"login\": \"demo-org\"}, \"name\": \"demo-repo\"}, \"pull_request\": {\"id\": 11, \"number\": 11, \"html_url\": \"https://github.com/demo-org/demo-repo/pull/11\", \"title\": \"Demo PR\", \"head\": {\"ref\": \"feature/demo\"}, \"base\": {\"ref\": \"main\"}, \"merged\": true, \"user\": {\"login\": \"demo-user\"}, \"created_at\": \"2026-05-13T00:00:00Z\"}}"
```

---

## One-Time Setup (already done, for reference)

### Seed DB
```cmd
docker exec -i orchestra-db psql -U postgres -d orchestra
```
```sql
INSERT INTO "Project" (id, name, "ownerId") 
VALUES ('demo-project-1', 'Demo Project', 'a6992e70-31c1-412f-8b44-8760416e5f0b');

INSERT INTO "ProjectRepository" (id, "projectId", "githubOwner", "githubRepo", "githubUrl", "webhookSecret")
VALUES ('demo-repo-1', 'demo-project-1', 'demo-org', 'demo-repo', 'https://github.com/demo-org/demo-repo', 'demo-secret');

UPDATE "User" SET "githubToken" = 'fake-token-for-demo' WHERE id = 'a6992e70-31c1-412f-8b44-8760416e5f0b';
```

### Temp Code Changes (revert after demo)
- `github.controller.ts:75` — commented out `verifyWebhookSignature`
- `github.service.ts:184-227` — commented out `verifyWebhookSignature` method
- `github.service.ts:358-360` — commented out `getReviewState` check
