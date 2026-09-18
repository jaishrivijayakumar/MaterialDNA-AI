"""
MaterialDNA AI — Material Identities Router
"""

import json
import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import MaterialIdentity, Material, AuditLog
from ..schemas import IdentityResponse, CreateIdentityRequest

router = APIRouter(prefix="/api/material-identities", tags=["identities"])


@router.get("")
def list_identities(db: Session = Depends(get_db)):
    identities = db.query(MaterialIdentity).order_by(
        MaterialIdentity.created_at.desc()
    ).all()

    return [_to_response(i) for i in identities]


@router.get("/{identity_id}")
def get_identity(identity_id: str, db: Session = Depends(get_db)):
    identity = db.query(MaterialIdentity).filter(
        MaterialIdentity.identity_id == identity_id
    ).first()
    if not identity:
        raise HTTPException(status_code=404, detail="Identity not found")
    return _to_response(identity)


@router.post("")
def create_identity(req: CreateIdentityRequest, db: Session = Depends(get_db)):
    identity_id = f"ID-{uuid.uuid4().hex[:8]}"

    # Build cpse_codes from material_ids
    cpse_codes = {}
    for mat_id in req.material_ids:
        mat = db.query(Material).filter(Material.material_id == mat_id).first()
        if mat:
            cpse_codes[mat.cpse] = mat.original_code
            mat.status = "matched"

    identity = MaterialIdentity(
        identity_id=identity_id,
        standardized_code=req.standardized_code,
        category=req.category,
        attributes=json.dumps(req.attributes),
        linked_materials=json.dumps(req.material_ids),
        cpse_codes=json.dumps(cpse_codes),
        status="active",
    )
    db.add(identity)

    # Audit
    db.add(AuditLog(
        action="identity_created",
        user="Engineer",
        details=f"MaterialDNA {req.standardized_code} created with {len(req.material_ids)} linked materials",
    ))

    db.commit()
    return _to_response(identity)


def _to_response(i: MaterialIdentity) -> IdentityResponse:
    try:
        attrs = json.loads(i.attributes) if i.attributes else {}
    except (json.JSONDecodeError, TypeError):
        attrs = {}
    try:
        linked = json.loads(i.linked_materials) if i.linked_materials else []
    except (json.JSONDecodeError, TypeError):
        linked = []
    try:
        cpse = json.loads(i.cpse_codes) if i.cpse_codes else {}
    except (json.JSONDecodeError, TypeError):
        cpse = {}

    return IdentityResponse(
        identity_id=i.identity_id,
        standardized_code=i.standardized_code,
        category=i.category or "",
        attributes=attrs,
        linked_materials=linked,
        cpse_codes=cpse,
        linked_count=len(linked),
        status=i.status or "active",
        created_at=i.created_at,
    )
