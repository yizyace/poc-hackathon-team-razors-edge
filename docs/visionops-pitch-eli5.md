# VisionOps, in Plain Words

*The no-jargon pitch. If you've never heard of this project, start here.*

---

## What it is, in one sentence

VisionOps looks at a photo of a damaged package and, in about eleven seconds, either files the paperwork to get your money back from the shipper — or, if something looks off, taps a human on the shoulder instead of guessing.

---

## The problem

Picture a busy e-commerce warehouse. A box arrives, and it's wrecked — crushed corner, dented side, maybe the contents rattling. Somebody now has to deal with it.

Today that "somebody" is a person. They pick up the box, squint at the shipping label to find the tracking number, dig through records to figure out which vendor sent it, pull up the contract to check what that vendor promised about damage, fill out a dispute claim to recover the cost, and then ping the right teammate so it doesn't fall through the cracks.

That whole dance takes about **half an hour and around $43 in labor** — for *one* box. Multiply that by the thousands of damaged boxes a large operation sees, and it's a quietly enormous, boring, error-prone money pit. Boxes get missed. Claims get filed wrong. Disputes age past their deadline and the warehouse just eats the loss.

---

## The idea, in one breath

Take a photo. Roughly **eleven seconds and three cents** later, the box has either been handled automatically or kicked up to a human — and there's a tidy, timestamped record of exactly why. No chatbot to babysit, no toy demo. Real photos, real decisions, a real paper trail.

---

## Meet the three agents

An "agent" here is just a little specialized worker that does one job and hands its result to the next worker — like a three-person assembly line where each person actually *thinks* about their piece instead of blindly passing it along. VisionOps has three of them.

**The Inspector (Vision Inspector) — the eyes.** It looks at the photo and answers two questions: how bad is the damage, and what's the tracking number on the label? Under the hood, it sends the picture to a vision AI model running on **GMI Cloud** (a service that runs powerful AI on rented graphics chips, and only charges while it's actually working). The Inspector hands back clean, structured notes — not a wall of chatty text.

**The Detective (Audit Core) — the memory.** It takes that tracking number and looks it up in the company's records to find out who shipped the box, what the vendor's contract says about damage, and — crucially — whether there's a match at all. It runs on **Phinite** (the platform that connects the agents and keeps a record of every decision) and, for the demo, a stand-in purchase-order database (a small mock file standing in for a real corporate system).

**The Coordinator (Dispute Coordinator) — the decision-maker.** It reads the damage report and the detective's findings and decides what to actually do. Minor damage with a clean match? File the claim quietly and move on. No match, or something doesn't add up? Escalate to a human. It runs on **Phinite** too, and reaches out through **Slack** (the workplace chat app) when — and only when — a person needs to get involved.

---

## Follow one photo through the system

1. A warehouse worker snaps a photo of a damaged box.
2. **The Inspector** examines it, gauges the damage, and reads the tracking number off the label.
3. It writes that up as tidy, structured data and passes it along.
4. **The Detective** takes the tracking number and searches the purchase-order records.
5. It reports back: who sent it, what the contract promises, and whether it found a match.
6. **The Coordinator** weighs the damage level against the match result.
7. It picks a lane: file the dispute silently, or escalate to a human for review.
8. Either way, every step is written down with a timestamp, so anyone can later ask "why did this happen?" and get a straight answer.

---

## The two demos, and what each one proves

We run two boxes back-to-back on purpose. Most demos only show the part where everything goes perfectly — which makes them look like a pre-recorded video. Showing a graceful *failure* first, then a clean success, proves the system genuinely makes choices.

**Run 1 — the crushed box (proves it knows when it doesn't know).** A badly crushed box rolls in, and the same impact that wrecked it also tore the shipping label. The Inspector reads what it can, but the tracking number comes back incomplete — it's missing a digit. The Detective searches and finds no match. Here's the important part: the Coordinator does **not** invent a dispute from broken data. It escalates — files a "needs a human" ticket and pings Slack to ask someone to step in. That's the **trust** story: the system refuses to fake an answer when the data is bad. In a process that moves real money, that restraint is the whole point.

**Run 2 — the scuffed box (proves it routes smartly).** A lightly scuffed box comes in with a crisp, readable label. The Inspector reads the tracking number cleanly. The Detective finds the matching purchase order. The damage is minor — low severity. So the Coordinator quietly files the claim and **says nothing** — no Slack ping, nobody interrupted for a scuffed box. Then we open the record and show the dispute sitting there, logged. That's the **efficiency** story: it acted, it just didn't make noise. Big problems get attention; small ones get handled in the background.

---

## The numbers that matter

- **Time:** about **27 minutes** by hand → about **11 seconds** with VisionOps.
- **Cost:** about **$43** in labor per box → about **$0.03** in compute.
- **When idle, it costs nothing.** This is the "scale-to-zero" part: when the warehouse is closed and no photos are coming in, there's no machine left running and the bill is **$0**. You pay for the eleven seconds of seeing, and nothing else.

---

## What's real vs. what's simulated (we're being honest)

Trust matters more than hype, so here's the straight story:

- **Simulated:** the corporate records the Detective searches. For the demo, that's a small mock file of purchase orders standing in for a real enterprise system. The plumbing is real; the warehouse it plugs into is a stand-in.
- **A published benchmark (not our guess):** the "27 minutes, $43" figure for handling a claim by hand. That comes from an industry source — the Council of Supply Chain Management Professionals — so it's a verifiable number, not something we made up.
- **Real and measured live:** the speed and cost of VisionOps itself. The eleven seconds and three cents aren't estimates — they're measured from the actual run happening in front of you.

Being upfront about the stand-in parts is what makes the real parts believable.

---

## Why it matters, in three words

- **Governance** — it can prove *why* it did everything, and it refuses to guess when it shouldn't.
- **Efficiency** — it handles the boring, high-volume work in seconds for pennies.
- **Scale** — it grows to handle a flood of boxes and shrinks to zero cost when there's nothing to do.

---

## Glossary

- **Agent** — a small, specialized AI worker that does one job and hands its result to the next. VisionOps chains three of them together.
- **VLM (vision-language model)** — an AI that can both *look* at a picture and *describe it in words*. It's what lets the Inspector understand a photo of a box and report the damage and tracking number.
- **ERP** — a company's central record-keeping system for things like orders, vendors, and contracts ("Enterprise Resource Planning"). The Detective looks things up here; in the demo it's simulated.
- **SLA** — the promise in a vendor's contract about what they'll cover, like damaged shipments ("Service Level Agreement"). It's part of what the Detective pulls up.
- **GMI Cloud** — the service that runs the heavy AI vision work on powerful rented chips, charging only while it's actually working (and nothing when it's idle).
- **Phinite** — the platform that wires the three agents together and keeps a detailed record of every decision they make.
- **Audit trail** — the timestamped log of every step and decision, so anyone can later ask "why did this happen?" and get a clear, honest answer.

---

## Learn more

- **[visionops-baseline-specification.md](./visionops-baseline-specification.md)** — the canonical, in-depth design document. Every decision, and the reasoning behind it.
- **[2026-06-03T23-37-47Z-handoff-visionops-ai-hackathon-plan.md](./2026-06-03T23-37-47Z-handoff-visionops-ai-hackathon-plan.md)** — the original plan, with risks ranked and the go/no-go gate.
- **[2026-06-03T23-50-23Z-handoff-phinite-gmicloud-hackathon-repo-kickoff.md](./2026-06-03T23-50-23Z-handoff-phinite-gmicloud-hackathon-repo-kickoff.md)** — the build kickoff, with the integration stubs and team roles.
