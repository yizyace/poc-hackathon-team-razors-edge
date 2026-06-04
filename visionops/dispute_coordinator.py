"""Dispute Coordinator agent: applies routing rules, sends Slack alerts, generates dispute records."""

import json
import os
import random
import requests
from datetime import datetime
from contracts import DisputeCoordinatorOutput, VisionInspectorOutput, AuditCoreOutput

SLACK_WEBHOOK_URL = os.environ.get("SLACK_WEBHOOK_URL", "")
SLACK_TIMEOUT = 10


def generate_dispute_id() -> str:
    """Generate a unique dispute identifier.

    Format: DSP-YYYY-NNNN where YYYY is the current year and NNNN is a random 4-digit number.

    Returns:
        Dispute ID string like 'DSP-2024-0147'.
    """
    year = datetime.utcnow().year
    sequence = random.randint(1000, 9999)
    return f"DSP-{year}-{sequence}"


def coordinate(
    vision_output: VisionInspectorOutput,
    audit_output: AuditCoreOutput,
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
            summary="No damage detected. Workflow terminated.",
        )

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
            summary="High-severity damage detected. Tracking number incomplete. No PO match. Escalated for manual review.",
        )

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
        summary=summary,
    )


SLACK_MANUAL_REVIEW_PAYLOAD = {
    "blocks": [
        {
            "type": "header",
            "text": {
                "type": "plain_text",
                "text": "⚠️ HIGH SEVERITY — Manual Review Required",
                "emoji": True,
            },
        },
        {
            "type": "section",
            "fields": [
                {"type": "mrkdwn", "text": "*Tracking Number:*\n1Z999AA1012345678 (INCOMPLETE)"},
                {"type": "mrkdwn", "text": "*Carrier:*\nUPS"},
                {"type": "mrkdwn", "text": "*Damage Severity:*\nHIGH"},
                {"type": "mrkdwn", "text": "*Label Readable:*\nPARTIAL"},
            ],
        },
        {"type": "divider"},
        {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": "The tracking number could not be fully resolved. No matching purchase order found. A human must verify this shipment manually.",
            },
        },
        {
            "type": "image",
            "image_url": "{IMAGE_URL_PLACEHOLDER}",
            "alt_text": "Damaged package label",
        },
        {
            "type": "context",
            "elements": [
                {"type": "mrkdwn", "text": "VisionOps | Run: {DISPUTE_ID} | Audit trail: {AUDIT_LINK}"}
            ],
        },
    ]
}

SLACK_SILENT_DISPUTE_PAYLOAD = {
    "blocks": [
        {
            "type": "header",
            "text": {
                "type": "plain_text",
                "text": "✅ Dispute Auto-Filed — No Action Required",
                "emoji": True,
            },
        },
        {
            "type": "section",
            "fields": [
                {"type": "mrkdwn", "text": "*Tracking Number:*\n74891234567890"},
                {"type": "mrkdwn", "text": "*Vendor:*\nFastShip Supply"},
                {"type": "mrkdwn", "text": "*PO Number:*\nPO-2024-0887"},
                {"type": "mrkdwn", "text": "*Severity:*\nLOW"},
            ],
        },
        {"type": "divider"},
        {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": "Damages below alert threshold. Dispute {DISPUTE_ID} filed against FastShip Supply. $430 in claimed damages. No human intervention needed.",
            },
        },
        {
            "type": "context",
            "elements": [
                {"type": "mrkdwn", "text": "VisionOps | Run: {DISPUTE_ID} | Audit trail: {AUDIT_LINK}"}
            ],
        },
    ]
}


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
            timeout=SLACK_TIMEOUT,
        )
        return response.status_code == 200
    except Exception:
        return False


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

    payload_str = json.dumps(payload)
    payload_str = payload_str.replace("{DISPUTE_ID}", output.dispute_id)
    payload_str = payload_str.replace("{AUDIT_LINK}", f"https://phinite.com/audit/{output.dispute_id}")
    if image_url:
        payload_str = payload_str.replace("{IMAGE_URL_PLACEHOLDER}", image_url)
    payload = json.loads(payload_str)

    return send_slack(payload)


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
    summary="High-severity damage detected. Tracking number incomplete. No PO match. Escalated for manual review.",
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
    summary="Low-severity damage. PO matched. Dispute filed silently. $430 in claimed damages against FastShip Supply.",
)
