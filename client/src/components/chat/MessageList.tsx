
import React from "react";
import { Message } from "./Message";
import { Message as MessageType } from "@/lib/types";
import { Loader2 } from "lucide-react";
import { useAgents } from "@/hooks/useAgents";

interface MessageListProps {
  messages: MessageType[];
  isLoading: boolean;
  onFeedback: (messageId: string, type: "positive" | "negative") => void;
  onViewTrace: (messageId: string) => void;
  selectedAgentId?: string;
  compact?: boolean;
}

export function MessageList({
  messages,
  isLoading,
  onFeedback,
  onViewTrace,
  selectedAgentId,
  compact = false,
}: MessageListProps) {
  const { getAgentById } = useAgents();
  const agent = selectedAgentId ? getAgentById(selectedAgentId) : null;

  if (messages.length === 0 && !isLoading) {
    return (
      <div className={`flex flex-col items-center justify-center h-full text-center ${compact ? "p-4" : "p-8"}`}>
        <div className={compact ? "max-w-sm" : "max-w-lg"}>
          <h2
            className={`mb-3 text-[var(--color-text-heading)] tracking-[-0.03em] leading-tight ${compact ? "text-xl font-semibold" : "text-3xl font-bold"}`}
            style={{ fontFamily: "var(--font-heading)" }}
          >
            {agent?.chat_title || "AI Assistant"}
          </h2>
          <p
            className={`text-[var(--color-text-muted)] leading-relaxed ${compact ? "text-sm" : "text-[0.9375rem]"}`}
            style={{ fontFamily: "var(--font-body)", fontWeight: 400 }}
          >
            {agent?.chat_subtitle ||
              "Start a conversation with your AI assistant."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col w-full ${compact ? "gap-3 p-3" : "gap-5 p-4 max-w-4xl mx-auto"}`}>
      {messages.map((message) => (
        <Message
          key={message.id}
          message={message}
          onFeedback={onFeedback}
          onViewTrace={onViewTrace}
          compact={compact}
        />
      ))}

      {isLoading && (
        <div className="flex items-center gap-3 text-[var(--color-muted-foreground)]">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span
            className="text-[0.8125rem] italic tracking-wide"
            style={{ fontFamily: "var(--font-body)" }}
          >
            AI is thinking...
          </span>
        </div>
      )}
    </div>
  );
}
