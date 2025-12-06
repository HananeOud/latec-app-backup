#!/usr/bin/env python
"""End-to-end test of the feedback flow."""

import json
import time
import requests
from dotenv import load_dotenv
import mlflow
from mlflow import MlflowClient

load_dotenv('.env.local')

mlflow.set_tracking_uri('databricks')
client = MlflowClient()

# Load agent config
with open('config/agents.json', 'r') as f:
  agents = json.load(f)['agents']

agent = agents[0]
agent_id = agent['id']
experiment_id = agent['mlflow_experiment_id']

print('=' * 80)
print('END-TO-END FEEDBACK FLOW TEST')
print('=' * 80)
print(f'\nAgent: {agent_id}')
print(f'Experiment ID: {experiment_id}')

# Step 1: Invoke agent
print('\n📡 Step 1: Invoking agent...')
invoke_response = requests.post(
  'http://localhost:8000/api/invoke_endpoint',
  json={
    'agent_id': agent_id,
    'messages': [{'role': 'user', 'content': 'What is Databricks?'}],
    'stream': False,
  },
)

if invoke_response.status_code != 200:
  print(f'❌ Agent invocation failed: {invoke_response.status_code}')
  print(invoke_response.text)
  exit(1)

result = invoke_response.json()
print(f'✅ Agent responded')
print(f'   Response preview: {str(result)[:150]}...')

# Step 2: Wait for traces to export
print('\n⏳ Step 2: Waiting 5 seconds for traces to export...')
time.sleep(5)

# Step 3: Find the client_request_id from backend logs
# In real flow, frontend gets this from the SSE stream
# For testing, we'll search for the most recent trace with our tag pattern

print('\n🔍 Step 3: Finding most recent client_request_id...')
# Get recent traces and filter for those with our tag
recent_traces = client.search_traces(
  experiment_ids=[experiment_id],
  max_results=10,
  order_by=['timestamp_ms DESC'],
)

# Filter for traces with client_request_id tag
traces_with_tag = []
for trace in recent_traces:
  if hasattr(trace.info, 'tags') and trace.info.tags.get('client_request_id'):
    traces_with_tag.append(trace)

recent_traces = traces_with_tag[:1] if traces_with_tag else []

if not recent_traces:
  print('❌ No traces with client_request_id found')
  exit(1)

client_request_id = recent_traces[0].info.tags.get('client_request_id')
router_trace_id = recent_traces[0].info.trace_id
print(f'✅ Found router trace: {router_trace_id}')
print(f'   client_request_id: {client_request_id}')

# Step 4: Submit feedback
print('\n📝 Step 4: Submitting thumbs up feedback...')
feedback_response = requests.post(
  'http://localhost:8000/api/log_assessment',
  json={
    'trace_id': client_request_id,  # This is the client_request_id, not MLflow trace ID
    'agent_id': agent_id,
    'assessment_name': 'user_feedback',
    'assessment_value': True,  # Thumbs up
    'rationale': 'Great response! Very helpful.',
    'source_id': 'test-user',
  },
)

if feedback_response.status_code != 200:
  print(f'❌ Feedback submission failed: {feedback_response.status_code}')
  print(feedback_response.text)
  exit(1)

feedback_result = feedback_response.json()
mlflow_trace_id = feedback_result.get('mlflow_trace_id')
print(f'✅ Feedback logged successfully')
print(f'   MLflow trace ID: {mlflow_trace_id}')

# Step 5: Verify feedback was logged to the AGENT trace (not router trace)
print('\n🔍 Step 5: Verifying feedback location...')

# Check if it's the router trace or agent trace
if mlflow_trace_id == router_trace_id:
  print(f'⚠️  Feedback logged to ROUTER trace (fallback behavior)')
  print(f'   This means no agent trace was found in the time window')
  print(f'   Router trace ID: {router_trace_id}')
else:
  print(f'✅ Feedback logged to AGENT trace (correct!)')
  print(f'   Router trace ID: {router_trace_id}')
  print(f'   Agent trace ID: {mlflow_trace_id}')

# Get the trace with feedback
trace_with_feedback = client.get_trace(mlflow_trace_id)

# Check for feedback (assessments)
if hasattr(trace_with_feedback.info, 'assessments') and trace_with_feedback.info.assessments:
  print(f'\n📊 Feedback details:')
  for assessment in trace_with_feedback.info.assessments:
    print(f'   Assessment: {assessment.name} = {assessment.value}')
    if hasattr(assessment, 'rationale') and assessment.rationale:
      print(f'   Rationale: {assessment.rationale}')
    print(f'   Source: {assessment.source.source_type}')
else:
  print(f'\n⚠️  No assessments found on trace (may take a moment to appear)')

# Check trace content
num_spans = len(trace_with_feedback.data.spans) if hasattr(trace_with_feedback.data, 'spans') and trace_with_feedback.data.spans else 0
print(f'\n📋 Trace details:')
print(f'   Number of spans: {num_spans}')
print(f'   Has content: {"✅ Yes" if num_spans > 1 else "⚠️  Minimal (router trace)"}')

# Final verdict
print('\n' + '=' * 80)
print('TEST SUMMARY')
print('=' * 80)

if mlflow_trace_id != router_trace_id and num_spans > 1:
  print('✅ SUCCESS! Feedback was logged to the agent trace with conversation content')
elif mlflow_trace_id == router_trace_id:
  print('⚠️  FALLBACK: Feedback was logged to router trace (agent trace not found)')
  print('   This is acceptable fallback behavior, but check timing/clock sync')
else:
  print('❌ UNEXPECTED: Feedback logged but trace structure is unusual')

print('=' * 80)
