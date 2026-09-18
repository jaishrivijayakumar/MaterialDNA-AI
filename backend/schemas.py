"""
MaterialDNA AI — Pydantic Schemas

Request/response models for the FastAPI endpoints.
"""

from pydantic import BaseModel, Field
from typing import Any, Optional
from datetime import datetime


# ── Material Schemas ────────────────────────────────────────────────────────

class MaterialBase(BaseModel):
    cpse: str
    original_code: str
    original_description: str
    category: str = ""
    uom: str = "EA"


class MaterialResponse(BaseModel):
    material_id: str
    cpse: str
    original_code: str
    original_description: str
    normalized_description: str = ""
    category: str = ""
    technical_attributes: dict = {}
    status: str = "unprocessed"
    uom: str = "EA"
    source: str = "seed"
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class MaterialListResponse(BaseModel):
    materials: list[MaterialResponse]
    total: int
    page: int
    page_size: int


# ── Match Schemas ───────────────────────────────────────────────────────────

class MatchRequest(BaseModel):
    description: str = Field(..., min_length=3)
    cpse: str = ""
    material_id: Optional[str] = None
    candidate_description: Optional[str] = None
    candidate_id: Optional[str] = None
    top_k: int = 5


class AttributeDetail(BaseModel):
    attribute: str
    label: str
    source_value: Optional[str] = None
    candidate_value: Optional[str] = None
    status: str  # match, mismatch, missing_in_source, missing_in_candidate
    weight: float = 0


class CandidateResult(BaseModel):
    material_id: str = ""
    description: str = ""
    cpse: str = ""
    original_code: str = ""
    normalized: str = ""
    attributes: dict = {}
    attributes_display: list[dict] = []
    semantic_similarity: float = 0
    attribute_score: float = 0
    attribute_details: list[dict] = []
    constraints_passed: bool = False
    constraint_conflicts: list[dict] = []
    constraint_warnings: list[dict] = []
    confidence: float = 0
    decision: str = ""
    decision_label: str = ""
    explanation: dict = {}
    reasoning: list[str] = []


class PipelineStep(BaseModel):
    step: int
    name: str
    status: str
    input: Optional[str] = None
    output: Any = None
    display: Optional[list] = None


class MatchResponse(BaseModel):
    match_id: Optional[str] = None
    source: dict
    pipeline_steps: list[dict]
    candidates: list[CandidateResult]
    best_match: Optional[CandidateResult] = None


# ── Review Schemas ──────────────────────────────────────────────────────────

class ReviewResponse(BaseModel):
    review_id: str
    match_id: str
    source_material_id: str
    candidate_material_id: str
    source_description: str = ""
    candidate_description: str = ""
    source_cpse: str = ""
    candidate_cpse: str = ""
    status: str
    reason: str = ""
    reviewer: str = ""
    notes: str = ""
    confidence: float = 0
    created_at: Optional[datetime] = None


class ReviewAction(BaseModel):
    reviewer: str = "Engineer"
    notes: str = ""


# ── Identity Schemas ────────────────────────────────────────────────────────

class IdentityResponse(BaseModel):
    identity_id: str
    standardized_code: str
    category: str = ""
    attributes: dict = {}
    linked_materials: list[str] = []
    cpse_codes: dict = {}
    linked_count: int = 0
    status: str = "active"
    created_at: Optional[datetime] = None


class CreateIdentityRequest(BaseModel):
    standardized_code: str
    category: str = ""
    attributes: dict = {}
    material_ids: list[str] = []


# ── Analytics Schemas ───────────────────────────────────────────────────────

class AnalyticsResponse(BaseModel):
    total_materials: int = 0
    potential_duplicates: int = 0
    harmonized_identities: int = 0
    pending_reviews: int = 0
    no_match_count: int = 0
    match_rate: float = 0
    harmonization_rate: float = 0
    by_cpse: list[dict] = []
    by_category: list[dict] = []
    by_decision: list[dict] = []
    recent_activity: list[dict] = []
    insights: list[str] = []


# ── Audit Schemas ───────────────────────────────────────────────────────────

class AuditEntry(BaseModel):
    id: int = 0
    action: str
    material_id: str = ""
    user: str = "System"
    details: str = ""
    decision: str = ""
    timestamp: Optional[datetime] = None


# ── Upload Schemas ──────────────────────────────────────────────────────────

class UploadPreview(BaseModel):
    filename: str
    total_records: int
    valid_records: int
    invalid_records: int
    columns_detected: list[str]
    preview_rows: list[dict] = []
    validation_errors: list[str] = []


class UploadResult(BaseModel):
    imported: int
    skipped: int
    errors: list[str] = []
