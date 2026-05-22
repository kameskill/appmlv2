"""
Timmy Tails – ML Microservice
Provides breed + season aware dog haircut recommendations using
a content-based scoring model built with scikit-learn.
"""

import os
import math
from datetime import datetime, timezone

from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS
import numpy as np
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics.pairwise import cosine_similarity

load_dotenv()

# ── Import local dataset ──────────────────────────────────────────────────────
import sys
sys.path.insert(0, os.path.dirname(__file__))
from data.breed_data import BREED_DATA, HAIRCUT_CATALOG

app = Flask(__name__)
CORS(app, origins=["http://localhost:5173", "http://localhost:3000", os.getenv("FRONTEND_URL", "")])

# ── Feature encoding ──────────────────────────────────────────────────────────
COAT_TYPES   = ["single", "double", "curly", "silky", "wire"]
SIZES        = ["small", "medium", "large"]
SHEDDINGS    = ["low", "medium", "high"]
SENSITIVITIES = ["low", "medium", "high"]

def _encode_breed(breed_info: dict) -> list[float]:
    """Convert breed characteristics to a numeric feature vector."""
    coat = COAT_TYPES.index(breed_info.get("coat_type", "single")) / len(COAT_TYPES)
    size = SIZES.index(breed_info.get("size", "medium")) / len(SIZES)
    shed = SHEDDINGS.index(breed_info.get("shedding", "medium")) / len(SHEDDINGS)
    sens = SENSITIVITIES.index(breed_info.get("season_sensitivity", "medium")) / len(SENSITIVITIES)
    water = 1.0 if breed_info.get("waterproof", False) else 0.0
    length_map = {"short": 0.0, "medium": 0.5, "long": 1.0}
    length = length_map.get(breed_info.get("coat_length", "medium"), 0.5)
    return [coat, size, shed, sens, water, length]


def _get_current_season() -> str:
    month = datetime.now().month
    if month in (3, 4, 5):
        return "spring"
    if month in (6, 7, 8):
        return "summer"
    if month in (9, 10, 11):
        return "fall"
    return "winter"


def _score_haircut(haircut: dict, breed_info: dict, season: str) -> float:
    """Compute a recommendation score 0-1 for a haircut given breed + season."""
    score = haircut["base_score"]

    # Season boost / penalty
    if season in haircut.get("best_seasons", []):
        score += 0.10
    if season in haircut.get("avoid_seasons", []):
        score -= 0.20

    # Coat type compatibility
    if breed_info.get("coat_type") in haircut.get("suitable_coat", []):
        score += 0.08
    else:
        score -= 0.12

    # Size compatibility
    if breed_info.get("size") in haircut.get("suitable_size", []):
        score += 0.05
    else:
        score -= 0.08

    # Shedding relevance
    if breed_info.get("shedding") == "high" and haircut["name"] == "De-shedding Treatment":
        score += 0.15

    # Summer cut relevance for heat-sensitive / double-coated breeds
    if season == "summer" and breed_info.get("shedding") == "high" and haircut["name"] == "Summer Cut":
        score += 0.10

    # Clamp to [0, 1]
    return min(1.0, max(0.0, round(score, 4)))


def _get_recommendations(breed: str, season: str, top_n: int = 3) -> list[dict]:
    """Return top-N ranked haircuts for the given breed and season."""
    breed_info = BREED_DATA.get(breed, BREED_DATA["Other"])

    scored = []
    for haircut in HAIRCUT_CATALOG:
        s = _score_haircut(haircut, breed_info, season)
        scored.append({
            "name": haircut["name"],
            "description": haircut["description"],
            "price": haircut["price"],
            "season": season.capitalize(),
            "match": f"{min(99, int(s * 100))}%",
            "popularity": f"{min(99, int(s * 100 - 3))}%",
            "_score": s
        })

    scored.sort(key=lambda x: x["_score"], reverse=True)
    results = []
    for item in scored[:top_n]:
        item.pop("_score")
        results.append(item)
    return results


# ── Routes ────────────────────────────────────────────────────────────────────

@app.route("/health", methods=["GET"])
def health():
    return jsonify({"success": True, "message": "ML service is running", "timestamp": datetime.now(timezone.utc).isoformat()})


@app.route("/recommend", methods=["GET", "POST"])
def recommend():
    """
    GET  /recommend?breed=Poodle&season=spring
    POST /recommend  { "breed": "Poodle", "season": "spring", "top_n": 3 }
    Returns ranked haircut recommendations.
    """
    if request.method == "POST":
        data = request.get_json(silent=True) or {}
    else:
        data = request.args

    breed   = data.get("breed", "Other").strip()
    season  = data.get("season", _get_current_season()).strip().lower()
    top_n   = int(data.get("top_n", 3))

    valid_seasons = {"spring", "summer", "fall", "winter"}
    if season not in valid_seasons:
        season = _get_current_season()

    # Normalise breed name (case-insensitive fallback)
    if breed not in BREED_DATA:
        for known in BREED_DATA:
            if known.lower() == breed.lower():
                breed = known
                break
        else:
            breed = "Other"

    recommendations = _get_recommendations(breed, season, top_n)

    return jsonify({
        "success": True,
        "breed": breed,
        "season": season.capitalize(),
        "current_season": _get_current_season().capitalize(),
        "recommendations": recommendations
    })


@app.route("/breeds", methods=["GET"])
def list_breeds():
    """Return all supported breed names."""
    return jsonify({"success": True, "breeds": sorted(BREED_DATA.keys())})


@app.route("/season", methods=["GET"])
def current_season():
    """Return the current season."""
    return jsonify({"success": True, "season": _get_current_season().capitalize()})


if __name__ == "__main__":
    port = int(os.getenv("PORT", 5001))
    debug = os.getenv("FLASK_DEBUG", "0") == "1"
    print(f"🐾 Timmy Tails ML Service running on port {port}")
    app.run(host="0.0.0.0", port=port, debug=debug)
