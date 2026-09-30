# Permission-Aware Multi-Tenant RAG System

An enterprise-grade, secure, multi-tenant Retrieval-Augmented Generation (RAG) system built with **FastAPI**, **Sentence-Transformers**, **Qdrant**, and a modern **React (Vite) + Tailwind CSS** frontend.

---

## 🏗️ Architecture Overview

```
                                  +------------------------------------+
                                  |    POST /api/upload                |
                                  |    - PDF / TXT Parsing (PyPDF)     |
                                  |    - Recursive Splitter (500/50)   |
                                  |    - SentenceTransformers (384-d)  |
                                  +-----------------+------------------+
                                                    |
                                                    v
                                    +--------------------------------+
                                    |     Qdrant Vector Database     |
                                    |  (tenant_id & allowed_roles)   |
                                    +---------------+----------------+
                                                    ^
                                                    |
+--------------------------+        +---------------+----------------+
|  User Query Request      | ---->  | Strict Pre-LLM Security Filter |
|  - tenant_id             |        | - Match tenant_id              |
|  - user_roles            |        | - MatchAny(user_roles)         |
+--------------------------+        +---------------+----------------+
                                                    |
                       +----------------------------+----------------------------+
                       | Chunks Found (GRANTED)                                  | 0 Chunks (DENIED)
                       v                                                         v
        +-------------------------------+                         +-------------------------------+
        | Context Augmentation Engine   |                         | Bypass LLM Call               |
        | - OpenAI / Gemini or Local    |                         | Return No-Access Message      |
        +---------------+---------------+                         +---------------+---------------+
                        |                                                         |
                        +----------------------------+----------------------------+
                                                     |
                                                     v
                                       +----------------------------+
                                       | Audit Logger (app/audit.py)|
                                       | - Logs all events to JSONL |
                                       | - GET /api/audit-logs      |
                                       +----------------------------+
```

---

## 🌟 Implemented Features

### Step 1: Ingestion & RBAC Metadata
- **FastAPI with CORS enabled**: Async web service with lifecycle pre-loading.
- **Qdrant Vector Storage**: Connected to `localhost:6333` with collection `enterprise_tenant_chunks` (384-dimensional cosine metric) and payload indexing.
- **Local Embeddings**: `sentence-transformers` using model `all-MiniLM-L6-v2`.
- **Document Ingestion**: Parser supporting PDF (via PyPDF) and plain text (.txt) with `RecursiveCharacterTextSplitter`.
- **POST /api/upload**: Ingests files with `tenant_id` and `allowed_roles` payload metadata.

### Step 2: Pre-LLM Security Filtering, Generation & Audit Trail
- **Strict Pre-LLM Security Filtering (`app/retrieval.py`)**:
  - Vector search pre-filters strictly enforce:
    1. `tenant_id == requester.tenant_id`
    2. `allowed_roles` matches any of `requester.user_roles` (`MatchAny`).
  - If no chunks match, returns an empty list immediately without calling the LLM.
- **Context Augmentation & Generation (`app/generation.py`)**:
  - If chunks are empty: Returns `"No accessible information found matching your permission level and tenant."`
  - If chunks exist: Synthesizes answer using retrieved context.
  - Supports OpenAI (`OPENAI_API_KEY`) and Google Gemini (`GEMINI_API_KEY`), with an automatic local smart answer synthesizer that works out-of-the-box.
- **Comprehensive Audit Logging (`app/audit.py`)**:
  - Records every query event with UUID, UTC timestamp, `user_id`, `tenant_id`, `user_roles`, `query`, `retrieved_chunks_count`, `retrieved_documents`, and `access_status` (`GRANTED` or `DENIED / NO ACCESS`).
  - Persisted in memory and in `audit_logs.jsonl`.
- **POST /api/query**: End-to-end secure RAG query endpoint.
- **GET /api/audit-logs**: Endpoint with optional `tenant_id` and `limit` query parameters.

### Step 3: Enterprise Frontend Web Application (`frontend/`)
- **React (Vite) + Tailwind CSS + Lucide React**: Sleek slate-950 dark mode with smooth animations and responsive design.
- **Global Context Bar & Top Navbar**:
  - Active Tenant Switcher (`company_a`, `company_b`, or custom tenant input).
  - Active Role Toggles (`admin`, `hr`, `employee`).
  - Editable User ID display.
  - Live backend & Qdrant health indicator pill.
- **Tab 1: Ask RAG (Query)**:
  - Clean chat interface with suggestion chips.
  - Expandable Pre-LLM Security Badges on every response (`ACCESS GRANTED` in green or `ACCESS DENIED` in rose).
  - Provenance details showing retrieved document names and corresponding Audit Log ID.
- **Tab 2: Document Upload (Ingestion)**:
  - Drag-and-drop zone for `.pdf` and `.txt` files.
  - Target Tenant ID and Allowed Roles multi-selection checkboxes.
  - Demo document buttons ("Demo Admin Doc" & "Demo Staff Doc") for instant testing.
  - Ingestion success summary card showing chunk count and metadata.
- **Tab 3: Security Audit Logs**:
  - Real-time audit trail table fetching from `GET /api/audit-logs`.
  - Columns: Status, Timestamp, User, Tenant, Roles, Query, Accessed Documents, and Audit ID.
  - Tenant filter dropdown, full-text search bar, and configurable auto-refresh (4s).
- **Toast Notification System**: Instant feedback for upload completions, permission denials, and errors.

---

## 📁 Project Structure

```
d:/My Projects/RAG Systam/
├── app/
│   ├── __init__.py           # Application package marker
│   ├── config.py             # Settings (Pydantic BaseSettings, env vars)
│   ├── database.py           # Qdrant client connection & collection setup
│   ├── embeddings.py         # SentenceTransformers ("all-MiniLM-L6-v2") wrapper
│   ├── ingestion.py          # PDF (PyPDF) & TXT parser + text chunker
│   ├── retrieval.py          # Pre-LLM security-filtered vector search (Step 2)
│   ├── generation.py         # Context augmentation & secure answer synthesis (Step 2)
│   ├── audit.py              # Audit logging system & JSONL storage (Step 2)
│   ├── models.py             # Pydantic schemas (Request, Response, Audit, Payloads)
│   ├── api/
│   │   ├── __init__.py       # API package marker
│   │   └── routes.py         # /upload, /query, and /audit-logs routes
│   └── main.py               # FastAPI app, CORS, lifespan startup hooks
├── frontend/                 # [Step 3] React + Tailwind CSS Web Application
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx    # Top navigation & global context switchers
│   │   │   ├── ChatTab.jsx   # Query chat with expandable security badges
│   │   │   ├── UploadTab.jsx # Document drag & drop + RBAC ingestion
│   │   │   ├── AuditLogsTab.jsx # Real-time audit log viewer & filter
│   │   │   └── Toast.jsx     # Global toast notification container
│   │   ├── context/
│   │   │   └── AuthContext.jsx # Global tenant, user, role & health state
│   │   ├── services/
│   │   │   └── api.js        # API service connecting to FastAPI backend
│   │   ├── App.jsx           # Tab layout and dashboard root
│   │   ├── main.jsx          # React DOM entry
│   │   └── index.css         # Tailwind base & custom scrollbar styles
│   ├── package.json          # Frontend dependencies
│   ├── vite.config.js        # Vite config
│   ├── tailwind.config.js    # Tailwind configuration
│   └── index.html            # HTML template with Inter typography
├── docker-compose.yml        # Qdrant vector database container
├── test_client.py            # Step 1 upload test script
├── test_permission_flow.py   # Step 2 complete permission & audit test suite
├── requirements.txt          # Python dependencies
├── .env.example              # Backend environment variables template
└── README.md                 # Documentation
```

---

## 🚀 Running the Full Stack

### 1. Start Qdrant Vector Database

```powershell
docker compose up -d
```
*(Qdrant dashboard is accessible at [http://localhost:6333/dashboard](http://localhost:6333/dashboard))*

---

### 2. Start FastAPI Backend

```powershell
# In the project root directory
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt

# Start FastAPI on port 8000
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
Interactive API documentation:
- **Swagger Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Health Check**: [http://localhost:8000/health](http://localhost:8000/health)

---

### 3. Start Frontend Web Application

Open a second terminal window:

```powershell
cd frontend
npm install
npm run dev
```

Open your browser to:
👉 **[http://localhost:5173](http://localhost:5173)**

---

## 🧪 Testing the Complete Permission Flow in the UI

1. **Ingest Test Documents** (Tab 2 - Document Upload):
   - Switch active tenant in navbar to `company_a`.
   - Click **Demo Admin Doc** &rarr; allowed role `["admin"]` &rarr; click **Ingest Document into Qdrant**.
   - Click **Demo Staff Doc** &rarr; allowed roles `["admin", "hr", "employee"]` &rarr; click **Ingest Document into Qdrant**.

2. **Test Authorized Access** (Tab 1 - Ask RAG):
   - Ensure navbar role toggle is set to `ADMIN`.
   - Ask: *"What is the executive compensation and Q4 expansion strategy?"*
   - Result: Badge displays `ACCESS GRANTED (1 doc)`, source shows `executive_financials_2026.txt`, and financial guidance is answered.

3. **Test Role Denial (Pre-LLM Security Filter)**:
   - In navbar, click `ADMIN` to disable it and toggle on `EMPLOYEE`.
   - Ask the exact same question: *"What is the executive compensation and Q4 expansion strategy?"*
   - Result: Badge turns rose showing `ACCESS DENIED / BLOCKED BY PRE-LLM FILTER`, answer says *"No accessible information found matching your permission level and tenant."*, and no LLM call is made.

4. **Test Cross-Tenant Isolation**:
   - In navbar, switch Tenant to `company_b`.
   - Toggle role back to `ADMIN`.
   - Ask about `company_a` plans.
   - Result: `ACCESS DENIED` & zero chunks leaked across tenant boundaries.

5. **Verify Security Audit Trail** (Tab 3 - Security Audit Logs):
   - Navigate to **Security Audit Logs**.
   - Review the real-time table showing all queries, user IDs, active roles, timestamps, and GRANTED/DENIED statuses.
