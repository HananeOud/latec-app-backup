#!/usr/bin/env python
"""Test searching for trace by client_request_id."""

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

# The client_request_id we just created
test_client_request_id = 'req-53367525ba8f4ab5'

print('=' * 80)
print(f'Testing Search for client_request_id: {test_client_request_id}')
print('=' * 80)

# Try searching by attributes.client_request_id
print('\n🔍 Searching by attributes.client_request_id...')
try:
  traces = client.search_traces(
    experiment_ids=[experiment_id],
    filter_string=f"attributes.client_request_id = '{test_client_request_id}'",
    max_results=5,
  )
  print(f'✅ Found {len(traces)} trace(s)')
  for trace in traces:
    print(f'   - Trace ID: {trace.info.trace_id}')
    print(f'   - Request ID: {trace.info.request_id}')
except Exception as e:
  print(f'❌ Error: {str(e)}')

# Try searching by tags.client_request_id
print('\n🔍 Searching by tags.client_request_id...')
try:
  traces = client.search_traces(
    experiment_ids=[experiment_id],
    filter_string=f"tags.client_request_id = '{test_client_request_id}'",
    max_results=5,
  )
  print(f'✅ Found {len(traces)} trace(s)')
  for trace in traces:
    print(f'   - Trace ID: {trace.info.trace_id}')
    print(f'   - Request ID: {trace.info.request_id}')
except Exception as e:
  print(f'❌ Error: {str(e)}')

# Try searching by request_metadata.client_request_id
print('\n🔍 Searching by request_metadata.client_request_id...')
try:
  traces = client.search_traces(
    experiment_ids=[experiment_id],
    filter_string=f"request_metadata.client_request_id = '{test_client_request_id}'",
    max_results=5,
  )
  print(f'✅ Found {len(traces)} trace(s)')
  for trace in traces:
    print(f'   - Trace ID: {trace.info.trace_id}')
    print(f'   - Request ID: {trace.info.request_id}')
except Exception as e:
  print(f'❌ Error: {str(e)}')

# Get most recent trace and check its structure
print('\n🔍 Checking most recent trace structure...')
traces = client.search_traces(
  experiment_ids=[experiment_id], max_results=1, order_by=['timestamp_ms DESC']
)

if traces:
  trace = traces[0]
  trace_id = trace.info.trace_id
  print(f'\n   Most recent trace ID: {trace_id}')

  # Get full trace details
  trace_detail = client.get_trace(trace_id)

  # Check tags
  print('\n   📌 Tags:')
  if hasattr(trace_detail.info, 'tags'):
    for key, value in trace_detail.info.tags.items():
      if 'client' in key.lower() or 'request' in key.lower():
        print(f'      ✅ {key}: {value}')

  # Check request_metadata
  print('\n   📦 Request Metadata:')
  if hasattr(trace.info, 'request_metadata') and trace.info.request_metadata:
    for key, value in trace.info.request_metadata.items():
      if 'client' in key.lower() or 'request' in key.lower():
        print(f'      ✅ {key}: {value}')

print('\n' + '=' * 80)
print('Search Test Complete')
print('=' * 80)
