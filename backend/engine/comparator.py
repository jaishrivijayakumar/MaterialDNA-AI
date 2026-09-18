"""
MaterialDNA AI — Attribute Comparator

Compares extracted technical attributes between a source and candidate
material, producing per-attribute match status and an overall attribute
match score.
"""

from typing import Any
import re


# Attributes and their comparison weights
ATTRIBUTE_WEIGHTS: dict[str, float] = {
    "material_type": 0.20,
    "grade": 0.25,
    "diameter": 0.20,
    "length": 0.10,
    "material": 0.10,
    "standard": 0.05,
    "pressure_class": 0.05,
    "schedule": 0.03,
    "nominal_bore": 0.02,
}

# Label display names
ATTRIBUTE_LABELS: dict[str, str] = {
    "material_type": "Type",
    "grade": "Grade",
    "diameter": "Diameter",
    "length": "Length",
    "material": "Material",
    "standard": "Standard",
    "pressure_class": "Pressure Class",
    "schedule": "Schedule",
    "nominal_bore": "Nominal Bore",
}


def _normalize_value(val: str) -> str:
    """Normalize an attribute value for comparison."""
    return re.sub(r"[^A-Z0-9./]", "", val.upper())


def _values_match(attr: str, val_a: str, val_b: str) -> bool:
    """
    Compare two attribute values.

    Handles common equivalences:
      - "STAINLESS STEEL 304" == "SS304"
      - "M10" == "10MM" (for diameter)
      - etc.
    """
    norm_a = _normalize_value(val_a)
    norm_b = _normalize_value(val_b)

    # Direct match
    if norm_a == norm_b:
        return True

    # Grade-specific equivalences
    if attr == "grade":
        # Strip "SS" prefix for comparison
        ga = re.sub(r"^SS", "", norm_a)
        gb = re.sub(r"^SS", "", norm_b)
        return ga == gb

    # Diameter equivalences: M10 == 10MM
    if attr == "diameter":
        def extract_dim(v: str) -> str:
            m = re.search(r"(\d+(?:\.\d+)?)", v)
            return m.group(1) if m else v
        return extract_dim(norm_a) == extract_dim(norm_b)

    # Length: compare numeric values
    if attr == "length":
        def extract_len(v: str) -> str:
            m = re.search(r"(\d+(?:\.\d+)?)", v)
            return m.group(1) if m else v
        return extract_len(norm_a) == extract_len(norm_b)

    # Material type fuzzy matching
    if attr == "material_type":
        # Both should match after normalization
        return norm_a == norm_b

    return False


def compare_attributes(
    source_attrs: dict[str, Any],
    candidate_attrs: dict[str, Any],
) -> dict[str, Any]:
    """
    Compare two sets of extracted attributes.

    Args:
        source_attrs: Attributes from the source material
        candidate_attrs: Attributes from the candidate material

    Returns:
        Dictionary containing:
        - attribute_details: per-attribute comparison results
        - attribute_score: weighted match score (0-100)
        - matched_count: number of matching attributes
        - total_count: total attributes compared
        - missing_in_source: attributes present in candidate but not source
        - missing_in_candidate: attributes present in source but not candidate
    """
    all_attrs = set(ATTRIBUTE_WEIGHTS.keys())
    attribute_details: list[dict] = []
    weighted_score = 0.0
    total_weight = 0.0
    matched_count = 0
    compared_count = 0
    missing_source: list[str] = []
    missing_candidate: list[str] = []

    for attr in all_attrs:
        src_val = source_attrs.get(attr)
        cand_val = candidate_attrs.get(attr)
        weight = ATTRIBUTE_WEIGHTS[attr]
        label = ATTRIBUTE_LABELS.get(attr, attr)

        if src_val and cand_val:
            # Both present — compare
            match = _values_match(attr, str(src_val), str(cand_val))
            compared_count += 1
            total_weight += weight

            if match:
                matched_count += 1
                weighted_score += weight
                status = "match"
            else:
                status = "mismatch"

            attribute_details.append({
                "attribute": attr,
                "label": label,
                "source_value": str(src_val),
                "candidate_value": str(cand_val),
                "status": status,
                "weight": weight,
            })

        elif src_val and not cand_val:
            missing_candidate.append(attr)
            attribute_details.append({
                "attribute": attr,
                "label": label,
                "source_value": str(src_val),
                "candidate_value": None,
                "status": "missing_in_candidate",
                "weight": weight,
            })

        elif cand_val and not src_val:
            missing_source.append(attr)
            attribute_details.append({
                "attribute": attr,
                "label": label,
                "source_value": None,
                "candidate_value": str(cand_val),
                "status": "missing_in_source",
                "weight": weight,
            })

    # Calculate score as percentage
    score = (weighted_score / total_weight * 100) if total_weight > 0 else 0.0

    return {
        "attribute_details": sorted(attribute_details, key=lambda d: -d["weight"]),
        "attribute_score": round(score, 1),
        "matched_count": matched_count,
        "compared_count": compared_count,
        "missing_in_source": missing_source,
        "missing_in_candidate": missing_candidate,
    }
