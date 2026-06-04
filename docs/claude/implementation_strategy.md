# VisionOps Implementation Strategy
## Target: Claude Code Generation

---

### DOCUMENT PURPOSE

This document specifies the exact file structure, module boundaries, function signatures, and implementation order for the VisionOps system. It is the bridge between the interface contract and executable code. Generate files against this strategy in the order specified.

---

## 1. PROJECT STRUCTURE

```
visionops/
├── contracts.py
├── vision_inspector.py
├── audit_core.py
├── dispute_coordinator.py
├── fallbacks.py
└── main.py
```

No subdirectories. No configuration files. No test files. Six Python files in a flat directory. Each file is a self-contained module with explicit imports and exports.

---

## 2. FILE SPECIFICATIONS

### 2.1 contracts.py

**Purpose:** Define the three dataclasses that cross module boundaries.

**Line budget:** 120 lines maximum.

**Contents in order:**
1. Module docstring
2. Imports: `dataclasses.dataclass`, `typing.Optional`
3. `VisionInspectorOutput` dataclass with `__post_init__`
4. `AuditCoreOutput` dataclass with `__post_init__`
5. `DisputeCoordinatorOutput` dataclass with `__post_init__`

**Dependencies:** None. This module imports nothing from the project.

**Validation rules implemented in `__post_init__`:**
- VisionInspectorOutput: severity in {low, medium, high}, confidence in {low, medium, high}, carrier in {UPS, FedEx, USPS, None}, raw_label_text is str
- AuditCoreOutput: reason in {exact_match, tracking_number_incomplete, no_match}, suggested_action in {manual_review, file_dispute}, cross-field consistency (po_found=True implies vendor fields not None)
- DisputeCoordinatorOutput: action in {escalate_manual_review, file_dispute_silent, file_dispute_with_alert, terminate_no_damage}, severity in {low, medium, high, none}, tracking_number_status in {complete, incomplete, n/a}, dispute_id format DSP-YYYY-NNNN, cross-field consistency for each action

**Generation note:** Generate this file first. All other modules depend on it.

---

### 2.2 vision_inspector.py

**Purpose:** Call GMI Cloud vision model, parse response, validate against schema, retry on failure, provide fallback data.

**Line budget:** 150 lines maximum.

**Contents in order:**
1. Module docstring
2. Imports: `base64`, `json`, `os`, `re`, `requests`, `typing.Optional`, `datetime`, `contracts.VisionInspectorOutput`
3. Module-level constants:
   - `GMI_API_KEY = os.environ.get("GMI_API_KEY", "")`
   - `GMI_ENDPOINT = "https://api.gmi-serving.com/v1/chat/completions"`
   - `GMI_MODEL = "nvidia/NVIDIA-Nemotron-3-Nano-Omni"`
   - `GMI_TIMEOUT = 30`
   - `MAX_RETRIES = 2`
4. `VLM_SYSTEM_PROMPT`: str constant containing the exact system prompt from the decisions document Section 3.1
5. `VLM_USER_PROMPT_TEMPLATE`: str constant for the user message template
6. `call_gmi_vision(image_path: str) -> dict` — Encodes image as base64, constructs the API request, calls GMI endpoint, returns raw response dict. Raises `requests.exceptions.RequestException` on network failure. Raises `ValueError` if GMI_API_KEY is empty.
7. `extract_json(raw_response: str) -> dict` — Applies regex `\{.*\}` with `re.DOTALL` to strip non-JSON content. Raises `ValueError` if no JSON object found.
8. `validate_vision_output(data: dict) -> VisionInspectorOutput` — Checks required fields exist, checks enum values, constructs and returns VisionInspectorOutput. Raises `ValueError` with specific message on validation failure.
9. `inspect_image(image_path: str, retry_count: int = 0) -> VisionInspectorOutput` — Orchestrates the full pipeline: call GMI, extract JSON, validate. Retries up to MAX_RETRIES times on any exception. After exhausting retries, calls `get_vision_fallback(image_path)`.
10. `get_vision_fallback(image_path: str) -> VisionInspectorOutput` — Returns `VISION_FALLBACK_NO_MATCH` if "crushed" or "no_match" appears in image_path, otherwise returns `VISION_FALLBACK_HAPPY_PATH`.
11. `VISION_FALLBACK_NO_MATCH`: VisionInspectorOutput constant — damage_detected=True, severity="high", tracking_number="1Z999AA1012345678", carrier="UPS", raw_label_text="1Z999AA1012345678... [label torn] ...Acme Packaging... REF: PO-2024-", parse_success=False, confidence="low"
12. `VISION_FALLBACK_HAPPY_PATH`: VisionInspectorOutput constant — damage_detected=True, severity="low", tracking_number="74891234567890", carrier="FedEx", raw_label_text="74891234567890 FedEx FastShip Supply PO-2024-0887", parse_success=True, confidence="high"

**Functions exported:** `inspect_image`, `VISION_FALLBACK_NO_MATCH`, `VISION_FALLBACK_HAPPY_PATH`

**Error handling:** All exceptions from `call_gmi_vision` and `extract_json` are caught by `inspect_image` and trigger retry or fallback. No unhandled exceptions escape this module.

---

### 2.3 audit_core.py

**Purpose:** Store mock purchase order database, perform exact-match tracking number lookup, provide fallback data.

**Line budget:** 100 lines maximum.

**Contents in order:**
1. Module docstring
2. Imports: `contracts.AuditCoreOutput`
3. `PURCHASE_ORDERS`: list[dict] constant containing the five purchase orders from the decisions document Section 4.1. Each dict has keys: tracking_number, vendor_name, po_number, sla_threshold, order_value.
4. `lookup_po(tracking_number: str | None) -> AuditCoreOutput` — If tracking_number is None, returns no-match with reason="tracking_number_incomplete". Iterates PURCHASE_ORDERS for exact string match on tracking_number. If match found, returns AuditCoreOutput with po_found=True and all vendor fields populated. If no match found, determines reason by tracking number length: if len(tracking_number) > 10, reason="no_match", else reason="tracking_number_incomplete". Returns AuditCoreOutput with po_found=False and all vendor fields None.
5. `AUDIT_FALLBACK_NO_MATCH`: AuditCoreOutput constant — po_found=False, tracking_number_queried="1Z999AA1012345678", reason="tracking_number_incomplete", vendor_name=None, po_number=None, sla_threshold=None, order_value=None, suggested_action="manual_review"
6. `AUDIT_FALLBACK_MATCH`: AuditCoreOutput constant — po_found=True, tracking_number_queried="74891234567890", reason="exact_match", vendor_name="FastShip Supply", po_number="PO-2024-0887", sla_threshold=250, order_value=430, suggested_action="file_dispute"

**Functions exported:** `lookup_po`, `AUDIT_FALLBACK_NO_MATCH`, `AUDIT_FALLBACK_MATCH`

**Error handling:** This module never raises exceptions. `lookup_po` handles None input and missing keys gracefully.

---

### 2.4 dispute_coordinator.py

**Purpose:** Apply routing logic, generate Slack Block Kit payloads, send Slack notifications, generate dispute records, provide fallback data.

**Line budget:** 150 lines maximum.

**Contents in order:**
1. Module docstring
2. Imports: `json`, `os`, `random`, `requests`, `datetime.datetime`, `contracts.DisputeCoordinatorOutput`, `contracts.VisionInspectorOutput`, `contracts.AuditCoreOutput`
3. `SLACK_WEBHOOK_URL = os.environ.get("SLACK_WEBHOOK_URL", "")`
4. `SLACK_TIMEOUT = 10`
5. `generate_dispute_id() -> str` — Uses `datetime.utcnow().year` and `random.randint(1000, 9999)`. Returns string in format `f"DSP-{year}-{sequence}"`.
6. `coordinate(vision_output: VisionInspectorOutput, audit_output: AuditCoreOutput) -> DisputeCoordinatorOutput` — Implements the five routing rules from the decisions document Section 1.2. Full logic:
   - If `vision_output.damage_detected` is False: return terminate_no_damage action
   - Determine `tracking_number_status`: "complete" if `vision_output.parse_success` else "incomplete"
   - If `audit_output.po_found` is False: return escalate_manual_review action with slack_sent=True
   - If `audit_output.po_found` is True AND `vision_output.severity` is "high": return file_dispute_with_alert action with slack_sent=True
   - If `audit_output.po_found` is True AND `vision_output.severity` is not "high": return file_dispute_silent action with slack_sent=False
   - Generate summary string appropriate to the action
   - All returned objects use `generate_dispute_id()` for dispute_id and `datetime.utcnow().isoformat() + "Z"` for timestamp
7. `SLACK_MANUAL_REVIEW_PAYLOAD`: dict constant — The Block Kit JSON from the decisions document Section 5.3. Contains header, fields section, divider, action message, image block placeholder, context footer. Uses `{DISPUTE_ID}`, `{IMAGE_URL_PLACEHOLDER}`, `{AUDIT_LINK}` as substitution placeholders.
8. `SLACK_SILENT_DISPUTE_PAYLOAD`: dict constant — The Block Kit JSON from the decisions document Section 5.4. Contains header, fields section, divider, action message, context footer. Uses `{DISPUTE_ID}` and `{AUDIT_LINK}` as substitution placeholders.
9. `send_slack(payload: dict) -> bool` — If `SLACK_WEBHOOK_URL` is empty, returns False. Posts payload as JSON to webhook URL with 10-second timeout. Returns True on 200 status, False otherwise. Catches all exceptions and returns False.
10. `format_and_send_slack(output: DisputeCoordinatorOutput, image_url: str = "") -> bool` — Selects the correct payload template based on `output.action`. Performs string substitution on placeholders: replaces `{DISPUTE_ID}`, `{AUDIT_LINK}`, and `{IMAGE_URL_PLACEHOLDER}` if image_url is provided. Calls `send_slack()` with the formatted payload. Returns the boolean result.
11. `DISPUTE_FALLBACK_ESCALATE`: DisputeCoordinatorOutput constant — dispute_id="DSP-2024-0147", timestamp="2024-06-03T14:32:06Z", action="escalate_manual_review", slack_sent=True, severity="high", tracking_number="1Z999AA1012345678", tracking_number_status="incomplete", vendor_name=None, po_number=None, claimed_damages=None, sla_threshold=None, summary="High-severity damage detected. Tracking number incomplete. No PO match. Escalated for manual review."
12. `DISPUTE_FALLBACK_SILENT`: DisputeCoordinatorOutput constant — dispute_id="DSP-2024-0148", timestamp="2024-06-03T14:33:12Z", action="file_dispute_silent", slack_sent=False, severity="low", tracking_number="74891234567890", tracking_number_status="complete", vendor_name="FastShip Supply", po_number="PO-2024-0887", claimed_damages=430, sla_threshold=250, summary="Low-severity damage. PO matched. Dispute filed silently. $430 in claimed damages against FastShip Supply."

**Functions exported:** `coordinate`, `send_slack`, `format_and_send_slack`, `DISPUTE_FALLBACK_ESCALATE`, `DISPUTE_FALLBACK_SILENT`, `SLACK_MANUAL_REVIEW_PAYLOAD`, `SLACK_SILENT_DISPUTE_PAYLOAD`

**Error handling:** `coordinate` never raises exceptions (all inputs handled). `send_slack` catches all exceptions and returns False.

---

### 2.5 fallbacks.py

**Purpose:** Single import point for all fallback constants. Simplifies the integration harness.

**Line budget:** 40 lines maximum.

**Contents in order:**
1. Module docstring
2. Imports from agent modules:
   - `from vision_inspector import VISION_FALLBACK_NO_MATCH, VISION_FALLBACK_HAPPY_PATH`
   - `from audit_core import AUDIT_FALLBACK_NO_MATCH, AUDIT_FALLBACK_MATCH`
   - `from dispute_coordinator import DISPUTE_FALLBACK_ESCALATE, DISPUTE_FALLBACK_SILENT`
3. `__all__` list exporting all six constant names
4. No functions. No classes. Pure re-export module.

**Dependencies:** vision_inspector, audit_core, dispute_coordinator

---

### 2.6 main.py

**Purpose:** Integration harness. Wires the three agents together. Provides demo scenario runner. Contains the Phinite Aura prompt as a comment.

**Line budget:** 150 lines maximum.

**Contents in order:**
1. Module docstring
2. Block comment: The Phinite Aura topology prompt from the decisions document Section 12. This is a comment, not executable code.
3. Imports: `os`, `sys`, `datetime.datetime`, `contracts.VisionInspectorOutput`, `contracts.AuditCoreOutput`, `contracts.DisputeCoordinatorOutput`, `vision_inspector.inspect_image`, `vision_inspector.VISION_FALLBACK_NO_MATCH`, `vision_inspector.VISION_FALLBACK_HAPPY_PATH`, `audit_core.lookup_po`, `audit_core.AUDIT_FALLBACK_NO_MATCH`, `audit_core.AUDIT_FALLBACK_MATCH`, `dispute_coordinator.coordinate`, `dispute_coordinator.format_and_send_slack`, `dispute_coordinator.DISPUTE_FALLBACK_ESCALATE`, `dispute_coordinator.DISPUTE_FALLBACK_SILENT`
4. `run_pipeline(image_path: str, use_fallbacks: bool = False, slack_image_url: str = "") -> DisputeCoordinatorOutput` — The main integration function. Implementation:
   - Stage 1: Try `inspect_image(image_path)`. On exception, select fallback based on image_path contents (contains "crushed" or "no_match" → VISION_FALLBACK_NO_MATCH, else → VISION_FALLBACK_HAPPY_PATH).
   - Check termination: if vision_output.damage_detected is False, return terminate_no_damage DisputeCoordinatorOutput directly (do not call downstream agents).
   - Stage 2: Try `lookup_po(vision_output.tracking_number)`. On exception, select fallback based on vision_output.parse_success (True → AUDIT_FALLBACK_MATCH, False → AUDIT_FALLBACK_NO_MATCH).
   - Stage 3: Try `coordinate(vision_output, audit_output)`. On exception, select fallback based on audit_output.po_found (True → DISPUTE_FALLBACK_SILENT, False → DISPUTE_FALLBACK_ESCALATE).
   - If coordinator_output.slack_sent is True, call `format_and_send_slack(coordinator_output, slack_image_url)`.
   - Return coordinator_output.
5. `run_demo_scenario_1() -> DisputeCoordinatorOutput` — Calls `run_pipeline("crushed_box_torn_label.jpg", use_fallbacks=False)`. Prints stage-by-stage output. Returns the final output.
6. `run_demo_scenario_2() -> DisputeCoordinatorOutput` — Calls `run_pipeline("scuffed_box_clean_label.jpg", use_fallbacks=False)`. Prints stage-by-stage output. Returns the final output.
7. `run_both_scenarios() -> None` — Calls scenario 1, prints separator, calls scenario 2. Prints summary table comparing both outputs.
8. `if __name__ == "__main__"` block — Calls `run_both_scenarios()`.

**Error handling:** `run_pipeline` catches exceptions at each stage and activates the appropriate fallback. The pipeline always returns a DisputeCoordinatorOutput. It never raises an unhandled exception.

---

## 3. EXECUTION FLOW

### 3.1 Normal Execution Path

```
main.run_pipeline(image_path)
  │
  ├── vision_inspector.inspect_image(image_path)
  │     ├── call_gmi_vision(image_path)          # HTTP POST to GMI
  │     ├── extract_json(raw_response)           # Regex strip
  │     └── validate_vision_output(data)         # Schema check
  │     Return: VisionInspectorOutput
  │
  ├── [Check: damage_detected?]
  │     If False: return terminate_no_damage DisputeCoordinatorOutput
  │
  ├── audit_core.lookup_po(tracking_number)
  │     └── Iterate PURCHASE_ORDERS for exact match
  │     Return: AuditCoreOutput
  │
  ├── dispute_coordinator.coordinate(vision_output, audit_output)
  │     ├── Apply routing rules
  │     ├── generate_dispute_id()
  │     └── Build summary string
  │     Return: DisputeCoordinatorOutput
  │
  └── [Check: slack_sent?]
        If True: dispute_coordinator.format_and_send_slack(output, image_url)
        Return: DisputeCoordinatorOutput
```

### 3.2 Fallback Execution Path (any stage failure)

```
main.run_pipeline(image_path, use_fallbacks=True)
  │
  ├── vision_inspector.inspect_image(image_path)
  │     └── [EXCEPTION]
  │     └── get_vision_fallback(image_path)
  │           ├── "crushed" in image_path → VISION_FALLBACK_NO_MATCH
  │           └── else → VISION_FALLBACK_HAPPY_PATH
  │     Return: VisionInspectorOutput (hardcoded)
  │
  ├── audit_core.lookup_po(tracking_number)
  │     └── [EXCEPTION]
  │     └── If vision_output.parse_success → AUDIT_FALLBACK_MATCH
  │         Else → AUDIT_FALLBACK_NO_MATCH
  │     Return: AuditCoreOutput (hardcoded)
  │
  ├── dispute_coordinator.coordinate(vision_output, audit_output)
  │     └── [EXCEPTION]
  │     └── If audit_output.po_found → DISPUTE_FALLBACK_SILENT
  │         Else → DISPUTE_FALLBACK_ESCALATE
  │     Return: DisputeCoordinatorOutput (hardcoded)
  │
  └── [Check: slack_sent?]
        If True: dispute_coordinator.format_and_send_slack(output, image_url)
        Return: DisputeCoordinatorOutput
```

---

## 4. DEPENDENCY GRAPH

```
contracts.py          (no internal dependencies)
    ^
    |
    +---- vision_inspector.py  (depends: contracts)
    +---- audit_core.py        (depends: contracts)
    +---- dispute_coordinator.py (depends: contracts)
    
fallbacks.py          (depends: vision_inspector, audit_core, dispute_coordinator)
    ^
    |
main.py               (depends: contracts, vision_inspector, audit_core, 
                       dispute_coordinator, fallbacks)
```

Generate files in this order:
1. `contracts.py`
2. `vision_inspector.py`
3. `audit_core.py`
4. `dispute_coordinator.py`
5. `fallbacks.py`
6. `main.py`

---

## 5. EXTERNAL DEPENDENCIES

### 5.1 Python Standard Library
- `base64` — Image encoding for GMI API
- `json` — JSON parsing and serialization
- `os` — Environment variable access
- `re` — Regex for JSON stripping
- `random` — Dispute ID generation
- `dataclasses` — Type definitions
- `typing` — Type hints
- `datetime` — Timestamps and dispute IDs

### 5.2 Third-Party Library
- `requests` — HTTP calls to GMI API and Slack webhook

No other third-party libraries. Do not import `langchain`, `openai`, `pydantic`, or any other package.

### 5.3 External Services
- GMI Cloud API: `https://api.gmi-serving.com/v1/chat/completions` — Requires `GMI_API_KEY` environment variable
- Slack Webhook: URL stored in `SLACK_WEBHOOK_URL` environment variable

---

## 6. ENVIRONMENT VARIABLES

| Variable | Required | Used By | Default |
|----------|----------|---------|---------|
| `GMI_API_KEY` | Yes | vision_inspector.py | Empty string (API call raises ValueError if empty) |
| `SLACK_WEBHOOK_URL` | No | dispute_coordinator.py | Empty string (Slack calls silently skipped if empty) |

---

## 7. GENERATION INSTRUCTIONS

Generate six Python files in the order specified in Section 4. Each file must:

- Stay within its line budget
- Use only the imports listed in its specification
- Export only the functions and constants listed
- Include type hints on all function signatures
- Include docstrings on all public functions and module-level constants
- Use synchronous functions exclusively (no `async`/`await`)
- Handle errors as specified — no unexpected exceptions
- Not import from files later in the dependency order

Do not generate:
- Test files
- Configuration files (`.env`, `.yaml`, `.json`)
- Documentation files
- Image files
- Shell scripts
- Docker files
- Any file not listed in Section 1

---

END OF IMPLEMENTATION STRATEGY