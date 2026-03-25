"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { User, Sparkles, Copy, Check, Wand2, Bot, Save, Lightbulb, ClipboardCopy, BookMarked } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Message } from "@/types/chat";
import { createSkill } from "@/lib/api";

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

/** Extract structured skill data from generated prompt content */
function extractSkillData(prompt: string, brief: string, deliverableType?: string) {
  // Extract name from ## Identity section (first sentence or line)
  const identityMatch = prompt.match(/## Identity\s*\n+([\s\S]*?)(?=\n##|\n*$)/);
  const identityText = identityMatch?.[1]?.trim() ?? '';
  // Use first sentence or first 60 chars as name
  const firstSentence = identityText.split(/[.\n]/)[0]?.trim() ?? '';
  const name = firstSentence.length > 8
    ? firstSentence.slice(0, 80).replace(/^You are (?:an? )?/i, '').trim()
    : 'Generated ' + (deliverableType === 'agent' ? 'Agent' : 'Skill');

  // Capitalize first letter
  const capitalizedName = name.charAt(0).toUpperCase() + name.slice(1);

  const description = brief || identityText.slice(0, 200) || 'Auto-generated from chat';

  // Extract sections
  const processMatch = prompt.match(/## (?:Process|Workflow)\s*\n+([\s\S]*?)(?=\n##|\n*$)/);
  const processSteps = processMatch?.[1]
    ?.split('\n')
    .map(l => l.replace(/^\d+\.\s*/, '').trim())
    .filter(l => l.length > 0) ?? [];

  const outputMatch = prompt.match(/## Output Format\s*\n+([\s\S]*?)(?=\n##|\n*$)/);
  const outputFormat = outputMatch?.[1]?.trim() ?? '';

  const constraintsMatch = prompt.match(/## Constraints\s*\n+([\s\S]*?)(?=\n##|\n*$)/);
  const constraints = constraintsMatch?.[1]
    ?.split('\n')
    .map(l => l.replace(/^[-•*]\s*/, '').trim())
    .filter(l => l.length > 0) ?? [];

  return {
    name: capitalizedName,
    description,
    domain: ['general'],
    pattern: deliverableType === 'agent' ? 'agent' : 'skill',
    template: {
      persona: identityText,
      process: processSteps,
      outputFormat,
      constraints,
      systemPrompt: prompt,
    },
  };
}

function DeliverableContent({ message }: { message: Message }) {
  const [copied, setCopied] = useState(false);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const { brief, prompt, deployNote } = parseDeliverable(message.content);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = async () => {
    setSaveState('saving');
    try {
      const skillData = extractSkillData(prompt, brief, message.deliverableType);
      await createSkill(skillData);
      setSaveState('saved');
    } catch (err) {
      console.error('Failed to save skill:', err);
      setSaveState('error');
      setTimeout(() => setSaveState('idle'), 3000);
    }
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
          <div className="flex items-center gap-1">
            {/* Save to Library button */}
            <button
              type="button"
              onClick={handleSave}
              disabled={saveState === 'saving' || saveState === 'saved'}
              className={cn(
                "flex items-center gap-1 rounded px-2 py-0.5 transition-all",
                saveState === 'saved'
                  ? "text-emerald-400"
                  : saveState === 'error'
                  ? "text-red-400"
                  : "hover:bg-white/10",
                (saveState === 'saving' || saveState === 'saved') && "opacity-70 cursor-default"
              )}
            >
              {saveState === 'saved' ? (
                <>
                  <Check className="h-3 w-3" />
                  <span>Saved</span>
                </>
              ) : saveState === 'saving' ? (
                <>
                  <Save className="h-3 w-3 animate-pulse" />
                  <span>Saving…</span>
                </>
              ) : saveState === 'error' ? (
                <span>Failed</span>
              ) : (
                <>
                  <Save className="h-3 w-3" />
                  <span>Save {isAgent ? 'Agent' : 'Skill'}</span>
                </>
              )}
            </button>
            {/* Copy button */}
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
        </div>

        {/* Prompt content */}
        <div className="p-3 max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-border">
          {isAgent ? (
            <div className="prose prose-sm prose-invert max-w-none break-words text-foreground/90">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{prompt}</ReactMarkdown>
            </div>
          ) : (
            <pre className="text-xs text-foreground/90 whitespace-pre-wrap break-words font-mono leading-relaxed">
              {prompt}
            </pre>
          )}
        </div>
      </div>

      {/* Deployment note */}
      {deployNote && (
        <div className="prose prose-sm prose-invert max-w-none break-words text-muted-foreground">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{deployNote}</ReactMarkdown>
        </div>
      )}

      {/* Agent-only: "What next?" guidance */}
      {isAgent && (
        <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-cyan-400">
            <Lightbulb className="h-4 w-4" />
            <span>How to use this agent</span>
          </div>
          <div className="space-y-2.5 text-xs text-foreground/80">
            <div className="flex items-start gap-2.5">
              <ClipboardCopy className="h-3.5 w-3.5 mt-0.5 shrink-0 text-cyan-400/70" />
              <div>
                <span className="font-medium text-foreground/90">Copy &amp; paste as System Prompt</span>
                <p className="mt-0.5 text-muted-foreground">Use in ChatGPT, Claude, Gemini, or any LLM via API. Paste the prompt as a system/custom instruction.</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <BookMarked className="h-3.5 w-3.5 mt-0.5 shrink-0 text-cyan-400/70" />
              <div>
                <span className="font-medium text-foreground/90">Add as Project Instructions</span>
                <p className="mt-0.5 text-muted-foreground">For best results, add this prompt to your project&apos;s custom instructions (e.g. ChatGPT Projects, Claude Projects). The agent will be available in every chat within that project.</p>
              </div>
            </div>
          </div>
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

        {/* Typing indicator with wait-time info */}
        {isStreaming && !streamedContent && (
          <div className="flex gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 mt-0.5">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div className="space-y-2">
              <div className="rounded-2xl rounded-tl-md bg-card border border-border/50 px-4 py-3 shadow-sm">
                <div className="flex gap-1.5 items-center h-5">
                  <span className="typing-dot" />
                  <span className="typing-dot [animation-delay:0.15s]" />
                  <span className="typing-dot [animation-delay:0.3s]" />
                </div>
              </div>
              <p
                className="text-xs text-muted-foreground/70 px-1"
                style={{ animation: 'fade-in 0.7s ease-out 1.5s both' }}
              >
                ✨ Pipeline is working its magic — this can take up to 3 min.
                <span className="text-muted-foreground/50"> The result is worth the wait.</span>
              </p>
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
