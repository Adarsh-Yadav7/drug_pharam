from typing import Dict, Any, List, Optional
import os
import json

from ..services.data_loader import load_internal_docs_list
from ..services.vector_store import get_internal_docs_vectorstore

from groq import Groq


def _build_query(
    molecule: Optional[str],
    therapy_area: Optional[str],
    region: Optional[str],
    user_prompt: Optional[str],
) -> str:
    """
    Molecule + therapy_area + region + user_prompt se
    ek meaningful query string banata hai jo vector search ke liye use hogi.
    """
    parts: List[str] = []

    if molecule:
        parts.append(f"molecule {molecule}")
    if therapy_area:
        parts.append(f"therapy area {therapy_area}")
    if region:
        parts.append(f"region {region}")
    if user_prompt:
        parts.append(user_prompt)

    if not parts:
        return "portfolio strategy whitespace and unmet need for existing molecules"

    return " | ".join(parts)


def _call_groq_llm(prompt: str) -> Dict[str, Any]:
    """
    Groq LLM ko call karta hai aur JSON response expect karta hai.

    NOTE:
    - GROQ_API_KEY env var me rakho.
    - Model name tum change bhi kar sakte ho, e.g. 'llama-3.1-8b-instant'
    """
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        # Agar key nahi mili to dummy output return kar do
        return {
            "summary": "Groq API key not configured. Returning fallback summary from internal docs.",
            "key_opportunities": [],
            "key_risks": [],
        }

    client = Groq(api_key=api_key)

    completion = client.chat.completions.create(
        model="llama-3.1-8b-instant",
        response_format={"type": "json_object"},
        messages=[
            {
                "role": "system",
                "content": (
                    "You are a senior pharma portfolio strategist. "
                    "You read internal strategy documents and field reports and extract insights "
                    "specifically about unmet needs, repurposing opportunities and risks for the given molecule."
                    "Always respond in JSON with keys: summary, key_opportunities, key_risks."
                ),
            },
            {
                "role": "user",
                "content": prompt,
            },
        ],
    )

    content = completion.choices[0].message.content

    try:
        data = json.loads(content)
        # ensure keys exist
        if "summary" not in data:
            data["summary"] = ""
        if "key_opportunities" not in data:
            data["key_opportunities"] = []
        if "key_risks" not in data:
            data["key_risks"] = []
        return data
    except Exception:
        # agar JSON parse fail ho gaya to raw text ko summary bana do
        return {
            "summary": content,
            "key_opportunities": [],
            "key_risks": [],
        }


def run_internal_docs_agent(
    molecule: Optional[str],
    therapy_area: Optional[str],
    region: Optional[str],
    user_prompt: Optional[str],
) -> Dict[str, Any]:
    """
    Internal Knowledge / Insights Agent

    - internal_docs/ folder se PDF list leta hai
    - vector store (FAISS) se relevant snippets nikalta hai
    - Groq LLM se:
        - summary
        - key_opportunities[]
        - key_risks[]
      nikalta hai
    - Master Agent ke liye structured dict return karta hai.
    """

    # 1) Check kya docs hai bhi ki nahi
    docs = load_internal_docs_list()
    if not docs:
        summary = (
            "No internal documents available in the repository yet. "
            "In production, this agent would surface strategy and field insights "
            "from internal PDFs for the selected molecule and therapy area."
        )
        return {
            "summary": summary,
            "key_opportunities": [],
            "key_risks": [],
            "highlights": [],
            "documents": [],
        }

    # 2) Vector store load karo (ye function hum vector_store.py me banayenge)
    vectordb = get_internal_docs_vectorstore()
    if vectordb is None:
        # Agar index nahi bana to simple generic message
        summary = (
            f"{len(docs)} internal documents are present, but vector index is not built yet. "
            "For the hackathon prototype, this demonstrates where LangChain-based retrieval "
            "would plug in to enrich the analysis with internal insights."
        )
        return {
            "summary": summary,
            "key_opportunities": [],
            "key_risks": [],
            "highlights": [],
            "documents": docs,
        }

    # 3) Query build karo
    query = _build_query(molecule, therapy_area, region, user_prompt)

    # 4) Similarity search from vector store
    retrieved_docs = vectordb.similarity_search(query, k=3)

    if not retrieved_docs:
        summary = (
            "Internal documents were indexed, but no strong matches were found "
            "for the given molecule / therapy area. "
            "This suggests that current internal strategy material does not directly "
            "cover this whitespace area."
        )
        return {
            "summary": summary,
            "key_opportunities": [],
            "key_risks": [],
            "highlights": [],
            "documents": docs,
        }

    # 5) Context text banayo Groq ke liye
    context_blocks: List[str] = []
    highlights: List[Dict[str, Any]] = []

    for d in retrieved_docs:
        snippet = d.page_content.strip().replace("\n", " ")
        context_blocks.append(snippet[:1000])  # per doc max ~1000 chars

        highlights.append(
            {
                "doc_name": d.metadata.get("source", "unknown"),
                "page": d.metadata.get("page", None),
                "snippet": snippet[:400],
            }
        )

    context_text = "\n\n---\n\n".join(context_blocks)

    # 6) Prompt for Groq LLM
    effective_prompt = user_prompt or (
        f"Identify internal unmet needs and repurposing opportunities for molecule {molecule} "
        f"in therapy area {therapy_area} for region {region}."
    )

    llm_prompt = f"""
Context from internal strategy / field documents:
{context_text}

User question:
{effective_prompt}

Please focus on:
- Unmet needs and pain points reported in the documents
- Potential repurposing angles or new target patient segments for {molecule} in {therapy_area}
- Any key risks, evidence gaps, or operational constraints highlighted

Respond ONLY in valid JSON with keys:
- "summary": string
- "key_opportunities": list of short bullet strings
- "key_risks": list of short bullet strings
"""

    llm_result = _call_groq_llm(llm_prompt)

    # 7) Final dict for Master Agent
    return {
        "summary": llm_result.get("summary", ""),
        "key_opportunities": llm_result.get("key_opportunities", []),
        "key_risks": llm_result.get("key_risks", []),
        "highlights": highlights,
        "documents": docs,
    }
