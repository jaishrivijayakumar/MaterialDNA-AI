"""
MaterialDNA AI — Audit Trail Router
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import AuditLog

router = APIRouter(prefix="/api/audit", tags=["audit"])


@router.get("")
def list_audit(
    action: str = Query("", description="Filter by action type"),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    query = db.query(AuditLog)
    if action:
        query = query.filter(AuditLog.action == action)

    logs = query.order_by(AuditLog.timestamp.desc()).limit(limit).all()

    action_labels = {
        "material_analyzed": "Material Analyzed",
        "match_approved": "Match Approved",
        "match_rejected": "Match Rejected",
        "identity_created": "Identity Created",
        "review_requested": "Review Requested",
        "review_completed": "Review Completed",
        "dataset_imported": "Dataset Imported",
        "material_updated": "Material Updated",
    }

    return [
        {
            "id": log.id,
            "action": log.action,
            "action_label": action_labels.get(log.action, log.action.replace("_", " ").title()),
            "material_id": log.material_id or "",
            "user": log.user or "System",
            "details": log.details or "",
            "decision": log.decision or "",
            "timestamp": log.timestamp.isoformat() if log.timestamp else "",
        }
        for log in logs
    ]
