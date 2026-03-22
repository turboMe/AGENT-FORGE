"use client";

import { Plus, MessageSquare, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Conversation } from "@/types/chat";

interface ConversationSidebarProps {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
}

function getRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function getConversationTitle(conv: Conversation): string {
  if (conv.title) return conv.title;
  const firstMessage = conv.messages[0];
  if (firstMessage) {
    return firstMessage.content.slice(0, 40) + (firstMessage.content.length > 40 ? "…" : "");
  }
  return "New conversation";
}

export function ConversationSidebar({
  conversations,
  activeId,
  onSelect,
  onNew,
  onDelete,
}: ConversationSidebarProps) {
  const sorted = [...conversations].sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <div className="flex h-full flex-col border-r border-border/50 bg-sidebar/50 w-64 lg:w-72">
      {/* New chat button */}
      <div className="p-3">
        <button
          type="button"
          onClick={onNew}
          className={cn(
            "flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
            "border border-dashed border-border/60 text-muted-foreground",
            "hover:border-violet-500/40 hover:text-violet-400 hover:bg-violet-500/5"
          )}
        >
          <Plus className="h-4 w-4" />
          New Chat
        </button>
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto px-2 pb-3 space-y-0.5">
        {sorted.length === 0 && (
          <p className="px-3 py-6 text-center text-xs text-muted-foreground/50">
            No conversations yet
          </p>
        )}

        {sorted.map((conv) => {
          const isActive = conv.id === activeId;

          return (
            <div
              key={conv.id}
              className={cn(
                "group flex items-center gap-2 rounded-lg px-3 py-2.5 cursor-pointer transition-all",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )}
              onClick={() => onSelect(conv.id)}
            >
              <MessageSquare className="h-4 w-4 shrink-0 opacity-50" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {getConversationTitle(conv)}
                </p>
                <p className="text-xs text-muted-foreground/50 mt-0.5">
                  {getRelativeTime(conv.updatedAt)}
                </p>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(conv.id);
                }}
                className="opacity-0 group-hover:opacity-100 text-muted-foreground/40 hover:text-destructive transition-all"
                aria-label="Delete conversation"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
