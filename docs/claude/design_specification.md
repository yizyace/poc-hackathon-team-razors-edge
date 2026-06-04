# VisionOps Design Specification
## Target: Claude Code Generation

---

### DOCUMENT PURPOSE

This document contains every design decision required to generate the VisionOps system. It is written for machine consumption. Ambiguity has been eliminated. Every component has explicit inputs, outputs, behavior, and fallback data. Generate code against this specification directly.

---

## 1. SYSTEM ARCHITECTURE

VisionOps is a three-agent pipeline that processes warehouse package images and automates supply chain dispute resolution.

### 1.1 Agent Topology

```
[Vision Inspector] --> [Audit Core] --> [Dispute Coordinator]
```

**Vision Inspector:** Receives an image file path. Calls GMI Cloud vision-language model. Returns structured damage assessment with label text extraction.

**Audit Core:** Receives a tracking number string. Queries a local mock purchase order database. Returns match status and vendor information.

**Dispute Coordinator:** Receives Vision Inspector output and Audit Core output. Applies routing logic based on severity and match status. Generates Slack Block Kit payloads. Returns dispute record.

### 1.2 Routing Rules

Rule 1: If `damage_detected == false`, terminate workflow. Do not call Audit Core. Return termination status.

Rule 2: If `parse_success == false` AND `retry_count < 2`, retry Vision Inspector call once with simplified prompt. If `parse_success == false` AND `retry_count >= 2`, proceed to Audit Core with partial data.

Rule 3: If `po_found == false`, escalate to Slack alert with manual review request. Severity is irrelevant when PO is not found.

Rule 4: If `po_found == true` AND `severity == "high"`, file dispute AND send Slack alert.

Rule 5: If `po_found == true` AND `severity != "high"`, file dispute silently. No Slack alert.

### 1.3 Terminal States

| State | Trigger | Action |
|-------|---------|--------|
| TERMINATE_NO_DAMAGE | `damage_detected == false` | Workflow ends. No further processing. |
| ESCALATE_MANUAL_REVIEW | `po_found == false` | Slack alert sent. Human intervention requested. |
| FILE_DISPUTE_WITH_ALERT | `po_found == true` AND `severity == "high"` | Dispute filed. Slack alert sent. |
| FILE_DISPUTE_SILENT | `po_found == true` AND `severity != "high"` | Dispute filed. No Slack alert. |
| ERROR_FALLBACK | Any unhandled exception | Activate hardcoded fallback for failed component. Continue pipeline. |

---

## 2. INTERFACE CONTRACTS

### 2.1 VisionInspectorOutput

```python
{
    "damage_detected": bool,          # True if any damage visible
    "severity": str,                  # "low" | "medium" | "high"
    "tracking_number": str | None,    # Extracted tracking number, null if unreadable
    "carrier": str | None,            # "UPS" | "FedEx" | "USPS" | None
    "raw_label_text": str,            # All readable text from label, truncated if partial
    "parse_success": bool,            # True if JSON is valid and fields populated correctly
    "confidence": str                 # "low" | "medium" | "high"
}
```

### 2.2 AuditCoreOutput

```python
{
    "po_found": bool,                      # True if tracking number matches a PO
    "tracking_number_queried": str,        # The tracking number that was looked up
    "reason": str,                         # "exact_match" | "tracking_number_incomplete" | "no_match"
    "vendor_name": str | None,             # Vendor name if match found
    "po_number": str | None,               # PO number if match found
    "sla_threshold": int | None,           # Dollar threshold from vendor SLA
    "order_value": int | None,             # Dollar value of the order
    "suggested_action": str                # "manual_review" | "file_dispute"
}
```

### 2.3 DisputeCoordinatorOutput

```python
{
    "dispute_id": str,                     # Format: DSP-YYYY-NNNN
    "timestamp": str,                      # ISO 8601 format
    "action": str,                         # "escalate_manual_review" | "file_dispute_silent" | "file_dispute_with_alert"
    "slack_sent": bool,                    # True if Slack webhook was called
    "severity": str,                       # From Vision Inspector
    "tracking_number": str,                # From Vision Inspector
    "tracking_number_status": str,         # "complete" | "incomplete"
    "vendor_name": str | None,             # From Audit Core
    "po_number": str | None,               # From Audit Core
    "claimed_damages": int | None,         # Order value from Audit Core if match found
    "sla_threshold": int | None,           # From Audit Core
    "summary": str                         # Human-readable one-line description of action taken
}
```

---

## 3. VISION INSPECTOR SPECIFICATION

### 3.1 VLM Prompt

Use this exact prompt structure. Do not modify.

```
You are a headless REST API server. You receive instructions and return ONLY raw, valid JSON. Do not include markdown formatting, conversational text, or explanations.

Analyze the provided image of a shipped package. Complete these tasks in order:

1. DAMAGE ASSESSMENT: Determine if the package shows visible damage. Classify severity as:
   - "low": Cosmetic damage only. Product inside likely intact. Minor scuffs, scratches, or light wear.
   - "medium": Visible damage to packaging. Product may be compromised. Dents, punctures, or significant wear.
   - "high": Severe structural damage. Product likely destroyed. Crushed corners, large tears, liquid leaking, or box structurally compromised.

2. LABEL EXTRACTION: Read all visible text on the shipping label. Extract the tracking number, carrier name, and any vendor or PO references. If the label is torn, obscured, or partially unreadable, record only what is clearly visible. Do not guess missing characters.

3. OUTPUT FORMAT: Return ONLY this exact JSON structure with no surrounding text:

{
  "damage_detected": true,
  "severity": "low",
  "tracking_number": "1Z999AA10123456784",
  "carrier": "UPS",
  "raw_label_text": "full readable text here",
  "parse_success": true,
  "confidence": "high"
}

If the tracking number cannot be read with confidence, set tracking_number to null and parse_success to false. If the label is partially readable, include what is visible in raw_label_text with "[label torn]" or "[illegible]" marking gaps. Set confidence to "low" when data is incomplete. Do not fabricate a tracking number.
```

### 3.2 API Call

```python
import base64
import requests

def call_gmi_vision(image_path: str) -> dict:
    with open(image_path, "rb") as f:
        image_bytes = f.read()
    image_b64 = base64.b64encode(image_bytes).decode("utf-8")
    
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {GMI_API_KEY}"
    }
    
    payload = {
        "model": "nvidia/NVIDIA-Nemotron-3-Nano-Omni",
        "messages": [
            {"role": "system", "content": "You are a headless REST API server. You return ONLY valid JSON."},
            {"role": "user", "content": [
                {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{image_b64}"}}
            ]}
        ],
        "temperature": 0,
        "max_completion_tokens": 500,
        "response_format": {"type": "json_object"}
    }
    
    response = requests.post(
        "https://api.gmi-serving.com/v1/chat/completions",
        headers=headers,
        json=payload,
        timeout=30
    )
    
    return response.json()
```

### 3.3 JSON Stripping

Apply this regex to the raw model response before parsing:

```python
import re
import json

def extract_json(raw_response: str) -> dict:
    # Strip any text before first { and after last }
    match = re.search(r'\{.*\}', raw_response, re.DOTALL)
    if match:
        return json.loads(match.group())
    raise ValueError("No JSON object found in response")
```

### 3.4 Schema Validation and Retry Logic

```python
def inspect_image(image_path: str, retry_count: int = 0) -> VisionInspectorOutput:
    try:
        raw = call_gmi_vision(image_path)
        content = raw["choices"][0]["message"]["content"]
        data = extract_json(content)
        
        # Validate required fields
        required = ["damage_detected", "severity", "tracking_number", "carrier", "raw_label_text", "parse_success", "confidence"]
        for field in required:
            if field not in data:
                raise ValueError(f"Missing required field: {field}")
        
        # Validate severity values
        if data["severity"] not in ["low", "medium", "high"]:
            raise ValueError(f"Invalid severity: {data['severity']}")
        
        # Validate confidence values
        if data["confidence"] not in ["low", "medium", "high"]:
            raise ValueError(f"Invalid confidence: {data['confidence']}")
        
        return VisionInspectorOutput(**data)
        
    except Exception as e:
        if retry_count < 2:
            return inspect_image(image_path, retry_count + 1)
        else:
            # Activate fallback
            return get_vision_fallback(image_path)
```

---

## 4. AUDIT CORE SPECIFICATION

### 4.1 Mock Purchase Order Database

```python
PURCHASE_ORDERS = [
    {
        "tracking_number": "1Z999AA10123456784",
        "vendor_name": "Acme Packaging",
        "po_number": "PO-2024-0892",
        "sla_threshold": 500,
        "order_value": 2340
    },
    {
        "tracking_number": "9400111899223456789012",
        "vendor_name": "GlobalSource Ltd",
        "po_number": "PO-2024-0901",
        "sla_threshold": 1000,
        "order_value": 8750
    },
    {
        "tracking_number": "74891234567890",
        "vendor_name": "FastShip Supply",
        "po_number": "PO-2024-0887",
        "sla_threshold": 250,
        "order_value": 430
    },
    {
        "tracking_number": "1Z999AA10123456999",
        "vendor_name": "Meridian Goods",
        "po_number": "PO-2024-0915",
        "sla_threshold": 750,
        "order_value": 1200
    },
    {
        "tracking_number": "9205590123456789012345",
        "vendor_name": "Pacific Rim Dist",
        "po_number": "PO-2024-0922",
        "sla_threshold": 500,
        "order_value": 3600
    }
]
```

### 4.2 Lookup Function

```python
def lookup_po(tracking_number: str) -> AuditCoreOutput:
    if tracking_number is None:
        return AuditCoreOutput(
            po_found=False,
            tracking_number_queried="null",
            reason="tracking_number_incomplete",
            vendor_name=None,
            po_number=None,
            sla_threshold=None,
            order_value=None,
            suggested_action="manual_review"
        )
    
    for po in PURCHASE_ORDERS:
        if po["tracking_number"] == tracking_number:
            return AuditCoreOutput(
                po_found=True,
                tracking_number_queried=tracking_number,
                reason="exact_match",
                vendor_name=po["vendor_name"],
                po_number=po["po_number"],
                sla_threshold=po["sla_threshold"],
                order_value=po["order_value"],
                suggested_action="file_dispute"
            )
    
    # No match found
    return AuditCoreOutput(
        po_found=False,
        tracking_number_queried=tracking_number,
        reason="no_match" if len(tracking_number) > 10 else "tracking_number_incomplete",
        vendor_name=None,
        po_number=None,
        sla_threshold=None,
        order_value=None,
        suggested_action="manual_review"
    )
```

---

## 5. DISPUTE COORDINATOR SPECIFICATION

### 5.1 Routing Logic

```python
def coordinate(vision_output: VisionInspectorOutput, audit_output: AuditCoreOutput) -> DisputeCoordinatorOutput:
    dispute_id = generate_dispute_id()
    timestamp = datetime.utcnow().isoformat() + "Z"
    tracking_status = "complete" if vision_output.parse_success else "incomplete"
    
    # Rule 3: PO not found always escalates
    if not audit_output.po_found:
        return DisputeCoordinatorOutput(
            dispute_id=dispute_id,
            timestamp=timestamp,
            action="escalate_manual_review",
            slack_sent=True,
            severity=vision_output.severity,
            tracking_number=vision_output.tracking_number or "unreadable",
            tracking_number_status=tracking_status,
            vendor_name=None,
            po_number=None,
            claimed_damages=None,
            sla_threshold=None,
            summary=f"High-severity damage detected. Tracking number incomplete. No PO match. Escalated for manual review."
        )
    
    # PO found: route by severity
    if vision_output.severity == "high":
        action = "file_dispute_with_alert"
        slack_sent = True
        summary = f"High-severity damage. Dispute filed against {audit_output.vendor_name}. ${audit_output.order_value} in claimed damages. Slack alert sent."
    else:
        action = "file_dispute_silent"
        slack_sent = False
        summary = f"Low-severity damage. PO matched. Dispute filed silently. ${audit_output.order_value} in claimed damages against {audit_output.vendor_name}."
    
    return DisputeCoordinatorOutput(
        dispute_id=dispute_id,
        timestamp=timestamp,
        action=action,
        slack_sent=slack_sent,
        severity=vision_output.severity,
        tracking_number=vision_output.tracking_number,
        tracking_number_status=tracking_status,
        vendor_name=audit_output.vendor_name,
        po_number=audit_output.po_number,
        claimed_damages=audit_output.order_value,
        sla_threshold=audit_output.sla_threshold,
        summary=summary
    )
```

### 5.2 Dispute ID Generation

```python
import random
from datetime import datetime

def generate_dispute_id() -> str:
    year = datetime.utcnow().year
    sequence = random.randint(1000, 9999)
    return f"DSP-{year}-{sequence}"
```

### 5.3 Slack Block Kit Payload: Manual Review Alert

```python
SLACK_MANUAL_REVIEW_PAYLOAD = {
    "blocks": [
        {
            "type": "header",
            "text": {
                "type": "plain_text",
                "text": "⚠️ HIGH SEVERITY — Manual Review Required",
                "emoji": True
            }
        },
        {
            "type": "section",
            "fields": [
                {"type": "mrkdwn", "text": "*Tracking Number:*\n1Z999AA1012345678 (INCOMPLETE)"},
                {"type": "mrkdwn", "text": "*Carrier:*\nUPS"},
                {"type": "mrkdwn", "text": "*Damage Severity:*\nHIGH"},
                {"type": "mrkdwn", "text": "*Label Readable:*\nPARTIAL"}
            ]
        },
        {"type": "divider"},
        {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": "The tracking number could not be fully resolved. No matching purchase order found. A human must verify this shipment manually."
            }
        },
        {
            "type": "image",
            "image_url": "{IMAGE_URL_PLACEHOLDER}",
            "alt_text": "Damaged package label"
        },
        {
            "type": "context",
            "elements": [
                {"type": "mrkdwn", "text": "VisionOps | Run: {DISPUTE_ID} | Audit trail: {AUDIT_LINK}"}
            ]
        }
    ]
}
```

### 5.4 Slack Block Kit Payload: Silent Dispute (Not Sent Live)

```python
SLACK_SILENT_DISPUTE_PAYLOAD = {
    "blocks": [
        {
            "type": "header",
            "text": {
                "type": "plain_text",
                "text": "✅ Dispute Auto-Filed — No Action Required",
                "emoji": True
            }
        },
        {
            "type": "section",
            "fields": [
                {"type": "mrkdwn", "text": "*Tracking Number:*\n74891234567890"},
                {"type": "mrkdwn", "text": "*Vendor:*\nFastShip Supply"},
                {"type": "mrkdwn", "text": "*PO Number:*\nPO-2024-0887"},
                {"type": "mrkdwn", "text": "*Severity:*\nLOW"}
            ]
        },
        {"type": "divider"},
        {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": "Damages below alert threshold. Dispute #{DISPUTE_ID} filed against FastShip Supply. $430 in claimed damages. No human intervention needed."
            }
        },
        {
            "type": "context",
            "elements": [
                {"type": "mrkdwn", "text": "VisionOps | Run: {DISPUTE_ID} | Audit trail: {AUDIT_LINK}"}
            ]
        }
    ]
}
```

### 5.5 Slack Webhook Call

```python
def send_slack(payload: dict) -> bool:
    webhook_url = os.environ.get("SLACK_WEBHOOK_URL")
    if not webhook_url:
        return False
    
    # Replace placeholders
    payload_str = json.dumps(payload)
    # Placeholder substitution handled by caller
    
    response = requests.post(webhook_url, json=payload, timeout=10)
    return response.status_code == 200
```

---

## 6. FALLBACK DATA

### 6.1 Vision Inspector Fallback: No-Match Scenario (Run 1)

```python
VISION_FALLBACK_NO_MATCH = VisionInspectorOutput(
    damage_detected=True,
    severity="high",
    tracking_number="1Z999AA1012345678",
    carrier="UPS",
    raw_label_text="1Z999AA1012345678... [label torn] ...Acme Packaging... REF: PO-2024-",
    parse_success=False,
    confidence="low"
)
```

### 6.2 Vision Inspector Fallback: Happy Path Scenario (Run 2)

```python
VISION_FALLBACK_HAPPY_PATH = VisionInspectorOutput(
    damage_detected=True,
    severity="low",
    tracking_number="74891234567890",
    carrier="FedEx",
    raw_label_text="74891234567890 FedEx FastShip Supply PO-2024-0887",
    parse_success=True,
    confidence="high"
)
```

### 6.3 Audit Core Fallback: No-Match

```python
AUDIT_FALLBACK_NO_MATCH = AuditCoreOutput(
    po_found=False,
    tracking_number_queried="1Z999AA1012345678",
    reason="tracking_number_incomplete",
    vendor_name=None,
    po_number=None,
    sla_threshold=None,
    order_value=None,
    suggested_action="manual_review"
)
```

### 6.4 Audit Core Fallback: Match

```python
AUDIT_FALLBACK_MATCH = AuditCoreOutput(
    po_found=True,
    tracking_number_queried="74891234567890",
    reason="exact_match",
    vendor_name="FastShip Supply",
    po_number="PO-2024-0887",
    sla_threshold=250,
    order_value=430,
    suggested_action="file_dispute"
)
```

### 6.5 Dispute Coordinator Fallback: Escalate

```python
DISPUTE_FALLBACK_ESCALATE = DisputeCoordinatorOutput(
    dispute_id="DSP-2024-0147",
    timestamp="2024-06-03T14:32:06Z",
    action="escalate_manual_review",
    slack_sent=True,
    severity="high",
    tracking_number="1Z999AA1012345678",
    tracking_number_status="incomplete",
    vendor_name=None,
    po_number=None,
    claimed_damages=None,
    sla_threshold=None,
    summary="High-severity damage detected. Tracking number incomplete. No PO match. Escalated for manual review."
)
```

### 6.6 Dispute Coordinator Fallback: Silent

```python
DISPUTE_FALLBACK_SILENT = DisputeCoordinatorOutput(
    dispute_id="DSP-2024-0148",
    timestamp="2024-06-03T14:33:12Z",
    action="file_dispute_silent",
    slack_sent=False,
    severity="low",
    tracking_number="74891234567890",
    tracking_number_status="complete",
    vendor_name="FastShip Supply",
    po_number="PO-2024-0887",
    claimed_damages=430,
    sla_threshold=250,
    summary="Low-severity damage. PO matched. Dispute filed silently. $430 in claimed damages against FastShip Supply."
)
```

---

## 7. DATA MODEL DEFINITIONS

Generate these as Python dataclasses with type hints:

```python
from dataclasses import dataclass
from typing import Optional

@dataclass
class VisionInspectorOutput:
    damage_detected: bool
    severity: str
    tracking_number: Optional[str]
    carrier: Optional[str]
    raw_label_text: str
    parse_success: bool
    confidence: str

@dataclass
class AuditCoreOutput:
    po_found: bool
    tracking_number_queried: str
    reason: str
    vendor_name: Optional[str]
    po_number: Optional[str]
    sla_threshold: Optional[int]
    order_value: Optional[int]
    suggested_action: str

@dataclass
class DisputeCoordinatorOutput:
    dispute_id: str
    timestamp: str
    action: str
    slack_sent: bool
    severity: str
    tracking_number: str
    tracking_number_status: str
    vendor_name: Optional[str]
    po_number: Optional[str]
    claimed_damages: Optional[int]
    sla_threshold: Optional[int]
    summary: str
```

---

## 8. INTEGRATION HARNESS

### 8.1 Main Pipeline

```python
import os
import sys
from typing import Optional

def run_pipeline(image_path: str, use_fallbacks: bool = False) -> DisputeCoordinatorOutput:
    # Stage 1: Vision Inspection
    try:
        if use_fallbacks:
            raise Exception("Fallback mode activated")
        vision_output = inspect_image(image_path)
    except Exception:
        if "no_match" in image_path or "crushed" in image_path:
            vision_output = VISION_FALLBACK_NO_MATCH
        else:
            vision_output = VISION_FALLBACK_HAPPY_PATH
    
    # Termination check
    if not vision_output.damage_detected:
        return DisputeCoordinatorOutput(
            dispute_id="N/A",
            timestamp=datetime.utcnow().isoformat() + "Z",
            action="terminate_no_damage",
            slack_sent=False,
            severity="none",
            tracking_number=vision_output.tracking_number or "unreadable",
            tracking_number_status="n/a",
            vendor_name=None,
            po_number=None,
            claimed_damages=None,
            sla_threshold=None,
            summary="No damage detected. Workflow terminated."
        )
    
    # Stage 2: Audit Lookup
    try:
        if use_fallbacks:
            raise Exception("Fallback mode activated")
        audit_output = lookup_po(vision_output.tracking_number)
    except Exception:
        if vision_output.parse_success:
            audit_output = AUDIT_FALLBACK_MATCH
        else:
            audit_output = AUDIT_FALLBACK_NO_MATCH
    
    # Stage 3: Dispute Coordination
    try:
        coordinator_output = coordinate(vision_output, audit_output)
    except Exception:
        if audit_output.po_found:
            coordinator_output = DISPUTE_FALLBACK_SILENT
        else:
            coordinator_output = DISPUTE_FALLBACK_ESCALATE
    
    return coordinator_output
```

### 8.2 Slack Sending with Placeholder Substitution

```python
def format_and_send_slack(output: DisputeCoordinatorOutput, image_url: str = "") -> bool:
    if output.action == "escalate_manual_review":
        payload = json.loads(json.dumps(SLACK_MANUAL_REVIEW_PAYLOAD))
    elif output.action == "file_dispute_silent":
        payload = json.loads(json.dumps(SLACK_SILENT_DISPUTE_PAYLOAD))
    elif output.action == "file_dispute_with_alert":
        payload = json.loads(json.dumps(SLACK_MANUAL_REVIEW_PAYLOAD))
    else:
        return False
    
    # String substitution for placeholders
    payload_str = json.dumps(payload)
    payload_str = payload_str.replace("{DISPUTE_ID}", output.dispute_id)
    payload_str = payload_str.replace("{AUDIT_LINK}", f"https://phinite.com/audit/{output.dispute_id}")
    if image_url:
        payload_str = payload_str.replace("{IMAGE_URL_PLACEHOLDER}", image_url)
    payload = json.loads(payload_str)
    
    return send_slack(payload)
```

---

## 9. DEMO SCENARIO CONFIGURATIONS

### 9.1 Run 1: No-Match (Guardrail Case)

**Image:** `crushed_box_torn_label.jpg` — A heavily crushed box with a torn shipping label. The tracking number `1Z999AA10123456784` has its final digit `4` torn off. Vendor name "Acme Packaging" partially visible.

**Expected Vision Inspector Output:** `damage_detected: true`, `severity: high`, `tracking_number: "1Z999AA1012345678"`, `parse_success: false`, `confidence: low`

**Expected Audit Core Output:** `po_found: false`, `reason: "tracking_number_incomplete"`

**Expected Dispute Coordinator Output:** `action: "escalate_manual_review"`, `slack_sent: true`

### 9.2 Run 2: Happy Path (Efficiency Case)

**Image:** `scuffed_box_clean_label.jpg` — A lightly scuffed box with a perfectly readable label. Tracking number `74891234567890` fully visible. Vendor "FastShip Supply" clearly readable.

**Expected Vision Inspector Output:** `damage_detected: true`, `severity: low`, `tracking_number: "74891234567890"`, `parse_success: true`, `confidence: high`

**Expected Audit Core Output:** `po_found: true`, `vendor_name: "FastShip Supply"`, `order_value: 430`

**Expected Dispute Coordinator Output:** `action: "file_dispute_silent"`, `slack_sent: false`

---

## 10. CONFIGURATION CONSTANTS

```python
# Environment Variables
GMI_API_KEY = os.environ.get("GMI_API_KEY", "")
SLACK_WEBHOOK_URL = os.environ.get("SLACK_WEBHOOK_URL", "")

# API Endpoints
GMI_ENDPOINT = "https://api.gmi-serving.com/v1/chat/completions"
GMI_MODEL = "nvidia/NVIDIA-Nemotron-3-Nano-Omni"

# Timing
GMI_TIMEOUT_SECONDS = 30
SLACK_TIMEOUT_SECONDS = 10
MAX_RETRIES = 2

# Dispute ID
DISPUTE_ID_PREFIX = "DSP"
```

---

## 11. GENERATION INSTRUCTIONS

Generate the following files. Each file must be under 150 lines. Use only Python standard library and the `requests` library. Use synchronous functions only. Include type hints on all function signatures. Include module-level docstrings.

1. `contracts.py` — The three dataclass definitions from Section 7.
2. `vision_inspector.py` — The VLM prompt from Section 3.1, the API call from Section 3.2, the JSON stripping from Section 3.3, the validation and retry logic from Section 3.4, and the two fallback constants from Sections 6.1 and 6.2. Import from `contracts`.
3. `audit_core.py` — The purchase order database from Section 4.1, the lookup function from Section 4.2, and the two fallback constants from Sections 6.3 and 6.4. Import from `contracts`.
4. `dispute_coordinator.py` — The routing logic from Section 5.1, the dispute ID generator from Section 5.2, the Slack payloads from Sections 5.3 and 5.4, the Slack webhook call from Section 5.5, and the two fallback constants from Sections 6.5 and 6.6. Import from `contracts`.
5. `fallbacks.py` — Re-export all six fallback constants. Import from the three agent modules.
6. `main.py` — The integration harness from Section 8, the Slack formatting function, the demo scenario configurations from Section 9, and the configuration constants from Section 10. Import from all other modules.

Do not generate any file for Phinite configuration. Phinite is configured manually.

Do not generate any test image files.

Do not generate any markdown documentation.

Generate only the six Python files specified above.

---

## 12. PHINITE AURA TOPOLOGY PROMPT

The following is the plain-language prompt to input into Phinite Aura to generate the three-agent topology. This is not Python code. Include it as a comment block at the top of `main.py`.

```
Create a three-agent workflow called VisionOps for automated supply chain dispute processing.

Agent 1: Vision Inspector
- Receives a package image as input
- Calls an external vision model to detect damage and extract tracking numbers
- Outputs: damage_detected (bool), severity (low/medium/high), tracking_number (string or null), parse_success (bool), confidence (low/medium/high)
- If damage_detected is false, terminate workflow
- If parse_success is false, retry once, then proceed with partial data

Agent 2: Audit Core
- Receives tracking_number from Agent 1
- Queries a purchase order database
- Outputs: po_found (bool), vendor_name, po_number, sla_threshold, order_value, suggested_action
- If no PO found, route to manual review

Agent 3: Dispute Coordinator
- Receives outputs from Agent 1 and Agent 2
- Routing logic:
  * If po_found is false: escalate to manual review, send Slack alert
  * If po_found is true AND severity is high: file dispute, send Slack alert
  * If po_found is true AND severity is low or medium: file dispute silently, no Slack alert
- Outputs: dispute_id, action, slack_sent, summary

Show all five possible terminal states as labeled end nodes:
1. TERMINATE_NO_DAMAGE
2. ESCALATE_MANUAL_REVIEW
3. FILE_DISPUTE_WITH_ALERT
4. FILE_DISPUTE_SILENT
5. ERROR_FALLBACK

Label all edges with their routing conditions.
```

---

END OF SPECIFICATION