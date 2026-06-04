# docs — hackathon research cache

Rough research captured for the Phinite × GMI Cloud (NY Tech Week) hackathon.
Not polished — cached here so it survives into this repo and stays searchable.

## Plain-language

- **[visionops-pitch-eli5.md](./visionops-pitch-eli5.md)** — Start here if you want the no-jargon pitch.

## Canonical

- **[visionops-baseline-specification.md](./visionops-baseline-specification.md)** — baseline spec for the entire app idea (VisionOps: three-agent damaged-inventory pipeline). **Start here.**
- **[visionops-demo-test-images.md](./visionops-demo-test-images.md)** — the two demo test images (Run 1 crushed box, Run 2 scuffed box) at a glance: what each looks like, why no training images are needed, and the no-barcode OCR + fallback read. Defers to `claude/design_specification.md` §9 for exact values.

## Rough handoffs (verbatim, timestamped)

- [2026-06-03T23-37-47Z-handoff-visionops-ai-hackathon-plan.md](./2026-06-03T23-37-47Z-handoff-visionops-ai-hackathon-plan.md) — VisionOps plan, critical evaluation (risks ranked), and the 15-min go/no-go API gate.
- [2026-06-03T23-50-23Z-handoff-phinite-gmicloud-hackathon-repo-kickoff.md](./2026-06-03T23-50-23Z-handoff-phinite-gmicloud-hackathon-repo-kickoff.md) — repo kickoff: copy-paste integration stubs (GMI / Phinite / Slack clients), env + setup, 5-person role split.


This is a goldmine. Let me synthesize everything. The event you're building for is literally **tonight** — June 3, the Phinite × GMI "AI Agents: From Prototype to Production" build night. Here's everything you need to know.

---

## The Real Situation First

This is a one-evening, in-person sprint. Phinite and GMI are the two sponsors. You'll have access to both platforms on-site. The top three teams pitch to a VC at the end. That means Phinite and GMI aren't optional add-ons to your Python script — they're the judging criteria. The judges will want to see their own tools running.

Here's what each platform actually is, what it gives you, and exactly how to use them together.

---

## Platform 1: Phinite (The Orchestration Layer)

### What it actually does

Phinite is an orchestration platform enabling enterprises to design, deploy, manage, and scale multi-agent AI systems from a single cloud-agnostic interface. Graph Studio enables visual design of agent topologies — hierarchical, networked, supervisory — with version control and in-canvas testing.

Think of it this way: Phinite is where your three agents *live and connect*. It's the thing you point at the screen when you show the topology diagram in your demo. It gives you:

- **Graph Studio** — the visual drag-and-drop canvas where you wire Vision Inspector → Audit Core → Dispute Coordinator as a connected node graph
- **Phinite Aura** — an AI copilot that generates agents, prompts, tools, and code from plain-language descriptions
- **Detailed audit trails** — tracks every interaction and escalation with full transparency. This is your "audit trail" slide in the demo triptych.
- **Live monitoring with built-in guardrails** that keep agents compliant and under control
- **Developer Studio** — custom hooks to any backend, 600+ pre-built tools, full version control

### Pricing / Access

The Free plan gives you 1K agent sessions, 1 user, builder features, and $5 in included usage credits. The Builder plan at $20/month gives 3K sessions, 5 users, API triggers, and workflow automation. For tonight's hackathon, the Free tier is enough to demo — but if they hand out promo credits at the event, take them.

### How to use it for VisionOps

**The right approach is a hybrid**: build your Python agents, then *register them in Phinite* so the visual topology, audit trail, and routing logic all show up in Phinite's Graph Studio. The judges see:

1. The three-node topology graph in Graph Studio (the opening image of your demo)
2. The audit trail showing each agent's decision, timestamped
3. Phinite's built-in observability confirming the guardrail fired

You wire it up one of two ways — and this is the key tactical decision:

**Option A (No-Code, Fastest):** Use Phinite's Graph Studio + Aura copilot to describe your three agents in plain language and let Aura generate the workflow. Then point each agent node at your GMI model via the LLM configuration in each node. This is the 30-minute path.

**Option B (Code-First, More Control):** Build the Python pipeline as described in the original prompt, then use Phinite's API triggers (available on Builder plan / beta on Free) to call your pipeline externally and feed results back into Phinite's audit trail via webhook. The topology is still in Phinite, but the logic lives in Python.

**Recommendation for a 2-hour sprint: Option A for the topology and audit trail, with your GMI API key injected into each node.** You can still have Python fallback files ready. The visual Graph Studio output is what the judges will remember.

---

## Platform 2: GMI Cloud (The Vision AI Layer)

### What it actually does

The GMI Cloud Inference Engine is a platform purpose-built for real-time AI inference. With a simple API and SDK, models can be launched in minutes, avoiding heavy configuration and enabling instant scaling once you select your model.

GMI Cloud's MaaS layer currently includes 45+ LLMs, 50+ video models, 25+ image models, and 15+ audio models.

The key thing for VisionOps: GMI Cloud's deployed endpoints run on H100/H200 GPUs with an OpenAI-compatible API. That means your existing OpenAI-style Python code points at `https://api.gmi-serving.com/v1/chat/completions` and it just works.

### The best vision model for your use case

This is the most important discovery. NVIDIA Nemotron 3 Nano Omni launched April 28 and is now available on GMI Cloud. It's a 30B-parameter open multimodal model that processes text, images, video, and audio in a single reasoning loop. A GMI blog post literally shows them using it for a *damage detection workflow on drone footage* — which is nearly identical to VisionOps.

The model name is `nvidia/NVIDIA-Nemotron-3-Nano-Omni`. It has a 256k token context window and supports FP8 quantization. It runs on NVIDIA H100 and H200 GPUs.

The API call looks exactly like this:
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
    "max_completion_tokens": 500
  }'
```

Use `response_format: {"type": "json_object"}` for JSON mode — this is how you force structured output and avoid the stripping/retry logic entirely.

### The GMI dashboard = your cost slide

End-to-end optimizations across software and hardware — including quantization and speculative decoding — improve serving speed while helping reduce compute costs at scale. After your live run, the GMI console at `console.gmicloud.ai` shows the inference call: its latency, its token usage, and the cost. That's your "11 seconds, $0.03, and right now nothing is running" moment in the demo.

---

## The Revised Build Strategy

Here's the adjusted approach now that you know both platforms:

### Step 1: Sign up (do this right now if not done)
- Phinite: `app.phinite.ai/sign-up` (free)
- GMI Cloud: `console.gmicloud.ai` (free tier, generate an API key immediately)

### Step 2: In Phinite's Graph Studio (first 20 min)
Open Graph Studio and create a new topology. Add three agent nodes:
- **Vision Inspector** — LLM node, configure with GMI Cloud endpoint + Nemotron Omni model, set system prompt to your damage assessment prompt
- **Audit Core** — configure with a tool/function node that calls your local JSON lookup (or a simple HTTP action hitting a local endpoint)
- **Dispute Coordinator** — configure with routing logic (conditional node based on severity score) → Slack webhook action

Use **Phinite Aura** to describe the workflow in plain language if you get stuck: *"Create a three-agent system where Agent 1 analyzes a photo and extracts a tracking number, Agent 2 looks it up in a database, and Agent 3 routes to Slack or silent file based on severity"* — Aura will scaffold it.

### Step 3: Configure GMI Cloud in Phinite
In each LLM node in Phinite, you'll configure the model provider. Since GMI uses an OpenAI-compatible endpoint:
- Base URL: `https://api.gmi-serving.com/v1`
- API Key: your GMI key
- Model: `nvidia/NVIDIA-Nemotron-3-Nano-Omni`

This means Phinite is orchestrating the agents, and GMI is providing the compute — exactly the story the judges want to hear.

### Step 4: Keep the Python fallbacks
Your Python codebase with hardcoded fallback JSONs is still your safety net. If Phinite's canvas has any hiccup during the demo, you run `python main.py --use-fallback all` and the story still holds. The Phinite audit trail screenshot from your verification run covers that case.

---

## The Demo Story Reframed

The way you describe this to judges changes slightly now that you have both platforms integrated:

- **Phinite** is the operating system: topology, audit trail, governance, routing logic — all visible on the canvas in real time
- **GMI Cloud** is the inference engine: the vision model that reads the damaged box photo, running on H100 GPUs, billed per call, zero cost when idle

When you show the triptych at the end: left panel is Phinite's audit trail (governance), center is the Slack alert (user impact), right is GMI Cloud's usage dashboard (economics). That's the exact story the event organizers built this around, and it's compelling because you're using their tools the way they intended — not bolting them on after the fact.

The line that lands: *"Phinite coordinates the agents. GMI does the seeing. Neither was running when you walked in tonight."*
