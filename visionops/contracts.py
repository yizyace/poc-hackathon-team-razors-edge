"""Data contracts shared across all VisionOps agents. No other module defines its own version of these types."""

from dataclasses import dataclass
from typing import Optional


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
            "terminate_no_damage",
        }
        valid_severity = {"low", "medium", "high", "none"}
        valid_tracking_status = {"complete", "incomplete", "n/a"}

        if self.action not in valid_action:
            raise ValueError(f"Invalid action: {self.action}")
        if self.severity not in valid_severity:
            raise ValueError(f"Invalid severity: {self.severity}")
        if self.tracking_number_status not in valid_tracking_status:
            raise ValueError(f"Invalid tracking_number_status: {self.tracking_number_status}")

        # "N/A" is the sentinel dispute_id for terminate_no_damage
        if self.action != "terminate_no_damage" and not self.dispute_id.startswith("DSP-"):
            raise ValueError(f"dispute_id must start with 'DSP-'")

        if self.action == "terminate_no_damage" and self.claimed_damages is not None:
            raise ValueError("claimed_damages must be None when action is terminate_no_damage")
        if self.action == "escalate_manual_review" and not self.slack_sent:
            raise ValueError("slack_sent must be True when action is escalate_manual_review")
        if self.action == "file_dispute_silent" and self.slack_sent:
            raise ValueError("slack_sent must be False when action is file_dispute_silent")
