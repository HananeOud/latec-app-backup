import React from "react";
import { Link } from "react-router-dom";
import { Loader2, AlertCircle, BarChart3, MessageSquare } from "lucide-react";
import { useAppConfig } from "@/contexts/AppConfigContext";
import { useAgentsContext } from "@/contexts/AgentsContext";
import { ChatWidget } from "@/components/chat/ChatWidget";
import { Button } from "@/components/ui/button";

export function HomeView() {
  const { config, isLoading } = useAppConfig();
  const { agents, agentErrors, loading: agentsLoading, error: globalError } = useAgentsContext();

  const noAgentsConfigured = !agentsLoading && agents.length === 0 && !globalError;

  if (isLoading || !config) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-[var(--color-text-muted)]">Loading...</div>
      </div>
    );
  }

  const { home } = config;
  const appName = (config as any).app_name;
  const isDefaultAppName = appName === "databricks-app-template";
  const isDefaultConfig = home.title === "Databricks App Template";

  return (
    <>
      <div className="h-full flex items-start pt-40 px-12">
        <div className="w-[70%] space-y-6">
          {/* Large title - reduced from 7xl to 5xl for better fit */}
          <h1 className="text-5xl font-bold text-[var(--color-text-heading)] leading-tight">
            {home.title}
          </h1>

          {/* Description - takes most of the width for long descriptions */}
          <p className="text-lg text-[var(--color-text-muted)] leading-relaxed w-full whitespace-pre-line">
            {home.description}
          </p>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-4 pt-4">
            <Button asChild size="lg">
              <Link to="/dashboard">
                <BarChart3 className="h-5 w-5" />
                Analyze the business
              </Link>
            </Button>
            <Button asChild variant="secondary" size="lg">
              <Link to="/chat">
                <MessageSquare className="h-5 w-5" />
                Ask the AI what happened
              </Link>
            </Button>
          </div>

          {/* Agent status: loading */}
          {agentsLoading && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)]">
              <Loader2 className="h-5 w-5 text-[var(--color-accent-primary)] animate-spin" />
              <span className="text-[var(--color-text-muted)]">Checking endpoint configuration...</span>
            </div>
          )}

          {/* Agent status: global error */}
          {!agentsLoading && globalError && (
            <div className="p-4 rounded-2xl bg-[var(--color-error)]/5 border border-[var(--color-error)]/20 shadow-lg space-y-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-[var(--color-error)]" />
                <p className="text-lg font-medium text-[var(--color-error)]">Configuration Error</p>
              </div>
              <p className="text-sm text-[var(--color-error)]/80">{globalError.message}</p>
            </div>
          )}

          {/* Agent status: no agents configured */}
          {!agentsLoading && noAgentsConfigured && (
            <div className="p-4 rounded-2xl bg-[var(--color-error)]/5 border border-[var(--color-error)]/20 shadow-lg space-y-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-[var(--color-error)]" />
                <p className="text-lg font-medium text-[var(--color-error)]">No Agents Configured</p>
              </div>
              <p className="text-sm text-[var(--color-error)]/80">
                No agents are configured. Update{" "}
                <code className="px-2 py-0.5 bg-[var(--color-error)]/10 rounded text-xs font-mono text-[var(--color-error)]">
                  config/app.json
                </code>{" "}
                to add at least one agent with{" "}
                <code className="px-2 py-0.5 bg-[var(--color-error)]/10 rounded text-xs font-mono text-[var(--color-error)]">
                  endpoint_name
                </code>{" "}
                or{" "}
                <code className="px-2 py-0.5 bg-[var(--color-error)]/10 rounded text-xs font-mono text-[var(--color-error)]">
                  mas_id
                </code>.
              </p>
              <p className="text-xs text-[var(--color-error)]/70">
                You can use foundation models directly:{" "}
                <code className="px-1.5 py-0.5 bg-[var(--color-error)]/10 rounded font-mono">
                  {'"agents": [{"endpoint_name": "databricks-gpt-5-2"}]'}
                </code>
              </p>
            </div>
          )}

          {/* Agent status: agent-specific errors */}
          {!agentsLoading && agentErrors.length > 0 && (
            <div className="p-4 rounded-2xl bg-[var(--color-error)]/5 border border-[var(--color-error)]/20 shadow-lg space-y-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-[var(--color-error)]" />
                <p className="text-lg font-medium text-[var(--color-error)]">Agent Configuration Errors</p>
              </div>
              <ul className="space-y-3">
                {agentErrors.map((agent, idx) => (
                  <li key={idx} className="p-3 bg-[var(--color-error)]/10 rounded-lg">
                    <p className="text-sm font-medium text-[var(--color-error)]">
                      {agent.display_name || agent.endpoint_name || "Unknown agent"}
                    </p>
                    <p className="text-xs text-[var(--color-error)]/70 mt-1 font-mono">
                      {agent.error}
                    </p>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-[var(--color-error)]/80">
                Check your{" "}
                <code className="px-1.5 py-0.5 bg-[var(--color-error)]/10 rounded font-mono">config/app.json</code>{" "}
                and verify the endpoint names or MAS IDs are correct.
              </p>
            </div>
          )}

          {/* Config instructions - only show when using default config */}
          {isDefaultConfig && (
            <div className="p-5 rounded-2xl bg-[var(--color-bg-secondary)] backdrop-blur-xl border border-[var(--color-border)] shadow-lg space-y-3">
              <p className="text-base font-medium text-[var(--color-text-primary)]">To configure your project:</p>
              <ol className="list-decimal list-inside space-y-2 text-sm text-[var(--color-text-muted)]">
                <li>
                  Open{" "}
                  <code className="px-2.5 py-1 bg-[var(--color-accent-primary)]/10 backdrop-blur-sm rounded-lg text-sm font-mono text-[var(--color-accent-primary)] border border-[var(--color-accent-primary)]/20">
                    config/app.json
                  </code>
                </li>
                <li>
                  Configure your agent using{" "}
                  <code className="px-2.5 py-1 bg-[var(--color-accent-primary)]/10 backdrop-blur-sm rounded-lg text-sm font-mono text-[var(--color-accent-primary)] border border-[var(--color-accent-primary)]/20">
                    endpoint_name
                  </code>{" "}
                  (any serving endpoint) or{" "}
                  <code className="px-2.5 py-1 bg-[var(--color-accent-primary)]/10 backdrop-blur-sm rounded-lg text-sm font-mono text-[var(--color-accent-primary)] border border-[var(--color-accent-primary)]/20">
                    mas_id
                  </code>{" "}
                  (Multi-Agent Supervisor ID)
                </li>
                <li>
                  Customize{" "}
                  <code className="px-2.5 py-1 bg-[var(--color-accent-primary)]/10 backdrop-blur-sm rounded-lg text-sm font-mono text-[var(--color-accent-primary)] border border-[var(--color-accent-primary)]/20">
                    home
                  </code>
                  {" "}(this page) and{" "}
                  <code className="px-2.5 py-1 bg-[var(--color-accent-primary)]/10 backdrop-blur-sm rounded-lg text-sm font-mono text-[var(--color-accent-primary)] border border-[var(--color-accent-primary)]/20">
                    branding
                  </code>
                  {" "}(top menu)
                </li>
              </ol>
              <p className="text-sm text-[var(--color-text-muted)] mt-4">
                See{" "}
                <code className="px-2 py-0.5 bg-[var(--color-accent-primary)]/10 rounded text-xs font-mono text-[var(--color-accent-primary)]">
                  config/app.example.json
                </code>{" "}
                for all available options.
              </p>
            </div>
          )}

          {/* Tracker configuration - only show when using default app_name */}
          {isDefaultAppName && (
            <div className="p-4 rounded-2xl bg-[var(--color-warning)]/5 border border-[var(--color-warning)]/20 shadow-lg space-y-3">
              <p className="text-lg font-medium text-[var(--color-warning)]">Tracker Configuration</p>
              <p className="text-sm text-[var(--color-text-primary)]">
                To track your app usage, update{" "}
                <code className="px-2 py-0.5 bg-[var(--color-warning)]/10 rounded text-xs font-mono text-[var(--color-warning)]">
                  app_name
                </code>{" "}
                in{" "}
                <code className="px-2 py-0.5 bg-[var(--color-warning)]/10 rounded text-xs font-mono text-[var(--color-warning)]">
                  config/app.json
                </code>{" "}
                to match your repository name for easy reconciliation.
              </p>
              <ul className="text-sm text-[var(--color-text-muted)] space-y-2 list-disc list-inside">
                <li>
                  Set{" "}
                  <code className="px-2 py-0.5 bg-[var(--color-warning)]/10 rounded text-xs font-mono">enable_tracker</code>
                  {" "}to{" "}
                  <code className="px-2 py-0.5 bg-[var(--color-warning)]/10 rounded text-xs font-mono">true</code>
                  {" "}or{" "}
                  <code className="px-2 py-0.5 bg-[var(--color-warning)]/10 rounded text-xs font-mono">false</code>
                </li>
                <li>
                  Optionally set{" "}
                  <code className="px-2 py-0.5 bg-[var(--color-warning)]/10 rounded text-xs font-mono">demo_catalog_id</code>
                  {" "}if your demo is in the Demo Catalog
                </li>
              </ul>
              <p className="text-xs text-[var(--color-text-muted)]">
                Usage is tracked and anonymized at team level. See{" "}
                <a
                  href="https://pypi.org/project/dbdemos-tracker/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:opacity-80"
                >
                  dbdemos-tracker
                </a>{" "}
                for details.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Chat Widget */}
      <ChatWidget />
    </>
  );
}
