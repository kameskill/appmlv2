"""
Timmy Tails – ML Microservice

Provides dog haircut recommendations based on:
- Dog breed characteristics
- Coat type and coat length
- Dog size
- Shedding level
- Philippine rainy and dry seasons
"""

import os
import sys
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS

load_dotenv()

# Allow Python to import the local data package.
sys.path.insert(0, os.path.dirname(__file__))

from data.breed_data import BREED_DATA, HAIRCUT_CATALOG

app = Flask(__name__)

# Allowed frontend origins
allowed_origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "https://timmytails.vercel.app"
]

frontend_url = os.getenv("FRONTEND_URL")

if frontend_url:
    allowed_origins.append(frontend_url)

CORS(app, origins=allowed_origins)


# ─────────────────────────────────────────────────────────────────────────────
# Philippine weather profiles
# ─────────────────────────────────────────────────────────────────────────────

COUNTRY_WEATHER_PROFILES = {
    "philippines": {
        "dry": {
            "season_label": "Dry Season",
            "humidity": 0.63,
            "heat_index": 0.85,
            "rainfall": 0.25
        },
        "rainy": {
            "season_label": "Rainy Season",
            "humidity": 0.82,
            "heat_index": 0.74,
            "rainfall": 0.83
        }
    }
}


def _get_current_season() -> str:
    """
    Return the current Philippine season.

    Rainy season: June to November
    Dry season: December to May
    """
    philippines_now = datetime.now(ZoneInfo("Asia/Manila"))
    month = philippines_now.month

    if 6 <= month <= 11:
        return "rainy"

    return "dry"


def _get_weather_context(
    country: str = "philippines",
    season: str | None = None
) -> dict:
    """
    Return the weather profile for the selected country and season.
    """
    normalized_country = str(country or "philippines").strip().lower()

    country_profile = COUNTRY_WEATHER_PROFILES.get(
        normalized_country,
        COUNTRY_WEATHER_PROFILES["philippines"]
    )

    selected_season = season or _get_current_season()

    return country_profile.get(
        selected_season,
        country_profile[_get_current_season()]
    )


# ─────────────────────────────────────────────────────────────────────────────
# Recommendation scoring
# ─────────────────────────────────────────────────────────────────────────────

def _score_haircut(
    haircut: dict,
    breed_info: dict,
    season: str,
    weather_context: dict
) -> float:
    """
    Compute a ranking score for a haircut.

    A higher score means the haircut is more appropriate for:
    - The dog's coat
    - The dog's size
    - Shedding level
    - Philippine weather conditions
    """

    score = float(haircut.get("base_score", 0.5))

    haircut_name = haircut.get("name", "")
    coat_type = breed_info.get("coat_type", "single")
    size = breed_info.get("size", "medium")
    shedding = breed_info.get("shedding", "medium")

    suitable_coats = haircut.get("suitable_coat", [])
    suitable_sizes = haircut.get("suitable_size", [])

    # Coat compatibility
    if coat_type in suitable_coats:
        score += 0.08
    else:
        score -= 0.12

    # Size compatibility
    if size in suitable_sizes:
        score += 0.05
    else:
        score -= 0.08

    # High-shedding breeds benefit from de-shedding.
    if shedding == "high" and haircut_name == "De-shedding Treatment":
        score += 0.15

    humidity = weather_context.get("humidity", 0.5)
    rainfall = weather_context.get("rainfall", 0.5)
    heat_index = weather_context.get("heat_index", 0.5)

    # ── Rainy-season recommendations ──────────────────────────────────────
    if season == "rainy":
        rainy_boosts = {
            "De-shedding Treatment": 0.20,
            "Sanitary Trim": 0.18,
            "Bath & Brush Only": 0.14,
            "Puppy Cut": 0.05
        }

        rainy_penalties = {
            "Summer Cut": 0.35,
            "Feathered Trim": 0.15,
            "Show Cut": 0.15,
            "Lion Cut": 0.10
        }

        score += rainy_boosts.get(haircut_name, 0)
        score -= rainy_penalties.get(haircut_name, 0)

        # Humid weather favors easy-to-maintain styles.
        if humidity >= 0.75:
            if haircut_name == "Sanitary Trim":
                score += 0.10
            elif haircut_name == "Bath & Brush Only":
                score += 0.08
            elif haircut_name == "De-shedding Treatment":
                score += 0.05

        # Long decorative styles are harder to maintain in heavy rain.
        if rainfall >= 0.70 and haircut_name in {
            "Feathered Trim",
            "Show Cut"
        }:
            score -= 0.10

    # ── Dry-season recommendations ────────────────────────────────────────
    elif season == "dry":
        dry_boosts = {
            "Summer Cut": 0.18,
            "De-shedding Treatment": 0.12,
            "Sanitary Trim": 0.06,
            "Bath & Brush Only": 0.05
        }

        dry_penalties = {
            "Lamb Cut": 0.12,
            "Teddy Bear Cut": 0.05
        }

        score += dry_boosts.get(haircut_name, 0)
        score -= dry_penalties.get(haircut_name, 0)

        if heat_index >= 0.75:
            if haircut_name == "Summer Cut":
                score += 0.10
            elif haircut_name == "De-shedding Treatment":
                score += 0.07

    return round(score, 4)


def _build_weather_reason(
    haircut_name: str,
    weather_context: dict,
    season: str
) -> str:
    """
    Create a readable explanation for the recommendation.
    """

    season_label = weather_context.get(
        "season_label",
        season.title()
    )

    if season == "rainy":
        rainy_reasons = {
            "De-shedding Treatment":
                "Helps control loose undercoat and supports coat care during humid rainy-season conditions.",

            "Sanitary Trim":
                "Recommended during the rainy season to reduce mud buildup, matting, and dampness around sensitive areas.",

            "Bath & Brush Only":
                "Helps clean and maintain the coat during humid and rainy weather without removing too much protective fur.",

            "Puppy Cut":
                "Provides a manageable coat length that is easier to clean and dry during the rainy season."
        }

        return rainy_reasons.get(
            haircut_name,
            f"Suitable for maintaining your dog's coat during the Philippine {season_label.lower()}."
        )

    dry_reasons = {
        "Summer Cut":
            "Recommended during hot, dry weather to provide a shorter and easier-to-maintain coat.",

        "De-shedding Treatment":
            "Helps remove loose undercoat and supports cooling during high heat-index conditions.",

        "Sanitary Trim":
            "Provides practical hygiene and coat maintenance during warm weather.",

        "Bath & Brush Only":
            "Helps maintain a clean and healthy coat during the Philippine dry season."
    }

    return dry_reasons.get(
        haircut_name,
        f"Balanced grooming option for the Philippine {season_label.lower()}."
    )


def _get_recommendations(
    breed: str,
    season: str,
    top_n: int = 3,
    country: str = "philippines"
) -> list[dict]:
    """
    Return ranked haircut recommendations.
    """

    breed_info = BREED_DATA.get(
        breed,
        BREED_DATA["Other"]
    )

    weather_context = _get_weather_context(
        country,
        season
    )

    scored_recommendations = []

    for haircut in HAIRCUT_CATALOG:
        ranking_score = _score_haircut(
            haircut,
            breed_info,
            season,
            weather_context
        )

        # Display percentage is limited to 99%.
        display_match = max(
            1,
            min(99, round(ranking_score * 100))
        )

        display_popularity = max(
            1,
            min(97, display_match - 2)
        )

        scored_recommendations.append({
            "name": haircut["name"],
            "description": haircut["description"],
            "price": haircut["price"],
            "season": weather_context.get(
                "season_label",
                season.title()
            ),
            "match": f"{display_match}%",
            "popularity": f"{display_popularity}%",
            "weather_reason": _build_weather_reason(
                haircut["name"],
                weather_context,
                season
            ),
            "_ranking_score": ranking_score
        })

    # Sort using the full score before percentages are capped.
    scored_recommendations.sort(
        key=lambda recommendation: recommendation["_ranking_score"],
        reverse=True
    )

    results = []

    for recommendation in scored_recommendations[:top_n]:
        recommendation.pop("_ranking_score", None)
        results.append(recommendation)

    return results


# ─────────────────────────────────────────────────────────────────────────────
# Routes
# ─────────────────────────────────────────────────────────────────────────────

@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "success": True,
        "message": "ML service is running",
        "current_season": _get_current_season(),
        "timestamp": datetime.now(timezone.utc).isoformat()
    })


@app.route("/recommend", methods=["GET", "POST"])
def recommend():
    """
    Examples:

    GET:
    /recommend?breed=Golden%20Retriever&season=rainy&top_n=3

    POST:
    {
        "breed": "Golden Retriever",
        "season": "rainy",
        "top_n": 3,
        "country": "philippines"
    }
    """

    if request.method == "POST":
        data = request.get_json(silent=True) or {}
    else:
        data = request.args

    breed = str(data.get("breed", "Other")).strip()

    requested_season = str(
        data.get("season", _get_current_season())
    ).strip().lower()

    country = str(
        data.get("country", "philippines")
    ).strip().lower() or "philippines"

    try:
        top_n = int(data.get("top_n", 3))
    except (TypeError, ValueError):
        top_n = 3

    top_n = max(1, min(top_n, 10))

    valid_seasons = {
        "rainy",
        "dry"
    }

    if requested_season not in valid_seasons:
        requested_season = _get_current_season()

    # Match breed names without case sensitivity.
    if breed not in BREED_DATA:
        matched_breed = next(
            (
                known_breed
                for known_breed in BREED_DATA
                if known_breed.lower() == breed.lower()
            ),
            "Other"
        )

        breed = matched_breed

    weather_context = _get_weather_context(
        country,
        requested_season
    )

    recommendations = _get_recommendations(
        breed,
        requested_season,
        top_n,
        country
    )

    return jsonify({
        "success": True,
        "breed": breed,
        "country": country.title(),
        "season": weather_context["season_label"],
        "season_key": requested_season,
        "current_season": _get_current_season(),
        "weather_context": weather_context,
        "recommendations": recommendations
    })


@app.route("/breeds", methods=["GET"])
def list_breeds():
    return jsonify({
        "success": True,
        "breeds": sorted(BREED_DATA.keys())
    })


@app.route("/season", methods=["GET"])
def current_season():
    season_key = _get_current_season()
    weather_context = _get_weather_context(
        "philippines",
        season_key
    )

    return jsonify({
        "success": True,
        "season": weather_context["season_label"],
        "season_key": season_key
    })


if __name__ == "__main__":
    port = int(os.getenv("PORT", 5001))
    debug = os.getenv("FLASK_DEBUG", "0") == "1"

    print(f"Timmy Tails ML Service running on port {port}")
    print(f"Current Philippine season: {_get_current_season()}")

    app.run(
        host="0.0.0.0",
        port=port,
        debug=debug
    )