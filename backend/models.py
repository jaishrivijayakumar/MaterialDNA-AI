"""
MaterialDNA AI — ORM Models
"""

import json
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, Text, DateTime, Boolean
try:
    from .database import Base
except (ImportError, ValueError):
    from database import Base


def utcnow():
    return datetime.now(timezone.utc)


class Material(Base):
    __tablename__ = "materials"

    id = Column(Integer, primary_key=True, autoincrement=True)
    material_id = Column(String(50), unique=True, nullable=False, index=True)
    cpse = Column(String(20), nullable=False, index=True)
    original_code = Column(String(100), nullable=False)
    original_description = Column(Text, nullable=False)
    normalized_description = Column(Text, default="")
    category = Column(String(50), default="", index=True)
    technical_attributes = Column(Text, default="{}")  # JSON
    status = Column(String(20), default="unprocessed")  # unprocessed, matched, review, no_match
    source = Column(String(50), default="seed")
    uom = Column(String(10), default="EA")
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)

    @property
    def attrs(self) -> dict:
        try:
            return json.loads(self.technical_attributes) if self.technical_attributes else {}
        except (json.JSONDecodeError, TypeError):
            return {}

    @attrs.setter
    def attrs(self, value: dict):
        self.technical_attributes = json.dumps(value)


class MatchResult(Base):
    __tablename__ = "match_results"

    id = Column(Integer, primary_key=True, autoincrement=True)
    match_id = Column(String(50), unique=True, nullable=False, index=True)
    source_material_id = Column(String(50), nullable=False, index=True)
    candidate_material_id = Column(String(50), nullable=False)
    semantic_similarity = Column(Float, default=0.0)
    attribute_score = Column(Float, default=0.0)
    constraints_passed = Column(Boolean, default=False)
    confidence = Column(Float, default=0.0)
    decision = Column(String(20), nullable=False)  # match, review, no_match
    explanation = Column(Text, default="{}")  # JSON
    attribute_details = Column(Text, default="[]")  # JSON
    constraint_details = Column(Text, default="[]")  # JSON
    created_at = Column(DateTime, default=utcnow)


class Review(Base):
    __tablename__ = "reviews"

    id = Column(Integer, primary_key=True, autoincrement=True)
    review_id = Column(String(50), unique=True, nullable=False, index=True)
    match_id = Column(String(50), nullable=False, index=True)
    source_material_id = Column(String(50), nullable=False)
    candidate_material_id = Column(String(50), nullable=False)
    status = Column(String(20), default="pending")  # pending, approved, rejected
    reason = Column(Text, default="")
    reviewer = Column(String(100), default="")
    notes = Column(Text, default="")
    confidence = Column(Float, default=0.0)
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)


class MaterialIdentity(Base):
    __tablename__ = "material_identities"

    id = Column(Integer, primary_key=True, autoincrement=True)
    identity_id = Column(String(50), unique=True, nullable=False, index=True)
    standardized_code = Column(String(100), nullable=False, index=True)
    category = Column(String(50), default="")
    attributes = Column(Text, default="{}")  # JSON
    linked_materials = Column(Text, default="[]")  # JSON — list of material_ids
    cpse_codes = Column(Text, default="{}")  # JSON — {cpse: original_code}
    status = Column(String(20), default="active")
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    action = Column(String(50), nullable=False)
    material_id = Column(String(50), default="")
    user = Column(String(100), default="System")
    details = Column(Text, default="")
    decision = Column(String(20), default="")
    timestamp = Column(DateTime, default=utcnow)
