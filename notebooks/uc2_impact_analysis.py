# Databricks notebook source

# MAGIC %md
# MAGIC # UC2: New Document Impact Scanner
# MAGIC
# MAGIC **What it does:** Takes a new client requirements document (PDF or text), extracts each
# MAGIC requirement, searches the Knowledge Base for related internal documents, and generates
# MAGIC an impact report showing matches, gaps, and required actions.
# MAGIC
# MAGIC **How it works:**
# MAGIC 1. Read document from a UC Volume (supports PDF via `ai_parse_document`, or plain text)
# MAGIC 2. LLM extracts structured requirements from the parsed content
# MAGIC 3. For each requirement, queries your KA to find related internal docs
# MAGIC 4. LLM compares requirement vs KB findings and generates an impact matrix

# COMMAND ----------

# MAGIC %md
# MAGIC ## Step 1: Install Dependencies

# COMMAND ----------

%pip install -U -qqqq databricks-langchain mlflow langchain-core
dbutils.library.restartPython()

# COMMAND ----------

# MAGIC %md
# MAGIC ## Step 2: Configuration

# COMMAND ----------

# ╔══════════════════════════════════════════════════════════════╗
# ║              ⚠️  FILL IN THE VALUES BELOW  ⚠️               ║
# ╚══════════════════════════════════════════════════════════════╝

# 📌 KNOWLEDGE AGENT ENDPOINT
KA_ENDPOINT_NAME = "<YOUR_KA_ENDPOINT_NAME>"

# 📌 LLM ENDPOINT for analysis
LLM_ENDPOINT = "databricks-claude-sonnet-4"

# 📌 PATH TO THE CLIENT REQUIREMENTS DOCUMENT IN A UC VOLUME
# Supports: .pdf, .docx, .txt
# Example: /Volumes/catalog/schema/volume_name/document.pdf
DOCUMENT_PATH = "/Volumes/<YOUR_CATALOG>/<YOUR_SCHEMA>/<YOUR_VOLUME>/requirements.pdf"

# COMMAND ----------

# MAGIC %md
# MAGIC ## Step 3: Read the Document from UC Volume
# MAGIC
# MAGIC - **PDF/DOCX** → uses `ai_parse_document` (Databricks-native, handles tables & layouts)
# MAGIC - **TXT** → reads directly

# COMMAND ----------

import os

file_ext = os.path.splitext(DOCUMENT_PATH)[1].lower()
print(f"Document: {DOCUMENT_PATH}")
print(f"File type: {file_ext}")

if file_ext == ".txt":
    # Plain text — read directly
    with open(DOCUMENT_PATH, "r") as f:
        CLIENT_REQUIREMENTS = f.read()
    print(f"✅ Text file loaded: {len(CLIENT_REQUIREMENTS)} characters")

elif file_ext in (".pdf", ".docx", ".doc", ".pptx", ".ppt"):
    # Use ai_parse_document for rich document parsing
    print("Parsing with ai_parse_document...")
    df = spark.read.format("binaryFile").load(DOCUMENT_PATH)
    result_df = df.selectExpr(
        "ai_parse_document(content, 'text') as parsed"
    )
    parsed = result_df.collect()[0]["parsed"]
    CLIENT_REQUIREMENTS = parsed
    print(f"✅ Document parsed: {len(CLIENT_REQUIREMENTS)} characters")

else:
    raise ValueError(f"Unsupported file type: {file_ext}. Use .pdf, .docx, or .txt")

# Show first 500 chars
print(f"\n--- Preview ---\n{CLIENT_REQUIREMENTS[:500]}")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Step 4: Extract Requirements from the Document

# COMMAND ----------

from databricks_langchain import ChatDatabricks
from langchain_core.messages import HumanMessage

llm = ChatDatabricks(endpoint=LLM_ENDPOINT, temperature=0)

extract_prompt = f"""Extract all individual requirements from this client document.

DOCUMENT:
{CLIENT_REQUIREMENTS}

For each requirement, output EXACTLY this format (one per line):
REQ_ID | SHORT_DESCRIPTION | FULL_TEXT

Example:
REQ-EXT-001 | 8 years rust protection for metal | All exterior metal surfaces must receive anti-corrosion coating that provides a minimum of 8 years rust protection.

Extract ALL requirements. Do not skip any. If requirements don't have IDs, assign them (REQ-001, REQ-002, etc.)."""

print("Extracting requirements...")
extract_response = llm.invoke([HumanMessage(content=extract_prompt)])
extracted_requirements = extract_response.content
print(extracted_requirements)

# COMMAND ----------

# MAGIC %md
# MAGIC ## Step 5: Parse the Extracted Requirements

# COMMAND ----------

requirements = []
for line in extracted_requirements.strip().split("\n"):
    line = line.strip()
    if "|" in line and "REQ" in line.upper():
        parts = [p.strip() for p in line.split("|")]
        if len(parts) >= 3:
            requirements.append({
                "id": parts[0],
                "summary": parts[1],
                "full_text": parts[2],
            })

print(f"✅ Parsed {len(requirements)} requirements:")
for r in requirements:
    print(f"  {r['id']}: {r['summary']}")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Step 6: Search the Knowledge Base for Each Requirement
# MAGIC
# MAGIC For each requirement, we ask the KA: "What internal documents relate to this?"

# COMMAND ----------

from mlflow.deployments import get_deploy_client

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
        return f"Error: {e}"

# Search KB for each requirement
print("Searching Knowledge Base for each requirement...\n")
kb_results = {}

for i, req in enumerate(requirements):
    search_query = (
        f"What products, specifications, or procedures do we have related to: "
        f"{req['full_text']}? "
        f"Include specific numbers like coverage rates, dry times, protection duration, "
        f"temperature ranges, and any relevant limitations."
    )
    print(f"[{i+1}/{len(requirements)}] Searching for {req['id']}: {req['summary']}...")
    result = search_kb(search_query)
    kb_results[req["id"]] = result
    print(f"  → Found {len(result)} chars of response")

print(f"\n✅ KB search complete for all {len(requirements)} requirements")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Step 7: View KB Results (Optional)
# MAGIC
# MAGIC Inspect what the KA returned for each requirement.

# COMMAND ----------

for req_id, result in kb_results.items():
    print(f"\n{'='*60}")
    print(f"📌 {req_id}")
    print(f"{'='*60}")
    print(result[:800])
    if len(result) > 800:
        print(f"  ... ({len(result)} total chars)")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Step 8: Generate Impact Analysis Report

# COMMAND ----------

# Build the context for the report
findings_text = ""
for req in requirements:
    rid = req["id"]
    findings_text += f"\n--- {rid}: {req['summary']} ---\n"
    findings_text += f"Client Requirement: {req['full_text']}\n"
    findings_text += f"KB Findings: {kb_results.get(rid, 'No results')[:2000]}\n"

report_prompt = f"""You are an impact analysis specialist. Based on client requirements and
internal knowledge base findings, generate a comprehensive Impact Analysis Report.

{findings_text}

Generate a report with this EXACT structure:

## Impact Analysis Report

#### Summary
- Total requirements analyzed: [count]
- Requirements MET by current products: [count]
- Requirements with GAPS: [count]
- Requirements needing ACTION: [count]

#### Detailed Impact Matrix

| Req ID | Requirement | Related KB Document | Status | Gap / Finding | Action Required | Priority |
|--------|------------|-------------------|--------|--------------|----------------|----------|
(fill one row per requirement)

Status must be one of: ✅ MET, ⚠️ GAP, ❌ NOT MET

#### Critical Gaps (detail each gap)
For each GAP or NOT MET item, explain:
- What the client requires
- What our current product/process offers
- The specific gap
- Recommended action to close the gap

#### Recommended Next Steps
List concrete actions the team should take, ordered by priority."""

print("Generating Impact Analysis Report...")
report_response = llm.invoke([HumanMessage(content=report_prompt)])
report = report_response.content

# COMMAND ----------

# MAGIC %md
# MAGIC ## Step 9: View the Report

# COMMAND ----------

print(report)

# COMMAND ----------

# MAGIC %md
# MAGIC ## Step 10: Display Report (Rendered Markdown)

# COMMAND ----------

# MAGIC %md
# MAGIC The report above is in markdown format. You can copy it into any markdown viewer
# MAGIC or render it below:

# COMMAND ----------

import re

# Convert markdown to basic HTML for display
html_report = report.replace("\n", "<br>")
displayHTML(f"""
<div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 1000px; padding: 24px; line-height: 1.6;">
{html_report}
</div>
""")

# COMMAND ----------

# MAGIC %md
# MAGIC ---
# MAGIC ## How to use with a PDF document
# MAGIC
# MAGIC 1. Upload your PDF to a UC Volume (e.g. `/Volumes/main/your_schema/your_volume/requirements.pdf`)
# MAGIC 2. Change `DOCUMENT_PATH` in Step 2 to point to the PDF
# MAGIC 3. Run all cells — `ai_parse_document` will automatically extract the text
# MAGIC
# MAGIC `ai_parse_document` handles:
# MAGIC - Complex tables with merged cells
# MAGIC - Multi-column layouts
# MAGIC - Headers, footers, page numbers
# MAGIC - Embedded images and diagrams (with descriptions)
# MAGIC
# MAGIC **Requirements:** Databricks Runtime 17.1+, US or EU region workspace
