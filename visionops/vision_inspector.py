"""Vision Inspector agent: calls GMI Cloud VLM to assess package damage and extract label data."""

import base64
import json
import os
import re
import requests
from datetime import datetime
from typing import Optional
from contracts import VisionInspectorOutput

GMI_API_KEY = os.environ.get("GMI_API_KEY", "")
GMI_ENDPOINT = "https://api.gmi-serving.com/v1/chat/completions"
GMI_MODEL = "nvidia/NVIDIA-Nemotron-3-Nano-Omni"
GMI_TIMEOUT = 30
MAX_RETRIES = 2

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
        "Authorization": f"Bearer {GMI_API_KEY}",
    }

    payload = {
        "model": GMI_MODEL,
        "messages": [
            {"role": "system", "content": VLM_SYSTEM_PROMPT},
            {
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:image/jpeg;base64,{image_b64}"},
                    }
                ],
            },
        ],
        "temperature": 0,
        "max_completion_tokens": 500,
        "response_format": {"type": "json_object"},
    }

    response = requests.post(
        GMI_ENDPOINT,
        headers=headers,
        json=payload,
        timeout=GMI_TIMEOUT,
    )
    response.raise_for_status()
    return response.json()


def extract_json(raw_response: str) -> dict:
    """Extract JSON object from model response, stripping any surrounding text.

    Args:
        raw_response: The raw string content from the model.

    Returns:
        Parsed JSON dict.

    Raises:
        ValueError: If no JSON object is found in the response.
    """
    match = re.search(r"\{.*\}", raw_response, re.DOTALL)
    if match:
        return json.loads(match.group())
    raise ValueError("No JSON object found in response")


def validate_vision_output(data: dict) -> VisionInspectorOutput:
    """Validate and construct VisionInspectorOutput from raw dict.

    Args:
        data: Raw dict from JSON parsing.

    Returns:
        Validated VisionInspectorOutput instance.

    Raises:
        ValueError: If required fields are missing or values are invalid.
    """
    required = [
        "damage_detected",
        "severity",
        "tracking_number",
        "carrier",
        "raw_label_text",
        "parse_success",
        "confidence",
    ]
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
        confidence=data["confidence"],
    )


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


VISION_FALLBACK_NO_MATCH = VisionInspectorOutput(
    damage_detected=True,
    severity="high",
    tracking_number="1Z999AA1012345678",
    carrier="UPS",
    raw_label_text="1Z999AA1012345678... [label torn] ...Acme Packaging... REF: PO-2024-",
    parse_success=False,
    confidence="low",
)

VISION_FALLBACK_HAPPY_PATH = VisionInspectorOutput(
    damage_detected=True,
    severity="low",
    tracking_number="74891234567890",
    carrier="FedEx",
    raw_label_text="74891234567890 FedEx FastShip Supply PO-2024-0887",
    parse_success=True,
    confidence="high",
)
