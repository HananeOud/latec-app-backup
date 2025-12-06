#!/usr/bin/env python
"""Check where client_request_id is stored after mlflow.update_current_trace().

This investigates whether it's in tags, attributes, request_metadata, or elsewhere.
"""

import json
from dotenv import load_dotenv
import mlflow
from mlflow import MlflowClient

load_dotenv('.env.local')

mlflow.set_tracking_uri('databricks')
client = MlflowClient()

# Load agent config
with open('config/agents.json', 'r') as f:
  agents = json.load(f)['agents']

experiment_id = agents[0]['mlflow_experiment_id']

print('=' * 80)
print('Investigating client_request_id Storage Location')
print('=' * 80)

# Get the most recent trace (should have our client_request_id)
print('\n1️⃣ Fetching most recent trace...')
traces = client.search_traces(
  experiment_ids=[experiment_id], max_results=1, order_by=['timestamp_ms DESC']
)

if not traces:
  print('❌ No traces found')
  exit(1)

trace = traces[0]
trace_id = trace.info.trace_id

print(f'   Trace ID: {trace_id}')
print(f'   Request ID: {trace.info.request_id}')

# Get full trace details
print('\n2️⃣ Checking trace structure...')
trace_detail = client.get_trace(trace_id)

# Check tags
print('\n📌 Tags:')
if hasattr(trace_detail.info, 'tags'):
  for key, value in trace_detail.info.tags.items():
    if 'client' in key.lower() or 'request' in key.lower():
      print(f'   ✅ {key}: {value}')
    else:
      print(f'   {key}: {value[:50] if len(str(value)) > 50 else value}')
else:
  print('   No tags attribute')

# Check request_metadata
print('\n📦 Request Metadata:')
if hasattr(trace.info, 'request_metadata'):
  print(f'   Type: {type(trace.info.request_metadata)}')
  if trace.info.request_metadata:
    for key, value in trace.info.request_metadata.items():
      if 'client' in key.lower() or 'request' in key.lower():
        print(f'   ✅ {key}: {value}')
      else:
        print(f'   {key}: {str(value)[:80]}...')
else:
  print('   No request_metadata attribute')

# Check trace data attributes
print('\n🔍 Trace Data:')
if hasattr(trace_detail, 'data'):
  print(f'   Data type: {type(trace_detail.data)}')
  print(f'   Data attributes: {dir(trace_detail.data)}')

# Try different search approaches
print('\n3️⃣ Testing different search filters...')

test_filters = [
  "attributes.client_request_id = 'req-test'",
  "tags.client_request_id = 'req-test'",
  "request_metadata.client_request_id = 'req-test'",
  "client_request_id = 'req-test'",
]

for filter_str in test_filters:
  try:
    print(f'\n   Testing: {filter_str}')
    result = client.search_traces(
      experiment_ids=[experiment_id], filter_string=filter_str, max_results=1
    )
    print(f'   ✅ Filter works! Found {len(result)} traces')
  except Exception as e:
    error_msg = str(e)
    if 'Invalid attribute column' in error_msg:
      print(f'   ❌ Invalid column')
    else:
      print(f'   ❌ Error: {error_msg[:100]}')

print('\n' + '=' * 80)
print('Investigation Complete')
print('=' * 80)

print(
  """
📋 Summary:
-----------
Check the output above to see where client_request_id is stored.

Possible locations:
- Tags: trace_detail.info.tags['client_request_id']
- Request metadata: trace.info.request_metadata['client_request_id']
- Attributes: (somewhere in trace data)

If it's in tags, we can search by: tags.client_request_id
If it's in request_metadata, we may need a different approach
If it's nowhere, mlflow.update_current_trace() didn't work
"""
)
