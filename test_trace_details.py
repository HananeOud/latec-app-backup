#!/usr/bin/env python
"""Examine trace details to understand the structure."""

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

# Get a trace WITH client_request_id
trace_id = 'tr-04a60f749dcd8a5c89968b8db04f13ef'  # Has client_request_id from previous output

print('=' * 80)
print(f'Examining trace: {trace_id}')
print('=' * 80)

trace = client.get_trace(trace_id)

print('\n📋 Trace Info:')
print(f'  Trace ID: {trace.info.trace_id}')
print(f'  Request ID: {trace.info.request_id}')
print(f'  Status: {trace.info.status}')

print('\n🏷️  Tags:')
if hasattr(trace.info, 'tags') and trace.info.tags:
  for key, value in trace.info.tags.items():
    print(f'  {key}: {value}')
else:
  print('  No tags')

print('\n📦 Request Metadata:')
if hasattr(trace.info, 'request_metadata') and trace.info.request_metadata:
  for key, value in trace.info.request_metadata.items():
    print(f'  {key}: {value}')
else:
  print('  No request_metadata')

print('\n🌲 Spans:')
if hasattr(trace.data, 'spans') and trace.data.spans:
  for span in trace.data.spans:
    print(f'\n  Span: {span.name}')
    print(f'    Span ID: {span.span_id}')
    print(f'    Parent ID: {span.parent_id}')
    print(f'    Status: {span.status}')

    # Check span inputs/outputs
    if hasattr(span, 'inputs'):
      print(f'    Inputs: {str(span.inputs)[:200]}...')
    if hasattr(span, 'outputs'):
      print(f'    Outputs: {str(span.outputs)[:200]}...')
else:
  print('  No spans')

print('\n' + '=' * 80)
