"""
MaterialDNA AI — Technical Attribute Extractor

Extracts structured technical attributes from material descriptions
using regex pattern matching. Handles diverse CPSE description formats.

Extracts:
  - material_type (Hex Bolt, Gate Valve, Ball Bearing, etc.)
  - grade (SS304, SS316, 10.9, 8.8, A2-70, etc.)
  - diameter (M10, M20, 25MM, 1/2", etc.)
  - length (50MM, 65MM, 100MM, etc.)
  - material (Stainless Steel, Carbon Steel, Brass, etc.)
  - standard (IS 1364, ASTM A193, DIN 933, etc.)
  - pressure_class (150#, 300LB, PN16, Class 150, etc.)
  - uom (EA, KG, MTR, SET, etc.)
  - schedule (SCH 40, SCH 80, etc.)
  - nominal_bore (NB 25, 2" NB, etc.)
"""

import re
from typing import Any


# ── Material Type Patterns ──────────────────────────────────────────────────
MATERIAL_TYPES: dict[str, list[str]] = {
    "Hex Bolt": [
        r"\bHEX(?:AGONAL)?\s*BOLT",
        r"\bBOLT\s*HEX(?:AGONAL)?",
        r"\bBOLT.*HEX",
    ],
    "Stud Bolt": [
        r"\bSTUD\s*BOLT",
        r"\bBOLT\s*STUD",
    ],
    "Socket Head Cap Screw": [
        r"\bSOCKET\s*HEAD\s*CAP\s*SCREW",
        r"\bSHCS\b",
    ],
    "Machine Screw": [
        r"\bMACHINE\s*SCREW",
    ],
    "Hex Nut": [
        r"\bHEX(?:AGONAL)?\s*NUT",
        r"\bNUT\s*HEX(?:AGONAL)?",
    ],
    "Lock Nut": [
        r"\bLOCK\s*NUT",
        r"\bNYLOC\s*NUT",
    ],
    "Flat Washer": [
        r"\bFLAT\s*WASHER",
        r"\bWASHER\s*FLAT",
        r"\bPLAIN\s*WASHER",
    ],
    "Spring Washer": [
        r"\bSPRING\s*WASHER",
        r"\bWASHER\s*SPRING",
    ],
    "Gate Valve": [
        r"\bGATE\s*VALVE",
        r"\bVALVE\s*GATE",
    ],
    "Globe Valve": [
        r"\bGLOBE\s*VALVE",
        r"\bVALVE\s*GLOBE",
    ],
    "Ball Valve": [
        r"\bBALL\s*VALVE",
        r"\bVALVE\s*BALL",
    ],
    "Check Valve": [
        r"\bCHECK\s*VALVE",
        r"\bNON\s*RETURN\s*VALVE",
        r"\bNRV\b",
    ],
    "Butterfly Valve": [
        r"\bBUTTERFLY\s*VALVE",
    ],
    "Ball Bearing": [
        r"\bBALL\s*BEARING",
        r"\bBEARING\s*BALL",
        r"\bDEEP\s*GROOVE\s*BALL\s*BEARING",
    ],
    "Roller Bearing": [
        r"\bROLLER\s*BEARING",
        r"\bBEARING\s*ROLLER",
        r"\bTAPER(?:ED)?\s*ROLLER\s*BEARING",
    ],
    "Thrust Bearing": [
        r"\bTHRUST\s*BEARING",
    ],
    "Pipe": [
        r"\bPIPE\b(?!.*FITTING)",
        r"\bSEAMLESS\s*PIPE",
        r"\bWELDED\s*PIPE",
        r"\bERW\s*PIPE",
    ],
    "Elbow": [
        r"\bELBOW\b",
        r"\b90\s*DEG(?:REE)?\s*ELBOW",
        r"\b45\s*DEG(?:REE)?\s*ELBOW",
    ],
    "Tee": [
        r"\bTEE\b(?!.*BOLT)",
        r"\bEQUAL\s*TEE",
        r"\bREDUCING\s*TEE",
    ],
    "Reducer": [
        r"\bREDUCER\b",
        r"\bCONCENTRIC\s*REDUCER",
        r"\bECCENTRIC\s*REDUCER",
    ],
    "Flange": [
        r"\bFLANGE\b",
        r"\bWELD\s*NECK\s*FLANGE",
        r"\bSLIP\s*ON\s*FLANGE",
        r"\bBLIND\s*FLANGE",
        r"\bWNRF\b",
        r"\bSOFF\b",
    ],
    "Coupling": [
        r"\bCOUPLING\b",
        r"\bFULL\s*COUPLING",
        r"\bHALF\s*COUPLING",
    ],
    "Gasket": [
        r"\bGASKET\b",
        r"\bSPIRAL\s*WOUND\s*GASKET",
        r"\bRING\s*JOINT\s*GASKET",
        r"\bRTJ\s*GASKET",
    ],
    "O-Ring": [
        r"\bO[\s-]*RING",
    ],
    "Seal": [
        r"\bSEAL\b",
        r"\bMECHANICAL\s*SEAL",
        r"\bOIL\s*SEAL",
    ],
    "Cable": [
        r"\bCABLE\b",
        r"\bPOWER\s*CABLE",
        r"\bCONTROL\s*CABLE",
        r"\bXLPE\s*CABLE",
    ],
    "Cable Gland": [
        r"\bCABLE\s*GLAND",
    ],
    "Transformer": [
        r"\bTRANSFORMER\b",
    ],
    "Motor": [
        r"\bMOTOR\b",
        r"\bINDUCTION\s*MOTOR",
    ],
    "Switch": [
        r"\bSWITCH\b",
        r"\bLIMIT\s*SWITCH",
        r"\bPROXIMITY\s*SWITCH",
    ],
    "Circuit Breaker": [
        r"\bCIRCUIT\s*BREAKER",
        r"\bMCB\b",
        r"\bMCCB\b",
        r"\bACB\b",
    ],
}

# ── Grade Patterns ──────────────────────────────────────────────────────────
GRADE_PATTERNS = [
    # Stainless steel grades
    (r"\b(?:STAINLESS\s*STEEL\s*)?(\d{3}L?)\b(?=.*(?:STEEL|STAINLESS|SS))", None),
    (r"\bSS\s*(\d{3}L?)\b", "SS"),
    (r"\bSTAINLESS\s*STEEL\s*(\d{3}L?)\b", "SS"),
    # ISO property class for bolts
    (r"\b(\d+\.\d+)\b", None),  # e.g., 10.9, 8.8, 4.6
    # A2-70, A4-80 style
    (r"\b(A[24][\s-]\d{2})\b", None),
    # ASTM grades
    (r"\bGR(?:ADE)?\s*([A-Z0-9]+)\b", "GR"),
    # Generic grade reference
    (r"\bGRADE\s*(\S+)\b", "GR"),
]

# ── Standard Patterns ──────────────────────────────────────────────────────
STANDARD_PATTERNS = [
    r"\bIS\s*(\d+(?:\s*PART\s*\d+)?)\b",
    r"\bASTM\s*([A-Z]\s*\d+(?:[A-Z])?)\b",
    r"\bDIN\s*(\d+)\b",
    r"\bBS\s*(\d+)\b",
    r"\bEN\s*(\d+)\b",
    r"\bASME\s*(B\d+\.\d+(?:\.\d+)?)\b",
    r"\bAPI\s*(\d+[A-Z]?)\b",
    r"\bJIS\s*([A-Z]\s*\d+)\b",
    r"\bANSI\s*(B\d+\.\d+)\b",
    r"\bIEC\s*(\d+)\b",
]

# ── Pressure Class Patterns ────────────────────────────────────────────────
PRESSURE_CLASS_PATTERNS = [
    r"\b(\d+)\s*(?:#|LB|LBS)\b",
    r"\bCLASS\s*(\d+)\b",
    r"\bCL\s*(\d+)\b",
    r"\bPN\s*(\d+)\b",
    r"\bRATING\s*(\d+)\b",
]

# ── Diameter Patterns ──────────────────────────────────────────────────────
DIAMETER_PATTERNS = [
    r"\bM(\d+)\b",                        # Metric thread: M10, M20
    r"\b(\d+(?:\.\d+)?)\s*MM\b",          # 10MM, 25.4MM
    r"\b(\d+(?:\.\d+)?)\s*INCH\b",        # 2 INCH
    r'\b(\d+/\d+)\s*["\u2033]',           # 1/2", 3/4"
    r"\bDN\s*(\d+)\b",                    # DN25, DN50
    r"\bNB\s*(\d+)\b",                    # NB25
    r"\b(\d+)\s*NB\b",                    # 25 NB
    r'\b(\d+(?:\.\d+)?)\s*["\u2033]\b',   # 2", 1.5"
]

# ── Length Patterns ────────────────────────────────────────────────────────
LENGTH_PATTERNS = [
    r"\b(\d+(?:\.\d+)?)\s*MM\s*(?:L(?:ONG)?|LG|LENGTH)\b",
    r"\bL(?:ENGTH)?\s*(\d+(?:\.\d+)?)\s*MM\b",
    r"\bX\s*(\d+(?:\.\d+)?)\s*MM\b",           # after diameter: M10 X 50MM
    r"\bX\s*(\d+(?:\.\d+)?)\b(?!.*MM.*X)",      # M10 X 50 (no unit, assume mm)
]

# ── Material Patterns ──────────────────────────────────────────────────────
MATERIAL_MAP = {
    "Stainless Steel": [r"\bSTAINLESS\s*STEEL\b", r"\bSS\b"],
    "Carbon Steel": [r"\bCARBON\s*STEEL\b", r"\bCS\b"],
    "Mild Steel": [r"\bMILD\s*STEEL\b", r"\bMS\b"],
    "Cast Iron": [r"\bCAST\s*IRON\b", r"\bCI\b"],
    "Galvanized Iron": [r"\bGALVANI[SZ]ED\s*IRON\b", r"\bGI\b"],
    "Brass": [r"\bBRASS\b"],
    "Bronze": [r"\bBRONZE\b"],
    "Aluminium": [r"\bALUMINI?UM\b", r"\bAL\b"],
    "Copper": [r"\bCOPPER\b"],
    "High Tensile Steel": [r"\bHIGH\s*TENSILE\s*STEEL\b", r"\bHTS\b"],
    "Alloy Steel": [r"\bALLOY\s*STEEL\b"],
    "Rubber": [r"\bRUBBER\b", r"\bNEOPRENE\b", r"\bNBR\b", r"\bEPDM\b", r"\bVITON\b"],
    "PTFE": [r"\bPTFE\b", r"\bTEFLON\b"],
    "PVC": [r"\bPVC\b", r"\bUPVC\b", r"\bCPVC\b"],
}

# ── UOM Patterns ───────────────────────────────────────────────────────────
UOM_MAP = {
    "EA": [r"\bEACH\b", r"\bEA\b", r"\bNO\b", r"\bNOS\b", r"\bNUMBERS?\b", r"\bPCS?\b", r"\bPIECES?\b"],
    "KG": [r"\bKILOGRAMS?\b", r"\bKGS?\b"],
    "MTR": [r"\bMETRES?\b", r"\bMETERS?\b", r"\bMTRS?\b"],
    "SET": [r"\bSET\b", r"\bSETS\b"],
    "LOT": [r"\bLOT\b", r"\bLOTS\b"],
    "PAIR": [r"\bPAIR\b", r"\bPRS?\b"],
    "ROLL": [r"\bROLL\b", r"\bROLLS\b"],
    "LTR": [r"\bLITRES?\b", r"\bLITERS?\b", r"\bLTRS?\b"],
    "SQM": [r"\bSQ(?:UARE)?\s*M(?:ETERS?|ETRES?)?\b", r"\bSQM\b"],
}

# ── Schedule Patterns ──────────────────────────────────────────────────────
SCHEDULE_PATTERNS = [
    r"\bSCH(?:EDULE)?\s*(\d+[A-Z]?)\b",
]


def extract_attributes(text: str) -> dict[str, Any]:
    """
    Extract structured technical attributes from a material description.

    Args:
        text: Normalized (or raw) material description

    Returns:
        Dictionary of extracted attributes with keys:
        material_type, grade, diameter, length, material, standard,
        pressure_class, uom, schedule, nominal_bore
    """
    upper = text.upper().strip()
    attrs: dict[str, Any] = {}

    # ── Material Type ──
    for mat_type, patterns in MATERIAL_TYPES.items():
        for pat in patterns:
            if re.search(pat, upper):
                attrs["material_type"] = mat_type
                break
        if "material_type" in attrs:
            break

    # ── Grade ──
    # Try specific SS grade first
    ss_match = re.search(r"\bSS\s*(\d{3}L?)\b", upper)
    if ss_match:
        attrs["grade"] = f"SS{ss_match.group(1)}"
    else:
        ss_full = re.search(r"\bSTAINLESS\s*STEEL\s*(\d{3}L?)\b", upper)
        if ss_full:
            attrs["grade"] = f"SS{ss_full.group(1)}"
        else:
            # Property class (bolt grades like 10.9, 8.8)
            prop_match = re.search(r"\b(\d+\.\d+)\b", upper)
            if prop_match:
                attrs["grade"] = prop_match.group(1)
            else:
                # A2-70 style
                a_match = re.search(r"\b(A[24][\s-]\d{2})\b", upper)
                if a_match:
                    attrs["grade"] = a_match.group(1).replace(" ", "-")
                else:
                    gr_match = re.search(r"\bGR(?:ADE)?\s*([A-Z0-9]+)\b", upper)
                    if gr_match:
                        attrs["grade"] = f"GR{gr_match.group(1)}"

    # ── Diameter ──
    # Metric thread first (most specific for fasteners)
    m_match = re.search(r"\bM(\d+)\b", upper)
    if m_match:
        attrs["diameter"] = f"M{m_match.group(1)}"
    else:
        # DN designation
        dn_match = re.search(r"\bDN\s*(\d+)\b", upper)
        if dn_match:
            attrs["diameter"] = f"DN{dn_match.group(1)}"
        else:
            # NB designation
            nb_match = re.search(r"\b(\d+)\s*NB\b", upper)
            if not nb_match:
                nb_match = re.search(r"\bNB\s*(\d+)\b", upper)
            if nb_match:
                attrs["diameter"] = f"{nb_match.group(1)}NB"
                attrs["nominal_bore"] = f"{nb_match.group(1)}"
            else:
                # Inch designation
                inch_match = re.search(r'\b(\d+(?:/\d+)?)\s*(?:["\u2033]|INCH)\b', upper)
                if inch_match:
                    attrs["diameter"] = f'{inch_match.group(1)}"'
                else:
                    # MM designation (fallback — avoid if M-thread already matched)
                    mm_match = re.search(r"\b(\d+(?:\.\d+)?)\s*MM\b", upper)
                    if mm_match:
                        attrs["diameter"] = f"{mm_match.group(1)}MM"

    # ── Length ──
    # After X separator (common in bolt descriptions)
    x_match = re.search(r"\bX\s*(\d+(?:\.\d+)?)\s*(?:MM)?\b", upper)
    if x_match and "diameter" in attrs:
        attrs["length"] = f"{x_match.group(1)}MM"
    else:
        len_match = re.search(r"\b(\d+(?:\.\d+)?)\s*MM\s*(?:L(?:ONG)?|LG|LENGTH)\b", upper)
        if len_match:
            attrs["length"] = f"{len_match.group(1)}MM"

    # ── Material ──
    for mat_name, patterns in MATERIAL_MAP.items():
        for pat in patterns:
            if re.search(pat, upper):
                attrs["material"] = mat_name
                break
        if "material" in attrs:
            break

    # ── Standard ──
    for pat in STANDARD_PATTERNS:
        std_match = re.search(pat, upper)
        if std_match:
            prefix = pat.split(r"\b")[1].split(r"\s")[0] if r"\s" in pat else pat.split(r"\b")[1]
            # Re-extract more cleanly
            full_match = re.search(r"\b(IS|ASTM|DIN|BS|EN|ASME|API|JIS|ANSI|IEC)\s*(\S+(?:\s*PART\s*\d+)?)\b", upper)
            if full_match:
                attrs["standard"] = f"{full_match.group(1)} {full_match.group(2)}"
            break

    # ── Pressure Class ──
    for pat in PRESSURE_CLASS_PATTERNS:
        pc_match = re.search(pat, upper)
        if pc_match:
            attrs["pressure_class"] = pc_match.group(1)
            break

    # ── UOM ──
    for uom_code, patterns in UOM_MAP.items():
        for pat in patterns:
            if re.search(pat, upper):
                attrs["uom"] = uom_code
                break
        if "uom" in attrs:
            break

    # ── Schedule ──
    for pat in SCHEDULE_PATTERNS:
        sch_match = re.search(pat, upper)
        if sch_match:
            attrs["schedule"] = f"SCH {sch_match.group(1)}"
            break

    return attrs


def format_attributes_display(attrs: dict[str, Any]) -> list[dict[str, str]]:
    """
    Format extracted attributes for display in the UI.

    Returns list of {label, value} pairs.
    """
    label_map = {
        "material_type": "Type",
        "grade": "Grade",
        "diameter": "Diameter",
        "length": "Length",
        "material": "Material",
        "standard": "Standard",
        "pressure_class": "Pressure Class",
        "uom": "UOM",
        "schedule": "Schedule",
        "nominal_bore": "Nominal Bore",
    }

    result = []
    for key, label in label_map.items():
        if key in attrs:
            result.append({"label": label, "value": str(attrs[key])})

    return result
