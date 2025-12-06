# TODO: Future Enhancements

## 💾 Persistent Storage & Trace Improvements

**Status:** Not Implemented
**Priority:** High
**Complexity:** Medium
**Estimated Effort:** 1-2 days

### Current Limitations

**Chat Storage:**
- Chats stored in-memory only (`ChatStorage` class)
- Lost on server restart
- Max 10 chats limit (oldest auto-deleted)
- No multi-user support

**Trace Storage:**
- Function calls cached in-memory with messages
- No timing/duration data (shown as 0ms)
- Lost on server restart
- Limited to current session

### Proposed Solution

**1. Database Integration**

Add SQLite (simple) or PostgreSQL (production-grade):

```python
# models.py
class Chat(Base):
    id = Column(String, primary_key=True)
    user_id = Column(String, index=True)
    title = Column(String)
    agent_id = Column(String)
    created_at = Column(DateTime)
    messages = relationship("Message")

class Message(Base):
    id = Column(String, primary_key=True)
    chat_id = Column(String, ForeignKey("chats.id"))
    role = Column(String)
    content = Column(Text)
    trace_id = Column(String, nullable=True)
    trace_summary = Column(JSON, nullable=True)  # Store as JSON blob
    created_at = Column(DateTime)
```

**2. Enhanced Trace Storage Options**

**Option A: Database-only (simple)**
- Store `trace_summary` JSON in database
- Keep current cache-only approach
- Pros: Simple, no MLflow dependency
- Cons: No timing data, no cross-session traces

**Option B: MLflow Integration (comprehensive)**
- Fetch traces from Databricks MLflow on-demand
- Cache in database for offline access
- Pros: Full trace data (durations, tokens, spans)
- Cons: Requires Databricks MLflow access, network calls

**Option C: Hybrid (recommended)**
- Primary: Cache trace data in database
- Fallback: Fetch from MLflow if available
- Best of both worlds

**3. Implementation Checklist**

```python
# Phase 1: Database setup
- [ ] Choose database (SQLite for dev, PostgreSQL for prod)
- [ ] Create SQLAlchemy models
- [ ] Add Alembic for migrations
- [ ] Implement database session management

# Phase 2: Chat persistence
- [ ] Replace ChatStorage with database queries
- [ ] Add user authentication/sessions
- [ ] Remove 10-chat limit
- [ ] Add pagination for chat history

# Phase 3: Trace persistence
- [ ] Store trace_summary in database
- [ ] Add optional MLflow fetching
- [ ] Cache MLflow traces for offline access
- [ ] Add trace cleanup (TTL or manual deletion)

# Phase 4: API updates
- [ ] GET /api/chats?user_id=X (paginated)
- [ ] DELETE /api/chats/{chat_id}
- [ ] GET /api/traces/{trace_id} (fetch from MLflow or cache)
- [ ] POST /api/traces/{trace_id}/refresh (re-fetch from MLflow)
```

**4. Migration Path**

```python
# Backward compatible: Support both in-memory and DB
class ChatRepository:
    def __init__(self, use_database: bool = True):
        self.backend = DatabaseBackend() if use_database else InMemoryBackend()

    def get_chat(self, chat_id: str) -> Chat:
        return self.backend.get(chat_id)
```

### Benefits

- ✅ Chat history persists across server restarts
- ✅ Support multiple users with authentication
- ✅ No arbitrary chat limits
- ✅ Trace data persisted and optionally enriched from MLflow
- ✅ Can add advanced features: search, export, analytics

### Files to Modify

- `server/chat_storage.py` → `server/repositories/chat_repository.py`
- `server/routers/chat.py` - Add user filtering, pagination
- `server/routers/agent.py` - Save to DB instead of in-memory
- Add: `server/db/` - Database models and session management
- Add: `alembic/` - Database migrations

---

## 🚀 Background Response Processing (Option 1)

**Status:** Not Implemented
**Priority:** Medium
**Complexity:** High
**Estimated Effort:** 2-3 days

### Problem Statement

Currently, when a user switches away from a chat mid-response, the streaming connection is aborted and the response processing stops. The user cannot return later to see the completed response. This differs from services like Claude.ai and ChatGPT where responses continue processing in the background.

### Current Behavior (Option 3 - Implemented)

**What happens now:**
1. User asks question in Chat A → response starts streaming
2. User tries to switch to Chat B during response
3. UI shows alert: "Please wait for the current response to complete before switching chats"
4. User must wait for response to finish before switching
5. Messages are saved to backend after response completes

**Pros:**
- ✅ Simple implementation
- ✅ No data loss
- ✅ Clear user expectations
- ✅ Works reliably with concurrent users

**Cons:**
- ❌ User cannot switch chats during response
- ❌ User cannot start new chat while waiting for response
- ❌ Less flexible UX compared to Claude.ai/ChatGPT

### Desired Behavior (Option 1 - To Implement)

**What should happen:**
1. User asks question in Chat A → response starts streaming
2. User switches to Chat B mid-response
3. Chat A response CONTINUES processing server-side (invisible to user)
4. User can interact with Chat B or start new chats
5. User returns to Chat A later → sees FULL completed response (not partial, not interrupted)

**User Experience:**
```
Timeline:
00:00 - Chat A: User asks "Explain quantum computing in detail"
00:01 - Response starts: "Quantum computing is..."
00:05 - User switches to Chat B (response 20% complete)
00:06 - User asks new question in Chat B
00:10 - Chat A response finishes in background (100% complete)
00:15 - User switches back to Chat A
00:15 - User sees FULL response about quantum computing
```

### Technical Requirements

To implement Option 1, the following architectural changes are needed:

#### 1. Backend Task Queue

**Current:** HTTP request → Databricks stream → Frontend (coupled)
**Needed:** HTTP request → Task queue → Background worker → Storage → Frontend polling

```python
# Example architecture

# 1. Request endpoint creates background task
@router.post('/invoke_endpoint')
async def invoke_endpoint(options: InvokeEndpointRequest):
    # Create unique request ID
    request_id = str(uuid.uuid4())

    # Queue the task (Celery, Redis, or similar)
    task_id = agent_task_queue.enqueue(
        process_agent_request,
        agent_id=options.agent_id,
        messages=options.messages,
        request_id=request_id
    )

    # Return immediately with task ID
    return {
        'request_id': request_id,
        'status': 'processing'
    }

# 2. Background worker processes stream
async def process_agent_request(agent_id, messages, request_id):
    """Runs in background worker thread/process."""
    handler = get_handler_for_agent(agent_id)

    # Stream response and accumulate
    full_response = ""
    async for chunk in handler.invoke_stream(messages):
        full_response += parse_chunk(chunk)

        # Store partial response (optional, for progress)
        await storage.update_request_status(
            request_id,
            status='streaming',
            partial_content=full_response
        )

    # Store complete response
    await storage.update_request_status(
        request_id,
        status='completed',
        content=full_response,
        trace_id=trace_id
    )
```

#### 2. Request Status Tracking

**Needed:** State machine for request lifecycle

```python
class RequestStatus(Enum):
    QUEUED = 'queued'
    STREAMING = 'streaming'
    COMPLETED = 'completed'
    FAILED = 'failed'
    CANCELLED = 'cancelled'

class AgentRequest(BaseModel):
    id: str
    chat_id: str
    user_message: str
    status: RequestStatus
    partial_response: Optional[str]
    final_response: Optional[str]
    trace_id: Optional[str]
    created_at: datetime
    completed_at: Optional[datetime]
```

#### 3. Frontend Polling/WebSocket

**Current:** Single fetch() with streaming reader
**Needed:** Polling or WebSocket to check request status

```typescript
// Option A: Polling
async function sendMessageWithBackgroundProcessing(message: string) {
    // Start request
    const { request_id } = await fetch('/api/invoke_endpoint', {
        method: 'POST',
        body: JSON.stringify({ messages, agent_id })
    }).then(r => r.json());

    // Poll for completion
    const pollInterval = setInterval(async () => {
        const status = await fetch(`/api/requests/${request_id}/status`)
            .then(r => r.json());

        if (status.status === 'completed') {
            clearInterval(pollInterval);
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: status.final_response,
                traceId: status.trace_id
            }]);
        } else if (status.status === 'streaming') {
            // Optionally show partial response
            updatePartialResponse(status.partial_content);
        }
    }, 1000); // Poll every second
}

// Option B: WebSocket (more efficient)
const ws = new WebSocket(`wss://.../requests/${request_id}/stream`);
ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.status === 'completed') {
        // Handle completion
    }
};
```

#### 4. Partial Response Storage

**Needed:** Persistent storage for in-progress requests

Options:
- Redis (fast, ephemeral)
- PostgreSQL (persistent)
- SQLite (simple, file-based)

```python
# Redis example
import redis

class RequestStorage:
    def __init__(self):
        self.redis = redis.Redis()

    async def update_request_status(self, request_id, **fields):
        key = f'request:{request_id}'
        self.redis.hmset(key, fields)
        self.redis.expire(key, 3600)  # Expire after 1 hour
```

#### 5. Connection Management

**Needed:** Handle disconnected streams gracefully

```python
# Keep stream alive even if frontend disconnects
async def process_agent_request(request_id, ...):
    try:
        # Process stream regardless of frontend connection
        async for chunk in handler.invoke_stream(messages):
            # Save to storage, not directly to frontend
            await storage.append_chunk(request_id, chunk)
    except Exception as e:
        await storage.mark_failed(request_id, error=str(e))
```

### Implementation Plan

**Phase 1: Infrastructure Setup (Day 1)**
1. Choose task queue (Celery + Redis or simple in-memory queue)
2. Set up request status storage (Redis or SQLite)
3. Create request status API endpoints
4. Implement background worker process

**Phase 2: Backend Changes (Day 2)**
1. Modify `/invoke_endpoint` to create background tasks
2. Implement background task processor
3. Add request status update logic
4. Test background processing isolation

**Phase 3: Frontend Changes (Day 2-3)**
1. Implement polling or WebSocket client
2. Update UI to show request status
3. Handle reconnection to in-progress requests
4. Add "response in progress" indicators
5. Test chat switching during responses

**Phase 4: Testing & Polish (Day 3)**
1. Test concurrent users with background processing
2. Test edge cases (server restart, network errors)
3. Add request cleanup (TTL, garbage collection)
4. Performance testing with multiple background tasks

### Risks & Considerations

**Memory Usage:**
- Background tasks consume server memory
- Need max concurrent tasks limit
- Implement task cleanup for old requests

**State Management:**
- What happens if server restarts mid-processing?
- Need persistent storage for critical state
- Consider request replay/recovery mechanisms

**Error Handling:**
- How to notify user if background task fails?
- Show errors when user returns to chat
- Implement retry logic for transient failures

**Performance:**
- Polling creates additional API load
- WebSocket more efficient but more complex
- Need request rate limiting

### Alternative: Simplified Background Processing

If full task queue is too complex, consider a simpler approach:

```python
# Option 1.5: In-memory background tasks (no external queue)
import asyncio

background_tasks = {}  # request_id -> asyncio.Task

@router.post('/invoke_endpoint')
async def invoke_endpoint(options: InvokeEndpointRequest):
    request_id = str(uuid.uuid4())

    # Start background task
    task = asyncio.create_task(
        process_in_background(request_id, options)
    )
    background_tasks[request_id] = task

    return {'request_id': request_id, 'status': 'processing'}

async def process_in_background(request_id, options):
    # Process and store result
    result = await process_agent_request(options)
    await storage.save_result(request_id, result)

    # Cleanup
    del background_tasks[request_id]
```

**Pros:** Simpler, no external dependencies
**Cons:** Lost on server restart, no distributed processing

### Decision Criteria

Implement Option 1 when:
- ✅ Multiple users frequently switch chats during responses
- ✅ Response times are consistently > 10 seconds
- ✅ User feedback indicates frustration with current UX
- ✅ Team has capacity for 2-3 days of development + testing
- ✅ Infrastructure can support background task processing

Stick with Option 3 when:
- ✅ Users typically wait for responses (< 10 seconds)
- ✅ Chat switching during responses is rare
- ✅ Current UX is acceptable to users
- ✅ Team wants to minimize complexity and maintenance burden
- ✅ Single-instance deployment (no distributed processing needed)

### Related Files

- `client/components/chat/ChatView.tsx` - Current streaming implementation
- `client/app/page.tsx` - Chat switching logic
- `server/routers/agent.py` - Agent invocation endpoint
- `server/agents/handlers/` - Handler implementations

### References

- [Celery Documentation](https://docs.celeryproject.org/)
- [Redis Quick Start](https://redis.io/docs/getting-started/)
- [FastAPI Background Tasks](https://fastapi.tiangolo.com/tutorial/background-tasks/)
- [WebSocket with FastAPI](https://fastapi.tiangolo.com/advanced/websockets/)
