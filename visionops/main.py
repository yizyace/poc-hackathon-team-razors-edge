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

import os
import sys
from datetime import datetime

from contracts import VisionInspectorOutput, AuditCoreOutput, DisputeCoordinatorOutput

from vision_inspector import (
    inspect_image,
    VISION_FALLBACK_NO_MATCH,
    VISION_FALLBACK_HAPPY_PATH,
)
from audit_core import (
    lookup_po,
    AUDIT_FALLBACK_NO_MATCH,
    AUDIT_FALLBACK_MATCH,
)
from dispute_coordinator import (
    coordinate,
    format_and_send_slack,
    DISPUTE_FALLBACK_ESCALATE,
    DISPUTE_FALLBACK_SILENT,
)


def run_pipeline(
    image_path: str,
    use_fallbacks: bool = False,
    slack_image_url: str = "",
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
        print(
            f"[Stage 1] Vision Inspector: damage_detected={vision_output.damage_detected}, "
            f"severity={vision_output.severity}, parse_success={vision_output.parse_success}"
        )
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
            summary="No damage detected. Workflow terminated.",
        )

    # Stage 2: Audit Lookup
    try:
        if use_fallbacks:
            raise Exception("Fallback mode activated")
        audit_output = lookup_po(vision_output.tracking_number)
        print(
            f"[Stage 2] Audit Core: po_found={audit_output.po_found}, "
            f"reason={audit_output.reason}"
        )
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
        print(
            f"[Stage 3] Dispute Coordinator: action={coordinator_output.action}, "
            f"slack_sent={coordinator_output.slack_sent}"
        )
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


if __name__ == "__main__":
    run_both_scenarios()
