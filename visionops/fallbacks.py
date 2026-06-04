"""Single import point for all six hardcoded fallback constants."""

from vision_inspector import VISION_FALLBACK_NO_MATCH, VISION_FALLBACK_HAPPY_PATH
from audit_core import AUDIT_FALLBACK_NO_MATCH, AUDIT_FALLBACK_MATCH
from dispute_coordinator import DISPUTE_FALLBACK_ESCALATE, DISPUTE_FALLBACK_SILENT

__all__ = [
    "VISION_FALLBACK_NO_MATCH",
    "VISION_FALLBACK_HAPPY_PATH",
    "AUDIT_FALLBACK_NO_MATCH",
    "AUDIT_FALLBACK_MATCH",
    "DISPUTE_FALLBACK_ESCALATE",
    "DISPUTE_FALLBACK_SILENT",
]
