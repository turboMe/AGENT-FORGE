"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { User, Sparkles, Copy, Check, Wand2, Bot } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Message } from "@/types/chat";

interface MessageListProps {
  messages: Message[];
  streamedContent: string;
  isStreaming: boolean;
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Extract prompt from deliverable content using markers */
function parseDeliverable(content: string) {
  const startMarker = "===PROMPT_START===";
  const endMarker = "===PROMPT_END===";

  const startIdx = content.indexOf(startMarker);
  const endIdx = content.indexOf(endMarker);

  if (startIdx === -1 || endIdx === -1) {
    return { brief: "", prompt: content, deployNote: "" };
  }

  const brief = content.slice(0, startIdx).trim();
  const prompt = content.slice(startIdx + startMarker.length, endIdx).trim();
  const deployNote = content.slice(endIdx + endMarker.length).trim();

  return { brief, prompt, deployNote };
}

function DeliverableContent({ message }: { message: Message }) {
  const [copied, setCopied] = useState(false);
  const { brief, prompt, deployNote } = parseDeliverable(message.content);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isAgent = message.deliverableType === "agent";

  return (
    <div className="space-y-3">
      {/* Brief */}
      {brief && (
        <div className="prose prose-sm prose-invert max-w-none break-words">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{brief}</ReactMarkdown>
        </div>
      )}

      {/* Prompt block */}
      <div className="relative rounded-lg border border-border/70 bg-background/50 overflow-hidden">
        {/* Header */}
        <div className={cn(
          "flex items-center justify-between px-3 py-2 text-xs font-medium border-b border-border/50",
          isAgent
            ? "bg-cyan-500/10 text-cyan-400"
            : "bg-amber-500/10 text-amber-400"
        )}>
          <div className="flex items-center gap-1.5">
            {isAgent ? <Bot className="h-3.5 w-3.5" /> : <Wand2 className="h-3.5 w-3.5" />}
            <span>Generated {isAgent ? "Agent" : "Skill"} Prompt</span>
          </div>
          <button
            type="button"
            onClick={handleCopy}
            className={cn(
              "flex items-center gap-1 rounded px-2 py-0.5 transition-all",
              "hover:bg-white/10",
              copied && "text-emerald-400"
            )}
          >
            {copied ? (
              <>
                <Check className="h-3 w-3" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>

        {/* Prompt content */}
        <div className="p-3 max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-border">
          <pre className="text-xs text-foreground/90 whitespace-pre-wrap break-words font-mono leading-relaxed">
            {prompt}
          </pre>
        </div>
      </div>

      {/* Deployment note */}
      {deployNote && (
        <div className="prose prose-sm prose-invert max-w-none break-words text-muted-foreground">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{deployNote}</ReactMarkdown>
        </div>
      )}
    </div>
  );
}

export function MessageList({
  messages,
  streamedContent,
  isStreaming,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new content
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamedContent]);

  if (messages.length === 0 && !isStreaming) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg shadow-violet-500/25">
          <Sparkles className="h-8 w-8 text-white" />
        </div>
        <div className="text-center">
          <h2 className="text-xl font-semibold">How can I help you?</h2>
          <p className="mt-1 text-sm text-muted-foreground max-w-sm">
            Describe your task in natural language. Every request is automatically
            routed through the AgentForge pipeline.
          </p>
        </div>

      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto px-4 py-6 scroll-smooth"
    >
      <div className="mx-auto max-w-3xl space-y-6">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        {/* Streaming assistant message */}
        {isStreaming && streamedContent && (
          <div className="flex gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 mt-0.5">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="rounded-2xl rounded-tl-md bg-card border border-border/50 px-4 py-3 shadow-sm">
                <div className="prose prose-sm prose-invert max-w-none break-words">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {streamedContent}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Typing indicator */}
        {isStreaming && !streamedContent && (
          <div className="flex gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 mt-0.5">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div className="rounded-2xl rounded-tl-md bg-card border border-border/50 px-4 py-3 shadow-sm">
              <div className="flex gap-1.5 items-center h-5">
                <span className="typing-dot" />
                <span className="typing-dot [animation-delay:0.15s]" />
                <span className="typing-dot [animation-delay:0.3s]" />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex gap-3", isUser && "flex-row-reverse")}>
      {/* Avatar */}
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg mt-0.5",
          isUser
            ? "bg-secondary text-secondary-foreground"
            : "bg-gradient-to-br from-violet-500 to-indigo-600"
        )}
      >
        {isUser ? (
          <User className="h-4 w-4" />
        ) : (
          <Sparkles className="h-4 w-4 text-white" />
        )}
      </div>

      {/* Content */}
      <div className={cn("min-w-0 flex-1", isUser && "flex flex-col items-end")}>
        <div
          className={cn(
            "inline-block max-w-full rounded-2xl px-4 py-3 shadow-sm",
            isUser
              ? "rounded-tr-md bg-gradient-to-br from-violet-500 to-indigo-600 text-white"
              : "rounded-tl-md bg-card border border-border/50"
          )}
        >
          {isUser ? (
            <p className="text-sm whitespace-pre-wrap break-words">
              {message.content}
            </p>
          ) : message.isDeliverable ? (
            <DeliverableContent message={message} />
          ) : (
            <div className="prose prose-sm prose-invert max-w-none break-words">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {message.content}
              </ReactMarkdown>
            </div>
          )}
        </div>
        <span className="mt-1 text-xs text-muted-foreground/60 px-1">
          {formatTime(message.timestamp)}
        </span>
      </div>
    </div>
  );
}
