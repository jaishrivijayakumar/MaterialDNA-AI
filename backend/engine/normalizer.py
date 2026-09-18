"""
MaterialDNA AI — Text Normalizer

Normalizes heterogeneous material descriptions into a consistent
canonical form suitable for attribute extraction and similarity matching.

Pipeline:
  raw text → lowercase → punctuation norm → abbreviation expansion
  → unit normalization → whitespace cleanup → filler removal
"""

import re
from typing import Optional

# ── Abbreviation Expansion Map ──────────────────────────────────────────────
ABBREVIATIONS: dict[str, str] = {
    # Material types
    r"\bHEX\b": "HEXAGONAL",
    r"\bHEXAG\b": "HEXAGONAL",
    r"\bBLT\b": "BOLT",
    r"\bSCR\b": "SCREW",
    r"\bNT\b": "NUT",
    r"\bWSH\b": "WASHER",
    r"\bWSHR\b": "WASHER",
    r"\bFLG\b": "FLANGE",
    r"\bGSKT\b": "GASKET",
    r"\bBRG\b": "BEARING",
    r"\bVLV\b": "VALVE",
    r"\bELB\b": "ELBOW",
    r"\bRDCR\b": "REDUCER",
    r"\bCPLG\b": "COUPLING",
    r"\bSTUD\b": "STUD",

    # Material grades
    r"\bSS\s*304\b": "STAINLESS STEEL 304",
    r"\bSS\s*316\b": "STAINLESS STEEL 316",
    r"\bSS\s*316L\b": "STAINLESS STEEL 316L",
    r"\bSS\s*410\b": "STAINLESS STEEL 410",
    r"\bSS\s*202\b": "STAINLESS STEEL 202",
    r"\bSS\b": "STAINLESS STEEL",
    r"\bCS\b": "CARBON STEEL",
    r"\bMS\b": "MILD STEEL",
    r"\bGI\b": "GALVANIZED IRON",
    r"\bCI\b": "CAST IRON",
    r"\bBLK\b": "BLACK",
    r"\bBRS\b": "BRASS",
    r"\bAL\b": "ALUMINIUM",
    r"\bHTS\b": "HIGH TENSILE STEEL",
    r"\bHTST\b": "HIGH TENSILE STEEL",
    r"\bMC\b": "MACHINE",

    # Standards
    r"\bIS\s*(\d+)\b": r"IS \1",
    r"\bASTM\s*([A-Z]\d+)\b": r"ASTM \1",
    r"\bDIN\s*(\d+)\b": r"DIN \1",
    r"\bBS\s*(\d+)\b": r"BS \1",
    r"\bEN\s*(\d+)\b": r"EN \1",
    r"\bASME\b": "ASME",
    r"\bAPI\b": "API",

    # Units and qualifiers
    r"\bLG\b": "LONG",
    r"\bTHK\b": "THICK",
    r"\bDIA\b": "DIAMETER",
    r"\bID\b": "INNER DIAMETER",
    r"\bOD\b": "OUTER DIAMETER",
    r"\bNB\b": "NOMINAL BORE",
    r"\bSCH\b": "SCHEDULE",
    r"\bCL\b": "CLASS",
    r"\bGR\b": "GRADE",
    r"\bSPEC\b": "SPECIFICATION",
    r"\bAPPROX\b": "APPROXIMATELY",
    r"\bSTD\b": "STANDARD",
    r"\bHVY\b": "HEAVY",
    r"\bLT\b": "LIGHT",

    # UOM
    r"\bEA\b": "EACH",
    r"\bNOS\b": "NUMBERS",
    r"\bKG\b": "KILOGRAM",
    r"\bKGS\b": "KILOGRAM",
    r"\bMTR\b": "METRE",
    r"\bMTRS\b": "METRE",
    r"\bSET\b": "SET",
    r"\bPCS\b": "PIECES",
    r"\bPC\b": "PIECE",
    r"\bPR\b": "PAIR",
}

# Words to strip from descriptions (low information content)
FILLER_WORDS = {
    "FOR", "USE", "WITH", "TYPE", "MATERIAL", "ITEM",
    "MAKE", "BRAND", "SIZE", "DESCRIPTION", "SPECIFICATION",
    "SUPPLY", "PROCUREMENT", "PURCHASE", "ORDER",
}

# Separator characters to normalize — only between numbers (dimension context)
SEPARATOR_PATTERN = re.compile(r"(?<=\d)\s*[×x\*]\s*(?=\d)", re.IGNORECASE)


def normalize_description(text: str) -> str:
    """
    Full normalization pipeline for a material description.

    Args:
        text: Raw material description from any CPSE

    Returns:
        Normalized, canonical-form description string
    """
    if not text or not text.strip():
        return ""

    result = text.strip()

    # Step 1: Uppercase for consistent processing
    result = result.upper()

    # Step 2: Normalize unicode and special characters
    result = result.replace("×", "X").replace("–", "-").replace("—", "-")
    result = result.replace(""", '"').replace(""", '"')
    result = result.replace("'", "'").replace("'", "'")

    # Step 3: Normalize separators (commas, colons, semicolons between attributes)
    result = re.sub(r"[,;:]+", " ", result)

    # Step 4: Normalize hyphens/dashes used as separators (but preserve in codes like IS-1364)
    result = re.sub(r"\s*-\s*", " ", result)

    # Step 5: Normalize dimension separators (× x X * between digits) to X
    result = SEPARATOR_PATTERN.sub(" X ", result)

    # Step 6: Normalize units — attach unit to number
    # "10 MM" → "10MM", "50 MM" → "50MM"
    result = re.sub(r"(\d+)\s*(MM|CM|M|INCH|IN|FT)\b", r"\1\2", result, flags=re.IGNORECASE)

    # Step 7: Normalize metric thread designation
    # "M 10" → "M10", "M 20" → "M20"
    result = re.sub(r"\bM\s+(\d+)", r"M\1", result)

    # Step 8: Expand abbreviations
    for pattern, replacement in ABBREVIATIONS.items():
        result = re.sub(pattern, replacement, result)

    # Step 9: Remove filler words
    tokens = result.split()
    tokens = [t for t in tokens if t not in FILLER_WORDS]
    result = " ".join(tokens)

    # Step 10: Collapse multiple spaces
    result = re.sub(r"\s+", " ", result).strip()

    return result


def normalize_for_comparison(text: str) -> str:
    """
    Lighter normalization for comparison purposes — strips all
    non-alphanumeric characters and lowercases.
    """
    if not text:
        return ""
    return re.sub(r"[^a-z0-9]", "", text.lower())


def extract_numeric(text: str) -> Optional[float]:
    """Extract the first numeric value from a string."""
    match = re.search(r"(\d+\.?\d*)", text)
    return float(match.group(1)) if match else None
