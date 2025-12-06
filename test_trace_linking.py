#!/usr/bin/env python
"""Find the agent trace that corresponds to a wrapper trace."""

import json
from datetime import datetime, timedelta
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

# Pick a wrapper trace with client_request_id
wrapper_trace_id = 'tr-04a60f749dcd8a5c89968b8db04f13ef'
wrapper_trace = client.get_trace(wrapper_trace_id)
wrapper_time = datetime.fromtimestamp(wrapper_trace.info.timestamp_ms / 1000)
client_req_id = wrapper_trace.info.tags.get('client_request_id')

print('=' * 80)
print(f'Finding Agent Trace for Wrapper Trace')
print('=' * 80)
print(f'\n🏷️  Wrapper Trace: {wrapper_trace_id}')
print(f'   client_request_id: {client_req_id}')
print(f'   Timestamp: {wrapper_time}')
print(f'   Name: {wrapper_trace.info.tags.get("mlflow.traceName")}')

# Search for traces within 2 seconds of this wrapper trace
time_window_start = wrapper_time - timedelta(seconds=2)
time_window_end = wrapper_time + timedelta(seconds=2)

print(f'\n🔍 Searching for agent traces within 2 seconds...')
print(f'   Time window: {time_window_start} to {time_window_end}')

all_traces = client.search_traces(
  experiment_ids=[experiment_id], max_results=50, order_by=['timestamp_ms DESC']
)

candidates = []
for trace in all_traces:
  trace_detail = client.get_trace(trace.info.trace_id)
  trace_time = datetime.fromtimestamp(trace.info.timestamp_ms / 1000)

  # Check if within time window
  if time_window_start <= trace_time <= time_window_end:
    # Check if it has client_request_id (skip wrapper traces)
    has_client_id = False
    if hasattr(trace_detail.info, 'tags'):
      has_client_id = bool(trace_detail.info.tags.get('client_request_id'))

    # Check if it has content
    has_content = False
    if hasattr(trace_detail.data, 'spans') and trace_detail.data.spans:
      for span in trace_detail.data.spans:
        if (hasattr(span, 'inputs') and span.inputs) or (hasattr(span, 'outputs') and span.outputs):
          has_content = True
          break

    trace_name = trace_detail.info.tags.get('mlflow.traceName', 'Unknown') if hasattr(trace_detail.info, 'tags') else 'Unknown'

    if not has_client_id and has_content:
      time_diff = (trace_time - wrapper_time).total_seconds()
      candidates.append({
        'trace_id': trace.info.trace_id,
        'name': trace_name,
        'time': trace_time,
        'time_diff': time_diff,
        'has_content': has_content,
      })

if candidates:
  print(f'\n✅ Found {len(candidates)} candidate agent trace(s):\n')
  for i, candidate in enumerate(sorted(candidates, key=lambda x: abs(x['time_diff']))):
    print(f'{i+1}. Trace ID: {candidate["trace_id"]}')
    print(f'   Name: {candidate["name"]}')
    print(f'   Time: {candidate["time"]}')
    print(f'   Time difference: {candidate["time_diff"]:.3f}s')
    print()

  # The closest one is likely the agent's trace
  closest = sorted(candidates, key=lambda x: abs(x['time_diff']))[0]
  print(f'🎯 Most likely agent trace: {closest["trace_id"]}')
  print(f'   Time offset: {closest["time_diff"]:.3f}s from wrapper trace')
else:
  print('\n❌ No candidate agent traces found')

print('\n' + '=' * 80)
