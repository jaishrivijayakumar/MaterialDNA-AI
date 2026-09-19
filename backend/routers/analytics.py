"""
MaterialDNA AI — Analytics Router
"""

import json
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
try:
    from ..database import get_db
    from ..models import Material, MatchResult, Review, MaterialIdentity, AuditLog
    from ..schemas import AnalyticsResponse
except (ImportError, ValueError):
    from database import get_db
    from models import Material, MatchResult, Review, MaterialIdentity, AuditLog
    from schemas import AnalyticsResponse

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


@router.get("", response_model=AnalyticsResponse)
def get_analytics(db: Session = Depends(get_db)):
    total_materials = db.query(Material).count()
    matched_count = db.query(MatchResult).filter(MatchResult.decision == "match").count()
    no_match_count = db.query(MatchResult).filter(MatchResult.decision == "no_match").count()
    pending_reviews = db.query(Review).filter(Review.status == "pending").count()
    harmonized = db.query(MaterialIdentity).count()
    total_matches = db.query(MatchResult).count()

    # Potential duplicates (matched pairs)
    potential_duplicates = matched_count

    # By CPSE
    by_cpse_query = db.query(
        Material.cpse, func.count(Material.id)
    ).group_by(Material.cpse).all()
    by_cpse = [{"name": c[0], "count": c[1]} for c in by_cpse_query]

    # By category
    by_cat_query = db.query(
        Material.category, func.count(Material.id)
    ).group_by(Material.category).all()
    by_category = [{"name": c[0] or "Uncategorized", "count": c[1]} for c in by_cat_query]

    # By decision
    by_dec_query = db.query(
        MatchResult.decision, func.count(MatchResult.id)
    ).group_by(MatchResult.decision).all()
    decision_labels = {"match": "Match", "review": "Review", "no_match": "No Match"}
    by_decision = [
        {"name": decision_labels.get(d[0], d[0]), "count": d[1]}
        for d in by_dec_query
    ]

    # Match rate
    match_rate = (matched_count / total_matches * 100) if total_matches > 0 else 0

    # Harmonization rate
    total_linked = 0
    identities = db.query(MaterialIdentity).all()
    for ident in identities:
        try:
            linked = json.loads(ident.linked_materials) if ident.linked_materials else []
            total_linked += len(linked)
        except (json.JSONDecodeError, TypeError):
            pass
    harmonization_rate = (total_linked / total_materials * 100) if total_materials > 0 else 0

    # Recent activity
    recent_logs = db.query(AuditLog).order_by(AuditLog.timestamp.desc()).limit(10).all()
    recent_activity = [
        {
            "action": log.action,
            "material_id": log.material_id,
            "user": log.user,
            "details": log.details,
            "decision": log.decision,
            "timestamp": log.timestamp.isoformat() if log.timestamp else "",
        }
        for log in recent_logs
    ]

    # Insights
    insights = []
    if by_category:
        top_cat = max(by_category, key=lambda c: c["count"])
        insights.append(
            f"{top_cat['name']} accounts for the highest number of material records ({top_cat['count']} items)."
        )
    if potential_duplicates > 0:
        insights.append(
            f"{potential_duplicates} potential duplicate pairs identified across {len(by_cpse)} CPSEs."
        )
    if pending_reviews > 0:
        insights.append(
            f"{pending_reviews} materials require manual engineering review before harmonization."
        )
    if harmonized > 0:
        insights.append(
            f"{harmonized} standardized MaterialDNA identities link {total_linked} CPSE-specific codes."
        )

    return AnalyticsResponse(
        total_materials=total_materials,
        potential_duplicates=potential_duplicates,
        harmonized_identities=harmonized,
        pending_reviews=pending_reviews,
        no_match_count=no_match_count,
        match_rate=round(match_rate, 1),
        harmonization_rate=round(harmonization_rate, 1),
        by_cpse=by_cpse,
        by_category=by_category,
        by_decision=by_decision,
        recent_activity=recent_activity,
        insights=insights,
    )
