"""
MaterialDNA AI — Reviews Router
"""

import json
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
try:
    from ..database import get_db
    from ..models import Review, Material, MatchResult, AuditLog
    from ..schemas import ReviewResponse, ReviewAction
except (ImportError, ValueError):
    from database import get_db
    from models import Review, Material, MatchResult, AuditLog
    from schemas import ReviewResponse, ReviewAction

router = APIRouter(prefix="/api/reviews", tags=["reviews"])


@router.get("")
def list_reviews(
    status: str = "",
    db: Session = Depends(get_db),
):
    query = db.query(Review)
    if status:
        query = query.filter(Review.status == status)

    reviews = query.order_by(Review.created_at.desc()).all()

    result = []
    for r in reviews:
        src = db.query(Material).filter(Material.material_id == r.source_material_id).first()
        cand = db.query(Material).filter(Material.material_id == r.candidate_material_id).first()

        result.append(ReviewResponse(
            review_id=r.review_id,
            match_id=r.match_id,
            source_material_id=r.source_material_id,
            candidate_material_id=r.candidate_material_id,
            source_description=src.original_description if src else "",
            candidate_description=cand.original_description if cand else "",
            source_cpse=src.cpse if src else "",
            candidate_cpse=cand.cpse if cand else "",
            status=r.status,
            reason=r.reason or "",
            reviewer=r.reviewer or "",
            notes=r.notes or "",
            confidence=r.confidence,
            created_at=r.created_at,
        ))

    return result


@router.post("/{review_id}/approve")
def approve_review(review_id: str, action: ReviewAction, db: Session = Depends(get_db)):
    review = db.query(Review).filter(Review.review_id == review_id).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")

    review.status = "approved"
    review.reviewer = action.reviewer or "Engineer"
    review.notes = action.notes
    review.updated_at = datetime.now(timezone.utc)

    # Update source material status
    src = db.query(Material).filter(Material.material_id == review.source_material_id).first()
    if src:
        src.status = "matched"
        src.updated_at = datetime.now(timezone.utc)

    # Audit log
    db.add(AuditLog(
        action="match_approved",
        material_id=review.source_material_id,
        user=action.reviewer or "Engineer",
        details=f"Review {review_id} approved: {review.source_material_id} matches {review.candidate_material_id}",
        decision="match",
    ))

    db.commit()
    return {"status": "approved", "review_id": review_id}


@router.post("/{review_id}/reject")
def reject_review(review_id: str, action: ReviewAction, db: Session = Depends(get_db)):
    review = db.query(Review).filter(Review.review_id == review_id).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")

    review.status = "rejected"
    review.reviewer = action.reviewer or "Engineer"
    review.notes = action.notes
    review.updated_at = datetime.now(timezone.utc)

    # Update source material status
    src = db.query(Material).filter(Material.material_id == review.source_material_id).first()
    if src:
        src.status = "no_match"
        src.updated_at = datetime.now(timezone.utc)

    # Audit log
    db.add(AuditLog(
        action="match_rejected",
        material_id=review.source_material_id,
        user=action.reviewer or "Engineer",
        details=f"Review {review_id} rejected: {review.source_material_id} does not match {review.candidate_material_id}",
        decision="no_match",
    ))

    db.commit()
    return {"status": "rejected", "review_id": review_id}
