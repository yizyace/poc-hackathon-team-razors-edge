# Phinite × GMI: VisionOps Build Night Walkthrough

> **Tonight's event:** Phinite × GMI "AI Agents: From Prototype to Production" — June 3
> Top three teams pitch to a VC at the end. Phinite and GMI are the judging criteria — they need to be running, not bolted on.

---

## The Real Situation

This is a one-evening, in-person sprint. You'll have access to both platforms on-site.

- **Phinite** = the orchestration layer: topology, audit trail, governance, routing logic — all visible on the canvas in real time
- **GMI Cloud** = the inference engine: the vision model that reads the damaged box photo, running on H100 GPUs, billed per call, zero cost when idle

**The line that lands:** *"Phinite coordinates the agents. GMI does the seeing. Neither was running when you walked in tonight."*

---

## Pre-Event: Do These Before You Walk In

**1. Create your Phinite account**
Go to `app.phinite.ai/sign-up` — use your personal email, not a school email. A laptop with at least 1080px screen width is required. Click **Get Started for Free**.

**2. Create your GMI Cloud account + API key**
Go to `console.gmicloud.ai` → sign up → **Settings → API Keys → Create API Key**. Name it `visionops-demo`. Scope: `ie_model`. Copy the key immediately — you won't see it again.

**3. Have these ready in a text file before you start:**

```
GMI_API_KEY = <your key>
GMI_BASE_URL = https://api.gmi-serving.com/v1
GMI_MODEL = nvidia/NVIDIA-Nemotron-3-Nano-Omni
SLACK_WEBHOOK_URL = <your Slack webhook>
SEVERITY_THRESHOLD = 7
```

---

## Platform Reference

### Phinite (The Orchestration Layer)

- **Graph Studio** — visual drag-and-drop canvas to wire Vision Inspector → Audit Core → Dispute Coordinator as a connected node graph
- **Phinite Aura** — AI copilot that generates agents, prompts, tools, and code from plain-language descriptions
- **Audit trails** — tracks every interaction and escalation with full transparency (your left-panel in the demo triptych)
- **Live monitoring with built-in guardrails** — keeps agents compliant and under control
- **Developer Studio** — custom hooks to any backend, 600+ pre-built tools, full version control

Free plan: 1K agent sessions, 1 user, builder features, $5 included credits — enough for tonight.

### GMI Cloud (The Vision AI Layer)

GMI Cloud's inference engine runs on H100/H200 GPUs with an OpenAI-compatible API. 45+ LLMs, 50+ video models, 25+ image models, 15+ audio models.

**Best model for VisionOps:** `nvidia/NVIDIA-Nemotron-3-Nano-Omni` (Nemotron 3 Nano Omni, launched April 28). 30B-parameter open multimodal model, 256k context, processes text + images in a single reasoning loop. GMI has a published damage-detection demo using this exact model.

```bash
curl https://api.gmi-serving.com/v1/chat/completions \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer $GMI_API_KEY' \
  --data '{
    "model": "nvidia/NVIDIA-Nemotron-3-Nano-Omni",
    "messages": [
      {"role": "system", "content": "You are a warehouse damage assessment system..."},
      {"role": "user", "content": [{"type": "image_url", "image_url": {"url": "data:image/jpeg;base64,..."}}]}
    ],
    "temperature": 0,
    "max_completion_tokens": 500,
    "response_format": {"type": "json_object"}
  }'
```

After your live run, `console.gmicloud.ai` shows latency, token usage, and cost — that's your "11 seconds, $0.03, and nothing was running when you walked in" slide.

---

## Build Strategy

**Recommended approach for a 2-hour sprint:**

- **Option A (No-Code, Fastest — use this):** Use Phinite Graph Studio + Aura to describe the three agents in plain language. Aura generates the workflow. Point each LLM node at GMI Cloud. This is the 30-minute path and produces the visual judges remember.
- **Option B (Code-First, More Control):** Build the Python pipeline, use Phinite's API triggers to call it externally, feed results back into Phinite's audit trail via webhook.

Keep your Python fallback files regardless — if Phinite has any hiccup during the demo, `python main.py --use-fallback all` and the story still holds.

---

## Inside Phinite: Step-by-Step

---

### PHASE 1 — Account Setup (2 min)

**Step 1.** Log into `app.phinite.ai`. You land on the dashboard. Note the **Workspace** name at the top left.

**Step 2.** Find **Settings → Secrets / API Keys / Environment Variables** in the sidebar. Add:
- `GMI_API_KEY` → your GMI key
- `SLACK_WEBHOOK_URL` → your Slack webhook URL

If you can't find this in 3 minutes, paste keys directly into nodes and refactor later.

---

### PHASE 2 — Use Phinite Aura to Scaffold the Workflow (5 min)

**Step 3.** In the left sidebar, find **Graph Studio** or **Flow Studio**. Click **New Flow** or **Create Agent**.

**Step 4.** Find the **Aura** button or copilot icon. Click it and paste this prompt:

```
Build a 3-agent sequential pipeline called VisionOps:

Agent 1 — Vision Inspector: Takes an image as input. Sends it to a 
vision LLM (GMI Cloud, model: nvidia/NVIDIA-Nemotron-3-Nano-Omni). 
Returns a JSON with: tracking_number, damage_severity (1-10), 
damage_description, label_readable (bool), confidence (float).

Agent 2 — Audit Core: Takes the tracking_number from Agent 1. 
Performs a lookup against a data source. Returns: match_found (bool), 
vendor_name, po_number, sla_terms, and passes through damage_severity.

Agent 3 — Dispute Coordinator: Takes output from Agent 2. 
If match_found is false, escalates to manual review and sends a 
Slack webhook alert. If damage_severity >= 7 and match_found is true, 
files a dispute and sends a Slack alert. If damage_severity < 7 and 
match_found is true, files dispute silently with no Slack alert. 
Logs all decisions to an audit trail.

Connect all three agents sequentially with the output of each 
feeding into the input of the next.
```

**Step 5.** Let Aura generate the topology. Three nodes should appear connected by arrows. If incomplete, scaffold manually and fill in details in the next phase.

---

### PHASE 3 — Configure Agent 1: Vision Inspector (8 min)

**Step 6.** Click the **Vision Inspector** node. Configuration panel opens on the right.

**Step 7.** Set node type to **LLM**. Find **Model Provider / LLM Configuration**. Select **Custom / OpenAI-Compatible** and fill in:

| Field | Value |
|---|---|
| Base URL | `https://api.gmi-serving.com/v1` |
| API Key | `{{GMI_API_KEY}}` or paste directly |
| Model | `nvidia/NVIDIA-Nemotron-3-Nano-Omni` |
| Temperature | `0` |
| Max tokens | `500` |
| Response format | `json_object` (if available) |

**Step 8.** Paste this into the **System Prompt** field:

```
You are a warehouse damage assessment system. Analyze the shipping box 
image provided.

Return ONLY a valid JSON object — no explanation, no markdown, no preamble.
Use exactly this structure:

{
  "tracking_number": "<tracking number from label, or PARTIAL_XXXX if unreadable>",
  "damage_severity": <integer 1-10, where 10 is completely destroyed>,
  "damage_description": "<one sentence describing the visible damage>",
  "label_readable": <true or false>,
  "confidence": <float 0.0 to 1.0>
}

If the tracking number is partially visible, include what you can read 
followed by "_PARTIAL". If completely illegible, use "UNREADABLE".
```

**Step 9.** Configure the **Input** to accept an image (`image_url`, `user_input`, or `attachment`). If image uploads aren't supported natively, configure as a text input accepting a base64 data URL string.

**Step 10.** Name the output variable `vision_output`.

---

### PHASE 4 — Configure Agent 2: Audit Core (5 min)

**Step 11.** Click the **Audit Core** node.

**Step 12.** Change node type from LLM to **HTTP Request**, **Tool**, or **Custom Code** — whichever Phinite offers for non-LLM operations.

**Step 13.** If using **HTTP Request**: point it at a locally running endpoint serving the purchase orders JSON.
`URL: http://localhost:5000/lookup?tracking={tracking_number}`

If using **Custom Code** (inline Python/JS), paste this logic:

```python
purchase_orders = [
    {"tracking_number": "1Z999AA10123456784", "vendor_name": "PackRight Logistics",
     "vendor_id": "VND-0042", "po_number": "PO-2024-8819",
     "sla_terms": "48hr replacement, full liability up to $500"},
    {"tracking_number": "1Z999BB20234567895", "vendor_name": "SwiftShip Co",
     "vendor_id": "VND-0017", "po_number": "PO-2024-7743",
     "sla_terms": "72hr replacement, liability up to $250"},
    {"tracking_number": "1Z999CC30345678906", "vendor_name": "FreightFirst Inc",
     "vendor_id": "VND-0089", "po_number": "PO-2024-9201",
     "sla_terms": "24hr replacement, full liability up to $1000"},
    {"tracking_number": "1Z999DD40456789017", "vendor_name": "DirectDeliver LLC",
     "vendor_id": "VND-0031", "po_number": "PO-2024-6654",
     "sla_terms": "48hr replacement, liability up to $300"},
    {"tracking_number": "1Z999EE50567890128", "vendor_name": "BulkRoute Partners",
     "vendor_id": "VND-0055", "po_number": "PO-2024-5512",
     "sla_terms": "96hr replacement, liability up to $200"},
]

tracking = input_data.get("tracking_number", "")
match = next((po for po in purchase_orders if po["tracking_number"] == tracking), None)

if match:
    return {**match, "match_found": True,
            "damage_severity": input_data.get("damage_severity"),
            "damage_description": input_data.get("damage_description")}
else:
    return {"match_found": False, "tracking_number": tracking,
            "damage_severity": input_data.get("damage_severity"),
            "damage_description": input_data.get("damage_description")}
```

**Step 14.** Map `tracking_number` and `damage_severity` from `vision_output` to this node's input.

**Step 15.** Name the output variable `audit_output`.

---

### PHASE 5 — Configure Agent 3: Dispute Coordinator (8 min)

**Step 16.** Click the **Dispute Coordinator** node.

**Step 17.** Set up conditional routing — look for a **Condition** node, **Router**, or **Switch** to attach after this node.

**Step 18.** Configure three branches:

| Condition | Action |
|---|---|
| `match_found == false` | Slack alert (manual review) → log to audit trail |
| `match_found == true AND damage_severity >= 7` | Slack alert (dispute filed) → log to audit trail |
| `match_found == true AND damage_severity < 7` | Silent → log to audit trail only |

**Step 19.** For Slack branches: add an **HTTP Request** node (POST) or use Phinite's Slack integration from the 600+ pre-built tools.
- URL: `{{SLACK_WEBHOOK_URL}}`
- Method: `POST`
- Body: Block Kit JSON (variants below)

**Block Kit — Manual Review:**
```json
{
  "blocks": [
    {"type": "header", "text": {"type": "plain_text", "text": "⚠️ Manual Review Required"}},
    {"type": "section", "text": {"type": "mrkdwn", "text": "Tracking number could not be verified. A human must review this incident."}},
    {"type": "section", "fields": [
      {"type": "mrkdwn", "text": "*Tracking Number:*\n{{tracking_number}}"},
      {"type": "mrkdwn", "text": "*Severity:*\n{{damage_severity}}/10"}
    ]},
    {"type": "context", "elements": [{"type": "mrkdwn", "text": "VisionOps Audit System • {{timestamp}}"}]}
  ]
}
```

**Block Kit — Dispute Filed:**
```json
{
  "blocks": [
    {"type": "header", "text": {"type": "plain_text", "text": "📋 Dispute Filed"}},
    {"type": "section", "text": {"type": "mrkdwn", "text": "High-severity incident flagged. Dispute filed automatically."}},
    {"type": "section", "fields": [
      {"type": "mrkdwn", "text": "*Vendor:*\n{{vendor_name}}"},
      {"type": "mrkdwn", "text": "*PO Number:*\n{{po_number}}"},
      {"type": "mrkdwn", "text": "*Dispute ID:*\n{{dispute_id}}"},
      {"type": "mrkdwn", "text": "*Severity:*\n{{damage_severity}}/10"}
    ]},
    {"type": "context", "elements": [{"type": "mrkdwn", "text": "VisionOps Audit System • {{timestamp}}"}]}
  ]
}
```

**Step 20.** For audit trail: add a **Log** action or **Output** node. Phinite's built-in observability may capture this automatically — check for a "Session Logs" toggle.

---

### PHASE 6 — Wire the Connections (3 min)

**Step 21.** Verify canvas arrows flow correctly:

```
Vision Inspector → Audit Core → Dispute Coordinator → [Condition Router]
                                                              ↓              ↓           ↓
                                                       Manual Alert   Dispute Alert  Silent Log
```

**Step 22.** Click each arrow and confirm data mapping:
- Arrow 1→2: Full Vision Inspector JSON → Audit Core input
- Arrow 2→3: Full Audit Core JSON → Dispute Coordinator input

Map each field explicitly if Phinite requires it: `tracking_number`, `damage_severity`, `damage_description`, `match_found`.

---

### PHASE 7 — Test In-Canvas (5 min)

**Step 23.** Find **Test**, **Run**, or **Debug** in Graph Studio. Phinite supports in-canvas testing.

**Step 24.** Run 1 — guardrail test input:
```json
{
  "tracking_number": "1Z999XZ9012345_PARTIAL",
  "damage_severity": 9,
  "damage_description": "Severe crushing, label torn",
  "label_readable": false,
  "confidence": 0.43
}
```
Expected: `match_found: false` → Slack alert fires → audit trail logs manual review.

**Step 25.** Run 2 — happy path input:
```json
{
  "tracking_number": "1Z999AA10123456784",
  "damage_severity": 3,
  "damage_description": "Light surface scuffing, label fully intact",
  "label_readable": true,
  "confidence": 0.97
}
```
Expected: `match_found: true`, severity < 7 → silent dispute → no Slack → audit trail logs.

**Step 26.** Watch node execution trace light up as each agent fires — this is what you show on screen during the demo.

---

### PHASE 8 — Deploy (2 min)

**Step 27.** Hit **Deploy** or **Publish**. Deploy to **Dev** environment — you don't need Prod for tonight.

**Step 28.** Find the **API Trigger URL** for your deployed workflow (`https://app.phinite.ai/api/v1/flows/{flow-id}/trigger`). Keep this if you want to call it from Python later.

---

### PHASE 9 — Demo Screen Setup (2 min)

**Step 29.** Open **Session Logs / Audit Trail** in Phinite's observability panel — keep this in a separate browser tab.

**Step 30.** Arrange your screen:

| Tab | Content |
|---|---|
| Tab 1 | Phinite Graph Studio — topology visible, full canvas |
| Tab 2 | Phinite Audit Trail / Session Logs |
| Tab 3 | Slack channel where alerts fire |
| Tab 4 | GMI Cloud console (`console.gmicloud.ai`) — inference usage |

---

## If You Hit a Wall

| Problem | Fix |
|---|---|
| Can't find "Custom LLM provider" in node config | Look for "OpenAI Compatible" or "Bring Your Own Key (BYOK)" — same thing |
| Aura doesn't generate the full graph | Manually drag three nodes from the sidebar and connect them with arrows |
| No inline code execution | Use HTTP Request nodes pointing at a local Flask server running your Python logic |
| Image input not supported natively | Pass image as a base64 string in the `user_message` text field — GMI's model accepts it |
| Slack tool not in Phinite's library | Use an HTTP Request node with a POST to your webhook URL |
| Phinite is slow or down | `python main.py --use-fallback all` — screenshots from your earlier session cover the topology |

---

## The Demo Evidence Triptych

Show these three things simultaneously at the end:

- **Left panel:** Phinite audit trail — governance, every agent decision timestamped
- **Center panel:** Slack alert — user-facing impact
- **Right panel:** GMI Cloud usage dashboard — latency, tokens, cost

> *"Phinite coordinates the agents. GMI does the seeing. Neither was running when you walked in tonight."*

---

**Most important first move:** When you open Graph Studio, spend 2 minutes clicking around every panel before building anything. Then fire the Aura prompt. The UI makes more sense in person — 2 minutes of exploration saves 10 minutes of confusion mid-build.
