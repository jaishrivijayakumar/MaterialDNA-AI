"""
MaterialDNA AI — Upload Router
"""

import io
import json
import uuid
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
import pandas as pd
try:
    from ..database import get_db
    from ..models import Material, AuditLog
    from ..engine.normalizer import normalize_description
    from ..engine.extractor import extract_attributes
    from ..engine.retriever import get_retriever, reset_retriever
    from ..schemas import UploadPreview, UploadResult
except (ImportError, ValueError):
    from database import get_db
    from models import Material, AuditLog
    from engine.normalizer import normalize_description
    from engine.extractor import extract_attributes
    from engine.retriever import get_retriever, reset_retriever
    from schemas import UploadPreview, UploadResult

router = APIRouter(prefix="/api/materials", tags=["upload"])


REQUIRED_COLUMNS = {"original_description"}
OPTIONAL_COLUMNS = {
    "cpse", "original_code", "category", "material_id",
    "grade", "size", "diameter", "length", "pressure_class",
    "standard", "uom", "source", "material",
}


@router.post("/upload/preview")
async def preview_upload(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Preview uploaded file before importing."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    if ext not in ("csv", "xlsx", "xls"):
        raise HTTPException(status_code=400, detail="Only CSV and Excel files are supported")

    content = await file.read()

    try:
        if ext == "csv":
            df = pd.read_csv(io.BytesIO(content))
        else:
            df = pd.read_excel(io.BytesIO(content))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read file: {str(e)}")

    # Normalize column names
    df.columns = [c.strip().lower().replace(" ", "_") for c in df.columns]

    # Validation
    errors = []
    if "original_description" not in df.columns and "description" not in df.columns:
        errors.append("Missing required column: 'original_description' or 'description'")

    # Rename 'description' to 'original_description' if needed
    if "description" in df.columns and "original_description" not in df.columns:
        df = df.rename(columns={"description": "original_description"})

    valid_count = len(df.dropna(subset=["original_description"])) if "original_description" in df.columns else 0
    invalid_count = len(df) - valid_count

    preview_rows = df.head(5).fillna("").to_dict(orient="records")

    return UploadPreview(
        filename=file.filename,
        total_records=len(df),
        valid_records=valid_count,
        invalid_records=invalid_count,
        columns_detected=list(df.columns),
        preview_rows=preview_rows,
        validation_errors=errors,
    )


@router.post("/upload")
async def upload_materials(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Import materials from uploaded CSV/Excel file."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    content = await file.read()

    try:
        if ext == "csv":
            df = pd.read_csv(io.BytesIO(content))
        else:
            df = pd.read_excel(io.BytesIO(content))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read file: {str(e)}")

    df.columns = [c.strip().lower().replace(" ", "_") for c in df.columns]

    if "description" in df.columns and "original_description" not in df.columns:
        df = df.rename(columns={"description": "original_description"})

    if "original_description" not in df.columns:
        raise HTTPException(status_code=400, detail="Missing required column: original_description")

    imported = 0
    skipped = 0
    errors = []

    for _, row in df.iterrows():
        desc = str(row.get("original_description", "")).strip()
        if not desc or desc == "nan":
            skipped += 1
            continue

        cpse = str(row.get("cpse", "Uploaded")).strip()
        if cpse == "nan":
            cpse = "Uploaded"

        original_code = str(row.get("original_code", "")).strip()
        if not original_code or original_code == "nan":
            original_code = f"UPL-{uuid.uuid4().hex[:8]}"

        mat_id = str(row.get("material_id", "")).strip()
        if not mat_id or mat_id == "nan":
            mat_id = original_code

        # Check for duplicates
        existing = db.query(Material).filter(Material.material_id == mat_id).first()
        if existing:
            skipped += 1
            continue

        normalized = normalize_description(desc)
        attrs = extract_attributes(desc)
        norm_attrs = extract_attributes(normalized)
        merged = {**norm_attrs, **{k: v for k, v in attrs.items() if v}}

        category = str(row.get("category", "")).strip()
        if category == "nan":
            category = ""

        material = Material(
            material_id=mat_id,
            cpse=cpse,
            original_code=original_code,
            original_description=desc,
            normalized_description=normalized,
            category=category,
            technical_attributes=json.dumps(merged),
            status="unprocessed",
            source="upload",
            uom=merged.get("uom", "EA"),
        )
        db.add(material)
        imported += 1

    if imported > 0:
        # Audit log
        db.add(AuditLog(
            action="dataset_imported",
            user="User",
            details=f"Imported {imported} materials from {file.filename}",
        ))
        db.commit()

        # Reset retriever to re-index
        reset_retriever()

    return UploadResult(
        imported=imported,
        skipped=skipped,
        errors=errors,
    )
