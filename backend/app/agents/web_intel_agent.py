from typing import Dict, Any
import json
import os
from pathlib import Path
from groq import Groq

from ..config import DATA_DIR


def run_web_intel_agent(therapy_area: str | None) -> Dict[str, Any]:
    """
    Fully realistic Web Intelligence Agent:
    - Reads curated guideline & RWE data from guidelines.json
    - Uses Groq LLM to generate a human-like evidence summary
    - Adds mock reference hyperlinks for credibility
    """

    # If no therapy area provided, skip
    if not therapy_area:
        return {
            "summary": "No therapy area provided for web intelligence.",
            "links": []
        }

    # -----------------------------------------
    # Step 1: Load guidelines.json
    # -----------------------------------------
    filepath = DATA_DIR / "guidelines.json"
    guidelines_data = {}

    if filepath.exists():
        with open(filepath, "r", encoding="utf-8") as f:
            guidelines_data = json.load(f)

    therapy_info = guidelines_data.get(therapy_area, {})

    guideline_list = therapy_info.get("guidelines", [])
    rwe_list = therapy_info.get("rwe", [])

    # Build context for LLM
    guideline_text = "\n- ".join(guideline_list)
    rwe_text = "\n- ".join(rwe_list)

    context = f"""
Therapy Area: {therapy_area}

Clinical Guidelines:
- {guideline_text}

Real-World Evidence (RWE):
- {rwe_text}
"""

    # -----------------------------------------
    # Step 2: If no GROQ API key → fallback mock
    # -----------------------------------------
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        return {
            "summary": f"Web research suggests emerging guidelines and real-world evidence in {therapy_area}.",
            "links": [
                {"title": f"{therapy_area} guideline reference", "url": "https://example.com/guideline"},
                {"title": f"{therapy_area} RWE report", "url": "https://example.com/rwe"}
            ]
        }

    # -----------------------------------------
    # Step 3: Generate realistic evidence summary using Groq LLM
    # -----------------------------------------
    client = Groq(api_key=api_key)

    prompt = f"""
You are a biomedical research assistant generating web-intelligence insights.

Summarize the latest guidelines and real-world evidence for: {therapy_area}

Context:
{context}

Your output MUST be in JSON:

{{
  "summary": "4–5 line scientific summary combining guidelines + RWE",
  "key_updates": ["bullet1", "bullet2"],
  "links": []
}}
"""

    completion = client.chat.completions.create(
        model="llama-3.1-8b-instant",
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": "You summarize guidelines & real-world evidence for pharma teams."},
            {"role": "user", "content": prompt}
        ]
    )

    data = json.loads(completion.choices[0].message.content)

    # -----------------------------------------
    # Step 4: Always attach mock useful links
    # -----------------------------------------
    data["links"] = [
        {"title": f"{therapy_area} guideline (synthetic)", "url": "https://example-guideline.com"},
        {"title": f"{therapy_area} RWE summary", "url": "https://example-rwe.com"}
    ]

    return data
