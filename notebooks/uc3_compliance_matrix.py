# Databricks notebook source
# MAGIC %md
# MAGIC # UC3: Compliance Matrix Generator
# MAGIC
# MAGIC **What it does:** Takes a client requirements/RFP document, extracts every requirement,
# MAGIC checks each one against the Knowledge Base, and generates a full **Compliance Matrix**
# MAGIC showing COMPLIANT / PARTIAL / GAP status with evidence.
# MAGIC
# MAGIC **Business value:** What takes senior engineers **weeks** (reading 200-page specs,
# MAGIC cross-referencing thousands of internal processes) becomes **minutes**.
# MAGIC
# MAGIC **Steps:**
# MAGIC 1. Parse client requirements document (PDF or TXT from a UC Volume)
# MAGIC 2. Extract individual requirements with an LLM
# MAGIC 3. For each requirement, query the Knowledge Agent for matching internal docs
# MAGIC 4. LLM evaluates compliance for each requirement
# MAGIC 5. Generate the final Compliance Matrix report

# COMMAND ----------

# MAGIC %md
# MAGIC ## Step 1: Install Dependencies

# COMMAND ----------

# MAGIC %pip install -U -qqqq databricks-langchain mlflow langchain-core
# MAGIC dbutils.library.restartPython()

# COMMAND ----------

# MAGIC %md
# MAGIC ## Step 2: Configuration

# COMMAND ----------

# ╔══════════════════════════════════════════════════════════════╗
# ║              ⚠️  FILL IN THE VALUES BELOW  ⚠️               ║
# ╚══════════════════════════════════════════════════════════════╝

# 📌 KNOWLEDGE AGENT ENDPOINT (your KA serving endpoint name)
KA_ENDPOINT_NAME = "<YOUR_KA_ENDPOINT_NAME>"

# 📌 LLM ENDPOINT for requirement extraction and compliance evaluation
LLM_ENDPOINT = "databricks-claude-haiku-4-5"

# 📌 PATH TO THE CLIENT REQUIREMENTS / RFP DOCUMENT IN A UC VOLUME
# Supports: .pdf, .docx, .txt
# Example: /Volumes/catalog/schema/volume_name/client_spec.pdf
DOCUMENT_PATH = "/Volumes/<YOUR_CATALOG>/<YOUR_SCHEMA>/<YOUR_VOLUME>/client_project_spec_uc3.txt"

# COMMAND ----------

# MAGIC %md
# MAGIC ## Step 3: Parse the Document
# MAGIC
# MAGIC - **PDF/DOCX** → uses `ai_parse_document` (Databricks-native)
# MAGIC - **TXT** → reads directly

# COMMAND ----------

import os

file_ext = os.path.splitext(DOCUMENT_PATH)[1].lower()
print(f"Document: {DOCUMENT_PATH}")
print(f"File type: {file_ext}")

if file_ext == ".txt":
    with open(DOCUMENT_PATH, "r") as f:
        CLIENT_DOC = f.read()
    print(f"✅ Text file loaded: {len(CLIENT_DOC)} characters")

elif file_ext in (".pdf", ".docx", ".doc", ".pptx", ".ppt"):
    print("Parsing with ai_parse_document...")
    CLIENT_DOC = spark.sql(f"""
        SELECT concat_ws('\\n\\n', 
               transform(
                   try_cast(ai_parse_document(content):document:elements AS ARRAY<VARIANT>),
                   element -> try_cast(element:content AS STRING)
               )
            ) as text
        FROM read_files('{DOCUMENT_PATH}', format => 'binaryFile')
    """).collect()[0][0]
    print(f"✅ Document parsed: {len(CLIENT_DOC)} characters")

else:
    raise ValueError(f"Unsupported file type: {file_ext}. Use .pdf, .docx, or .txt")

print(f"\n--- Preview (first 500 chars) ---\n{CLIENT_DOC[:500]}")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Step 4: Extract Individual Requirements
# MAGIC
# MAGIC The LLM reads the full document and pulls out every SHALL / MUST / REQUIRED statement
# MAGIC as a structured list.

# COMMAND ----------

from databricks_langchain import ChatDatabricks
from langchain_core.messages import HumanMessage

llm = ChatDatabricks(endpoint=LLM_ENDPOINT, temperature=0)

extract_prompt = f"""You are a requirements analyst. Extract every individual requirement from this client specification document.

DOCUMENT:
{CLIENT_DOC}

For each requirement, output EXACTLY this format (one per line, pipe-separated):
REQ_ID | CATEGORY | CRITICALITY | FULL_REQUIREMENT_TEXT

Rules:
- REQ_ID: Use the document's own IDs if present (e.g., REQ-EXT-001), otherwise assign REQ-001, REQ-002, etc.
- CATEGORY: One of: General, Exterior, Interior, Primer, Sustainability, Commercial, Other
- CRITICALITY: Critical (safety/regulatory/disqualifying), Major (important for bid), Minor (nice to have)
- FULL_REQUIREMENT_TEXT: The exact requirement text — every SHALL, MUST, REQUIRED statement

Be exhaustive. Missing a requirement could mean a compliance failure. Do NOT output headers or explanations, just the pipe-separated lines."""

print("Extracting requirements from document...")
extract_response = llm.invoke([HumanMessage(content=extract_prompt)])
extracted_text = extract_response.content
print(extracted_text)

# COMMAND ----------

# MAGIC %md
# MAGIC ## Step 5: Parse Extracted Requirements

# COMMAND ----------

requirements = []
for line in extracted_text.strip().split("\n"):
    line = line.strip()
    if "|" in line and line and not line.startswith("REQ_ID"):
        parts = [p.strip() for p in line.split("|")]
        if len(parts) >= 4:
            requirements.append({
                "id": parts[0],
                "category": parts[1],
                "criticality": parts[2],
                "text": parts[3],
            })
        elif len(parts) == 3:
            requirements.append({
                "id": parts[0],
                "category": "Other",
                "criticality": "Major",
                "text": parts[2],
            })

print(f"✅ Extracted {len(requirements)} requirements:\n")
for r in requirements:
    print(f"  [{r['criticality']:8s}] {r['id']}: {r['text'][:80]}...")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Step 6: Query Knowledge Base for Each Requirement
# MAGIC
# MAGIC For each requirement, we ask the KA: *"Do we have internal products, processes, or documentation that address this?"*

# COMMAND ----------

from mlflow.deployments import get_deploy_client
import time

deploy_client = get_deploy_client("databricks")

def search_kb(question: str) -> str:
    """Query the Knowledge Agent for related internal documents."""
    try:
        resp = deploy_client.predict(
            endpoint=KA_ENDPOINT_NAME,
            inputs={"input": [{"role": "user", "content": question}]},
        )
        if isinstance(resp, dict):
            output = resp.get("output", "")
            if isinstance(output, str):
                return output
            if isinstance(output, list):
                for msg in output:
                    if isinstance(msg, dict) and msg.get("role") == "assistant":
                        return msg.get("content", "")
                return str(output)
            return str(output)
        return str(resp)
    except Exception as e:
        return f"Error querying KB: {e}"

# Search KB for every requirement
print(f"Searching Knowledge Base for {len(requirements)} requirements...\n")
kb_results = {}

for i, req in enumerate(requirements):
    search_query = (
        f"Do we have any products, specifications, technical data sheets, or procedures "
        f"that address the following requirement: {req['text']}? "
        f"Include specific numbers (coverage rates, dry times, protection duration, "
        f"temperature ranges, VOC levels, certifications) and document references."
    )
    print(f"[{i+1}/{len(requirements)}] {req['id']}: {req['text'][:60]}...")
    kb_results[req["id"]] = search_kb(search_query)
    print(f"  → {len(kb_results[req['id']])} chars returned")
    time.sleep(0.5)  # Small delay to avoid rate limiting

print(f"\n✅ KB search complete for all {len(requirements)} requirements")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Step 7: (Optional) Inspect KB Results
# MAGIC
# MAGIC Check what the KA returned for each requirement before evaluating compliance.

# COMMAND ----------

for req_id, result in kb_results.items():
    print(f"\n{'='*60}")
    print(f"📌 {req_id}")
    print(f"{'='*60}")
    print(result[:600])
    if len(result) > 600:
        print(f"  ... ({len(result)} total chars)")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Step 8: Evaluate Compliance for Each Requirement
# MAGIC
# MAGIC The LLM compares each client requirement against what the KB returned and assigns
# MAGIC a compliance status with evidence.

# COMMAND ----------

# Build the full context: requirements + KB findings
findings_text = ""
for req in requirements:
    rid = req["id"]
    findings_text += f"\n--- {rid} [{req['category']}] [{req['criticality']}] ---\n"
    findings_text += f"CLIENT REQUIREMENT: {req['text']}\n"
    findings_text += f"INTERNAL KB FINDINGS: {kb_results.get(rid, 'No results found')[:2000]}\n"

# COMMAND ----------

# MAGIC %md
# MAGIC ## Step 9: Generate the Compliance Matrix
# MAGIC
# MAGIC This is the final output — the full compliance matrix with summary, detailed table,
# MAGIC gap analysis, and bid recommendation.

# COMMAND ----------

compliance_prompt = f"""You are a compliance analyst. Based on a client's requirements and our internal knowledge base findings, generate a professional **Compliance Matrix**.

For each requirement, compare what the client asks vs. what our internal documentation/products offer, then assign a compliance status.

{findings_text}

Generate a report with this EXACT structure:

---

## Compliance Matrix — [Client Name from Document]

### Executive Summary
- **Total Requirements**: [count]
- **COMPLIANT**: [count] ([%]) — We fully meet this requirement
- **PARTIAL**: [count] ([%]) — We partially meet this, with deviations
- **GAP**: [count] ([%]) — We have no matching capability or documentation

### Detailed Compliance Matrix

| Req ID | Category | Requirement | Status | Evidence (Product/Document) | Details/Deviation | Action Required |
|--------|----------|-------------|--------|-----------------------------|-------------------|-----------------|
(one row per requirement — fill ALL of them)

Status values: ✅ COMPLIANT, ⚠️ PARTIAL, ❌ GAP

### Critical Gaps

For each GAP or PARTIAL item, provide:
1. **Requirement**: What the client requires
2. **Current State**: What we currently offer (or "No capability found")
3. **Gap**: The specific difference
4. **Recommended Action**: How to close the gap
5. **Priority**: High / Medium / Low

### Bid Recommendation

Based on the compliance analysis:
- Can we bid on this project? (Yes / Yes with caveats / Not recommended)
- Key strengths to highlight
- Key risks to flag
- Investments or actions needed before/during the project

---

Be thorough and precise. For COMPLIANT items, cite the specific product name and relevant specs from the KB.
For GAP items, clearly state what is missing. Do not hallucinate — if the KB did not return evidence, mark it as GAP."""

print("Generating Compliance Matrix...")
report_response = llm.invoke([HumanMessage(content=compliance_prompt)])
compliance_report = report_response.content

# COMMAND ----------

# MAGIC %md
# MAGIC ## Step 10: View the Compliance Matrix

# COMMAND ----------

print(compliance_report)

# COMMAND ----------

# MAGIC %md
# MAGIC ## Step 11: Render as HTML (for better table display)

# COMMAND ----------

import re

# Simple markdown-to-HTML conversion for tables and headers
html = compliance_report

# Convert headers
html = re.sub(r'^### (.+)$', r'<h3>\1</h3>', html, flags=re.MULTILINE)
html = re.sub(r'^## (.+)$', r'<h2>\1</h2>', html, flags=re.MULTILINE)

# Convert markdown tables to HTML tables
lines = html.split('\n')
in_table = False
html_lines = []
for line in lines:
    stripped = line.strip()
    if stripped.startswith('|') and stripped.endswith('|'):
        cells = [c.strip() for c in stripped.split('|')[1:-1]]
        if all(set(c) <= set('- :') for c in cells):
            # This is a separator row — skip it
            continue
        if not in_table:
            html_lines.append('<table style="border-collapse:collapse;width:100%;font-size:13px;">')
            # First row is header
            html_lines.append('<tr>' + ''.join(f'<th style="border:1px solid #ddd;padding:8px;background:#f4f4f4;text-align:left;">{c}</th>' for c in cells) + '</tr>')
            in_table = True
        else:
            # Color-code status cells
            colored_cells = []
            for c in cells:
                if '✅' in c or 'COMPLIANT' in c.upper():
                    colored_cells.append(f'<td style="border:1px solid #ddd;padding:8px;background:#e6f4ea;color:#1a7431;">{c}</td>')
                elif '⚠️' in c or 'PARTIAL' in c.upper():
                    colored_cells.append(f'<td style="border:1px solid #ddd;padding:8px;background:#fef7e0;color:#8a6d00;">{c}</td>')
                elif '❌' in c or 'GAP' in c.upper():
                    colored_cells.append(f'<td style="border:1px solid #ddd;padding:8px;background:#fce8e6;color:#c5221f;">{c}</td>')
                else:
                    colored_cells.append(f'<td style="border:1px solid #ddd;padding:8px;">{c}</td>')
            html_lines.append('<tr>' + ''.join(colored_cells) + '</tr>')
    else:
        if in_table:
            html_lines.append('</table><br>')
            in_table = False
        html_lines.append(line + '<br>')

if in_table:
    html_lines.append('</table>')

html_output = '\n'.join(html_lines)

displayHTML(f"""
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 1200px; padding: 24px; line-height: 1.6;">
{html_output}
</div>
""")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Step 12: (Optional) Save the Report

# COMMAND ----------

# Save compliance matrix to the same volume
base_path = DOCUMENT_PATH.rsplit("/", 1)[0]
output_file = base_path + "/compliance_matrix_report.md"

with open(output_file, "w") as f:
    f.write(compliance_report)
print(f"✅ Compliance Matrix saved to: {output_file}")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Step 13: (Optional) Generate a KA Prompt
# MAGIC
# MAGIC If you prefer to run the compliance check interactively in the app,
# MAGIC copy this prompt and paste it into the Knowledge Assistant.

# COMMAND ----------

# Build a list of requirements for the prompt
req_list = "\n".join([f"- {r['id']}: {r['text']}" for r in requirements])

ka_prompt = f"""A client sent us a requirements specification for a new project. I need you to check our compliance against each requirement below.

For each requirement, tell me:
1. **Status**: ✅ COMPLIANT (we fully meet it), ⚠️ PARTIAL (we partly meet it), or ❌ GAP (we don't have it)
2. **Evidence**: Which of our products or documents addresses this, with specific specs/numbers
3. **Gap**: If PARTIAL or GAP, what exactly is missing

Format as a table:
| Req ID | Requirement | Status | Evidence | Gap |

Here are the client requirements:

{req_list}

After the table, give me:
- Summary: X compliant, X partial, X gaps out of {len(requirements)} total
- List the top critical gaps
- Can we bid on this project?"""

print("=" * 60)
print("KA PROMPT — Copy and paste into the Knowledge Assistant")
print("=" * 60)
print()
print(ka_prompt)

# COMMAND ----------

# MAGIC %md
# MAGIC ---
# MAGIC ## How to use this notebook
# MAGIC
# MAGIC 1. Upload your client requirements document (PDF, DOCX, or TXT) to a UC Volume
# MAGIC 2. Set `DOCUMENT_PATH` in **Step 2** to point to it
# MAGIC 3. Set `KA_ENDPOINT_NAME` to your Knowledge Agent serving endpoint
# MAGIC 4. **Run All** — the notebook will:
# MAGIC    - Parse the document
# MAGIC    - Extract every requirement
# MAGIC    - Check each one against your Knowledge Base
# MAGIC    - Generate a full Compliance Matrix with gap analysis
# MAGIC 5. View the rendered HTML report in Step 11 or copy the markdown from Step 10
# MAGIC 6. Optionally, use the KA prompt from Step 13 to run it interactively in the app
# MAGIC
# MAGIC **Tip:** For large documents (100+ requirements), the KB search in Step 6 may take
# MAGIC several minutes. The `time.sleep(0.5)` prevents rate limiting.
