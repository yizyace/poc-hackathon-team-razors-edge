# phinite.ai × GMI Cloud Hackathon — New Repo Kickoff Handoff

Generated: 2026-06-03T23:50:23Z
Purpose: Bootstrap a brand-new repo for the NYTechWeek "AI Agents: From Prototype to Production" hackathon (tonight, 7–11pm ET). Build-focused handoff: project decision, proposed repo structure, copy-paste integration stubs, env/setup, and a 5-person role split. Drop this in the repo root as `HANDOFF.md` (or fold into `README.md`).

> Full research brief (product deep-dives, sources, confidence flags) lives at:
> `/tmp/2026-06-03T23-37-34Z-handoff-phinite-gmicloud-hackathon-research.md`

---

## Summary

Two complementary sponsor layers, both **OpenAI-compatible**:
- **phinite.ai** = agent **orchestration** + channels (Slack/WhatsApp/voice/email/API) + governance (RBAC, audit, guardrails, PII redaction).
- **GMI Cloud** = **inference** — 100+ open models behind one OpenAI-compatible endpoint, cheap NVIDIA GPUs.

**Decision (proposed, change if the team prefers another idea):** build **"AgentDesk"** — a governed multi-channel support copilot with **reasoning-escalation + cost-aware model routing + a live guardrail + a real DB write**. It hits every judging keyword (real APIs/DBs/workflows + guardrails, "beyond the ChatGPT wrapper") and gives the VC judges a margin/unit-economics story.

The integration layer in this repo is **idea-agnostic** — the GMI client + phinite trigger client + Slack handler support any of the 4 candidate ideas (AgentDesk / DocFlow vision-extraction / Pulse autonomous intel / cost Router), so the team can pivot in the first 30 min without rework.

---

## Key Context

- **Event:** "AI Agents: From Prototype to Production" (#NYTechWeek), Wed Jun 3 2026, 7–11pm ET, 149 W 24th St #6, NYC. Prize = top 3 pitch to a VC. Build window ≈ 2–3 hrs after sponsor walkthroughs. Reg: https://luma.com/9k388o8l
- **Integration mechanic:** a phinite agent calls models via GMI's OpenAI-compatible endpoint (one `base_url` swap), or a phinite "custom hook to any backend" calls this repo's service for specialized inference (vision/video/audio).
- **Known gotchas (baked into stubs below):**
  - Use GMI base URL `https://api.gmi-serving.com/v1` (docs also show `api.gmicloud.ai/v1` — that's the inconsistent one; fall back only if the primary 4xx/DNS-fails).
  - phinite **API triggers may require the $20 Builder tier** (Free tier might be UI/channel-only) — confirm in-app / ask organizers at kickoff.
  - phinite app is **desktop-only (≥1080px)**; build the agent there, call it over REST from this repo.
  - GMI default rate limit = **100k TPM (Tier 1)** — fine for a demo; ask organizers for a tier bump/credits.

---

## Proposed Repo Structure

```
phinite-gmi-agentdesk/
├── README.md                  # quickstart + demo script
├── HANDOFF.md                 # this file
├── .env.example               # all required secrets/IDs (never commit real .env)
├── .gitignore                 # ignore .env, __pycache__, .venv
├── requirements.txt
├── app/
│   ├── main.py                # FastAPI: /demo (and /slack/events) entrypoints
│   ├── gmi_client.py          # GMI inference + cost-aware router
│   ├── phinite_client.py      # phinite trigger caller (sync + poll)
│   ├── guardrail.py           # simple pre/post-response guardrail check
│   ├── store.py               # ticket/record persistence (Supabase/Airtable/SQLite)
│   └── prompts.py             # system prompts per agent tier
├── web/                       # R4 demo surface (static page or simple React)
│   └── index.html             # live trace + "$ saved" panel
└── scripts/
    └── smoke_test.py          # verifies GMI + phinite creds before the clock starts
```

---

## Evidence (copy-paste stubs)

### `.env.example`
```bash
# --- GMI Cloud (console.gmicloud.ai -> Settings -> API Keys) ---
GMI_API_KEY=
GMI_BASE_URL=https://api.gmi-serving.com/v1
GMI_MODEL_FAST=meta-llama/Llama-3.3-70B-Instruct
GMI_MODEL_REASON=deepseek-ai/DeepSeek-R1
GMI_MODEL_VISION=Qwen3-VL          # only if doing DocFlow/vision

# --- phinite (app.phinite.ai -> build agent -> add API Trigger) ---
PHINITE_WORKSPACE_ID=
PHINITE_TRIGGER_ID=
PHINITE_ENV=PROD                   # DEV | UAT | PROD
PHINITE_WORKSPACE_API_KEY=

# --- Channel / store (pick what you use) ---
SLACK_BOT_TOKEN=
SLACK_SIGNING_SECRET=
SUPABASE_URL=
SUPABASE_KEY=
```

### `requirements.txt`
```
openai>=1.0
fastapi
uvicorn
requests
python-dotenv
# slack_sdk            # if using Slack
# supabase             # if using Supabase as the DB
```

### `app/gmi_client.py` — inference + cost-aware router
```python
import os
from openai import OpenAI

_client = OpenAI(
    base_url=os.environ.get("GMI_BASE_URL", "https://api.gmi-serving.com/v1"),
    api_key=os.environ["GMI_API_KEY"],
)

FAST = os.environ.get("GMI_MODEL_FAST", "meta-llama/Llama-3.3-70B-Instruct")
REASON = os.environ.get("GMI_MODEL_REASON", "deepseek-ai/DeepSeek-R1")

def chat(messages, model=FAST, **kw):
    r = _client.chat.completions.create(model=model, messages=messages, **kw)
    return r.choices[0].message.content

def route(user_msg, history=None):
    """Cost-aware router: cheap model unless the turn looks 'hard'."""
    history = history or []
    hard = any(k in user_msg.lower() for k in
               ("refund", "legal", "cancel", "why", "calculate", "compare", "policy"))
    model = REASON if hard else FAST
    msgs = history + [{"role": "user", "content": user_msg}]
    answer = chat(msgs, model=model, max_tokens=600, temperature=0.4)
    return {"answer": answer, "model": model, "tier": "reason" if hard else "fast"}

def list_models():
    return [m.id for m in _client.models.list().data]   # confirm live IDs at runtime
```

### `app/phinite_client.py` — trigger caller (sync + poll)
```python
import os, time, requests

BASE = "https://app.phinite.ai/api/v1/ai/trigger"
WS = os.environ["PHINITE_WORKSPACE_ID"]
TRIG = os.environ["PHINITE_TRIGGER_ID"]
ENV = os.environ.get("PHINITE_ENV", "PROD")
HEADERS = {
    "Authorization": f"Bearer {os.environ['PHINITE_WORKSPACE_API_KEY']}",
    "Content-Type": "application/json",
}

def run_sync(message, user_variables=None):
    url = f"{BASE}/{WS}/{TRIG}/{ENV}"
    body = {"message": message, "user_variables": user_variables or {}}
    return requests.post(url, headers=HEADERS, json=body, timeout=150).json()

def run_async(message, user_variables=None, poll_s=3, timeout_s=300):
    start_url = f"{BASE}/start/{WS}/{TRIG}/{ENV}"
    wf = requests.post(start_url, headers=HEADERS,
                       json={"message": message, "user_variables": user_variables or {}},
                       timeout=30).json()
    wid = wf["workflow_id"]
    # NOTE: docs disagree on the status host — try app.phinite.ai first, then ai-core.phinite.ai
    status_url = f"{BASE}/status/{WS}/{wid}"
    deadline = time.time() + timeout_s
    while time.time() < deadline:
        s = requests.get(status_url, headers=HEADERS, timeout=30).json()
        if s.get("status") in ("completed", "failed"):
            return s
        time.sleep(poll_s)
    raise TimeoutError("phinite workflow did not complete in time")
```

### `app/guardrail.py` — minimal pre/post check (the "live guardrail" demo)
```python
BLOCKLIST = ("guaranteed refund", "i promise", "100% safe", "share your password")

def check_outbound(text):
    hit = next((p for p in BLOCKLIST if p in text.lower()), None)
    if hit:
        return False, f"Blocked: policy phrase '{hit}'. Escalating to a human."
    return True, text
```

### `scripts/smoke_test.py` — run this FIRST (before the build clock)
```python
from dotenv import load_dotenv; load_dotenv()
from app.gmi_client import chat, list_models
from app.phinite_client import run_sync

print("GMI models (sample):", list_models()[:5])
print("GMI says:", chat([{"role": "user", "content": "Reply with the single word: ready"}]))
# Uncomment once the phinite agent + API trigger exist:
# print("phinite:", run_sync("ping", {"source": "smoke_test"}))
```

### Setup commands
```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env       # fill in GMI + phinite creds
python -m scripts.smoke_test
uvicorn app.main:app --reload --port 8000
```

---

## 5-Person Role Split

| Role | Owner | Deliverable | Files |
|---|---|---|---|
| R1 Agent Architect | | phinite agent graph (triage→answer→escalate), Slack/WhatsApp channel, API Trigger; provide `PHINITE_*` IDs | (phinite app) + consumes `phinite_client.py` |
| R2 Inference Eng | | GMI key, model selection, cost-aware router, prompts | `gmi_client.py`, `prompts.py` |
| R3 Backend/Integration | | real DB/Sheet write + one "tool" (CRM lookup), guardrail wiring | `store.py`, `guardrail.py` |
| R4 Demo/Frontend | | live trace + "$ saved vs all-frontier" panel; the screen judges watch | `web/index.html`, `app/main.py` |
| R5 PM/Pitch + QA | | VC narrative + slides, seed data, demo script, final integration & smoke test | `README.md`, `scripts/smoke_test.py` |

### Build timeline (≈3 hrs)
- **0:00–0:30** — Hour-0 checklist: both API keys live, `smoke_test.py` green, idea locked, roles assigned.
- **0:30–1:45** — Parallel build: R1 agent graph, R2 router+prompts, R3 DB+guardrail, R4 demo shell.
- **1:45–2:30** — Integrate: phinite trigger ↔ this service ↔ GMI ↔ DB; one happy path end-to-end.
- **2:30–3:00** — Polish the demo moment, seed data, rehearse the 2-min VC pitch.

---

## Open Questions

- Final idea: AgentDesk (recommended) vs DocFlow / Pulse / Router — confirm with the team in the first 15 min.
- Is phinite's REST trigger on the Free tier or gated to Builder ($20)? — verify in-app at kickoff.
- DB choice for R3: Supabase vs Airtable vs SQLite (fastest is SQLite/Airtable for a demo).
- Channel: Slack (fastest) vs WhatsApp (more impressive, more setup) vs plain web UI.
- Are on-site GMI credits / phinite codes provided? — ask organizers.

---

## Next Steps

1. `git init` the new repo with the structure above; commit this file as `HANDOFF.md` and an empty `.env.example`.
2. Run the Hour-0 checklist (research brief §"Hour-0 setup checklist") — get `smoke_test.py` green before the build clock.
3. Lock the idea + assign the 5 roles from the table.
4. Build the idea-agnostic integration layer first (`gmi_client`, `phinite_client`, `guardrail`), then the idea-specific pieces.
5. (Optional) Ask me to scaffold these files as actual code in the repo once it exists — I can fan out ~5 worker beads to write them in parallel.

---

## Provenance

- Derived from the 5-agent research swarm (private Beads project `hack_research`, epic `hack_research-ut5` + children `ut5.1`–`ut5.5`, all closed).
- Companion research brief: `/tmp/2026-06-03T23-37-34Z-handoff-phinite-gmicloud-hackathon-research.md`.
- All code stubs are starting points (not yet run end-to-end); model IDs and the phinite status host are verify-at-runtime per the gotchas above.
