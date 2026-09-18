"""
MaterialDNA AI — Hard Constraint Validator

Enforces critical technical constraints that CANNOT be overridden
by semantic similarity. This is the core differentiator of MaterialDNA AI.

Principle: "Semantic similarity suggests a match.
            Technical constraints decide the match."

Critical attributes (hard constraints):
  - grade: SS304 vs SS316 → NO MATCH regardless of similarity
  - diameter: M10 vs M12 → NO MATCH
  - pressure_class: 150# vs 300# → NO MATCH
  - material: Carbon Steel vs Stainless Steel → NO MATCH

Missing critical attributes → REVIEW (not auto-match)
"""

from typing import Any


# Attributes that trigger HARD FAIL if mismatched
CRITICAL_ATTRIBUTES = {
    "grade",
    "diameter",
    "pressure_class",
}

# Attributes that trigger REVIEW if mismatched (less critical)
IMPORTANT_ATTRIBUTES = {
    "material",
    "length",
    "standard",
}

# Material group incompatibilities — even without specific grade,
# these base material types are fundamentally incompatible
INCOMPATIBLE_MATERIALS = [
    {"Stainless Steel", "Carbon Steel"},
    {"Stainless Steel", "Mild Steel"},
    {"Stainless Steel", "Cast Iron"},
    {"Carbon Steel", "Brass"},
    {"Carbon Steel", "Aluminium"},
    {"Stainless Steel", "Brass"},
    {"Stainless Steel", "Aluminium"},
]


def validate_constraints(
    source_attrs: dict[str, Any],
    candidate_attrs: dict[str, Any],
    attribute_comparison: dict[str, Any],
) -> dict[str, Any]:
    """
    Validate hard technical constraints between source and candidate materials.

    Args:
        source_attrs: Extracted attributes from source material
        candidate_attrs: Extracted attributes from candidate material
        attribute_comparison: Result from comparator.compare_attributes()

    Returns:
        Dictionary containing:
        - passed: bool — overall constraint pass/fail
        - decision_override: 'no_match' | 'review' | None
        - conflicts: list of conflict details
        - warnings: list of warning details
        - missing_critical: list of missing critical attributes
        - explanation: human-readable explanation
    """
    conflicts: list[dict] = []
    warnings: list[dict] = []
    missing_critical: list[str] = []
    passed = True
    decision_override = None
    explanations: list[str] = []

    # Check each attribute comparison detail
    for detail in attribute_comparison.get("attribute_details", []):
        attr = detail["attribute"]
        status = detail["status"]

        if attr in CRITICAL_ATTRIBUTES:
            if status == "mismatch":
                # HARD FAIL
                passed = False
                decision_override = "no_match"
                conflicts.append({
                    "attribute": attr,
                    "label": detail["label"],
                    "source_value": detail["source_value"],
                    "candidate_value": detail["candidate_value"],
                    "severity": "critical",
                    "message": f"{detail['label']} mismatch: {detail['source_value']} ≠ {detail['candidate_value']}",
                })
                explanations.append(
                    f"Critical {detail['label'].lower()} mismatch: "
                    f"source has {detail['source_value']}, "
                    f"candidate has {detail['candidate_value']}. "
                    f"This is a hard constraint violation."
                )

            elif status in ("missing_in_source", "missing_in_candidate"):
                missing_critical.append(attr)
                if decision_override != "no_match":
                    decision_override = "review"
                warnings.append({
                    "attribute": attr,
                    "label": detail["label"],
                    "source_value": detail.get("source_value"),
                    "candidate_value": detail.get("candidate_value"),
                    "severity": "warning",
                    "message": f"{detail['label']} not specified in {'source' if status == 'missing_in_source' else 'candidate'}",
                })
                explanations.append(
                    f"{detail['label']} is missing in the "
                    f"{'source' if status == 'missing_in_source' else 'candidate'} material. "
                    f"Manual review recommended."
                )

        elif attr in IMPORTANT_ATTRIBUTES:
            if status == "mismatch":
                if decision_override != "no_match":
                    decision_override = "review"
                warnings.append({
                    "attribute": attr,
                    "label": detail["label"],
                    "source_value": detail["source_value"],
                    "candidate_value": detail["candidate_value"],
                    "severity": "warning",
                    "message": f"{detail['label']} differs: {detail['source_value']} vs {detail['candidate_value']}",
                })
                explanations.append(
                    f"{detail['label']} differs between materials. "
                    f"Review recommended."
                )

    # Check material compatibility at base level
    src_material = source_attrs.get("material", "")
    cand_material = candidate_attrs.get("material", "")
    if src_material and cand_material and src_material != cand_material:
        pair = {src_material, cand_material}
        for incompatible in INCOMPATIBLE_MATERIALS:
            if pair == incompatible:
                passed = False
                decision_override = "no_match"
                conflicts.append({
                    "attribute": "material",
                    "label": "Base Material",
                    "source_value": src_material,
                    "candidate_value": cand_material,
                    "severity": "critical",
                    "message": f"Incompatible base materials: {src_material} vs {cand_material}",
                })
                explanations.append(
                    f"Base material incompatibility: {src_material} and {cand_material} "
                    f"are fundamentally different materials."
                )
                break

    # Generate overall explanation
    if not explanations:
        if passed:
            explanation = "All technical constraints passed. No critical conflicts detected."
        else:
            explanation = "Technical constraint validation failed."
    else:
        explanation = " ".join(explanations)

    return {
        "passed": passed,
        "decision_override": decision_override,
        "conflicts": conflicts,
        "warnings": warnings,
        "missing_critical": missing_critical,
        "explanation": explanation,
    }
