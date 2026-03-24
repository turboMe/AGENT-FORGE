"use client";

import { useState, useRef, useEffect, type KeyboardEvent } from "react";
import { Send, Paperclip, Loader2, Wand2, Bot, Zap, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface AttachedSkill {
  id: string;
  name: string;
}

interface ChatInputProps {
  onSend: (message: string) => void;
  onGenerate?: (message: string, type: 'skill' | 'agent') => void;
  onFileUploadToggle: () => void;
  disabled?: boolean;
  hasFiles?: boolean;
  /** Skill attached from "Use" button on Skills page */
  attachedSkill?: AttachedSkill | null;
  onDetachSkill?: () => void;
  /** When architect is waiting for follow-up, show a special placeholder */
  isArchitectFollowUp?: boolean;
}

export function ChatInput({
  onSend,
  onGenerate,
  onFileUploadToggle,
  disabled = false,
  hasFiles = false,
  attachedSkill,
  onDetachSkill,
  isArchitectFollowUp = false,
}: ChatInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Focus textarea when skill is attached
  useEffect(() => {
    if (attachedSkill) {
      requestAnimationFrame(() => {
        textareaRef.current?.focus();
      });
    }
  }, [attachedSkill]);

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleGenerate = (type: 'skill' | 'agent') => {
    const trimmed = value.trim();
    if (!trimmed || disabled || !onGenerate) return;
    onGenerate(trimmed, type);
    setValue("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  };

  const showGenerateButtons = !!value.trim() && !disabled && onGenerate && !isArchitectFollowUp;

  return (
    <div className="border-t border-border bg-background/80 backdrop-blur-xl px-4 py-3">
      <div className="mx-auto max-w-3xl space-y-2">
        {/* Attached skill badge */}
        {attachedSkill && (
          <div className="flex items-center gap-2 animate-in fade-in-0 slide-in-from-bottom-1 duration-200">
            <div className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium",
              "bg-gradient-to-r from-violet-500/15 to-indigo-500/15 text-violet-300",
              "border border-violet-500/30"
            )}>
              <Zap className="h-3 w-3 text-violet-400" />
              <span className="text-muted-foreground">Skill:</span>
              <span className="text-violet-300 font-semibold max-w-[200px] truncate">
                {attachedSkill.name}
              </span>
              <button
                type="button"
                onClick={onDetachSkill}
                className="ml-1 rounded-full p-0.5 hover:bg-violet-500/20 text-muted-foreground hover:text-violet-300 transition-colors"
                aria-label="Detach skill"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          </div>
        )}

        {/* Generate buttons — appear when there's content */}
        {showGenerateButtons && (
          <div className="flex items-center gap-2 animate-in fade-in-0 slide-in-from-bottom-1 duration-200">
            <button
              type="button"
              onClick={() => handleGenerate('skill')}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200",
                "bg-gradient-to-r from-amber-500/15 to-orange-500/15 text-amber-400",
                "hover:from-amber-500/25 hover:to-orange-500/25 hover:text-amber-300",
                "border border-amber-500/20 hover:border-amber-500/40"
              )}
            >
              <Wand2 className="h-3 w-3" />
              Generate Skill
            </button>
            <button
              type="button"
              onClick={() => handleGenerate('agent')}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200",
                "bg-gradient-to-r from-cyan-500/15 to-blue-500/15 text-cyan-400",
                "hover:from-cyan-500/25 hover:to-blue-500/25 hover:text-cyan-300",
                "border border-cyan-500/20 hover:border-cyan-500/40"
              )}
            >
              <Bot className="h-3 w-3" />
              Generate Agent
            </button>
          </div>
        )}

        <div className="flex items-end gap-2">
          {/* File attach */}
          <button
            type="button"
            onClick={onFileUploadToggle}
            disabled={disabled}
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all",
              "text-muted-foreground hover:text-foreground hover:bg-secondary",
              "disabled:opacity-40 disabled:cursor-not-allowed",
              hasFiles && "text-violet-400 bg-violet-500/10"
            )}
            aria-label="Attach files"
          >
            <Paperclip className="h-4 w-4" />
          </button>

          {/* Textarea */}
          <div className="relative flex-1">
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onInput={handleInput}
              onKeyDown={handleKeyDown}
              placeholder={
                isArchitectFollowUp
                  ? "Answer the architect's questions..."
                  : attachedSkill
                    ? `What would you like "${attachedSkill.name}" to do?`
                    : "Describe your task..."
              }
              disabled={disabled}
              rows={1}
              className={cn(
                "w-full resize-none rounded-xl border border-border bg-card px-4 py-2.5 pr-12",
                "text-sm text-foreground placeholder:text-muted-foreground",
                "focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/50",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "transition-all duration-200",
                "scrollbar-thin scrollbar-thumb-border",
                isArchitectFollowUp && "border-amber-500/30 focus:ring-amber-500/40 focus:border-amber-500/50",
                attachedSkill && !isArchitectFollowUp && "border-violet-500/30 focus:ring-violet-500/40"
              )}
            />
          </div>

          {/* Send button */}
          <button
            type="button"
            onClick={handleSend}
            disabled={disabled || !value.trim()}
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all duration-200",
              "bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-lg shadow-violet-500/25",
              "hover:shadow-violet-500/40 hover:scale-105",
              "disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:shadow-none"
            )}
            aria-label="Send message"
          >
            {disabled ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
