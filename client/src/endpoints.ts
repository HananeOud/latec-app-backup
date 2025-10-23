export interface Endpoint {
  displayName: string;
  // Model serving endpoint name.
  endpointName: string;
  // Endpoint type: "openai-chat" for OpenAI-compatible, "databricks-agent" for agent endpoints
  type: "openai-chat" | "databricks-agent";
}

export const ENDPOINTS: Endpoint[] = [
  {
    displayName: "Sonnet 4",
    endpointName: "databricks-claude-sonnet-4",
    type: "openai-chat",
  },
  {
    displayName: "Llama 4 Maverick",
    endpointName: "databricks-llama-4-maverick",
    type: "openai-chat",
  },
  {
    displayName: "mas_mehdi_genai_demo",
    endpointName: "mas-5981db7c-endpoint",
    type: "databricks-agent",
  },
];
