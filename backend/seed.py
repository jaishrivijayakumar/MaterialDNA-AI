"""
MaterialDNA AI — Seed Data

Realistic CPSE material master data for prototype demonstration.
Includes equivalent pairs, near-duplicates, hard negatives, and
missing-specification records across NTPC, BHEL, and ONGC.
"""

import json
import uuid
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session

from .models import Material, MatchResult, Review, MaterialIdentity, AuditLog
from .engine.normalizer import normalize_description
from .engine.extractor import extract_attributes
from .engine.pipeline import generate_standardized_code

# ── Material Records ────────────────────────────────────────────────────────

SEED_MATERIALS = [
    # ═══════════════════════════════════════════════════════════════════════
    # FASTENERS — Hex Bolts
    # ═══════════════════════════════════════════════════════════════════════
    {
        "cpse": "NTPC",
        "original_code": "NTPC-FST-10234",
        "original_description": "HEX BOLT M10 X 50 SS304",
        "category": "Fasteners",
    },
    {
        "cpse": "BHEL",
        "original_code": "BH-FAST-20456",
        "original_description": "HEXAGONAL BOLT 10MM X 50MM STAINLESS STEEL 304",
        "category": "Fasteners",
    },
    {
        "cpse": "ONGC",
        "original_code": "ONGC-BLT-8831",
        "original_description": "SS304 HEX BOLT M10 X 50",
        "category": "Fasteners",
    },
    {
        "cpse": "NTPC",
        "original_code": "NTPC-FST-10235",
        "original_description": "HEX BOLT - M10 - 50MM - SS 304",
        "category": "Fasteners",
    },
    # Hard negative — SS316 vs SS304
    {
        "cpse": "BHEL",
        "original_code": "BH-FAST-20457",
        "original_description": "HEX BOLT M10 X 50 SS316",
        "category": "Fasteners",
    },
    # Missing grade — should trigger REVIEW
    {
        "cpse": "ONGC",
        "original_code": "ONGC-BLT-8832",
        "original_description": "HEX BOLT M10 X 50 SS",
        "category": "Fasteners",
    },
    # Missing length and grade
    {
        "cpse": "NTPC",
        "original_code": "NTPC-FST-10236",
        "original_description": "HEXAGONAL BOLT 10MM X 50",
        "category": "Fasteners",
    },

    # ═══════════════════════════════════════════════════════════════════════
    # FASTENERS — Larger Bolts (M20)
    # ═══════════════════════════════════════════════════════════════════════
    {
        "cpse": "NTPC",
        "original_code": "M1515444752",
        "original_description": "BOLT,HEX: HTS,IS1364-10.9,MC,M20,65MM",
        "category": "Fasteners",
    },
    {
        "cpse": "BHEL",
        "original_code": "BH-FAST-30891",
        "original_description": "BOLT HEX M20 X 65 HIGH TENSILE 10.9 IS 1364",
        "category": "Fasteners",
    },
    {
        "cpse": "ONGC",
        "original_code": "ONGC-BLT-7542",
        "original_description": "HEX BOLT M20X65MM GR 10.9 IS1364 HT STEEL",
        "category": "Fasteners",
    },

    # ═══════════════════════════════════════════════════════════════════════
    # FASTENERS — Stud Bolts
    # ═══════════════════════════════════════════════════════════════════════
    {
        "cpse": "NTPC",
        "original_code": "NTPC-FST-11001",
        "original_description": "STUD BOLT M16 X 120 ASTM A193 GR B7 WITH 2 NUTS",
        "category": "Fasteners",
    },
    {
        "cpse": "BHEL",
        "original_code": "BH-FAST-22001",
        "original_description": "STUD BOLT 16MM DIA 120MM LONG A193 B7 C/W HEX NUTS 2H",
        "category": "Fasteners",
    },
    {
        "cpse": "ONGC",
        "original_code": "ONGC-STD-3312",
        "original_description": "STUD BOLT ASTM A193 GR B7 M16X120 WITH ASTM A194 2H NUTS",
        "category": "Fasteners",
    },

    # ═══════════════════════════════════════════════════════════════════════
    # FASTENERS — Nuts and Washers
    # ═══════════════════════════════════════════════════════════════════════
    {
        "cpse": "NTPC",
        "original_code": "NTPC-FST-12001",
        "original_description": "HEX NUT M10 SS304",
        "category": "Fasteners",
    },
    {
        "cpse": "BHEL",
        "original_code": "BH-FAST-23001",
        "original_description": "HEXAGONAL NUT 10MM STAINLESS STEEL 304",
        "category": "Fasteners",
    },
    {
        "cpse": "NTPC",
        "original_code": "NTPC-FST-12010",
        "original_description": "FLAT WASHER M10 SS304 IS2016",
        "category": "Fasteners",
    },
    {
        "cpse": "BHEL",
        "original_code": "BH-FAST-23010",
        "original_description": "PLAIN WASHER 10MM STAINLESS STEEL 304 AS PER IS 2016",
        "category": "Fasteners",
    },
    {
        "cpse": "NTPC",
        "original_code": "NTPC-FST-12020",
        "original_description": "SPRING WASHER M10 SS304",
        "category": "Fasteners",
    },

    # ═══════════════════════════════════════════════════════════════════════
    # VALVES — Gate Valves
    # ═══════════════════════════════════════════════════════════════════════
    {
        "cpse": "NTPC",
        "original_code": "NTPC-VLV-40101",
        "original_description": "GATE VALVE 2 INCH 150# FLANGED CS BODY ASTM A216 WCB",
        "category": "Valves",
    },
    {
        "cpse": "BHEL",
        "original_code": "BH-VLV-50201",
        "original_description": "GATE VALVE 2\" CLASS 150 CARBON STEEL FLANGED END A216 GR WCB",
        "category": "Valves",
    },
    {
        "cpse": "ONGC",
        "original_code": "ONGC-VLV-6110",
        "original_description": "GATE VALVE FLANGED 50MM 150LB CS BODY WCB",
        "category": "Valves",
    },
    # Hard negative — different pressure class
    {
        "cpse": "NTPC",
        "original_code": "NTPC-VLV-40102",
        "original_description": "GATE VALVE 2 INCH 300# FLANGED CS BODY ASTM A216 WCB",
        "category": "Valves",
    },
    # Ball Valve
    {
        "cpse": "NTPC",
        "original_code": "NTPC-VLV-40201",
        "original_description": "BALL VALVE 1 INCH 150# SS316 FULL BORE FLANGED",
        "category": "Valves",
    },
    {
        "cpse": "BHEL",
        "original_code": "BH-VLV-50301",
        "original_description": "BALL VALVE 25MM CLASS 150 STAINLESS STEEL 316 FULL BORE",
        "category": "Valves",
    },
    # Globe Valve
    {
        "cpse": "ONGC",
        "original_code": "ONGC-VLV-6201",
        "original_description": "GLOBE VALVE 3 INCH 300# CS FLANGED ASTM A216 WCB",
        "category": "Valves",
    },
    {
        "cpse": "NTPC",
        "original_code": "NTPC-VLV-40301",
        "original_description": "GLOBE VALVE 3\" 300LB CARBON STEEL FLANGED A216 WCB",
        "category": "Valves",
    },
    # Check Valve
    {
        "cpse": "BHEL",
        "original_code": "BH-VLV-50401",
        "original_description": "CHECK VALVE SWING TYPE 4 INCH 150# CS A216 WCB FLANGED",
        "category": "Valves",
    },
    {
        "cpse": "ONGC",
        "original_code": "ONGC-VLV-6301",
        "original_description": "NRV SWING TYPE 4\" CL150 CARBON STEEL WCB FLANGED END",
        "category": "Valves",
    },

    # ═══════════════════════════════════════════════════════════════════════
    # BEARINGS
    # ═══════════════════════════════════════════════════════════════════════
    {
        "cpse": "NTPC",
        "original_code": "NTPC-BRG-60101",
        "original_description": "DEEP GROOVE BALL BEARING 6205 2RS SKF OR EQUIV",
        "category": "Bearings",
    },
    {
        "cpse": "BHEL",
        "original_code": "BH-BRG-70201",
        "original_description": "BALL BEARING 6205-2RS DEEP GROOVE SEALED",
        "category": "Bearings",
    },
    {
        "cpse": "ONGC",
        "original_code": "ONGC-BRG-8101",
        "original_description": "BEARING BALL DEEP GROOVE 6205 2RS MAKE SKF/FAG/EQUIV",
        "category": "Bearings",
    },
    # Different bearing
    {
        "cpse": "NTPC",
        "original_code": "NTPC-BRG-60201",
        "original_description": "TAPER ROLLER BEARING 30206 SKF OR EQUIV",
        "category": "Bearings",
    },
    {
        "cpse": "BHEL",
        "original_code": "BH-BRG-70301",
        "original_description": "TAPERED ROLLER BEARING 30206 SKF/FAG",
        "category": "Bearings",
    },

    # ═══════════════════════════════════════════════════════════════════════
    # PIPES & FITTINGS
    # ═══════════════════════════════════════════════════════════════════════
    {
        "cpse": "NTPC",
        "original_code": "NTPC-PIP-80101",
        "original_description": "SEAMLESS PIPE 2 INCH SCH 80 CS ASTM A106 GR B",
        "category": "Pipes & Fittings",
    },
    {
        "cpse": "BHEL",
        "original_code": "BH-PIP-90201",
        "original_description": "PIPE SEAMLESS 2\" SCH80 CARBON STEEL A106 GRADE B",
        "category": "Pipes & Fittings",
    },
    {
        "cpse": "ONGC",
        "original_code": "ONGC-PIP-1001",
        "original_description": "CS SEAMLESS PIPE 50NB SCH 80 ASTM A106 GR B",
        "category": "Pipes & Fittings",
    },
    # Hard negative — different schedule
    {
        "cpse": "NTPC",
        "original_code": "NTPC-PIP-80102",
        "original_description": "SEAMLESS PIPE 2 INCH SCH 40 CS ASTM A106 GR B",
        "category": "Pipes & Fittings",
    },
    # Elbow
    {
        "cpse": "NTPC",
        "original_code": "NTPC-PIP-80201",
        "original_description": "ELBOW 90 DEG 2 INCH SCH 80 CS ASTM A234 WPB BW",
        "category": "Pipes & Fittings",
    },
    {
        "cpse": "BHEL",
        "original_code": "BH-PIP-90301",
        "original_description": "90 DEG ELBOW 2\" SCH80 BUTT WELD CS A234 WPB",
        "category": "Pipes & Fittings",
    },
    # Reducer
    {
        "cpse": "ONGC",
        "original_code": "ONGC-PIP-1101",
        "original_description": "CONCENTRIC REDUCER 3 INCH X 2 INCH SCH 80 CS A234 WPB BW",
        "category": "Pipes & Fittings",
    },
    {
        "cpse": "NTPC",
        "original_code": "NTPC-PIP-80301",
        "original_description": "REDUCER CONC 3\"X2\" SCH80 CS ASTM A234 WPB BUTT WELD",
        "category": "Pipes & Fittings",
    },
    # Flange
    {
        "cpse": "NTPC",
        "original_code": "NTPC-PIP-80401",
        "original_description": "WELD NECK FLANGE 2 INCH 150# RF CS ASTM A105",
        "category": "Pipes & Fittings",
    },
    {
        "cpse": "BHEL",
        "original_code": "BH-PIP-90401",
        "original_description": "WNRF FLANGE 2\" CL150 CARBON STEEL A105",
        "category": "Pipes & Fittings",
    },

    # ═══════════════════════════════════════════════════════════════════════
    # GASKETS & SEALS
    # ═══════════════════════════════════════════════════════════════════════
    {
        "cpse": "NTPC",
        "original_code": "NTPC-GSK-90101",
        "original_description": "SPIRAL WOUND GASKET 2 INCH 150# SS304 INNER RING CS OUTER RING",
        "category": "Gaskets & Seals",
    },
    {
        "cpse": "BHEL",
        "original_code": "BH-GSK-10101",
        "original_description": "GASKET SPIRAL WOUND 2\" CL150 SS304/CS ASME B16.20",
        "category": "Gaskets & Seals",
    },
    {
        "cpse": "ONGC",
        "original_code": "ONGC-GSK-2101",
        "original_description": "SWG 2 INCH 150LB STAINLESS STEEL 304 INNER WITH CS OUTER RING",
        "category": "Gaskets & Seals",
    },
    # O-Ring
    {
        "cpse": "NTPC",
        "original_code": "NTPC-GSK-90201",
        "original_description": "O-RING VITON 25MM ID X 3MM CS",
        "category": "Gaskets & Seals",
    },
    {
        "cpse": "BHEL",
        "original_code": "BH-GSK-10201",
        "original_description": "O RING 25MM INSIDE DIA 3MM CROSS SECTION VITON FKM",
        "category": "Gaskets & Seals",
    },

    # ═══════════════════════════════════════════════════════════════════════
    # ELECTRICAL
    # ═══════════════════════════════════════════════════════════════════════
    {
        "cpse": "NTPC",
        "original_code": "NTPC-ELC-70101",
        "original_description": "POWER CABLE 3.5C X 240 SQMM XLPE ARMOURED 1.1KV",
        "category": "Electrical",
    },
    {
        "cpse": "BHEL",
        "original_code": "BH-ELC-80101",
        "original_description": "CABLE POWER 3.5 CORE 240 SQ MM XLPE INSULATED ARMOURED 1.1 KV",
        "category": "Electrical",
    },
    {
        "cpse": "ONGC",
        "original_code": "ONGC-ELC-9101",
        "original_description": "XLPE CABLE 3.5CX240SQMM ARMOURED 1100V LT POWER",
        "category": "Electrical",
    },
    # Cable Gland
    {
        "cpse": "NTPC",
        "original_code": "NTPC-ELC-70201",
        "original_description": "CABLE GLAND DOUBLE COMPRESSION BRASS 75MM",
        "category": "Electrical",
    },
    {
        "cpse": "BHEL",
        "original_code": "BH-ELC-80201",
        "original_description": "CABLE GLAND 75MM BRASS DOUBLE COMPRESSION TYPE",
        "category": "Electrical",
    },
    # Circuit Breaker
    {
        "cpse": "NTPC",
        "original_code": "NTPC-ELC-70301",
        "original_description": "MCCB 3 POLE 250A 36KA THERMAL MAGNETIC TRIP",
        "category": "Electrical",
    },
    {
        "cpse": "BHEL",
        "original_code": "BH-ELC-80301",
        "original_description": "MOULDED CASE CIRCUIT BREAKER 3P 250 AMP 36KA BREAKING CAPACITY",
        "category": "Electrical",
    },

    # ═══════════════════════════════════════════════════════════════════════
    # Additional fastener variants for richer demo data
    # ═══════════════════════════════════════════════════════════════════════
    {
        "cpse": "NTPC",
        "original_code": "NTPC-FST-13001",
        "original_description": "HEX BOLT M16 X 80 SS316 DIN 933",
        "category": "Fasteners",
    },
    {
        "cpse": "BHEL",
        "original_code": "BH-FAST-24001",
        "original_description": "HEXAGONAL BOLT M16X80MM STAINLESS STEEL 316 DIN933",
        "category": "Fasteners",
    },
    {
        "cpse": "ONGC",
        "original_code": "ONGC-BLT-9001",
        "original_description": "BOLT HEX SS316 M16 X 80 AS PER DIN 933",
        "category": "Fasteners",
    },
    # CS bolts
    {
        "cpse": "NTPC",
        "original_code": "NTPC-FST-14001",
        "original_description": "HEX BOLT M12 X 40 GR 8.8 CS DIN 931 ZINC PLATED",
        "category": "Fasteners",
    },
    {
        "cpse": "BHEL",
        "original_code": "BH-FAST-25001",
        "original_description": "HEXAGONAL BOLT M12X40MM CARBON STEEL GRADE 8.8 DIN931 ZP",
        "category": "Fasteners",
    },

    # ═══════════════════════════════════════════════════════════════════════
    # Additional pipes for richer data
    # ═══════════════════════════════════════════════════════════════════════
    {
        "cpse": "NTPC",
        "original_code": "NTPC-PIP-85001",
        "original_description": "GI PIPE 1 INCH MEDIUM CLASS IS 1239 THREADED",
        "category": "Pipes & Fittings",
    },
    {
        "cpse": "BHEL",
        "original_code": "BH-PIP-95001",
        "original_description": "GALVANIZED IRON PIPE 25MM IS1239 MEDIUM SCREWED END",
        "category": "Pipes & Fittings",
    },
    {
        "cpse": "ONGC",
        "original_code": "ONGC-PIP-1201",
        "original_description": "GI PIPE 1\" IS 1239 MEDIUM CLASS THREADED BOTH ENDS",
        "category": "Pipes & Fittings",
    },
    # SS Pipe
    {
        "cpse": "NTPC",
        "original_code": "NTPC-PIP-85101",
        "original_description": "SS304 SEAMLESS PIPE 1 INCH SCH 40S ASTM A312 TP304",
        "category": "Pipes & Fittings",
    },
    {
        "cpse": "BHEL",
        "original_code": "BH-PIP-95101",
        "original_description": "PIPE SEAMLESS SS304 25NB SCH40S ASTM A312 TP 304",
        "category": "Pipes & Fittings",
    },

    # ═══════════════════════════════════════════════════════════════════════
    # Additional valves
    # ═══════════════════════════════════════════════════════════════════════
    {
        "cpse": "NTPC",
        "original_code": "NTPC-VLV-41001",
        "original_description": "BUTTERFLY VALVE 6 INCH PN16 CI BODY SS316 DISC EPDM SEAT WAFER TYPE",
        "category": "Valves",
    },
    {
        "cpse": "BHEL",
        "original_code": "BH-VLV-51001",
        "original_description": "BUTTERFLY VALVE 150MM PN16 CAST IRON BODY SS316 DISC WAFER",
        "category": "Valves",
    },

    # ═══════════════════════════════════════════════════════════════════════
    # Additional gaskets
    # ═══════════════════════════════════════════════════════════════════════
    {
        "cpse": "NTPC",
        "original_code": "NTPC-GSK-90301",
        "original_description": "CAF GASKET 2 INCH 150# 3MM THICK IS 2712",
        "category": "Gaskets & Seals",
    },
    {
        "cpse": "BHEL",
        "original_code": "BH-GSK-10301",
        "original_description": "COMPRESSED ASBESTOS FREE GASKET 2\" CL150 3MM THK AS PER IS2712",
        "category": "Gaskets & Seals",
    },

    # ═══════════════════════════════════════════════════════════════════════
    # Additional electrical
    # ═══════════════════════════════════════════════════════════════════════
    {
        "cpse": "NTPC",
        "original_code": "NTPC-ELC-70401",
        "original_description": "CONTROL CABLE 10C X 2.5 SQMM PVC ARMOURED 1.1KV",
        "category": "Electrical",
    },
    {
        "cpse": "ONGC",
        "original_code": "ONGC-ELC-9201",
        "original_description": "CABLE CONTROL 10 CORE 2.5 SQ MM PVC INSULATED ARMOURED 1.1KV",
        "category": "Electrical",
    },

    # Additional bearing variants
    {
        "cpse": "NTPC",
        "original_code": "NTPC-BRG-60301",
        "original_description": "DEEP GROOVE BALL BEARING 6308 2RS",
        "category": "Bearings",
    },
    {
        "cpse": "ONGC",
        "original_code": "ONGC-BRG-8201",
        "original_description": "BALL BEARING 6308-2RS SEALED BOTH SIDES",
        "category": "Bearings",
    },
]

# ── Pre-built MaterialDNA Identities ────────────────────────────────────

SEED_IDENTITIES = [
    {
        "standardized_code": "BOLT-SS304-M10-50",
        "category": "Fasteners",
        "attributes": {
            "material_type": "Hex Bolt",
            "grade": "SS304",
            "diameter": "M10",
            "length": "50MM",
            "material": "Stainless Steel",
        },
        "material_ids": ["NTPC-FST-10234", "BH-FAST-20456", "ONGC-BLT-8831", "NTPC-FST-10235"],
        "cpse_codes": {
            "NTPC": "NTPC-FST-10234",
            "BHEL": "BH-FAST-20456",
            "ONGC": "ONGC-BLT-8831",
        },
    },
    {
        "standardized_code": "BOLT-10.9-M20-65",
        "category": "Fasteners",
        "attributes": {
            "material_type": "Hex Bolt",
            "grade": "10.9",
            "diameter": "M20",
            "length": "65MM",
            "material": "High Tensile Steel",
            "standard": "IS 1364",
        },
        "material_ids": ["M1515444752", "BH-FAST-30891", "ONGC-BLT-7542"],
        "cpse_codes": {
            "NTPC": "M1515444752",
            "BHEL": "BH-FAST-30891",
            "ONGC": "ONGC-BLT-7542",
        },
    },
    {
        "standardized_code": "GV-CS-2IN-150",
        "category": "Valves",
        "attributes": {
            "material_type": "Gate Valve",
            "diameter": '2"',
            "pressure_class": "150",
            "material": "Carbon Steel",
            "standard": "ASTM A216",
        },
        "material_ids": ["NTPC-VLV-40101", "BH-VLV-50201", "ONGC-VLV-6110"],
        "cpse_codes": {
            "NTPC": "NTPC-VLV-40101",
            "BHEL": "BH-VLV-50201",
            "ONGC": "ONGC-VLV-6110",
        },
    },
    {
        "standardized_code": "PIPE-CS-2IN-SCH80",
        "category": "Pipes & Fittings",
        "attributes": {
            "material_type": "Pipe",
            "diameter": '2"',
            "schedule": "SCH 80",
            "material": "Carbon Steel",
            "standard": "ASTM A106",
            "grade": "GRB",
        },
        "material_ids": ["NTPC-PIP-80101", "BH-PIP-90201", "ONGC-PIP-1001"],
        "cpse_codes": {
            "NTPC": "NTPC-PIP-80101",
            "BHEL": "BH-PIP-90201",
            "ONGC": "ONGC-PIP-1001",
        },
    },
    {
        "standardized_code": "BBG-6205-2RS",
        "category": "Bearings",
        "attributes": {
            "material_type": "Ball Bearing",
        },
        "material_ids": ["NTPC-BRG-60101", "BH-BRG-70201", "ONGC-BRG-8101"],
        "cpse_codes": {
            "NTPC": "NTPC-BRG-60101",
            "BHEL": "BH-BRG-70201",
            "ONGC": "ONGC-BRG-8101",
        },
    },
    {
        "standardized_code": "BOLT-SS316-M16-80",
        "category": "Fasteners",
        "attributes": {
            "material_type": "Hex Bolt",
            "grade": "SS316",
            "diameter": "M16",
            "length": "80MM",
            "standard": "DIN 933",
        },
        "material_ids": ["NTPC-FST-13001", "BH-FAST-24001", "ONGC-BLT-9001"],
        "cpse_codes": {
            "NTPC": "NTPC-FST-13001",
            "BHEL": "BH-FAST-24001",
            "ONGC": "ONGC-BLT-9001",
        },
    },
]


def seed_database(db: Session) -> None:
    """Seed the database with realistic material data."""
    # Check if already seeded
    existing = db.query(Material).count()
    if existing > 0:
        return

    now = datetime.now(timezone.utc)
    material_map: dict[str, Material] = {}  # original_code → Material

    # ── Seed Materials ──
    for i, mat_data in enumerate(SEED_MATERIALS):
        mat_id = mat_data["original_code"]
        normalized = normalize_description(mat_data["original_description"])
        attrs = extract_attributes(mat_data["original_description"])
        norm_attrs = extract_attributes(normalized)
        merged = {**norm_attrs, **{k: v for k, v in attrs.items() if v}}

        material = Material(
            material_id=mat_id,
            cpse=mat_data["cpse"],
            original_code=mat_data["original_code"],
            original_description=mat_data["original_description"],
            normalized_description=normalized,
            category=mat_data.get("category", ""),
            technical_attributes=json.dumps(merged),
            status="matched" if i < 30 else "unprocessed",
            source="seed",
            uom=merged.get("uom", "EA"),
            created_at=now - timedelta(days=30 - i),
            updated_at=now - timedelta(days=max(0, 15 - i)),
        )
        db.add(material)
        material_map[mat_id] = material

    db.flush()

    # ── Seed Match Results ──
    match_pairs = [
        # MATCH cases
        ("NTPC-FST-10234", "BH-FAST-20456", "match"),
        ("NTPC-FST-10234", "ONGC-BLT-8831", "match"),
        ("M1515444752", "BH-FAST-30891", "match"),
        ("M1515444752", "ONGC-BLT-7542", "match"),
        ("NTPC-VLV-40101", "BH-VLV-50201", "match"),
        ("NTPC-VLV-40101", "ONGC-VLV-6110", "match"),
        ("NTPC-PIP-80101", "BH-PIP-90201", "match"),
        ("NTPC-PIP-80101", "ONGC-PIP-1001", "match"),
        ("NTPC-BRG-60101", "BH-BRG-70201", "match"),
        ("NTPC-BRG-60101", "ONGC-BRG-8101", "match"),
        ("NTPC-FST-13001", "BH-FAST-24001", "match"),
        ("NTPC-FST-13001", "ONGC-BLT-9001", "match"),
        ("NTPC-ELC-70101", "BH-ELC-80101", "match"),
        ("NTPC-GSK-90101", "BH-GSK-10101", "match"),
        ("NTPC-FST-12001", "BH-FAST-23001", "match"),
        # NO MATCH — grade conflict
        ("NTPC-FST-10234", "BH-FAST-20457", "no_match"),
        # NO MATCH — pressure class conflict
        ("NTPC-VLV-40101", "NTPC-VLV-40102", "no_match"),
    ]

    for src_id, cand_id, decision in match_pairs:
        conf = 92.0 if decision == "match" else 28.0
        sem = 0.95 if decision == "match" else 0.90
        attr_score = 100.0 if decision == "match" else 75.0

        mr = MatchResult(
            match_id=f"MR-{uuid.uuid4().hex[:8]}",
            source_material_id=src_id,
            candidate_material_id=cand_id,
            semantic_similarity=sem,
            attribute_score=attr_score,
            constraints_passed=(decision == "match"),
            confidence=conf,
            decision=decision,
            explanation=json.dumps({
                "summary": "Technical constraints passed." if decision == "match"
                    else "Critical technical constraint failed.",
                "decision": decision,
            }),
            attribute_details="[]",
            constraint_details="[]",
            created_at=now - timedelta(days=10),
        )
        db.add(mr)

    # ── Seed Reviews ──
    review_items = [
        ("ONGC-BLT-8832", "NTPC-FST-10234", "Missing grade specification"),
        ("NTPC-FST-10236", "BH-FAST-20456", "Missing grade and incomplete length"),
        ("NTPC-FST-11001", "BH-FAST-22001", "Verify nut specification compatibility"),
        ("NTPC-VLV-40201", "BH-VLV-50301", "Confirm bore specification"),
        ("NTPC-ELC-70301", "BH-ELC-80301", "Verify breaking capacity rating"),
    ]

    for src_id, cand_id, reason in review_items:
        review = Review(
            review_id=f"RV-{uuid.uuid4().hex[:8]}",
            match_id=f"MR-{uuid.uuid4().hex[:8]}",
            source_material_id=src_id,
            candidate_material_id=cand_id,
            status="pending",
            reason=reason,
            confidence=65.0,
            created_at=now - timedelta(days=5),
        )
        db.add(review)

    # ── Seed Identities ──
    for ident_data in SEED_IDENTITIES:
        identity = MaterialIdentity(
            identity_id=f"ID-{uuid.uuid4().hex[:8]}",
            standardized_code=ident_data["standardized_code"],
            category=ident_data.get("category", ""),
            attributes=json.dumps(ident_data["attributes"]),
            linked_materials=json.dumps(ident_data["material_ids"]),
            cpse_codes=json.dumps(ident_data["cpse_codes"]),
            status="active",
            created_at=now - timedelta(days=7),
        )
        db.add(identity)

    # ── Seed Audit Log ──
    audit_entries = [
        ("dataset_imported", "", "System", "Initial dataset of 65 materials imported from CPSE masters", ""),
        ("material_analyzed", "NTPC-FST-10234", "System", "Batch analysis of fastener materials", ""),
        ("match_approved", "BH-FAST-20456", "Eng. Sharma", "Confirmed HEX BOLT M10 SS304 equivalence", "match"),
        ("identity_created", "", "System", "MaterialDNA BOLT-SS304-M10-50 created", ""),
        ("match_approved", "ONGC-BLT-8831", "Eng. Patel", "Verified ONGC bolt matches NTPC equivalent", "match"),
        ("material_analyzed", "NTPC-VLV-40101", "System", "Valve material analysis completed", ""),
        ("match_approved", "BH-VLV-50201", "Eng. Kumar", "Gate valve 2\" 150# equivalence confirmed", "match"),
        ("identity_created", "", "System", "MaterialDNA GV-CS-2IN-150 created", ""),
        ("review_requested", "ONGC-BLT-8832", "System", "Missing grade specification — review required", "review"),
        ("match_rejected", "BH-FAST-20457", "Eng. Sharma", "SS304 vs SS316 grade conflict", "no_match"),
        ("dataset_imported", "", "Eng. Verma", "BHEL valve master data imported — 12 records", ""),
        ("material_analyzed", "NTPC-PIP-80101", "System", "Pipe material analysis completed", ""),
        ("match_approved", "BH-PIP-90201", "Eng. Singh", "Seamless pipe 2\" SCH80 equivalence verified", "match"),
        ("identity_created", "", "System", "MaterialDNA PIPE-CS-2IN-SCH80 created", ""),
        ("review_completed", "NTPC-FST-11001", "Eng. Patel", "Stud bolt specification review completed", "match"),
    ]

    for i, (action, mat_id, user, details, decision) in enumerate(audit_entries):
        audit = AuditLog(
            action=action,
            material_id=mat_id,
            user=user,
            details=details,
            decision=decision,
            timestamp=now - timedelta(days=14 - i, hours=i * 2),
        )
        db.add(audit)

    db.commit()
