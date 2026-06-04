# Handoff: VisionOps AI — Hackathon Plan & Context

Generated: 2026-06-03T23:37:47Z
Purpose: Portable handoff to seed a **new repo** for the Phinite × GMI Cloud
hackathon. Captures the VisionOps AI plan in full, the critical evaluation, the
intended repo layout, and next steps — self-contained so it can be carried over
without rereading the originating session.

## Summary

**VisionOps AI** is the candidate hackathon project for an event sponsored by
**Phinite** (Multi-Agent OS — orchestration, visual topologies/"Graph Studio",
enterprise workflows) and **GMI Cloud** (low-latency multimodal/vision inference,
Model-as-a-Service). It's an end-to-end, multi-agent pipeline that detects damaged
inbound inventory via GMI vision, audits it against vendor SLAs via Phinite
orchestration, and auto-files a dispute + alerts a floor manager (Slack). Build
window is ~**2 hours**.

Status: **idea proposed and evaluated; not greenlit, not built.** Sponsor API
research is in flight (separate effort). The work currently lives in a scratch dir
(`~/work/hack_research`) and is being transferred into a dedicated repo — this
handoff is the transfer vehicle.

## Key Context

- **Sponsor fit is the core strength.** The plan uses *both* sponsors deeply and
  complementarily (GMI = perception, Phinite = orchestration + governance). That's
  what sponsor-prize judges reward and what most teams fail.
- **The #1 risk is unverified sponsor APIs.** "Graph Studio," "Aura,"
  "Multi-Channel," "built-in hooks" are marketing terms until proven. A
  **15-minute go/no-go API-validation gate before any code** is the single most
  important process decision. Have a Plan-B thin-orchestrator architecture ready.
- **OCR is the silent killer.** VLMs are unreliable at reading tracking
  numbers/barcodes off real boxes; one wrong digit kills the ERP lookup. Split the
  vision task: VLM owns the damage narrative, a real barcode decoder
  (`pyzbar`/`zxing`) or deterministic pre-seeding owns the digits.
- **Prefer human-in-the-loop over "autonomous."** Auto-filing financial disputes
  fights the governance pitch. A Slack approval card ("[Approve dispute]
  [Dismiss]") is safer, more enterprise-credible, and better live theater.
- **Demo on conference wifi = 4 live deps** (GMI, Phinite, Slack, mock ERP).
  Record a fallback demo by ~minute 110; keep local mocks.
- **Constraints:** ~2-hour build; parallelize the team from minute 0 (the roadmap
  is strictly sequential, so slips cascade); cut the demo to one happy path + one
  rejected path; build the pitch + one defensible ROI number from the start.

## Evidence

### A. The plan / spec (verbatim, lightly reformatted)

**Pitch (one line):** an end-to-end, multi-agent pipeline that detects
incoming-inventory damage via GMI Cloud vision endpoints, audits it against vendor
SLAs via Phinite orchestration, and automatically files the dispute + alerts the
floor manager.

**Problem:** E-commerce fulfillment hubs and logistics giants lose billions
annually on damaged incoming inventory and vendor SLA non-compliance. Traditional
CV can flag a "crushed box," but a human still has to manually match it to an
invoice, look up the vendor contract, file a dispute ticket, and alert the floor
manager.

**Solution — three cooperating agents:**

| Agent | Powered by | Responsibility & tools |
|---|---|---|
| **1. Vision Inspector** | GMI Cloud multimodal inference | Processes image/video of incoming cargo. Flags damage severity and extracts text (barcodes, tracking numbers, carrier names). |
| **2. Audit Core** | Phinite Developer Studio | Takes extracted tracking data, hits a mock ERP API, pulls the purchase order, checks vendor SLA compliance rules. |
| **3. Dispute Coordinator** | Phinite (Aura / Multi-Channel) | Synthesizes the data. Logs a financial dispute ticket, attaches the visual proof crop, routes a high-priority alert to Slack. |

**2-hour roadmap:**

| Window | Task |
|---|---|
| **0–30 min** | Spin up a GMI Vision (VLM) endpoint via MaaS. Feed sample images of damaged freight; prompt for structured JSON: `damage_detected` (bool), `severity` (low/med/high), `tracking_number`. |
| **30–60 min** | In Phinite Graph Studio, design the 3-agent topology visually. Routing: if Agent 1 returns `damage_detected: true`, route to Agent 2; if false, terminate silently. |
| **60–90 min** | Stand up a lightweight mock ERP (JSON endpoint or Supabase) with ~5 sample purchase orders matching the tracking numbers. Use Phinite hooks for Agent 2 → DB query and Agent 3 → live Slack webhook. |
| **90–120+ min** | End-to-end test: drop a photo of a damaged box → GMI processes pixels → Phinite routes state, pulls vendor data → formatted dispute notification lands in Slack with the audit trail. Polish the pitch. |

**VC pitch angle:** not another chatbot — focus on **ROI, governance, scale**.
Show the **Phinite audit trail** as the guardrail that stops agents hallucinating
financial disputes; highlight **GMI's serverless scale-to-zero** for cheap
off-hours runs. (Caveat from eval: don't over-index on scale-to-zero — many ops
receive 24/7; lead with cost-per-inference + throughput, and attach one concrete
ROI number, e.g. "10k inbound pallets/day × 2% damage × $X/dispute = $Y/yr.")

### B. Evaluation — risks ranked by likelihood × impact

1. **Unverified sponsor APIs** (highest). If a Phinite hook can't call an arbitrary
   HTTPS endpoint + a Slack webhook out of the box, the Agent 2→3 chain stalls.
   GUI-only (no SDK) is a trap for a 2-hr build. → Validate first; Plan B ready.
2. **OCR of tracking numbers/barcodes.** VLM-hostile; one wrong digit breaks the
   demo. → Decode with a real library or pre-seed deterministically; fuzzy ERP match.
3. **2-hour scope is optimistic** and strictly sequential. → Parallelize; de-scope.
4. **4 live external deps on conference wifi.** → Recorded fallback + local mocks.
5. **Credential/provisioning latency.** → Provision GMI + Phinite accounts before
   the clock starts; treat "keys in minutes?" as part of the gate.

### C. Go/No-Go gate (first ~15 min, before code)

- [ ] Can we provision GMI + Phinite credentials in minutes (not hours)?
- [ ] Does GMI MaaS expose a VLM that accepts image input (URL/base64) and returns
      structured/JSON output? Latency + free-tier limits acceptable?
- [ ] Can a Phinite agent/hook call an **arbitrary HTTPS endpoint** (mock ERP) and
      a **Slack webhook**? Is there an **SDK**, or is it GUI-only?
- [ ] Is the visual topology + audit trail exportable/screenshare-able for the pitch?

### D. Source files in the scratch dir (`~/work/hack_research`, to bring over)

- `specs/visionops-ai.md` — the plan as a spec (source of truth), v0.
- `docs/visionops-evaluation.md` — full critical evaluation (171 lines).
- `docs/visionops-plan.md` — earlier verbatim capture of the plan (duplicate of the
  spec; can be dropped once `specs/` is canonical).
- `AGENTS.md` — orientation for future agents (hand-authored, not dd-dm-managed).
- `.gitignore` — `.DS_Store` only.

Recommended layout for the **new repo** (mirrors the `judge-me-bro` "specs-first"
convention on this host): `specs/` = source of truth (start with
`specs/visionops-ai.md`), `docs/` = evaluation + sponsor research
(`docs/sponsor-research/phinite.md`, `docs/sponsor-research/gmi-cloud.md`), and an
`AGENTS.md` that points future agents at the evaluation + go/no-go gate first.

## Open Questions

Feed these into the in-flight sponsor research — they gate the entire sprint:

**Phinite** — Are Graph Studio / Aura / Multi-Channel real, shipping, self-serve
features or roadmap? Can a hook call arbitrary HTTP + a Slack webhook natively?
Auth model? SDK/CLI or GUI-only? Free/hackathon-tier limits? Credential turnaround?

**GMI Cloud** — Which VLM(s) via MaaS? Image input format (URL vs base64)?
Structured/JSON output support? Latency + rate limits on free tier? Pricing?
API-key turnaround?

**Both** — How fast to first working call from a cold start?

## Next Steps

1. **Create the new repo** and copy over `specs/visionops-ai.md`,
   `docs/visionops-evaluation.md`, and a tailored `AGENTS.md` (drop the duplicate
   `docs/visionops-plan.md`). Adopt the specs-first layout above.
2. **Land the sponsor research** into `docs/sponsor-research/` and answer the Open
   Questions — this is the precondition for the go/no-go gate.
3. **Run the 15-minute go/no-go gate.** If it passes, build the Phinite-native
   path; if it fails, pivot to the Plan-B thin orchestrator (GMI for vision + a
   small script + Slack), preserving the end-to-end story.
4. **Build de-risked:** pre-seed tracking numbers, human-in-the-loop Slack approval
   card, one happy + one rejected path, pitch + ROI number in parallel from minute
   0, recorded fallback demo by ~minute 110.
5. **Provision GMI + Phinite credentials now**, before any timed sprint begins.

---
_Source: scratch work in `~/work/hack_research` (a `personal`-class host). This
handoff is self-contained; the scratch dir can be archived once the new repo is
seeded._
