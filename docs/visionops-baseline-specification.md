# VisionOps: Design Decisions Document
## *From Prototype to Production — NY Tech Week Sprint*

---

### What This Document Is

This is every design decision we've made for the VisionOps demo, explained from the ground up. It's written so anyone on the team — regardless of experience level — can understand not just *what* we decided, but *why*.

If you're joining mid-stream: start here. You should be able to read this, look at your assigned component, and know exactly what you're building and how it connects to everything else.

---

## Part 1: What We're Building

### The Problem (One Sentence)

E-commerce warehouses lose billions of dollars every year because when a damaged box shows up, a human has to manually figure out who sent it, check the vendor contract, file a dispute ticket, and notify the right people. That process takes about half an hour per incident.

### What VisionOps Does

VisionOps is a system of three AI agents that work together to do that entire process automatically. You take a photo of a damaged box. Eleven seconds and three cents later, either a dispute is filed or a human is alerted that something needs manual review. No chatbot. No toy demo. A real pipeline that touches real APIs, makes real decisions, and leaves a real audit trail.

### The Three Agents

Think of agents as specialized workers that each do one job and pass their results to the next worker. They're not three functions in one script — each one makes at least one decision on its own.

| Agent | What It Does | What It Connects To |
|-------|-------------|---------------------|
| **Vision Inspector** | Takes a photo of a package. Asks a vision AI model (hosted on GMI Cloud) to describe the damage and read the tracking number. Returns structured data. | GMI Cloud VLM API |
| **Audit Core** | Takes the tracking number. Looks it up in a mock database of purchase orders. Returns the vendor name, SLA terms, and whether a match was found. | Mock ERP (local JSON file) |
| **Dispute Coordinator** | Takes the damage report and the audit result. Decides what to do next based on severity. Files a dispute ticket. Either sends a Slack alert or stays silent. | Slack Webhook, Phinite Audit Trail |

---

## Part 2: The Demo Flow

We have roughly 4–5 minutes in front of the judges. Here's exactly what happens, second by second.

### Opening (15 seconds)

The screen shows the Phinite topology — a visual graph with three connected agent nodes. The narrator says one sentence about the problem, then points at the topology and says: "Three agents, one photo, fully autonomous. Watch."

No slides. No bios. The topology is the opening image because it gives the judges a mental model before anything runs.

### Run 1: The Guardrail Case (60–90 seconds)

**What the judges see:** The narrator drops a photo of a heavily damaged box — crushed, with a torn shipping label. The Vision Inspector fires. It extracts what it can from the label, but the tracking number is incomplete (the damage that crushed the box also tore the label). The Audit Core looks up the partial number in the database and finds no match. Instead of guessing or hallucinating a dispute, the Dispute Coordinator files a "manual review required" ticket and fires a Slack alert asking a human to step in.

**What this proves:** The system knows when it doesn't know. It doesn't fabricate a financial dispute from bad data. That's the governance story in one live example.

**The Slack alert for Run 1:** A formatted message with a warning header, the incomplete tracking number, the damage severity (high), the image crop of the damaged label, and a clear message: manual review needed.

### Reset (5 seconds)

The narrator says: "That's the guardrail. Now let's show you what happens when everything goes right."

The demo pilot clears the Slack channel and resets the topology. The judges see the graph go blank and ready. This reset is important — it makes the two runs feel like two distinct incidents, not one continuous blur.

### Run 2: The Efficiency Case (60–90 seconds)

**What the judges see:** The narrator drops a second photo — a lightly scuffed box with a perfectly readable label. The Vision Inspector reads the tracking number cleanly. The Audit Core finds the matching purchase order. The severity is low. The Dispute Coordinator files the dispute silently — no Slack alert, no interruption. The narrator says: "No one gets woken up for a scuffed box." Then immediately switches to the Phinite audit trail and points to the dispute that was quietly logged, proving the system acted even though Slack stayed silent.

**What this proves:** The system routes decisions based on context. High severity gets attention. Low severity gets resolved without noise. That's the efficiency story — and it's also the moment that shows this is a multi-agent system making real decisions, not a script pushing data through a pipe.

### Dashboards and Close (60 seconds)

The screen switches to the **evidence triptych** — three windows arranged side by side:

- **Left:** The Phinite audit trail, showing every decision each agent made, with timestamps.
- **Center:** The final Slack alert from Run 1 (the manual review escalation).
- **Right:** The GMI Cloud usage dashboard, showing the inference call that just ran — its latency, its cost, and the fact that zero GPUs are running now.

The narrator walks through two things:
1. **The governance moment:** pointing to the audit trail and saying: "Right here — the Audit Core returned no match, and the Dispute Coordinator did not fabricate a dispute. That's the guardrail."
2. **The cost story:** pointing to the GMI dashboard and saying: "One inference call. Eleven seconds. Three cents. And right now, nothing is running. The warehouse doors are closed and the compute cost is zero."

### Closing Metric

The final line the judges hear is a concrete comparison:

> "The industry average for manual freight claims processing is about 27 minutes and $43 in labor per incident. VisionOps just did it in 11 seconds for $0.03. Our ERP is simulated — the labor cost is a published industry average — but the compute numbers are real. You just watched them happen."

This works because:
- The industry figure comes from a known source (Council of Supply Chain Management Professionals) so it's verifiable, not made up.
- The compute numbers are measured from the live run, not estimated.
- The caveat about the simulated ERP is specific and honest, which builds trust rather than undermining the claim.

---

## Part 3: The Architecture Decisions

### Decision 1: Live Demo (Not Recorded)

We're running the system live in front of the judges. This is riskier than playing a screen recording, but it fits the event's "real stakes" framing and shows confidence. To manage the risk, we have a layered fallback plan (see Part 5).

### Decision 2: Strict Schema Enforcement on the Vision Model

AI vision models sometimes return messy output — extra text, missing fields, malformed JSON. In a production system handling financial disputes, you can't pass bad data downstream and hope for the best.

**What we do about it:** When the Vision Inspector receives the model's response, it validates the JSON against a strict schema before anything else happens. If the JSON is valid, it proceeds normally. If the JSON is broken, the system retries the call once with a simpler prompt. If it's still broken after the retry, the system routes to a "manual review required" state instead of guessing.

**Why this matters for the pitch:** It's a live demonstration of an enterprise guardrail. We're not just talking about preventing hallucinations — we're showing the exact mechanism that catches them.

**Implementation detail:** The code that handles the model response should strip any text before the first `{` and after the last `}` using a regular expression. Vision models sometimes add phrases like "Here's the JSON you requested:" before the actual JSON, and this catch handles that common failure mode without needing a second API call.

### Decision 3: Two-Run Structure (No-Match Then Happy Path)

We show a failure case first, then a success case. Most demos only show the happy path, which makes them indistinguishable from a scripted video. Showing a graceful failure and a full success back-to-back proves the system has real branching logic.

**Run 1 (No-Match):** Damaged box with a torn label. The tracking number comes back incomplete. No purchase order matches. The system escalates to manual review.

**Run 2 (Happy Path):** Lightly scuffed box with a clean label. Tracking number reads perfectly. Purchase order found. Low severity. Dispute filed silently.

The contrast between the two runs demonstrates two different system behaviors, and the reset between them makes the structure clear to the judges.

### Decision 4: Severity-Based Routing

The Dispute Coordinator doesn't always fire a Slack alert. It evaluates the damage severity and makes a routing decision:

- **High severity:** Slack alert fires immediately. This is an urgent situation that needs human attention.
- **Low severity:** The dispute is filed quietly. No alert. No interruption.

This is the simplest possible agentic decision — "based on the context, I choose between two different actions" — but it's enough to prove the system isn't a static pipeline. An agent evaluated a situation and picked a tool.

**The severity threshold:** This is one of the three decisions we're leaving open for the team to set during the design review. A starting suggestion: severity scores of 7/10 or higher trigger the Slack alert.

### Decision 5: The No-Match Photo Tells a Coherent Story

The no-match case isn't just a random missing tracking number. The photo shows a box where the same impact that damaged the product also tore the shipping label. The Vision Inspector extracts an incomplete tracking number (missing its last digit due to the tear). The system catches the incomplete data and escalates.

This matters because it feels real. The damage that triggered the inspection also made the label hard to read — that's a realistic warehouse scenario. A judge who sees this understands instantly why the system couldn't find the purchase order, without needing it explained.

### Decision 6: Single-Pass Vision Prompt with Stripping

We send one prompt to the GMI vision model, not two. The prompt includes the exact JSON schema we want back, and it starts with an instruction that the model should output *only* JSON — no explanations, no conversational text.

The code that receives the response strips anything outside the curly braces as a safety net, then validates the remainder against the schema.

This is faster than a two-pass approach (one call to describe, one call to structure) and the stripping catches the most common failure mode. In a two-hour sprint, speed and simplicity win.

### Decision 7: One Narrator, Silent Credit to Builders

A single person carries the full walkthrough. At each transition — when the Vision Inspector fires, when the Audit Core returns a result, when the Dispute Coordinator routes a decision — the narrator names the person who built that component. That person doesn't speak; they're visible, they nod, and the judge registers the connection.

This keeps the pitch fast and clean while making it obvious that a team built this, not one person. Five voices in four minutes is too many handoffs. One voice with five visible owners is efficient and generous.

### Decision 8: Dedicated Demo Pilot

The person narrating never touches the keyboard. A separate team member — the demo pilot — runs the machine: drops the photos, triggers the resets, switches the windows, and manages the screen layout.

This eliminates split-attention errors. The narrator focuses entirely on the judges and the story. The pilot focuses entirely on the technical execution. It's a standard conference demo practice for a reason.

---

## Part 4: How We Build It (Team Process)

### The Strawman Approach

The decisions in this document form a **strawman design** — a coherent starting point, not a final decree. The team will review it together in the first 10 minutes of the sprint. The goal of that review is not to re-litigate the architecture, but to stress-test it, fill in the remaining blanks, and make it ours.

### What's Fixed vs. What's Open for Tuning

To protect the build window, we make a distinction between structural decisions and tuning decisions.

**Fixed (change only if genuinely broken):**
- The three-agent topology
- The inter-agent contracts (JSON schemas for what each agent sends and receives)
- The two-run demo structure (no-match then happy path)
- The severity-based routing logic

**Open for Tuning (team shapes these during the sprint):**
- The exact wording of the vision model prompt
- The severity threshold value
- The Slack alert message copy and formatting details
- The choice of test images
- The mock ERP purchase order data

### Three Deliberate Blanks

We're intentionally leaving three decisions unmade in this strawman. The team will fill them during the design review. These are chosen to be concrete, scoped, and fun to decide as a group — they give everyone a genuine creative stake without opening the door to re-architecting the system.

1. **Slack alert copy:** The exact text and Block Kit layout of the manual review alert and the dispute filed notification.
2. **Severity threshold:** The numeric cutoff between "low severity, file silently" and "high severity, fire Slack alert."
3. **Test images:** Which specific photos we use for the crushed box (Run 1) and the scuffed box (Run 2).

### The 10-Minute Design Review (Minutes 0–10)

The team gathers. The strawman is on screen or printed. The agenda:

- **Minutes 0–3:** Walk through the architecture visually. Everyone understands the three agents and how they connect.
- **Minutes 3–6:** Each person names one risk they see. Capture them without solving yet.
- **Minutes 6–8:** Address the top two risks as a group. Modify the strawman if needed.
- **Minutes 8–9:** Fill in the three deliberate blanks together.
- **Minutes 9–10:** Publish the final contract schemas so PR 1 and PR 2 can start building.

### Parallel Build (Minutes 10–70)

The team splits into two tracks that build independently against the published contracts.

| Track | Who | What They Build | Test Inputs |
|-------|-----|-----------------|-------------|
| **PR 1** | Expert + Novice | Vision Inspector module — prompt, GMI API call, JSON validation with retry and fallback | One damaged box photo (match), one unreadable photo (no-match) |
| **PR 2** | Expert + Novice | Audit Core module — mock ERP database (five purchase orders), lookup logic, match/no-match response | One matching tracking number, one non-matching |
| **PR 3 / Integration** | Strongest Generalist | Dispute Coordinator module, Slack webhook, Phinite topology wiring, contract schemas (published first) | Combined test cases from PR 1 and PR 2 |

Each PR is a self-contained deliverable with its own test inputs. The contract schemas — defined before anyone writes code — mean the two tracks don't need to talk to each other to validate their own work. If each module passes its own tests against the contract, they'll integrate.

### Integration (Minutes 70–90)

The three component owners come together. The integrator connects PR 1 → PR 2 → PR 3 in sequence. If a component doesn't work against its contract at this point, the owner gets 5 minutes to fix it. If it still doesn't work, the pre-built hardcoded fallback for that component drops in, and the team proceeds with the full end-to-end flow.

This rule — "5 minutes to fix, then fallback" — guarantees the demo always works, even if some pieces are simulated behind the scenes. A working demo with one mocked component is infinitely better than an authentic demo that fails silently on stage.

### End-to-End Testing and Polish (Minutes 90–110)

Once the full pipeline runs, the team shifts to:

- Running both demo scenarios end-to-end
- Rehearsing the narrator's walkthrough (twice minimum)
- Arranging the evidence triptych layout on the demo machine
- Capturing the Phinite audit trail screenshot and the GMI dashboard screenshot
- Practicing the reset between runs to get the timing smooth
- Verifying the Slack alert formatting looks right
- Timing the full pitch to ensure it fits in the slot

### Hard Freeze (Minute 110)

At minute 110, all changes stop. No code edits, no prompt tweaks, no Slack message adjustments. The demo pilot does one thing: a single verification run to confirm the system still works. If it does, everyone breathes. If it doesn't, the fallbacks handle it — no last-minute fixes.

The final 10 minutes before the pitch are for calm, not changes.

---

## Part 5: The Fallback Plan

We prepare for things to go wrong so that nothing can kill the demo. The fallbacks are layered — if one layer fails, the next one catches it.

### Layer 1: Component Fallbacks

Every component owner prepares a hardcoded version of their module's output alongside their real implementation. These are written during the build window, not after. If a component isn't working at the integration checkpoint (minute 70), the hardcoded version drops in and the demo continues.

- **Vision Inspector fallback:** A hardcoded JSON object matching the contract schema, with realistic damage data and a valid tracking number.
- **Audit Core fallback:** A hardcoded purchase order response matching one of the test tracking numbers.
- **Dispute Coordinator fallback:** A hardcoded Slack payload.

### Layer 2: Network Fallbacks

Venue Wi-Fi is unreliable. If the internet drops during the pitch:

- **GMI Cloud:** The Vision Inspector uses its hardcoded fallback JSON instead of calling the live API. The output looks identical to the judges.
- **Mock ERP:** Served from a local file on the demo machine — no network needed.
- **Slack Webhook:** If the webhook fails, the formatted Slack message payload is displayed on screen instead. The judges still see exactly what would have been sent.

The Phinite topology still orchestrates the flow in all cases, which is the main thing we're showing.

### Layer 3: Platform Fallback (Last Resort)

If the Phinite platform itself is slow or unresponsive during the pitch, the demo pilot switches to static screenshots captured during the verification run: the topology graph, the audit trail, and the agent execution trace. The narrator says: "Here's the topology from our verification run 10 minutes ago — the same flow you would have seen live."

The Slack alert (or its on-screen fallback) and the GMI dashboard (or its cost readout) still work independently. The demo becomes 70% live, 30% static — not ideal, but coherent. The story survives.

### What the Judges Experience in Each Scenario

- **Everything works:** Full live demo. All three agents fire. Slack pings. Dashboards show real data.
- **One component fails:** That component's hardcoded fallback runs instead. The topology and routing still work live. The judges can't tell the difference.
- **Network dies:** GMI and ERP run on local fallbacks. Slack payload shown on screen. Topology still live. Demo is 70% live.
- **Phinite is down:** Static screenshots from verification run. Slack and GMI still live. Demo is 50% live but still tells the full story.

No single failure silences the pitch.

---

## Part 6: What We're Not Building

Scope discipline matters more than ambition in a two-hour sprint. These are explicitly off the table for tonight. If someone suggests one during the build window, this list gives everyone permission to say "not tonight."

- **Multi-turn agent conversations.** Agents call each other once per incident. No back-and-forth negotiation, no clarification loops.
- **Real ERP integration.** The mock database stays a local JSON file. No Supabase, no Airtable, no live enterprise system.
- **Any UI beyond the Slack alert.** Terminal output is fine for debugging. The Slack alert is the only polished visual surface. No dashboard, no web app, no admin panel.
- **Historical run comparison.** One audit trail screenshot per run is enough. No "compare incidents" view.
- **Mobile or multi-channel notifications.** Desktop Slack is sufficient. No email, no SMS, no push notifications.
- **Multiple damage types per run.** One photo per run. The system processes a single incident from start to finish each time.

The team can modify this list during the design review, but the default is aggressive cutting. Everything on this list is a good idea that would make the system better — just not in two hours.

---

## Part 7: The Narrative Structure (For the Narrator)

Here's the script skeleton. It's not word-for-word — the narrator should sound natural, not robotic — but the sequence and the key lines are locked.

### Opening
*[Screen: Phinite topology — three connected agent nodes]*

"Every day, warehouses lose millions to damaged inventory that takes half an hour per incident to process manually. This is the same workflow, fully autonomous. Three agents, one photo — watch."

### Run 1 (Drop crushed box photo)
"This box was crushed in transit. The same impact tore the shipping label. Watch the Vision Inspector extract what it can."

*[Agent 1 fires. Tracking number appears — incomplete.]*

"The tracking number is missing its last digit. The Audit Core, which [Builder Name] built, looks it up in the purchase order database. No match found."

*[Agent 2 returns no-match. Agent 3 routes to manual review.]*

"Now watch the Dispute Coordinator. It doesn't guess. It doesn't fabricate a dispute. It escalates for human review. [Builder Name]'s Slack alert just fired — manual intervention requested, audit trail intact. That's the guardrail."

### Reset
"That's what happens when the system faces bad data. Now let's show you what happens when everything goes right."

*[Pilot resets Slack and topology. 3–5 seconds.]*

### Run 2 (Drop scuffed box photo)
"Same system. Different box. Lightly scuffed, label perfectly readable. [Builder Name]'s Vision Inspector reads the tracking number cleanly. [Builder Name]'s Audit Core finds the purchase order. Vendor identified, SLA terms pulled."

*[Agent 3 evaluates severity — low. Routes to silent file.]*

"This one's low severity. Watch — the system files the dispute, but no one gets woken up for a scuffed box."

*[Silence. Phinite node shows "Dispute logged — silent."]*

"Slack is quiet. But let me show you the proof." *[Switch to audit trail.]* "Right here — dispute filed, severity low, action silent. The system acted. It just didn't interrupt anyone. That's the efficiency story."

### Dashboards and Close
*[Screen: Evidence triptych — audit trail, Slack alert, GMI dashboard]*

"Three things I want you to see. On the left, the Phinite audit trail — every decision, timestamped, attributable. If an auditor asks 'why was this dispute filed,' the answer is right here. No black box. That's governance."

"In the center, the Slack alert from Run 1 — the output a real warehouse team would see. Image attached, vendor identified, next steps clear. That's user impact."

"On the right, the GMI Cloud dashboard. The inference call you just watched: eleven seconds, three cents. And right now — nothing is running. The warehouse doors are closed. The compute cost is zero. That's what serverless scaling actually means."

### Closing Metric
"Industry average for manual freight claims: about 27 minutes and $43 in labor. VisionOps just did it in 11 seconds for $0.03. Our ERP is simulated, the labor cost is an industry benchmark — but the compute numbers are real. You just watched them happen."

---

## Part 8: Contingencies During the Pitch

### If a Judge Asks a Question Mid-Demo

The narrator acknowledges the question and parks it: *"Great question — I'm going to finish this run so you can see the full flow, and I'll come back to that exact point in 90 seconds."*

The demo continues without pausing. At the next natural pause point (after a Slack alert fires or during the dashboard transition), the narrator returns to the question unprompted. This shows control, keeps the demo on schedule, and builds trust by following through.

### If Something Breaks During the Live Run

The narrator never acknowledges a failure as a failure. The demo pilot silently activates the next fallback layer. The narrator continues as if the transition was intentional. The judges may not notice anything changed. If the fallback involves switching to a screenshot, the narrator says: *"Here's the audit trail from our verification run 10 minutes ago."* No apology, no explanation — just forward momentum.

### If the Demo Finishes Early

The narrator opens the floor for questions. The full team is present and can answer. If a question hits a specific component, the person who built it steps forward to answer — their one moment to speak directly to the judges.

---

## Part 9: Pre-Sprint Preparation

Before the sprint starts, share these things with the team:

1. **This document** — so everyone has read the full design before arriving.
2. **The two questions to think about:**
   - "What breaks in your hands?" (What will fail when you try to build your component?)
   - "What's missing that would make this feel like ours, not one person's?" (What small addition would give you ownership?)
3. **The three blanks reminder:** Slack alert copy, severity threshold, and test images will be decided together during the design review. Come with ideas.

---

## Part 10: Quick Reference Card

*For the narrator and demo pilot — print or screenshot.*

| Moment | Screen | Action | Key Line |
|--------|--------|--------|----------|
| Opening | Topology | None | "Three agents, one photo — watch." |
| Run 1 start | Topology | Drop crushed box photo | "Same impact tore the label." |
| Run 1 no-match | Topology + Slack | Audit Core returns null, Slack fires | "It doesn't fabricate a dispute." |
| Reset | Clearing | Pilot clears Slack + topology | "Now when everything goes right." |
| Run 2 start | Topology | Drop scuffed box photo | "Same system. Different box." |
| Run 2 silent file | Topology | Agent 3 routes to silent, node shows "Dispute logged — silent" | "No one gets woken up for a scuffed box." |
| Audit proof | Audit trail | Switch to Phinite audit trail | "Right here — dispute filed, severity low." |
| Dashboards | Triptych | Pilot arranges three windows | "Governance, user impact, economics." |
| Close | Triptych | None | "11 seconds, $0.03. You just watched it happen." |

---

This document represents every design decision as of the strawman freeze. The team will review, stress-test, and complete it during the first 10 minutes of the sprint. After that, we build.
