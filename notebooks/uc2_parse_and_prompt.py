# Databricks notebook source
# MAGIC %md
# MAGIC # UC2: Parse Requirements & Generate KA Prompt
# MAGIC
# MAGIC **Simple 2-step notebook:**
# MAGIC 1. Parse a client PDF from a UC Volume
# MAGIC 2. Generate a prompt you can paste directly into the KA in the app

# COMMAND ----------

# MAGIC %md
# MAGIC ## Step 1: Configuration

# COMMAND ----------

# 📌 PATH TO THE CLIENT REQUIREMENTS DOCUMENT
DOCUMENT_PATH = "/Volumes/<YOUR_CATALOG>/<YOUR_SCHEMA>/<YOUR_VOLUME>/requirements.pdf"

# 📌 LLM for extracting requirements
LLM_ENDPOINT = "databricks-claude-haiku-4-5"

# COMMAND ----------

# MAGIC %md
# MAGIC ## Step 2: Parse the PDF

# COMMAND ----------

import os

file_ext = os.path.splitext(DOCUMENT_PATH)[1].lower()
print(f"Parsing: {DOCUMENT_PATH}")

if file_ext == ".txt":
    with open(DOCUMENT_PATH, "r") as f:
        doc_text = f.read()
elif file_ext in (".pdf", ".docx", ".doc", ".pptx", ".ppt"):
    doc_text = spark.sql(f"""
        SELECT concat_ws('\\n\\n', 
               transform(
                   try_cast(ai_parse_document(content):document:elements AS ARRAY<VARIANT>),
                   element -> try_cast(element:content AS STRING)
               )
            ) as text
        FROM read_files('{DOCUMENT_PATH}', format => 'binaryFile')
    """).collect()[0][0]
else:
    raise ValueError(f"Unsupported: {file_ext}")

print(f"✅ Parsed: {len(doc_text)} characters")
print(f"\n--- Preview (first 500 chars) ---\n{doc_text[:500]}")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Step 3: Extract Requirements with LLM

# COMMAND ----------

# MAGIC %pip install -U -qqqq databricks-langchain langchain-core
# MAGIC dbutils.library.restartPython()

# COMMAND ----------

# Re-run parsing after Python restart
import os
DOCUMENT_PATH = "/Volumes/<YOUR_CATALOG>/<YOUR_SCHEMA>/<YOUR_VOLUME>/requirements.pdf"
LLM_ENDPOINT = "databricks-claude-haiku-4-5"

file_ext = os.path.splitext(DOCUMENT_PATH)[1].lower()
if file_ext == ".txt":
    with open(DOCUMENT_PATH, "r") as f:
        doc_text = f.read()
else:
    doc_text = spark.sql(f"""
        SELECT concat_ws('\\n\\n', 
               transform(
                   try_cast(ai_parse_document(content):document:elements AS ARRAY<VARIANT>),
                   element -> try_cast(element:content AS STRING)
               )
            ) as text
        FROM read_files('{DOCUMENT_PATH}', format => 'binaryFile')
    """).collect()[0][0]

print(f"✅ Parsed: {len(doc_text)} characters")

# COMMAND ----------

from databricks_langchain import ChatDatabricks
from langchain_core.messages import HumanMessage

llm = ChatDatabricks(endpoint=LLM_ENDPOINT, temperature=0)

extract_response = llm.invoke([HumanMessage(content=f"""Extract all requirements from this client document. 
Be thorough — include technical specs, compliance items, and performance criteria.

For each requirement, output one line:
REQ-001 | Short description | Full requirement text

DOCUMENT:
{doc_text}""")])

requirements_text = extract_response.content
print(requirements_text)

# COMMAND ----------

# MAGIC %md
# MAGIC ## Step 4: Generate the KA Prompt
# MAGIC
# MAGIC Copy the output below and paste it into the **Knowledge Assistant** in the app.

# COMMAND ----------

ka_prompt_detailed = f"""I have a new client requirements document. For each requirement below, search our knowledge base and tell me:

1. **Which internal products/documents match** this requirement
2. **Status**: ✅ MET (we have a product that covers it), ⚠️ PARTIAL (partly covered), or ❌ GAP (nothing matches)
3. **Specific details** from our documentation (coverage rates, protection duration, temperature ranges, etc.)
4. **Gap description** if not fully met

Format your response as a table:
| Req ID | Requirement | Matching Product/Doc | Status | Details | Gap |

Here are the requirements:

{requirements_text}

After the table, provide:
- A summary of how many requirements are MET, PARTIAL, and GAP
- The top 3 critical gaps that need immediate attention
- Recommended next steps"""

ka_prompt_simple = f"""A client sent new requirements. Search our knowledge base and tell me which of our internal documents need to be updated or created to meet these requirements.

Only list documents that need changes. For each one, tell me what to change.

Format:
| Document | Change Required |

Requirements:

{requirements_text}"""

print("=" * 60)
print("OPTION 1: DETAILED — Full impact analysis with status & gaps")
print("=" * 60)
print()
print(ka_prompt_detailed)
print()
print()
print("=" * 60)
print("OPTION 2: SIMPLE — Just the documents to change")
print("=" * 60)
print()
print(ka_prompt_simple)

# COMMAND ----------

# MAGIC %md
# MAGIC ## Step 5: (Optional) Save prompt to a file

# COMMAND ----------

# Save both prompts to a volume
base_path = DOCUMENT_PATH.rsplit("/", 1)[0]

with open(base_path + "/ka_prompt_detailed.txt", "w") as f:
    f.write(ka_prompt_detailed)
print(f"✅ Detailed prompt saved to: {base_path}/ka_prompt_detailed.txt")

with open(base_path + "/ka_prompt_simple.txt", "w") as f:
    f.write(ka_prompt_simple)
print(f"✅ Simple prompt saved to: {base_path}/ka_prompt_simple.txt")