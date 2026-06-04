"""Audit Core agent: exact-match purchase order lookup. Never raises exceptions."""

from typing import Optional
from contracts import AuditCoreOutput

PURCHASE_ORDERS = [
    {
        "tracking_number": "1Z999AA10123456784",
        "vendor_name": "Acme Packaging",
        "po_number": "PO-2024-0892",
        "sla_threshold": 500,
        "order_value": 2340,
    },
    {
        "tracking_number": "9400111899223456789012",
        "vendor_name": "GlobalSource Ltd",
        "po_number": "PO-2024-0901",
        "sla_threshold": 1000,
        "order_value": 8750,
    },
    {
        "tracking_number": "74891234567890",
        "vendor_name": "FastShip Supply",
        "po_number": "PO-2024-0887",
        "sla_threshold": 250,
        "order_value": 430,
    },
    {
        "tracking_number": "1Z999AA10123456999",
        "vendor_name": "Meridian Goods",
        "po_number": "PO-2024-0915",
        "sla_threshold": 750,
        "order_value": 1200,
    },
    {
        "tracking_number": "9205590123456789012345",
        "vendor_name": "Pacific Rim Dist",
        "po_number": "PO-2024-0922",
        "sla_threshold": 500,
        "order_value": 3600,
    },
]


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
    if tracking_number is None:
        return AuditCoreOutput(
            po_found=False,
            tracking_number_queried="null",
            reason="tracking_number_incomplete",
            vendor_name=None,
            po_number=None,
            sla_threshold=None,
            order_value=None,
            suggested_action="manual_review",
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
                suggested_action="file_dispute",
            )

    reason = "tracking_number_incomplete" if len(tracking_number) <= 15 else "no_match"
    return AuditCoreOutput(
        po_found=False,
        tracking_number_queried=tracking_number,
        reason=reason,
        vendor_name=None,
        po_number=None,
        sla_threshold=None,
        order_value=None,
        suggested_action="manual_review",
    )


AUDIT_FALLBACK_NO_MATCH = AuditCoreOutput(
    po_found=False,
    tracking_number_queried="1Z999AA1012345678",
    reason="tracking_number_incomplete",
    vendor_name=None,
    po_number=None,
    sla_threshold=None,
    order_value=None,
    suggested_action="manual_review",
)

AUDIT_FALLBACK_MATCH = AuditCoreOutput(
    po_found=True,
    tracking_number_queried="74891234567890",
    reason="exact_match",
    vendor_name="FastShip Supply",
    po_number="PO-2024-0887",
    sla_threshold=250,
    order_value=430,
    suggested_action="file_dispute",
)
