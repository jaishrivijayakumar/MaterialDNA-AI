"""
MaterialDNA AI — Matching Router
"""

import json
import uuid
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
try:
    from ..database import get_db
    from ..models import Material, MatchResult, Review, AuditLog
    from ..schemas import MatchRequest, MatchResponse
    from ..engine.pipeline import run_matching_pipeline
    from ..engine.normalizer import normalize_description
    from ..engine.extractor import extract_attributes
except (ImportError, ValueError):
    from database import get_db
    from models import Material, MatchResult, Review, AuditLog
    from schemas import MatchRequest, MatchResponse
    from engine.pipeline import run_matching_pipeline
    from engine.normalizer import normalize_description
    from engine.extractor import extract_attributes

router = APIRouter(prefix="/api", tags=["matching"])


@router.post("/match", response_model=MatchResponse)
def run_match(req: MatchRequest, db: Session = Depends(get_db)):
    """Run the full matching pipeline on a material description."""

    # Build candidate context if matching against a specific candidate
    candidate_desc = req.candidate_description
    candidate_attrs = None

    if req.candidate_id:
        cand_mat = db.query(Material).filter(
            Material.material_id == req.candidate_id
        ).first()
        if cand_mat:
            candidate_desc = cand_mat.original_description
            try:
                candidate_attrs = json.loads(cand_mat.technical_attributes) if cand_mat.technical_attributes else None
            except (json.JSONDecodeError, TypeError):
                candidate_attrs = None

    # Run pipeline
    result = run_matching_pipeline(
        source_description=req.description,
        source_cpse=req.cpse,
        source_id=req.material_id,
        candidate_description=candidate_desc,
        candidate_id=req.candidate_id,
        candidate_attrs=candidate_attrs,
        top_k=req.top_k,
    )

    # Enrich candidates with database info
    for cand in result.get("candidates", []):
        mat_id = cand.get("material_id", "")
        if mat_id and mat_id != "direct-input":
            db_mat = db.query(Material).filter(Material.material_id == mat_id).first()
            if db_mat:
                cand["cpse"] = db_mat.cpse
                cand["original_code"] = db_mat.original_code
                cand["description"] = db_mat.original_description

    # Store match results in database
    match_id = f"MR-{uuid.uuid4().hex[:8]}"
    if result.get("best_match"):
        best = result["best_match"]
        mr = MatchResult(
            match_id=match_id,
            source_material_id=req.material_id or "manual-input",
            candidate_material_id=best.get("material_id", ""),
            semantic_similarity=best.get("semantic_similarity", 0) / 100,
            attribute_score=best.get("attribute_score", 0),
            constraints_passed=best.get("constraints_passed", False),
            confidence=best.get("confidence", 0),
            decision=best.get("decision", "no_match"),
            explanation=json.dumps(best.get("explanation", {})),
            attribute_details=json.dumps(best.get("attribute_details", [])),
            constraint_details=json.dumps(best.get("constraint_conflicts", [])),
        )
        db.add(mr)

        # Create review if decision is "review"
        if best.get("decision") == "review":
            review = Review(
                review_id=f"RV-{uuid.uuid4().hex[:8]}",
                match_id=match_id,
                source_material_id=req.material_id or "manual-input",
                candidate_material_id=best.get("material_id", ""),
                status="pending",
                reason=_get_review_reason(best),
                confidence=best.get("confidence", 0),
            )
            db.add(review)

        # Audit log
        audit = AuditLog(
            action="material_analyzed",
            material_id=req.material_id or "",
            user="System",
            details=f"Matched '{req.description[:60]}...' — {best.get('decision_label', 'Unknown')} ({best.get('confidence', 0):.0f}%)",
            decision=best.get("decision", ""),
        )
        db.add(audit)
        db.commit()

    result["match_id"] = match_id
    return result


@router.get("/matches/{match_id}")
def get_match(match_id: str, db: Session = Depends(get_db)):
    mr = db.query(MatchResult).filter(MatchResult.match_id == match_id).first()
    if not mr:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Match not found")

    return {
        "match_id": mr.match_id,
        "source_material_id": mr.source_material_id,
        "candidate_material_id": mr.candidate_material_id,
        "semantic_similarity": mr.semantic_similarity,
        "attribute_score": mr.attribute_score,
        "constraints_passed": mr.constraints_passed,
        "confidence": mr.confidence,
        "decision": mr.decision,
        "explanation": json.loads(mr.explanation) if mr.explanation else {},
        "attribute_details": json.loads(mr.attribute_details) if mr.attribute_details else [],
        "created_at": mr.created_at,
    }


def _get_review_reason(candidate: dict) -> str:
    """Generate a human-readable review reason."""
    reasons = []
    for warning in candidate.get("constraint_warnings", []):
        reasons.append(warning.get("message", ""))
    if not reasons:
        if candidate.get("confidence", 0) < 80:
            reasons.append("Confidence below threshold for automatic match")
    return "; ".join(reasons) if reasons else "Manual review required"
