"""
MaterialDNA AI — Materials Router
"""

import json
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
try:
    from ..database import get_db
    from ..models import Material
    from ..schemas import MaterialResponse, MaterialListResponse
except (ImportError, ValueError):
    from database import get_db
    from models import Material
    from schemas import MaterialResponse, MaterialListResponse

router = APIRouter(prefix="/api/materials", tags=["materials"])


@router.get("", response_model=MaterialListResponse)
def list_materials(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    cpse: str = Query("", description="Filter by CPSE"),
    category: str = Query("", description="Filter by category"),
    status: str = Query("", description="Filter by status"),
    search: str = Query("", description="Search in description"),
    db: Session = Depends(get_db),
):
    query = db.query(Material)

    if cpse:
        query = query.filter(Material.cpse == cpse)
    if category:
        query = query.filter(Material.category == category)
    if status:
        query = query.filter(Material.status == status)
    if search:
        query = query.filter(
            Material.original_description.ilike(f"%{search}%")
            | Material.original_code.ilike(f"%{search}%")
            | Material.normalized_description.ilike(f"%{search}%")
        )

    total = query.count()
    materials = query.order_by(Material.created_at.desc()).offset(
        (page - 1) * page_size
    ).limit(page_size).all()

    return MaterialListResponse(
        materials=[_to_response(m) for m in materials],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/categories")
def get_categories(db: Session = Depends(get_db)):
    cats = db.query(Material.category).distinct().all()
    return [c[0] for c in cats if c[0]]


@router.get("/cpses")
def get_cpses(db: Session = Depends(get_db)):
    cpses = db.query(Material.cpse).distinct().all()
    return [c[0] for c in cpses if c[0]]


@router.get("/{material_id}", response_model=MaterialResponse)
def get_material(material_id: str, db: Session = Depends(get_db)):
    material = db.query(Material).filter(Material.material_id == material_id).first()
    if not material:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Material not found")
    return _to_response(material)


def _to_response(m: Material) -> MaterialResponse:
    try:
        attrs = json.loads(m.technical_attributes) if m.technical_attributes else {}
    except (json.JSONDecodeError, TypeError):
        attrs = {}

    return MaterialResponse(
        material_id=m.material_id,
        cpse=m.cpse,
        original_code=m.original_code,
        original_description=m.original_description,
        normalized_description=m.normalized_description or "",
        category=m.category or "",
        technical_attributes=attrs,
        status=m.status or "unprocessed",
        uom=m.uom or "EA",
        source=m.source or "seed",
        created_at=m.created_at,
        updated_at=m.updated_at,
    )
