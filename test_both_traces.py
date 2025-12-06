#!/usr/bin/env python
"""Compare the two types of traces."""

import json
from datetime import datetime
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

# Get traces around the same time
traces = client.search_traces(
  experiment_ids=[experiment_id], max_results=20, order_by=['timestamp_ms DESC']
)

print('=' * 80)
print('Comparing Trace Pairs')
print('=' * 80)

# Group traces by proximity (within 1 second)
for i, trace in enumerate(traces):
  trace_detail = client.get_trace(trace.info.trace_id)

  # Check if it has client_request_id
  has_client_id = False
  client_req_id = None
  if hasattr(trace_detail.info, 'tags'):
    client_req_id = trace_detail.info.tags.get('client_request_id')
    has_client_id = bool(client_req_id)

  timestamp = datetime.fromtimestamp(trace.info.timestamp_ms / 1000)

  # Get trace name
  trace_name = trace_detail.info.tags.get('mlflow.traceName', 'Unknown') if hasattr(trace_detail.info, 'tags') else 'Unknown'

  # Check if trace has content
  has_content = False
  if hasattr(trace_detail.data, 'spans') and trace_detail.data.spans:
    for span in trace_detail.data.spans:
      if hasattr(span, 'inputs') and span.inputs:
        has_content = True
        break
      if hasattr(span, 'outputs') and span.outputs:
        has_content = True
        break

  marker = '🏷️' if has_client_id else '📋'
  content_marker = '✅' if has_content else '❌'

  print(f'\n{marker} Trace {i+1}: {trace.info.trace_id}')
  print(f'   Name: {trace_name}')
  print(f'   Timestamp: {timestamp}')
  print(f'   client_request_id: {client_req_id or "NONE"}')
  print(f'   Has content: {content_marker}')

print('\n' + '=' * 80)
