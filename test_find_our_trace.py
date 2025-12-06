#!/usr/bin/env python
"""Find our endpoint trace."""

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

print('=' * 80)
print('Finding Recent Traces')
print('=' * 80)

# Get the 10 most recent traces
traces = client.search_traces(
  experiment_ids=[experiment_id], max_results=10, order_by=['timestamp_ms DESC']
)

print(f'\nFound {len(traces)} recent traces:\n')

for i, trace in enumerate(traces):
  trace_id = trace.info.trace_id
  timestamp = datetime.fromtimestamp(trace.info.timestamp_ms / 1000)

  # Get full trace details
  trace_detail = client.get_trace(trace_id)

  # Check for client_request_id in tags
  client_req_id = None
  if hasattr(trace_detail.info, 'tags'):
    client_req_id = trace_detail.info.tags.get('client_request_id')

  print(f'{i+1}. Trace ID: {trace_id}')
  print(f'   Timestamp: {timestamp}')
  print(f'   client_request_id: {client_req_id or "NOT FOUND"}')

  # Check request_metadata too
  if hasattr(trace.info, 'request_metadata') and trace.info.request_metadata:
    req_meta_id = trace.info.request_metadata.get('client_request_id')
    if req_meta_id:
      print(f'   (Also in request_metadata: {req_meta_id})')

  print()

print('=' * 80)
