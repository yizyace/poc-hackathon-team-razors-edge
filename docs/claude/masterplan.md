# VisionOps Masterplan & Subplans
## Target: Claude Code Generation

---

### DOCUMENT PURPOSE

This document defines the complete build sequence with detailed specifications for each component. The masterplan establishes the generation order and dependencies. Each subplan is a self-contained specification that can be handed to Claude Code independently to generate a single module. All subplans reference the interface contract and implementation strategy for type definitions and function signatures.

---

## MASTERPLAN

### Generation Order

| Phase | File | Line Budget | Dependencies | Estimated Complexity |
|-------|------|-------------|--------------|---------------------|
| 1 | `contracts.py` | 120 | None | Low |
| 2 | `vision_inspector.py` | 150 | contracts | High |
| 3 | `audit_core.py` | 100 | contracts | Low |
| 4 | `dispute_coordinator.py` | 150 | contracts | Medium |
| 5 | `fallbacks.py` | 40 | vision_inspector, audit_core, dispute_coordinator | Trivial |
| 6 | `main.py` | 150 | All modules | Medium |

### Critical Path

`contracts.py` → `vision_inspector.py` → `dispute_coordinator.py` → `main.py`

`audit_core.py` and `fallbacks.py` are parallelizable but low complexity. Generate them in sequence to avoid confusion.

### Integration Checkpoints

After generating Phase 2 (`vision_inspector.py`): Verify it imports `contracts.VisionInspectorOutput` without error.

After generating Phase 4 (`dispute_coordinator.py`): Verify it imports both `contracts.VisionInspectorOutput` and `contracts.AuditCoreOutput`.

After generating Phase 6 (`main.py`): Verify all imports resolve. Run `python main.py` with environment variables set. Expected behavior: pipeline runs to completion using fallbacks (since GMI API key may not be valid at generation time). No import errors. No syntax errors.

---

## SUBPLAN 1: contracts.py

### What This Module Is

The single source of truth for all data structures that cross agent boundaries. Every other module imports its types from here. No module defines its own version of a shared type.

### Exact Contents

**Imports:**
```python
from dataclasses import dataclass
from typing import Optional
```

**Class 1: VisionInspectorOutput**

```python
@dataclass(frozen=True)
class VisionInspectorOutput:
    """Output from Vision Inspector agent after processing a package image."""
    
    damage_detected: bool
    severity: str
    tracking_number: Optional[str]
    carrier: Optional[str]
    raw_label_text: str
    parse_success: bool
    confidence: str

    def __post_init__(self):
        valid_severity = {"low", "medium", "high"}
        valid_confidence = {"low", "medium", "high"}
        valid_carrier = {"UPS", "FedEx", "USPS", None}
        
        if self.severity not in valid_severity:
            raise ValueError(f"Invalid severity: {self.severity}")
        if self.confidence not in valid_confidence:
            raise ValueError(f"Invalid confidence: {self.confidence}")
        if self.carrier not in valid_carrier:
            raise ValueError(f"Invalid carrier: {self.carrier}")
        if not isinstance(self.raw_label_text, str):
            raise ValueError(f"raw_label_text must be string")
```

**Class 2: AuditCoreOutput**

```python
@dataclass(frozen=True)
class AuditCoreOutput:
    """Output from Audit Core agent after purchase order lookup."""
    
    po_found: bool
    tracking_number_queried: str
    reason: str
    vendor_name: Optional[str]
    po_number: Optional[str]
    sla_threshold: Optional[int]
    order_value: Optional[int]
    suggested_action: str

    def __post_init__(self):
        valid_reason = {"exact_match", "tracking_number_incomplete", "no_match"}
        valid_action = {"manual_review", "file_dispute"}
        
        if self.reason not in valid_reason:
            raise ValueError(f"Invalid reason: {self.reason}")
        if self.suggested_action not in valid_action:
            raise ValueError(f"Invalid suggested_action: {self.suggested_action}")
        
        if self.po_found:
            if self.vendor_name is None:
                raise ValueError("vendor_name must not be None when po_found is True")
            if self.po_number is None:
                raise ValueError("po_number must not be None when po_found is True")
            if self.sla_threshold is None:
                raise ValueError("sla_threshold must not be None when po_found is True")
            if self.order_value is None:
                raise ValueError("order_value must not be None when po_found is True")
            if self.suggested_action != "file_dispute":
                raise ValueError(f"suggested_action must be 'file_dispute' when po_found is True")
        else:
            if self.suggested_action != "manual_review":
                raise ValueError(f"suggested_action must be 'manual_review' when po_found is False")
```

**Class 3: DisputeCoordinatorOutput**

```python
@dataclass(frozen=True)
class DisputeCoordinatorOutput:
    """Terminal output from Dispute Coordinator after routing decision."""
    
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

    def __post_init__(self):
        valid_action = {
            "escalate_manual_review",
            "file_dispute_silent",
            "file_dispute_with_alert",
            "terminate_no_damage"
        }
        valid_severity = {"low", "medium", "high", "none"}
        valid_tracking_status = {"complete", "incomplete", "n/a"}
        
        if self.action not in valid_action:
            raise ValueError(f"Invalid action: {self.action}")
        if self.severity not in valid_severity:
            raise ValueError(f"Invalid severity: {self.severity}")
        if self.tracking_number_status not in valid_tracking_status:
            raise ValueError(f"Invalid tracking_number_status: {self.tracking_number_status}")
        
        if not self.dispute_id.startswith("DSP-"):
            raise ValueError(f"dispute_id must start with 'DSP-'")
        
        if self.action == "terminate_no_damage" and self.claimed_damages is not None:
            raise ValueError("claimed_damages must be None when action is terminate_no_damage")
        if self.action == "escalate_manual_review" and not self.slack_sent:
            raise ValueError("slack_sent must be True when action is escalate_manual_review")
        if self.action == "file_dispute_silent" and self.slack_sent:
            raise ValueError("slack_sent must be False when action is file_dispute_silent")
```

### Acceptance Criteria

- File imports without error
- All three classes instantiate correctly with valid data
- All three classes raise ValueError with invalid data
- Frozen=True prevents attribute mutation
- No functions, no executable code beyond class definitions

---

## SUBPLAN 2: vision_inspector.py

### What This Module Is

The interface to the GMI Cloud vision-language model. It sends package images, receives damage assessments, and enforces JSON schema compliance. It is the only module that calls the GMI API.

### Exact Contents

**Imports:**
```python
import base64
import json
import os
import re
import requests
from datetime import datetime
from typing import Optional
from contracts import VisionInspectorOutput
```

**Constants:**
```python
GMI_API_KEY = os.environ.get("GMI_API_KEY", "")
GMI_ENDPOINT = "https://api.gmi-serving.com/v1/chat/completions"
GMI_MODEL = "nvidia/NVIDIA-Nemotron-3-Nano-Omni"
GMI_TIMEOUT = 30
MAX_RETRIES = 2
```

**VLM Prompt:**
```python
VLM_SYSTEM_PROMPT = """You are a headless REST API server. You receive instructions and return ONLY raw, valid JSON. Do not include markdown formatting, conversational text, or explanations.

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

If the tracking number cannot be read with confidence, set tracking_number to null and parse_success to false. If the label is partially readable, include what is visible in raw_label_text with "[label torn]" or "[illegible]" marking gaps. Set confidence to "low" when data is incomplete. Do not fabricate a tracking number."""
```

**Function: call_gmi_vision**
```python
def call_gmi_vision(image_path: str) -> dict:
    """Send image to GMI Cloud vision model and return raw response dict.
    
    Args:
        image_path: Path to the package image file.
        
    Returns:
        Raw API response dict with choices[0].message.content containing the model output.
        
    Raises:
        ValueError: If GMI_API_KEY environment variable is empty.
        requests.exceptions.RequestException: On network or HTTP errors.
    """
    if not GMI_API_KEY:
        raise ValueError("GMI_API_KEY environment variable is not set")
    
    with open(image_path, "rb") as f:
        image_bytes = f.read()
    image_b64 = base64.b64encode(image_bytes).decode("utf-8")
    
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {GMI_API_KEY}"
    }
    
    payload = {
        "model": GMI_MODEL,
        "messages": [
            {"role": "system", "content": VLM_SYSTEM_PROMPT},
            {"role": "user", "content": [
                {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{image_b64}"}}
            ]}
        ],
        "temperature": 0,
        "max_completion_tokens": 500,
        "response_format": {"type": "json_object"}
    }
    
    response = requests.post(
        GMI_ENDPOINT,
        headers=headers,
        json=payload,
        timeout=GMI_TIMEOUT
    )
    response.raise_for_status()
    return response.json()
```

**Function: extract_json**
```python
def extract_json(raw_response: str) -> dict:
    """Extract JSON object from model response, stripping any surrounding text.
    
    Args:
        raw_response: The raw string content from the model.
        
    Returns:
        Parsed JSON dict.
        
    Raises:
        ValueError: If no JSON object is found in the response.
    """
    match = re.search(r'\{.*\}', raw_response, re.DOTALL)
    if match:
        return json.loads(match.group())
    raise ValueError("No JSON object found in response")
```

**Function: validate_vision_output**
```python
def validate_vision_output(data: dict) -> VisionInspectorOutput:
    """Validate and construct VisionInspectorOutput from raw dict.
    
    Args:
        data: Raw dict from JSON parsing.
        
    Returns:
        Validated VisionInspectorOutput instance.
        
    Raises:
        ValueError: If required fields are missing or values are invalid.
    """
    required = ["damage_detected", "severity", "tracking_number", "carrier", 
                "raw_label_text", "parse_success", "confidence"]
    for field in required:
        if field not in data:
            raise ValueError(f"Missing required field: {field}")
    
    return VisionInspectorOutput(
        damage_detected=data["damage_detected"],
        severity=data["severity"],
        tracking_number=data["tracking_number"],
        carrier=data["carrier"],
        raw_label_text=data["raw_label_text"],
        parse_success=data["parse_success"],
        confidence=data["confidence"]
    )
```

**Function: get_vision_fallback**
```python
def get_vision_fallback(image_path: str) -> VisionInspectorOutput:
    """Return the appropriate hardcoded fallback based on image filename.
    
    Args:
        image_path: Path to the image file. Filename is used to select fallback.
        
    Returns:
        VISION_FALLBACK_NO_MATCH if filename contains 'crushed' or 'no_match',
        VISION_FALLBACK_HAPPY_PATH otherwise.
    """
    filename = image_path.lower()
    if "crushed" in filename or "no_match" in filename:
        return VISION_FALLBACK_NO_MATCH
    return VISION_FALLBACK_HAPPY_PATH
```

**Function: inspect_image**
```python
def inspect_image(image_path: str, retry_count: int = 0) -> VisionInspectorOutput:
    """Process a package image and return structured damage assessment.
    
    Calls GMI vision model, validates response, retries on failure.
    Falls back to hardcoded data after exhausting retries.
    
    Args:
        image_path: Path to the package image file.
        retry_count: Current retry attempt (internal use, starts at 0).
        
    Returns:
        VisionInspectorOutput with damage assessment and label data.
    """
    try:
        raw = call_gmi_vision(image_path)
        content = raw["choices"][0]["message"]["content"]
        data = extract_json(content)
        return validate_vision_output(data)
    except Exception:
        if retry_count < MAX_RETRIES:
            return inspect_image(image_path, retry_count + 1)
        return get_vision_fallback(image_path)
```

**Fallback Constants:**
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

### Acceptance Criteria

- Imports contracts.VisionInspectorOutput without error
- `call_gmi_vision` raises ValueError if GMI_API_KEY is empty string
- `extract_json` strips text before `{` and after `}`
- `extract_json` raises ValueError if no `{...}` pattern found
- `validate_vision_output` raises ValueError on missing fields
- `inspect_image` retries exactly MAX_RETRIES times before activating fallback
- `get_vision_fallback` returns NO_MATCH for filenames containing "crushed"
- `get_vision_fallback` returns HAPPY_PATH for all other filenames
- All functions have type hints and docstrings

---

## SUBPLAN 3: audit_core.py

### What This Module Is

A local purchase order database with exact-match lookup. Returns structured match or no-match results. Never calls external services. Never raises exceptions.

### Exact Contents

**Imports:**
```python
from typing import Optional
from contracts import AuditCoreOutput
```

**Purchase Order Database:**
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

**Function: lookup_po**
```python
def lookup_po(tracking_number: Optional[str]) -> AuditCoreOutput:
    """Look up a purchase order by tracking number.
    
    Performs exact-match lookup only. No fuzzy matching.
    
    Args:
        tracking_number: The tracking number string from Vision Inspector.
                         May be None if the label was unreadable.
                         May be incomplete if the label was damaged.
                         
    Returns:
        AuditCoreOutput with po_found=True and vendor data if match found,
        or po_found=False with reason indicating why no match was found.
    """
    # Handle None input
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
    
    # Exact match lookup
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
    
    # No match: determine reason by tracking number length
    reason = "tracking_number_incomplete" if len(tracking_number) <= 15 else "no_match"
    return AuditCoreOutput(
        po_found=False,
        tracking_number_queried=tracking_number,
        reason=reason,
        vendor_name=None,
        po_number=None,
        sla_threshold=None,
        order_value=None,
        suggested_action="manual_review"
    )
```

**Fallback Constants:**
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

### Acceptance Criteria

- Imports contracts.AuditCoreOutput without error
- `lookup_po` with None returns po_found=False, reason="tracking_number_incomplete"
- `lookup_po("74891234567890")` returns po_found=True, vendor_name="FastShip Supply"
- `lookup_po("1Z999AA1012345678")` returns po_found=False, reason="tracking_number_incomplete" (length 17, but no match found — wait, this is 17 chars so reason="no_match" per the > 15 rule — verify that the partial tracking number "1Z999AA1012345678" is 17 characters and will be classified as "no_match" rather than "tracking_number_incomplete")
- IMPORTANT: The partial tracking number "1Z999AA1012345678" from the no-match scenario is 17 characters. The threshold check `len(tracking_number) <= 15` will classify it as reason="no_match" rather than "tracking_number_incomplete". The full tracking number is "1Z999AA10123456784" (18 characters). This is acceptable because the Audit Core does not know whether the number is complete or incomplete — it only knows whether it matched. The reason field describes the lookup result, not the tracking number quality. Keep the threshold at 15 as a heuristic.
- All return paths have po_found and suggested_action consistent
- No function raises exceptions under any input

---

## SUBPLAN 4: dispute_coordinator.py

### What This Module Is

The decision-making agent. Applies routing rules, generates Slack notifications, produces dispute records. The only module that calls the Slack webhook.

### Exact Contents

**Imports:**
```python
import json
import os
import random
import requests
from datetime import datetime
from contracts import DisputeCoordinatorOutput, VisionInspectorOutput, AuditCoreOutput
```

**Constants:**
```python
SLACK_WEBHOOK_URL = os.environ.get("SLACK_WEBHOOK_URL", "")
SLACK_TIMEOUT = 10
```

**Function: generate_dispute_id**
```python
def generate_dispute_id() -> str:
    """Generate a unique dispute identifier.
    
    Format: DSP-YYYY-NNNN where YYYY is the current year and NNNN is a random 4-digit number.
    
    Returns:
        Dispute ID string like 'DSP-2024-0147'.
    """
    year = datetime.utcnow().year
    sequence = random.randint(1000, 9999)
    return f"DSP-{year}-{sequence}"
```

**Function: coordinate**
```python
def coordinate(
    vision_output: VisionInspectorOutput,
    audit_output: AuditCoreOutput
) -> DisputeCoordinatorOutput:
    """Apply routing rules and produce a dispute record.
    
    Routing rules (in priority order):
    1. If damage_detected is False: terminate, no further action
    2. If po_found is False: escalate to manual review, send Slack (severity ignored)
    3. If po_found is True AND severity is "high": file dispute, send Slack
    4. If po_found is True AND severity is not "high": file dispute silently
    
    Args:
        vision_output: Output from Vision Inspector.
        audit_output: Output from Audit Core.
        
    Returns:
        DisputeCoordinatorOutput with action, routing, and summary.
    """
    dispute_id = generate_dispute_id()
    timestamp = datetime.utcnow().isoformat() + "Z"
    tracking_status = "complete" if vision_output.parse_success else "incomplete"
    
    # Rule 1: No damage detected
    if not vision_output.damage_detected:
        return DisputeCoordinatorOutput(
            dispute_id="N/A",
            timestamp=timestamp,
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
    
    # Rule 2: PO not found — always escalate
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
        summary = (
            f"High-severity damage. Dispute filed against {audit_output.vendor_name}. "
            f"${audit_output.order_value} in claimed damages. Slack alert sent."
        )
    else:
        action = "file_dispute_silent"
        slack_sent = False
        summary = (
            f"Low-severity damage. PO matched. Dispute filed silently. "
            f"${audit_output.order_value} in claimed damages against {audit_output.vendor_name}."
        )
    
    return DisputeCoordinatorOutput(
        dispute_id=dispute_id,
        timestamp=timestamp,
        action=action,
        slack_sent=slack_sent,
        severity=vision_output.severity,
        tracking_number=vision_output.tracking_number or "unreadable",
        tracking_number_status=tracking_status,
        vendor_name=audit_output.vendor_name,
        po_number=audit_output.po_number,
        claimed_damages=audit_output.order_value,
        sla_threshold=audit_output.sla_threshold,
        summary=summary
    )
```

**Slack Payloads:**
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
                "text": "Damages below alert threshold. Dispute {DISPUTE_ID} filed against FastShip Supply. $430 in claimed damages. No human intervention needed."
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

**Function: send_slack**
```python
def send_slack(payload: dict) -> bool:
    """Send a Slack message via webhook.
    
    Args:
        payload: Slack Block Kit JSON payload as a dict.
        
    Returns:
        True if the message was sent successfully (HTTP 200), False otherwise.
        Silently handles missing webhook URL, network errors, and non-200 responses.
    """
    if not SLACK_WEBHOOK_URL:
        return False
    
    try:
        response = requests.post(
            SLACK_WEBHOOK_URL,
            json=payload,
            timeout=SLACK_TIMEOUT
        )
        return response.status_code == 200
    except Exception:
        return False
```

**Function: format_and_send_slack**
```python
def format_and_send_slack(output: DisputeCoordinatorOutput, image_url: str = "") -> bool:
    """Format the appropriate Slack payload with dispute data and send it.
    
    Selects the correct payload template based on output.action.
    Substitutes placeholders with actual dispute data.
    
    Args:
        output: The DisputeCoordinatorOutput from coordinate().
        image_url: Optional URL to the damaged package image for the manual review alert.
        
    Returns:
        True if the message was sent successfully, False otherwise.
    """
    if output.action == "escalate_manual_review":
        payload = json.loads(json.dumps(SLACK_MANUAL_REVIEW_PAYLOAD))
    elif output.action == "file_dispute_with_alert":
        payload = json.loads(json.dumps(SLACK_MANUAL_REVIEW_PAYLOAD))
    elif output.action == "file_dispute_silent":
        payload = json.loads(json.dumps(SLACK_SILENT_DISPUTE_PAYLOAD))
    else:
        return False
    
    # Substitute placeholders
    payload_str = json.dumps(payload)
    payload_str = payload_str.replace("{DISPUTE_ID}", output.dispute_id)
    payload_str = payload_str.replace("{AUDIT_LINK}", f"https://phinite.com/audit/{output.dispute_id}")
    if image_url:
        payload_str = payload_str.replace("{IMAGE_URL_PLACEHOLDER}", image_url)
    payload = json.loads(payload_str)
    
    return send_slack(payload)
```

**Fallback Constants:**
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

### Acceptance Criteria

- Imports both contract types without error
- `generate_dispute_id` returns format DSP-YYYY-NNNN
- `coordinate` with damage_detected=False returns terminate_no_damage
- `coordinate` with po_found=False returns escalate_manual_review with slack_sent=True (regardless of severity)
- `coordinate` with po_found=True and severity="high" returns file_dispute_with_alert with slack_sent=True
- `coordinate` with po_found=True and severity="low" returns file_dispute_silent with slack_sent=False
- `coordinate` with po_found=True and severity="medium" returns file_dispute_silent with slack_sent=False
- `send_slack` returns False if SLACK_WEBHOOK_URL is empty string
- `send_slack` returns False on any exception
- `format_and_send_slack` returns False for terminate_no_damage action
- All fallback constants are valid DisputeCoordinatorOutput instances

---

## SUBPLAN 5: fallbacks.py

### What This Module Is

A single import point for all six fallback constants. Eliminates the need for main.py to import from three different modules for fallback data.

### Exact Contents

**Imports:**
```python
from vision_inspector import VISION_FALLBACK_NO_MATCH, VISION_FALLBACK_HAPPY_PATH
from audit_core import AUDIT_FALLBACK_NO_MATCH, AUDIT_FALLBACK_MATCH
from dispute_coordinator import DISPUTE_FALLBACK_ESCALATE, DISPUTE_FALLBACK_SILENT
```

**Exports:**
```python
__all__ = [
    "VISION_FALLBACK_NO_MATCH",
    "VISION_FALLBACK_HAPPY_PATH",
    "AUDIT_FALLBACK_NO_MATCH",
    "AUDIT_FALLBACK_MATCH",
    "DISPUTE_FALLBACK_ESCALATE",
    "DISPUTE_FALLBACK_SILENT",
]
```

### Acceptance Criteria

- File imports without error
- All six constants are accessible via `from fallbacks import CONSTANT_NAME`
- No functions, no classes, no executable code

---

## SUBPLAN 6: main.py

### What This Module Is

The integration harness. Wires the three agents together into a complete pipeline. Provides demo scenario runners. Contains the Phinite Aura topology prompt as a comment block for manual use.

### Exact Contents

**Phinite Aura Prompt (comment block at top of file):**
```python
"""
Phinite Aura Topology Prompt:
-----------------------------
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
"""
```

**Imports:**
```python
import os
import sys
from datetime import datetime

from contracts import VisionInspectorOutput, AuditCoreOutput, DisputeCoordinatorOutput

from vision_inspector import (
    inspect_image,
    VISION_FALLBACK_NO_MATCH,
    VISION_FALLBACK_HAPPY_PATH
)
from audit_core import (
    lookup_po,
    AUDIT_FALLBACK_NO_MATCH,
    AUDIT_FALLBACK_MATCH
)
from dispute_coordinator import (
    coordinate,
    format_and_send_slack,
    DISPUTE_FALLBACK_ESCALATE,
    DISPUTE_FALLBACK_SILENT
)
```

**Function: run_pipeline**
```python
def run_pipeline(
    image_path: str,
    use_fallbacks: bool = False,
    slack_image_url: str = ""
) -> DisputeCoordinatorOutput:
    """Execute the full VisionOps pipeline on a package image.
    
    Three-stage pipeline: Vision Inspector -> Audit Core -> Dispute Coordinator.
    Each stage has a hardcoded fallback activated on failure.
    
    Args:
        image_path: Path to the package image file.
        use_fallbacks: If True, skip live API calls and use hardcoded data.
        slack_image_url: URL to the image for Slack attachment (optional).
        
    Returns:
        DisputeCoordinatorOutput with the final dispute record.
    """
    
    # Stage 1: Vision Inspection
    try:
        if use_fallbacks:
            raise Exception("Fallback mode activated")
        vision_output = inspect_image(image_path)
        print(f"[Stage 1] Vision Inspector: damage_detected={vision_output.damage_detected}, "
              f"severity={vision_output.severity}, parse_success={vision_output.parse_success}")
    except Exception as e:
        print(f"[Stage 1] Vision Inspector failed: {e}")
        filename = image_path.lower()
        if "crushed" in filename or "no_match" in filename:
            vision_output = VISION_FALLBACK_NO_MATCH
        else:
            vision_output = VISION_FALLBACK_HAPPY_PATH
        print(f"[Stage 1] Activated fallback: severity={vision_output.severity}")
    
    # Check termination condition
    if not vision_output.damage_detected:
        print("[Stage 1] No damage detected. Terminating pipeline.")
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
        print(f"[Stage 2] Audit Core: po_found={audit_output.po_found}, "
              f"reason={audit_output.reason}")
    except Exception as e:
        print(f"[Stage 2] Audit Core failed: {e}")
        if vision_output.parse_success:
            audit_output = AUDIT_FALLBACK_MATCH
        else:
            audit_output = AUDIT_FALLBACK_NO_MATCH
        print(f"[Stage 2] Activated fallback: po_found={audit_output.po_found}")
    
    # Stage 3: Dispute Coordination
    try:
        coordinator_output = coordinate(vision_output, audit_output)
        print(f"[Stage 3] Dispute Coordinator: action={coordinator_output.action}, "
              f"slack_sent={coordinator_output.slack_sent}")
        print(f"[Stage 3] Summary: {coordinator_output.summary}")
    except Exception as e:
        print(f"[Stage 3] Dispute Coordinator failed: {e}")
        if audit_output.po_found:
            coordinator_output = DISPUTE_FALLBACK_SILENT
        else:
            coordinator_output = DISPUTE_FALLBACK_ESCALATE
        print(f"[Stage 3] Activated fallback: action={coordinator_output.action}")
    
    # Send Slack notification if required
    if coordinator_output.slack_sent:
        success = format_and_send_slack(coordinator_output, slack_image_url)
        print(f"[Slack] Notification sent: {success}")
    
    return coordinator_output
```

**Function: run_demo_scenario_1**
```python
def run_demo_scenario_1() -> DisputeCoordinatorOutput:
    """Run the no-match guardrail scenario.
    
    Uses crushed_box_torn_label.jpg with a damaged label.
    Expected: escalate_manual_review, slack_sent=True.
    
    Returns:
        DisputeCoordinatorOutput from the pipeline.
    """
    print("=" * 60)
    print("SCENARIO 1: Guardrail Case — Crushed Box, Torn Label")
    print("=" * 60)
    return run_pipeline("crushed_box_torn_label.jpg", use_fallbacks=False)
```

**Function: run_demo_scenario_2**
```python
def run_demo_scenario_2() -> DisputeCoordinatorOutput:
    """Run the happy-path efficiency scenario.
    
    Uses scuffed_box_clean_label.jpg with a clean label.
    Expected: file_dispute_silent, slack_sent=False.
    
    Returns:
        DisputeCoordinatorOutput from the pipeline.
    """
    print("\n" + "=" * 60)
    print("SCENARIO 2: Efficiency Case — Scuffed Box, Clean Label")
    print("=" * 60)
    return run_pipeline("scuffed_box_clean_label.jpg", use_fallbacks=False)
```

**Function: run_both_scenarios**
```python
def run_both_scenarios() -> None:
    """Run both demo scenarios and print a comparison summary."""
    result1 = run_demo_scenario_1()
    result2 = run_demo_scenario_2()
    
    print("\n" + "=" * 60)
    print("COMPARISON SUMMARY")
    print("=" * 60)
    print(f"{'Metric':<30} {'Scenario 1':<30} {'Scenario 2':<30}")
    print("-" * 90)
    print(f"{'Action':<30} {result1.action:<30} {result2.action:<30}")
    print(f"{'Slack Sent':<30} {str(result1.slack_sent):<30} {str(result2.slack_sent):<30}")
    print(f"{'Severity':<30} {result1.severity:<30} {result2.severity:<30}")
    print(f"{'Tracking Number':<30} {result1.tracking_number:<30} {result2.tracking_number:<30}")
    print(f"{'Vendor':<30} {str(result1.vendor_name):<30} {str(result2.vendor_name):<30}")
    print(f"{'Claimed Damages':<30} {str(result1.claimed_damages):<30} {str(result2.claimed_damages):<30}")
    print(f"{'Dispute ID':<30} {result1.dispute_id:<30} {result2.dispute_id:<30}")
    print("-" * 90)
    print(f"\nScenario 1 Summary: {result1.summary}")
    print(f"Scenario 2 Summary: {result2.summary}")
```

**Entry Point:**
```python
if __name__ == "__main__":
    run_both_scenarios()
```

### Acceptance Criteria

- All imports resolve without error
- `run_pipeline` with use_fallbacks=True completes without external API calls
- `run_pipeline` with use_fallbacks=True returns escalate_manual_review for filenames containing "crushed"
- `run_pipeline` with use_fallbacks=True returns file_dispute_silent for filenames containing "scuffed" or neither keyword
- `run_demo_scenario_1` prints stage-by-stage output
- `run_demo_scenario_2` prints stage-by-stage output
- `run_both_scenarios` prints a formatted comparison table
- Pipeline always returns a DisputeCoordinatorOutput — never raises unhandled exception
- Print statements are present at each stage for live demo visibility
- Phinite Aura prompt is present as a comment block at the top of the file

---

## CROSS-MODULE CONSISTENCY CHECKS

| Check | Modules Involved | Expected |
|-------|-----------------|----------|
| VisionInspectorOutput imported correctly | contracts, vision_inspector, dispute_coordinator, main | Same class used everywhere |
| AuditCoreOutput imported correctly | contracts, audit_core, dispute_coordinator, main | Same class used everywhere |
| DisputeCoordinatorOutput imported correctly | contracts, dispute_coordinator, main | Same class used everywhere |
| Fallback constants match their types | vision_inspector, audit_core, dispute_coordinator | Each fallback is a valid instance of its module's output type |
| Fallback re-exports resolve | fallbacks, main | All six constants accessible from fallbacks |
| Routing rules consistent | dispute_coordinator, main | coordinate() matches rules in Section 1.2 of decisions document |
| Environment variable names | vision_inspector, dispute_coordinator | GMI_API_KEY, SLACK_WEBHOOK_URL used consistently |
| No circular imports | All | Dependency graph is acyclic |

---

## GENERATION INSTRUCTIONS

Generate six Python files in the order listed in the Masterplan. Each subplan above is a self-contained specification for its file. Generate each file to match the exact contents, function signatures, and constants specified.

If a subplan specifies a function or constant, it must appear in the generated file exactly as specified. If a subplan omits a detail covered by the interface contract or implementation strategy, derive that detail from those documents.

Do not generate any file not specified in this document.

---

END OF MASTERPLAN & SUBPLANS