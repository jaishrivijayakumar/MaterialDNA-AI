"""
MaterialDNA AI — Matching Pipeline Orchestrator

Orchestrates the full material matching pipeline:

  RAW DESCRIPTION
       ↓
  NORMALIZATION
       ↓
  ATTRIBUTE EXTRACTION
       ↓
  CANDIDATE RETRIEVAL
       ↓
  SEMANTIC SIMILARITY
       ↓
  ATTRIBUTE COMPARISON
       ↓
  HARD CONSTRAINT VALIDATION
       ↓
  CONFIDENCE SCORING
       ↓
  MATCH / REVIEW / NO MATCH

Each step produces traceable output for explainability.
"""

from typing import Any, Optional
from .normalizer import normalize_description
from .extractor import extract_attributes, format_attributes_display
from .retriever import get_retriever
from .comparator import compare_attributes
from .constraints import validate_constraints
from .scorer import calculate_confidence, generate_explanation


def run_matching_pipeline(
    source_description: str,
    source_cpse: str = "",
    source_id: Optional[str] = None,
    candidate_description: Optional[str] = None,
    candidate_id: Optional[str] = None,
    candidate_attrs: Optional[dict] = None,
    top_k: int = 5,
) -> dict[str, Any]:
    """
    Run the complete matching pipeline.

    Can operate in two modes:
    1. Source vs All — find best candidates from the database
    2. Source vs Candidate — compare two specific materials

    Args:
        source_description: Raw material description to match
        source_cpse: CPSE of the source material
        source_id: Material ID of source (to exclude from candidates)
        candidate_description: If provided, compare directly against this
        candidate_id: Material ID of specific candidate
        candidate_attrs: Pre-extracted attributes for candidate
        top_k: Number of candidates to retrieve in mode 1

    Returns:
        Complete pipeline result with step-by-step details
    """
    pipeline_steps: list[dict] = []
    result: dict[str, Any] = {
        "source": {
            "description": source_description,
            "cpse": source_cpse,
            "id": source_id,
        },
        "pipeline_steps": pipeline_steps,
        "candidates": [],
    }

    # ── Step 1: Normalize ──
    normalized = normalize_description(source_description)
    pipeline_steps.append({
        "step": 1,
        "name": "Normalization",
        "status": "complete",
        "input": source_description,
        "output": normalized,
    })

    # ── Step 2: Extract Attributes ──
    source_attrs = extract_attributes(source_description)
    # Also try extracting from normalized
    norm_attrs = extract_attributes(normalized)
    # Merge (original takes precedence, normalized fills gaps)
    merged_attrs = {**norm_attrs, **{k: v for k, v in source_attrs.items() if v}}
    
    pipeline_steps.append({
        "step": 2,
        "name": "Attribute Extraction",
        "status": "complete",
        "output": merged_attrs,
        "display": format_attributes_display(merged_attrs),
    })

    result["source"]["normalized"] = normalized
    result["source"]["attributes"] = merged_attrs
    result["source"]["attributes_display"] = format_attributes_display(merged_attrs)

    # ── Step 3: Get Candidates ──
    if candidate_description:
        # Direct comparison mode
        cand_normalized = normalize_description(candidate_description)
        if candidate_attrs is None:
            cand_attrs_extracted = extract_attributes(candidate_description)
            cand_norm_attrs = extract_attributes(cand_normalized)
            candidate_attrs = {**cand_norm_attrs, **{k: v for k, v in cand_attrs_extracted.items() if v}}
        
        candidates_raw = [{
            "material_id": candidate_id or "direct-input",
            "description": candidate_description,
            "normalized": cand_normalized,
            "attributes": candidate_attrs,
            "similarity": 0,  # Will be computed below
        }]
        pipeline_steps.append({
            "step": 3,
            "name": "Candidate Selection",
            "status": "complete",
            "output": f"Direct comparison with 1 candidate",
        })
    else:
        # Database retrieval mode
        retriever = get_retriever()
        exclude = [source_id] if source_id else []
        raw_candidates = retriever.retrieve(normalized, top_k=top_k, exclude_ids=exclude)
        
        candidates_raw = []
        for rc in raw_candidates:
            cand_norm = normalize_description(rc["description"])
            cand_attrs_ext = extract_attributes(rc["description"])
            cand_norm_attrs_ext = extract_attributes(cand_norm)
            merged_cand = {**cand_norm_attrs_ext, **{k: v for k, v in cand_attrs_ext.items() if v}}
            candidates_raw.append({
                "material_id": rc["material_id"],
                "description": rc["description"],
                "normalized": cand_norm,
                "attributes": merged_cand,
                "similarity": rc["similarity"],
            })
        
        pipeline_steps.append({
            "step": 3,
            "name": "Candidate Retrieval",
            "status": "complete",
            "output": f"Found {len(candidates_raw)} candidates via TF-IDF retrieval",
        })

    # ── Steps 4-7: Process each candidate ──
    processed_candidates = []

    for cand in candidates_raw:
        # Step 4: Semantic Similarity
        retriever = get_retriever()
        semantic_sim = retriever.compute_similarity(normalized, cand["normalized"])
        # Use the pre-computed retrieval similarity if higher
        if cand.get("similarity", 0) > semantic_sim:
            semantic_sim = cand["similarity"]
        
        # Step 5: Attribute Comparison
        attr_comparison = compare_attributes(merged_attrs, cand["attributes"])
        
        # Step 6: Constraint Validation
        constraint_result = validate_constraints(
            merged_attrs, cand["attributes"], attr_comparison
        )
        
        # Step 7: Confidence Scoring
        confidence_result = calculate_confidence(
            semantic_sim, attr_comparison["attribute_score"], constraint_result
        )
        
        # Generate explanation
        explanation = generate_explanation(
            confidence_result, semantic_sim, attr_comparison, constraint_result
        )
        
        processed_candidates.append({
            "material_id": cand["material_id"],
            "description": cand["description"],
            "normalized": cand["normalized"],
            "attributes": cand["attributes"],
            "attributes_display": format_attributes_display(cand["attributes"]),
            "semantic_similarity": round(semantic_sim * 100, 1),
            "attribute_score": attr_comparison["attribute_score"],
            "attribute_details": attr_comparison["attribute_details"],
            "constraints_passed": constraint_result["passed"],
            "constraint_conflicts": constraint_result["conflicts"],
            "constraint_warnings": constraint_result["warnings"],
            "confidence": confidence_result["confidence"],
            "decision": confidence_result["decision"],
            "decision_label": confidence_result["decision_label"],
            "explanation": explanation,
            "reasoning": confidence_result["reasoning"],
        })

    # Sort by confidence descending
    processed_candidates.sort(key=lambda c: c["confidence"], reverse=True)

    pipeline_steps.extend([
        {"step": 4, "name": "Semantic Similarity", "status": "complete",
         "output": f"Computed similarity for {len(processed_candidates)} candidates"},
        {"step": 5, "name": "Attribute Comparison", "status": "complete",
         "output": "Compared technical attributes with weighted scoring"},
        {"step": 6, "name": "Constraint Validation", "status": "complete",
         "output": "Validated critical technical constraints"},
        {"step": 7, "name": "Confidence Scoring", "status": "complete",
         "output": "Calculated final confidence and decision"},
    ])

    result["candidates"] = processed_candidates
    result["best_match"] = processed_candidates[0] if processed_candidates else None

    return result


def generate_standardized_code(attrs: dict[str, Any]) -> str:
    """
    Generate a deterministic standardized MaterialDNA code from attributes.

    Format: TYPE-MATERIAL-SIZE-SPEC
    Example: BOLT-SS304-M10-50
    """
    parts = []

    # Type (shortened)
    mat_type = attrs.get("material_type", "")
    type_abbrevs = {
        "Hex Bolt": "BOLT",
        "Stud Bolt": "STUD",
        "Socket Head Cap Screw": "SHCS",
        "Machine Screw": "MSCR",
        "Hex Nut": "NUT",
        "Lock Nut": "LNUT",
        "Flat Washer": "FWSH",
        "Spring Washer": "SWSH",
        "Gate Valve": "GV",
        "Globe Valve": "GLV",
        "Ball Valve": "BV",
        "Check Valve": "CV",
        "Butterfly Valve": "BFV",
        "Ball Bearing": "BBG",
        "Roller Bearing": "RBG",
        "Thrust Bearing": "TBG",
        "Pipe": "PIPE",
        "Elbow": "ELB",
        "Tee": "TEE",
        "Reducer": "RED",
        "Flange": "FLG",
        "Coupling": "CPL",
        "Gasket": "GSK",
        "O-Ring": "ORING",
        "Seal": "SEAL",
        "Cable": "CBL",
        "Cable Gland": "CGL",
        "Transformer": "XFMR",
        "Motor": "MOT",
        "Switch": "SW",
        "Circuit Breaker": "CB",
    }
    type_code = type_abbrevs.get(mat_type, mat_type.upper().replace(" ", "")[:4]) if mat_type else "MAT"
    parts.append(type_code)

    # Grade
    grade = attrs.get("grade", "")
    if grade:
        parts.append(grade.upper().replace(" ", ""))

    # Diameter
    diameter = attrs.get("diameter", "")
    if diameter:
        parts.append(diameter.upper().replace(" ", ""))

    # Length
    length = attrs.get("length", "")
    if length:
        # Extract just the number
        import re
        lm = re.search(r"(\d+)", length)
        if lm:
            parts.append(lm.group(1))

    return "-".join(parts) if len(parts) > 1 else parts[0] if parts else "UNKNOWN"
