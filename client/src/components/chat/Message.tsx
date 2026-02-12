
import { useState } from "react";
import {
  ThumbsUp,
  ThumbsDown,
  Search,
  Clock,
  Zap,
  Wrench,
  Database,
  AlertCircle,
  Eye,
  EyeOff,
} from "lucide-react";
import { Message as MessageType } from "@/lib/types";
import { ChartRenderer } from "./ChartRenderer";
import { formatDistanceToNow } from "date-fns";
import { MarkdownRenderer } from "@/components/shared/MarkdownRenderer";
import { Button } from "@/components/ui/button";

interface MessageProps {
  message: MessageType;
  onFeedback: (messageId: string, type: "positive" | "negative") => void;
  onViewTrace: (messageId: string) => void;
  compact?: boolean;
}

export function Message({ message, onFeedback, onViewTrace, compact = false }: MessageProps) {
  const isUser = message.role === "user";
  const isError = message.isError === true;
  const [visualizationsVisible, setVisualizationsVisible] = useState(true);

  return (
    <div
      className={`flex ${isUser ? "justify-end" : "justify-start"} animate-in fade-in-0 slide-in-from-bottom-2 duration-300`}
    >
      {/* Message Content */}
      <div
        className={`min-w-0 ${isUser ? "items-end" : "items-start"}`}
        style={{ maxWidth: compact ? "85%" : isUser ? "75%" : "100%" }}
      >
        <div
          className={`
            rounded-2xl px-4 py-3 transition-all duration-300 backdrop-blur-sm
            ${
              isUser
                ? "bg-[var(--color-accent-primary)] text-white shadow-lg hover:shadow-xl"
                : isError
                  ? "bg-[var(--color-error)]/5 border border-[var(--color-error)]/30 shadow-sm"
                  : "bg-[var(--color-background)]/80 border border-[var(--color-border)]/30 shadow-sm hover:shadow-md"
            }
          `}
        >
          {isUser ? (
            <p
              className="whitespace-pre-wrap break-words text-[0.9375rem] leading-relaxed text-white tracking-[-0.01em]"
              style={{ fontFamily: "var(--font-body)" }}
            >
              {message.content}
            </p>
          ) : isError ? (
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-[var(--color-error)] flex-shrink-0 mt-0.5" />
              <p
                className="whitespace-pre-wrap break-words text-[0.875rem] leading-relaxed text-[var(--color-error)]"
                style={{ fontFamily: "var(--font-body)" }}
              >
                {message.content}
              </p>
            </div>
          ) : (
            <MarkdownRenderer content={message.content} />
          )}

          {/* Visualizations */}
          {message.visualizations && message.visualizations.length > 0 && (
            <div className="mt-4 space-y-3">
              {/* Toggle Button */}
              <button
                onClick={() => setVisualizationsVisible(!visualizationsVisible)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--color-muted)]/50 hover:bg-[var(--color-muted)] border border-[var(--color-border)]/40 hover:border-[var(--color-border)] transition-all duration-200 text-sm text-[var(--color-text-primary)] hover:text-[var(--color-accent-primary)] group"
                title={visualizationsVisible ? "Hide visualizations" : "Show visualizations"}
              >
                {visualizationsVisible ? (
                  <EyeOff className="h-3.5 w-3.5 transition-transform group-hover:scale-110" />
                ) : (
                  <Eye className="h-3.5 w-3.5 transition-transform group-hover:scale-110" />
                )}
                <span className="font-medium">
                  {visualizationsVisible ? "Hide" : "Show"} {message.visualizations.length > 1 ? "Charts" : "Chart"}
                </span>
              </button>

              {/* Charts */}
              {visualizationsVisible && (
                <div className="space-y-4 animate-in fade-in-0 slide-in-from-top-2 duration-300">
                  {message.visualizations.map((viz, index) => (
                    <ChartRenderer key={index} visualization={viz} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Timestamp */}
        <div
          className={`mt-1.5 text-[0.6875rem] text-[var(--color-text-muted)] tracking-wide ${isUser ? "text-right" : "text-left"}`}
          style={{ fontFamily: "var(--font-body)", fontWeight: 400 }}
        >
          {formatDistanceToNow(message.timestamp, { addSuffix: true })}
        </div>

        {/* Trace Summary (for assistant messages with trace data, not for errors) */}
        {!isUser && !isError && message.traceSummary && (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-[0.6875rem]" style={{ fontFamily: "var(--font-body)" }}>
            {message.traceSummary.duration_ms > 0 && (
              <div
                className="flex items-center gap-1 px-2 py-1 rounded-md bg-[var(--color-muted)] text-[var(--color-text-muted)]"
                title="Total execution time"
              >
                <Clock className="h-3 w-3" />
                <span>
                  {(message.traceSummary.duration_ms / 1000).toFixed(2)}s
                </span>
              </div>
            )}
            {message.traceSummary.total_tokens > 0 && (
              <div
                className="flex items-center gap-1 px-2 py-1 rounded-md bg-[var(--color-muted)] text-[var(--color-text-muted)]"
                title="Total tokens used"
              >
                <Zap className="h-3 w-3" />
                <span>
                  {message.traceSummary.total_tokens.toLocaleString()} tokens
                </span>
              </div>
            )}
            {message.traceSummary.tools_called?.length > 0 && (
              <button
                onClick={() => onViewTrace(message.id)}
                className="flex items-center gap-1 px-2 py-1 rounded-md bg-[var(--color-muted)] text-[var(--color-text-muted)] hover:bg-[var(--color-accent-primary)]/10 hover:text-[var(--color-accent-primary)] transition-colors cursor-pointer"
                title={`Click to view details: ${message.traceSummary.tools_called.map((t) => t.name).join(", ")}`}
              >
                <Wrench className="h-3 w-3" />
                <span>
                  {message.traceSummary.tools_called.length} tool
                  {message.traceSummary.tools_called.length !== 1 ? "s" : ""}
                </span>
              </button>
            )}
            {message.traceSummary.retrieval_calls?.length > 0 && (
              <div
                className="flex items-center gap-1 px-2 py-1 rounded-md bg-[var(--color-muted)] text-[var(--color-text-muted)]"
                title="Document retrievals"
              >
                <Database className="h-3 w-3" />
                <span>
                  {message.traceSummary.retrieval_calls.reduce(
                    (sum, r) => sum + (r.num_documents || 0),
                    0,
                  )}{" "}
                  docs
                </span>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons (for assistant messages, not for errors, and not while streaming) */}
        {!isUser && !isError && !message.isStreaming && (
          <div className="flex items-center gap-2 mt-2">
            {/* Feedback buttons - only show if we have a trace_id (required for MLflow feedback) */}
            {message.traceId && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onFeedback(message.id, "positive")}
                  className="h-7 w-7 rounded-full hover:bg-[var(--color-success)]/10 hover:text-[var(--color-success)] hover:scale-110 transition-all duration-200"
                  title="Helpful response"
                >
                  <ThumbsUp className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onFeedback(message.id, "negative")}
                  className="h-7 w-7 rounded-full hover:bg-[var(--color-error)]/10 hover:text-[var(--color-error)] hover:scale-110 transition-all duration-200"
                  title="Not helpful"
                >
                  <ThumbsDown className="h-3.5 w-3.5" />
                </Button>
              </>
            )}
            {/* Trace view button - show if we have trace_id or tools were called */}
            {(message.traceId || (message.traceSummary?.tools_called?.length ?? 0) > 0) && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onViewTrace(message.id)}
                className="h-7 w-7 rounded-full hover:bg-[var(--color-info)]/10 hover:text-[var(--color-info)] hover:scale-110 transition-all duration-200"
                title="View detailed trace"
              >
                <Search className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
