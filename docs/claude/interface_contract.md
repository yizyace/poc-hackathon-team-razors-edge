# VisionOps Interface Contract
## Target: Claude Code Generation

---

### DOCUMENT PURPOSE

This document defines every data structure that crosses module boundaries in the VisionOps system. It is the single source of truth for what each agent sends and receives. All generated modules must import and use these exact definitions. No module may define its own version of a shared type.

---

## 1. TYPE DEFINITIONS

### 1.1 VisionInspectorOutput

The structured response produced by the Vision Inspector agent after analyzing a package image.

```python
from dataclasses import dataclass
from typing import Optional

@dataclass(frozen=True)
class VisionInspectorOutput:
    """Output from Vision Inspector agent after processing a package image.
    
    All fields are populated by the VLM response or by the fallback system.
    """
    
    damage_detected: bool
    """True if the image shows any visible damage to the package."""
    
    severity: str
    """Damage severity classification. Valid values: 'low', 'medium', 'high'."""
    
    tracking_number: Optional[str]
    """Extracted tracking number from the shipping label. 
    None if unreadable. May be incomplete if label is damaged."""
    
    carrier: Optional[str]
    """Identified carrier. Valid values: 'UPS', 'FedEx', 'USPS', or None."""
    
    raw_label_text: str
    """All readable text extracted from the shipping label.
    Contains '[label torn]' or '[illegible]' markers for unreadable sections.
    Never None. Empty string if no text could be read."""
    
    parse_success: bool
    """True if the JSON response was valid and all critical fields populated.
    False triggers retry or fallback behavior."""
    
    confidence: str
    """Model's confidence in the extraction. Valid values: 'low', 'medium', 'high'.
    'low' typically accompanies parse_success=False or partial reads."""

    def __post_init__(self):
        """Validate field constraints."""
        valid_severity = {"low", "medium", "high"}
        valid_confidence = {"low", "medium", "high"}
        valid_carrier = {"UPS", "FedEx", "USPS", None}
        
        if self.severity not in valid_severity:
            raise ValueError(f"Invalid severity: {self.severity}. Must be one of {valid_severity}")
        if self.confidence not in valid_confidence:
            raise ValueError(f"Invalid confidence: {self.confidence}. Must be one of {valid_confidence}")
        if self.carrier not in valid_carrier:
            raise ValueError(f"Invalid carrier: {self.carrier}. Must be one of {valid_carrier}")
        if not isinstance(self.raw_label_text, str):
            raise ValueError(f"raw_label_text must be string, got {type(self.raw_label_text)}")
```

### 1.2 AuditCoreOutput

The structured response produced by the Audit Core agent after querying the purchase order database.

```python
from dataclasses import dataclass
from typing import Optional

@dataclass(frozen=True)
class AuditCoreOutput:
    """Output from Audit Core agent after purchase order lookup.
    
    When po_found is False, vendor_name, po_number, sla_threshold, 
    and order_value will be None.
    """
    
    po_found: bool
    """True if a purchase order matching the tracking number was found."""
    
    tracking_number_queried: str
    """The exact tracking number string that was used for the lookup.
    Will be 'null' if the input tracking number was None."""
    
    reason: str
    """Reason for the lookup result.
    Valid values: 'exact_match', 'tracking_number_incomplete', 'no_match'."""
    
    vendor_name: Optional[str]
    """Name of the vendor. None if no PO matched."""
    
    po_number: Optional[str]
    """Purchase order number. Format: PO-YYYY-NNNN. None if no PO matched."""
    
    sla_threshold: Optional[int]
    """Dollar threshold above which the vendor's SLA covers damage.
    None if no PO matched."""
    
    order_value: Optional[int]
    """Total value of the purchase order in dollars. None if no PO matched."""
    
    suggested_action: str
    """Recommended next step based on lookup result.
    Valid values: 'manual_review', 'file_dispute'."""

    def __post_init__(self):
        """Validate field constraints and cross-field consistency."""
        valid_reason = {"exact_match", "tracking_number_incomplete", "no_match"}
        valid_action = {"manual_review", "file_dispute"}
        
        if self.reason not in valid_reason:
            raise ValueError(f"Invalid reason: {self.reason}. Must be one of {valid_reason}")
        if self.suggested_action not in valid_action:
            raise ValueError(f"Invalid suggested_action: {self.suggested_action}. Must be one of {valid_action}")
        
        # Cross-field consistency: if po_found is True, vendor fields must be populated
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
                raise ValueError(f"suggested_action must be 'file_dispute' when po_found is True, got {self.suggested_action}")
        else:
            if self.suggested_action != "manual_review":
                raise ValueError(f"suggested_action must be 'manual_review' when po_found is False, got {self.suggested_action}")
```

### 1.3 DisputeCoordinatorOutput

The final output produced by the Dispute Coordinator agent. This is the terminal record of the pipeline execution.

```python
from dataclasses import dataclass
from typing import Optional

@dataclass(frozen=True)
class DisputeCoordinatorOutput:
    """Terminal output from Dispute Coordinator after routing decision.
    
    Contains the complete dispute record including all actions taken,
    Slack notification status, and a human-readable summary.
    """
    
    dispute_id: str
    """Unique dispute identifier. Format: DSP-YYYY-NNNN where YYYY is year
    and NNNN is a random 4-digit sequence."""
    
    timestamp: str
    """ISO 8601 formatted timestamp of when the dispute was processed.
    Example: '2024-06-03T14:32:06Z'"""
    
    action: str
    """The action taken by the Dispute Coordinator.
    Valid values: 'escalate_manual_review', 'file_dispute_silent', 
    'file_dispute_with_alert', 'terminate_no_damage'."""
    
    slack_sent: bool
    """True if a Slack notification was sent via webhook."""
    
    severity: str
    """Damage severity from the Vision Inspector.
    Valid values: 'low', 'medium', 'high', 'none'."""
    
    tracking_number: str
    """Tracking number from the Vision Inspector.
    Will be 'unreadable' if the original was None."""
    
    tracking_number_status: str
    """Whether the tracking number was fully readable.
    Valid values: 'complete', 'incomplete', 'n/a'."""
    
    vendor_name: Optional[str]
    """Vendor name from the Audit Core. None if no PO matched."""
    
    po_number: Optional[str]
    """Purchase order number from the Audit Core. None if no PO matched."""
    
    claimed_damages: Optional[int]
    """Claimed damage amount in dollars. Equals order_value from Audit Core.
    None if no PO matched."""
    
    sla_threshold: Optional[int]
    """Vendor SLA threshold from the Audit Core. None if no PO matched."""
    
    summary: str
    """Human-readable one-line description of the action taken.
    Suitable for display in audit logs and Slack notifications."""

    def __post_init__(self):
        """Validate field constraints and cross-field consistency."""
        valid_action = {
            "escalate_manual_review",
            "file_dispute_silent",
            "file_dispute_with_alert",
            "terminate_no_damage"
        }
        valid_severity = {"low", "medium", "high", "none"}
        valid_tracking_status = {"complete", "incomplete", "n/a"}
        
        if self.action not in valid_action:
            raise ValueError(f"Invalid action: {self.action}. Must be one of {valid_action}")
        if self.severity not in valid_severity:
            raise ValueError(f"Invalid severity: {self.severity}. Must be one of {valid_severity}")
        if self.tracking_number_status not in valid_tracking_status:
            raise ValueError(f"Invalid tracking_number_status: {self.tracking_number_status}. Must be one of {valid_tracking_status}")
        
        # Validate dispute_id format
        if not self.dispute_id.startswith("DSP-"):
            raise ValueError(f"dispute_id must start with 'DSP-', got {self.dispute_id}")
        parts = self.dispute_id.split("-")
        if len(parts) != 3:
            raise ValueError(f"dispute_id must have format DSP-YYYY-NNNN, got {self.dispute_id}")
        
        # Cross-field consistency: terminate_no_damage has no vendor data
        if self.action == "terminate_no_damage":
            if self.claimed_damages is not None:
                raise ValueError("claimed_damages must be None when action is terminate_no_damage")
        
        # Cross-field consistency: manual review escalation has slack_sent=True
        if self.action == "escalate_manual_review" and not self.slack_sent:
            raise ValueError("slack_sent must be True when action is escalate_manual_review")
        
        # Cross-field consistency: silent file has slack_sent=False
        if self.action == "file_dispute_silent" and self.slack_sent:
            raise ValueError("slack_sent must be False when action is file_dispute_silent")
```

---

## 2. INTER-AGENT DATA FLOW

### 2.1 Stage 1 → Stage 2

```
VisionInspectorOutput ──────────────────> AuditCore
                      │
                      ├── tracking_number (str | None)
                      │   Used as the lookup key.
                      │   If None, AuditCore returns po_found=False immediately.
                      │
                      └── parse_success (bool)
                          Used to determine if retry is needed.
                          AuditCore does not receive this directly.
                          Retry logic lives in Vision Inspector.
```

### 2.2 Stage 1 + Stage 2 → Stage 3

```
VisionInspectorOutput ──┐
                         ├──> DisputeCoordinator
AuditCoreOutput ────────┘
                         │
Vision fields used:      Audit fields used:
├── severity             ├── po_found
├── tracking_number      ├── vendor_name
├── parse_success        ├── po_number
└── confidence           ├── order_value
                         ├── sla_threshold
                         └── suggested_action
```

### 2.3 Stage 3 → External Systems

```
DisputeCoordinatorOutput ──┬──> Slack Webhook (if slack_sent=True)
                           │    Uses: action, tracking_number, vendor_name,
                           │           po_number, severity, claimed_damages,
                           │           dispute_id
                           │
                           └──> Audit Trail / Log
                                Uses: all fields
```

---

## 3. VALID VALUE ENUMERATIONS

### 3.1 Severity Values

| Value | Meaning | Routing Consequence (when PO found) |
|-------|---------|-------------------------------------|
| `low` | Cosmetic damage only. Product likely intact. | File dispute silently. No Slack alert. |
| `medium` | Visible packaging damage. Product may be compromised. | File dispute silently. No Slack alert. |
| `high` | Severe structural damage. Product likely destroyed. | File dispute AND send Slack alert. |
| `none` | No damage detected. | Terminate workflow. Used only in terminate_no_damage action. |

### 3.2 Action Values

| Value | Trigger | Slack Sent | Meaning |
|-------|---------|------------|---------|
| `escalate_manual_review` | `po_found == false` | `true` | PO could not be matched. Human must verify. |
| `file_dispute_with_alert` | `po_found == true` AND `severity == "high"` | `true` | Dispute filed. High severity warrants notification. |
| `file_dispute_silent` | `po_found == true` AND `severity != "high"` | `false` | Dispute filed. Low severity, no interruption needed. |
| `terminate_no_damage` | `damage_detected == false` | `false` | No damage. Pipeline halts at Stage 1. |

### 3.3 Confidence Values

| Value | Meaning |
|-------|---------|
| `high` | Model is confident in all extracted fields. Tracking number complete and verified. |
| `medium` | Model extracted data successfully but with some uncertainty. |
| `low` | Model has low confidence. Typically accompanies partial reads or `parse_success: false`. |

### 3.4 Reason Values

| Value | Meaning |
|-------|---------|
| `exact_match` | Tracking number matched a PO exactly. |
| `tracking_number_incomplete` | Tracking number was partial, too short, or null. Reliable lookup impossible. |
| `no_match` | Tracking number was complete but did not match any PO in the database. |

### 3.5 Tracking Number Status Values

| Value | Meaning |
|-------|---------|
| `complete` | Tracking number was fully and cleanly read from the label. |
| `incomplete` | Tracking number was partially read or null. |
| `n/a` | Not applicable. Used when damage_detected is false and pipeline terminated early. |

---

## 4. MODULE IMPORT MAP

```
contracts.py
    Defines: VisionInspectorOutput, AuditCoreOutput, DisputeCoordinatorOutput
    Imported by: vision_inspector.py, audit_core.py, dispute_coordinator.py, 
                  fallbacks.py, main.py

vision_inspector.py
    Imports: contracts.VisionInspectorOutput
    Exports: inspect_image(), VISION_FALLBACK_NO_MATCH, VISION_FALLBACK_HAPPY_PATH
    Imported by: fallbacks.py, main.py

audit_core.py
    Imports: contracts.AuditCoreOutput
    Exports: lookup_po(), AUDIT_FALLBACK_NO_MATCH, AUDIT_FALLBACK_MATCH
    Imported by: fallbacks.py, main.py

dispute_coordinator.py
    Imports: contracts.DisputeCoordinatorOutput
    Exports: coordinate(), send_slack(), format_and_send_slack(),
             DISPUTE_FALLBACK_ESCALATE, DISPUTE_FALLBACK_SILENT,
             SLACK_MANUAL_REVIEW_PAYLOAD, SLACK_SILENT_DISPUTE_PAYLOAD
    Imported by: fallbacks.py, main.py

fallbacks.py
    Imports: VISION_FALLBACK_NO_MATCH, VISION_FALLBACK_HAPPY_PATH (from vision_inspector)
             AUDIT_FALLBACK_NO_MATCH, AUDIT_FALLBACK_MATCH (from audit_core)
             DISPUTE_FALLBACK_ESCALATE, DISPUTE_FALLBACK_SILENT (from dispute_coordinator)
    Exports: All six fallback constants (re-exported)
    Imported by: main.py

main.py
    Imports: VisionInspectorOutput, AuditCoreOutput, DisputeCoordinatorOutput (from contracts)
             inspect_image, VISION_FALLBACK_NO_MATCH, VISION_FALLBACK_HAPPY_PATH (from vision_inspector)
             lookup_po, AUDIT_FALLBACK_NO_MATCH, AUDIT_FALLBACK_MATCH (from audit_core)
             coordinate, send_slack, format_and_send_slack,
             DISPUTE_FALLBACK_ESCALATE, DISPUTE_FALLBACK_SILENT (from dispute_coordinator)
    Exports: run_pipeline(), format_and_send_slack()
    No other module imports main.py
```

---

## 5. CONTRACT VIOLATIONS

### 5.1 What Each Module Guarantees

**Vision Inspector guarantees:**
- Returns a valid VisionInspectorOutput or raises an exception caught by the integration harness.
- `severity` is always one of: `low`, `medium`, `high`.
- `confidence` is always one of: `low`, `medium`, `high`.
- `raw_label_text` is never None (empty string if nothing readable).
- If `parse_success` is False, `tracking_number` may be partial or None.

**Audit Core guarantees:**
- Returns a valid AuditCoreOutput for any input (no exceptions for bad input).
- If input `tracking_number` is None, returns `po_found=False` with `reason="tracking_number_incomplete"`.
- If `po_found` is True, all vendor fields are populated (not None).
- If `po_found` is False, all vendor fields are None.
- Performs exact-match lookup only. No fuzzy matching.

**Dispute Coordinator guarantees:**
- Returns a valid DisputeCoordinatorOutput for any combination of inputs.
- `action` correctly reflects the routing rules in all cases.
- `slack_sent` is consistent with `action`.
- `dispute_id` follows the format DSP-YYYY-NNNN.
- `summary` is a non-empty string regardless of action taken.

### 5.2 What Each Module Does NOT Guarantee

**Vision Inspector does NOT guarantee:**
- That the VLM API call will succeed (network errors are possible).
- That the VLM will return the exact tracking number on the label (OCR errors are possible).
- Response time within any specific window.

**Audit Core does NOT guarantee:**
- That the purchase order database contains every possible tracking number.
- That vendor data is accurate (it is mock data).

**Dispute Coordinator does NOT guarantee:**
- That the Slack webhook call will succeed (network errors are possible).
- That the Slack payload will render correctly on all Slack clients.

---

## 6. EXTENSION POINTS

These are fields and values included in the contracts to support future functionality without breaking changes. They are not used in the current demo but must be present in the generated code.

- `confidence` field on VisionInspectorOutput: Included for future confidence-based routing. Currently unused by downstream agents.
- `raw_label_text` field on VisionInspectorOutput: Included for audit trail completeness. Currently unused by downstream agents beyond logging.
- `sla_threshold` field on AuditCoreOutput and DisputeCoordinatorOutput: Included for future SLA-aware dispute logic. Currently unused in routing decisions.
- `suggested_action` field on AuditCoreOutput: Included for future agent-to-agent negotiation patterns. Currently the Dispute Coordinator makes independent routing decisions.

---

## 7. GENERATION INSTRUCTION

Generate a single file: `contracts.py`

This file must contain:
1. All necessary imports (dataclasses, typing)
2. The `VisionInspectorOutput` dataclass with `__post_init__` validation
3. The `AuditCoreOutput` dataclass with `__post_init__` validation
4. The `DisputeCoordinatorOutput` dataclass with `__post_init__` validation
5. No other functions, classes, or executable code

All three dataclasses must use `@dataclass(frozen=True)` to ensure immutability. All validation logic must be in `__post_init__` methods. All fields must have type annotations. All docstrings must be present as specified above.

Generate only `contracts.py`. Do not generate any other file.

---

END OF INTERFACE CONTRACT