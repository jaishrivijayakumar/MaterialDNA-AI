"""
MaterialDNA AI — Confidence Scorer

Combines semantic similarity, attribute match score, and constraint
validation into a final confidence score and decision.

Decision outcomes:
  MATCH   — confidence ≥ 80 AND all constraints pass
  REVIEW  — 50 ≤ confidence < 80 OR missing critical attributes
  NO MATCH — confidence < 50 OR hard constraint failure
"""

from typing import Any


def calculate_confidence(
    semantic_similarity: float,
    attribute_score: float,
    constraint_result: dict[str, Any],
) -> dict[str, Any]:
    """
    Calculate final confidence score and decision.

    Args:
        semantic_similarity: TF-IDF cosine similarity (0-1)
        attribute_score: Weighted attribute match (0-100)
        constraint_result: Result from constraints.validate_constraints()

    Returns:
        Dictionary with:
        - confidence: final confidence percentage (0-100)
        - decision: 'match' | 'review' | 'no_match'
        - decision_label: Human-readable decision label
        - reasoning: list of reasoning steps
    """
    reasoning: list[str] = []

    # Convert semantic similarity to percentage
    semantic_pct = semantic_similarity * 100

    # ── Step 1: Check for hard constraint overrides ──
    if constraint_result.get("decision_override") == "no_match":
        # Hard constraint failure — override everything
        confidence = min(semantic_pct * 0.3, 40)  # Cap at 40 even if semantic is high
        reasoning.append(
            f"Semantic similarity is {semantic_pct:.0f}%, but a critical "
            f"technical constraint has failed."
        )
        for conflict in constraint_result.get("conflicts", []):
            reasoning.append(f"⚠ {conflict['message']}")
        reasoning.append(
            "High semantic similarity cannot override a technical incompatibility."
        )
        return {
            "confidence": round(confidence, 1),
            "decision": "no_match",
            "decision_label": "No Match",
            "reasoning": reasoning,
        }

    # ── Step 2: Calculate weighted confidence ──
    # Semantic similarity: 40% weight
    # Attribute match: 60% weight (technical accuracy matters more)
    weighted_confidence = (semantic_pct * 0.4) + (attribute_score * 0.6)

    reasoning.append(
        f"Semantic similarity: {semantic_pct:.0f}% (weight: 40%)"
    )
    reasoning.append(
        f"Attribute match: {attribute_score:.0f}% (weight: 60%)"
    )
    reasoning.append(
        f"Weighted confidence: {weighted_confidence:.0f}%"
    )

    # ── Step 3: Adjust for warnings/missing attributes ──
    penalty = 0
    missing = constraint_result.get("missing_critical", [])
    warnings = constraint_result.get("warnings", [])

    if missing:
        penalty += len(missing) * 10
        reasoning.append(
            f"Penalty: -{len(missing) * 10}% for {len(missing)} missing "
            f"critical attribute(s): {', '.join(missing)}"
        )

    if warnings:
        penalty += len(warnings) * 5
        reasoning.append(
            f"Penalty: -{len(warnings) * 5}% for {len(warnings)} warning(s)"
        )

    adjusted_confidence = max(0, weighted_confidence - penalty)

    if penalty > 0:
        reasoning.append(
            f"Adjusted confidence: {adjusted_confidence:.0f}%"
        )

    # ── Step 4: Determine decision ──
    if constraint_result.get("decision_override") == "review":
        decision = "review"
        reasoning.append(
            "Decision forced to REVIEW due to missing critical specifications "
            "or attribute warnings."
        )
    elif adjusted_confidence >= 80:
        decision = "match"
        reasoning.append(
            f"Confidence {adjusted_confidence:.0f}% ≥ 80% threshold → MATCH"
        )
    elif adjusted_confidence >= 50:
        decision = "review"
        reasoning.append(
            f"Confidence {adjusted_confidence:.0f}% is between 50-80% → REVIEW"
        )
    else:
        decision = "no_match"
        reasoning.append(
            f"Confidence {adjusted_confidence:.0f}% < 50% threshold → NO MATCH"
        )

    decision_labels = {
        "match": "Match",
        "review": "Review",
        "no_match": "No Match",
    }

    return {
        "confidence": round(adjusted_confidence, 1),
        "decision": decision,
        "decision_label": decision_labels[decision],
        "reasoning": reasoning,
    }


def generate_explanation(
    confidence_result: dict[str, Any],
    semantic_similarity: float,
    attribute_comparison: dict[str, Any],
    constraint_result: dict[str, Any],
) -> dict[str, Any]:
    """
    Generate a comprehensive human-readable explanation of the match result.
    """
    decision = confidence_result["decision"]

    summary_templates = {
        "match": (
            "Materials are technically compatible. Semantic similarity and "
            "technical attributes both support equivalence."
        ),
        "review": (
            "Materials may be equivalent but require human verification. "
            "Some technical information is missing or uncertain."
        ),
        "no_match": (
            "Materials are NOT equivalent. A critical technical difference "
            "prevents matching despite any textual similarity."
        ),
    }

    matched_attrs = [
        d for d in attribute_comparison.get("attribute_details", [])
        if d["status"] == "match"
    ]
    mismatched_attrs = [
        d for d in attribute_comparison.get("attribute_details", [])
        if d["status"] == "mismatch"
    ]
    missing_attrs = [
        d for d in attribute_comparison.get("attribute_details", [])
        if d["status"].startswith("missing_")
    ]

    return {
        "summary": summary_templates.get(decision, ""),
        "semantic_similarity": round(semantic_similarity * 100, 1),
        "attribute_score": attribute_comparison.get("attribute_score", 0),
        "constraints_passed": constraint_result.get("passed", False),
        "confidence": confidence_result["confidence"],
        "decision": decision,
        "decision_label": confidence_result["decision_label"],
        "matched_attributes": matched_attrs,
        "mismatched_attributes": mismatched_attrs,
        "missing_attributes": missing_attrs,
        "conflicts": constraint_result.get("conflicts", []),
        "warnings": constraint_result.get("warnings", []),
        "reasoning": confidence_result.get("reasoning", []),
    }
