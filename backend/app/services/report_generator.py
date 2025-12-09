from datetime import datetime
from typing import List, Optional
from jinja2 import Template
import uuid
from xhtml2pdf import pisa

from ..config import REPORTS_DIR


HTML_TEMPLATE = """
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8" />
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 28px;
            line-height: 1.5;
            color: #111827;
        }
        h1 {
            font-size: 26px;
            text-align: left;
            margin-bottom: 4px;
            color: #0f172a;
        }
        h2 {
            font-size: 20px;
            margin-top: 20px;
            color: #1d4ed8;
        }
        h3 {
            font-size: 16px;
            margin-top: 12px;
            color: #111827;
        }
        p {
            font-size: 13px;
            margin: 4px 0;
        }
        ul {
            margin-left: 18px;
            font-size: 13px;
        }
        li {
            margin-bottom: 4px;
        }
        .section {
            margin-top: 18px;
            padding-top: 10px;
            border-top: 1px solid #e5e7eb;
        }
        .header-bar {
            border-left: 5px solid #22c55e;
            padding-left: 10px;
            margin-bottom: 14px;
        }
        .subtitle {
            font-size: 12px;
            color: #6b7280;
        }
        .meta-grid {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
            font-size: 12px;
        }
        .meta-grid td {
            padding: 4px 6px;
            border: 1px solid #e5e7eb;
            word-wrap: break-word;
            word-break: break-all;
        }
        .meta-label {
            font-weight: bold;
            background: #f3f4f6;
            width: 24%;
        }
        .meta-value {
            width: 26%;
        }
        .pill {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 999px;
            border: 1px solid #22c55e;
            color: #166534;
            font-size: 11px;
        }
        .summary-box {
            background: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 6px;
            padding: 10px 12px;
            margin-top: 4px;
        }
        .summary-points {
            margin-top: 6px;
        }
        .agent-card {
            border: 1px solid #e5e7eb;
            border-radius: 6px;
            padding: 10px 12px;
            margin-top: 10px;
            background: #ffffff;
        }
        .agent-title {
            font-size: 14px;
            font-weight: bold;
            color: #0f172a;
        }
        .agent-summary-label {
            font-size: 12px;
            font-weight: bold;
            margin-top: 6px;
        }
        .agent-summary-text {
            font-size: 13px;
        }
        .data-label {
            font-size: 12px;
            font-weight: bold;
            margin-top: 6px;
        }
        .sub-list {
            margin-left: 14px;
            margin-top: 4px;
        }
        .footer-note {
            font-size: 10px;
            color: #6b7280;
            margin-top: 18px;
        }
    </style>
</head>

<body>

<div class="header-bar">
    <h1>Pharma Agentic AI – Analysis Report</h1>
    <p class="subtitle">Automated opportunity assessment powered by Agentic AI (Master + Worker agents).</p>
</div>

<table class="meta-grid">
    <tr>
        <td class="meta-label">Query</td>
        <td class="meta-value" colspan="3">{{ query_title }}</td>
    </tr>
    <tr>
        <td class="meta-label">Molecule</td>
        <td class="meta-value">{{ molecule or "-" }}</td>
        <td class="meta-label">Therapy area</td>
        <td class="meta-value">{{ therapy_area or "-" }}</td>
    </tr>
    <tr>
        <td class="meta-label">Region / Country</td>
        <td class="meta-value">{{ region or "-" }}</td>
        <td class="meta-label">Agents run</td>
        <td class="meta-value">
            {% if tasks and tasks|length > 0 %}
                {% for t in tasks %}
                    <span class="pill">{{ t|upper }}</span>
                    {% if not loop.last %} {% endif %}
                {% endfor %}
            {% else %}
                -
            {% endif %}
        </td>
    </tr>
    <tr>
        <td class="meta-label">Generated on</td>
        <td class="meta-value">{{ timestamp }}</td>
    </tr>
</table>

<div class="section">
    <h2>Executive Summary</h2>
    <div class="summary-box">
        {% if overall_points and overall_points|length > 0 %}
            <ul class="summary-points">
                {% for point in overall_points %}
                    <li>{{ point }}</li>
                {% endfor %}
            </ul>
        {% else %}
            <p>{{ overall_summary }}</p>
        {% endif %}
    </div>
</div>

<div class="section">
    <h2>Agent-level Insights</h2>

    {% for agent in agents %}
    <div class="agent-card">
        <div class="agent-title">{{ agent.agent_name }}</div>

        <div class="agent-summary-label">High-level summary</div>
        <p class="agent-summary-text">{{ agent.summary }}</p>

        {% if agent.data %}
            <div class="data-label">Structured details</div>
            <ul>
                {# Iterate over data keys like table, patents, key_opportunities, etc. #}
                {% for key, value in agent.data.items() %}
                    <li>
                        <b>{{ key.replace("_", " ") | title }}:</b>

                        {# If value is a list/dict -> format nicely #}
                        {% if value is iterable and value is not string %}
                            <ul class="sub-list">
                                {% for item in value[:5] %} {# top 5 only to keep PDF readable #}
                                    <li>
                                        {% if item is mapping %}
                                            {% for k, v in item.items() %}
                                                <b>{{ k }}:</b> {{ v }}&nbsp;&nbsp;
                                            {% endfor %}
                                        {% else %}
                                            {{ item }}
                                        {% endif %}
                                    </li>
                                {% endfor %}
                                {% if value|length > 5 %}
                                    <li>... ({{ value|length - 5 }} more records)</li>
                                {% endif %}
                            </ul>
                        {% else %}
                            {{ value }}
                        {% endif %}
                    </li>
                {% endfor %}
            </ul>
        {% endif %}
    </div>
    {% endfor %}
</div>

<p class="footer-note">
    This report is generated by the Pharma Agentic AI prototype for EY Hackathon 6.0. 
    Insights are based on simulated / mock data sources and should not be used as a substitute for validated market research.
</p>

</body>
</html>
"""


# headings jinke hisaab se bullets banani hain
SUMMARY_HEADINGS = [
    "Market & growth view:",
    "Supply and trade dynamics:",
    "IP barriers and freedom-to-operate:",
    "Clinical development and pipeline:",
    "Internal strategy and unmet needs:",
    "Guidelines and real-world evidence:",
]


def _split_summary_to_points(overall_summary: str) -> List[str]:
    """
    Overall summary ko fixed headings ke basis par 4–6 clean bullet
    points me todta hai. Decimals (10589.9, 6.2%) ko break nahi karega.
    """
    if not overall_summary:
        return []

    text = overall_summary.strip()
    points: List[str] = []

    for i, heading in enumerate(SUMMARY_HEADINGS):
        start = text.find(heading)
        if start == -1:
            # iss heading ka part summary me nahi hai – skip
            continue

        # next heading ka index dhoondo
        end = len(text)
        for next_heading in SUMMARY_HEADINGS[i + 1 :]:
            idx = text.find(next_heading, start + len(heading))
            if idx != -1:
                end = idx
                break

        chunk = text[start:end].strip()
        if chunk:
            points.append(chunk)

    # safety: agar kisi reason se upar wala logic se kuch nahi bana
    if not points:
        points.append(overall_summary.strip())

    return points


def generate_report(
    overall_summary: str,
    agent_results: List,
    query_title: str = "User Query",
    molecule: Optional[str] = None,
    therapy_area: Optional[str] = None,
    region: Optional[str] = None,
    tasks: Optional[List[str]] = None,
) -> str:
    """
    Enhanced PDF report generator.

    - Executive summary ko bullet points me dikhata hai
    - Molecule / therapy / region / agents ko meta table me show karta hai
    - Agent-level sections ko card-style blocks me render karta hai
    """
    report_id = str(uuid.uuid4())
    timestamp = datetime.now().strftime("%d %b %Y, %I:%M %p")

    overall_points = _split_summary_to_points(overall_summary)

    t = Template(HTML_TEMPLATE)
    html_content = t.render(
        overall_summary=overall_summary,
        overall_points=overall_points,
        agents=agent_results,
        timestamp=timestamp,
        report_id=report_id,
        query_title=query_title,
        molecule=molecule,
        therapy_area=therapy_area,
        region=region,
        tasks=tasks or [],
    )

    pdf_path = REPORTS_DIR / f"{report_id}.pdf"

    with open(pdf_path, "wb") as pdf_file:
        pisa.CreatePDF(html_content, dest=pdf_file)

    return report_id
