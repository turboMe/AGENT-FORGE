"use client";

import { useReducer, useCallback, useEffect, useState, useRef } from "react";
import { ChatInput } from "@/components/chat/chat-input";
import { FileUpload } from "@/components/chat/file-upload";
import { MessageList } from "@/components/chat/message-list";
import { PipelineIndicator } from "@/components/chat/pipeline-indicator";
import { ConversationSidebar } from "@/components/chat/conversation-sidebar";
import { streamTask } from "@/lib/api";
import type {
  ChatState,
  ChatAction,
  Message,
  Conversation,
  PipelineStep,
  UploadedFile,
  SSEEvent,
} from "@/types/chat";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Helpers ─────────────────────────────────────────
const STORAGE_KEY = "agentforge-conversations";

function genId(): string {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function loadConversations(): Conversation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Conversation[]) : [];
  } catch {
    return [];
  }
}

function saveConversations(convs: Conversation[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(convs));
}

// ── Default pipeline steps ──────────────────────────
function defaultPipelineSteps(): PipelineStep[] {
  return [
    { step: "classify", label: "Classifying task", status: "pending" },
    { step: "search", label: "Searching skill library", status: "pending" },
    { step: "route", label: "Deciding routing", status: "pending" },
    { step: "execute", label: "Executing with skill", status: "pending" },
    { step: "save", label: "Saving results", status: "pending" },
    { step: "log", label: "Logging decision", status: "pending" },
  ];
}

// ── Reducer ─────────────────────────────────────────
function createNewConversation(): Conversation {
  const now = Date.now();
  return {
    id: genId(),
    title: "",
    messages: [],
    createdAt: now,
    updatedAt: now,
  };
}

const initialState: ChatState = {
  conversations: [],
  activeConversationId: null,
  isStreaming: false,
  pipelineSteps: [],
  streamedContent: "",
};

function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case "LOAD_CONVERSATIONS": {
      const active =
        action.conversations.length > 0
          ? action.conversations.sort((a, b) => b.updatedAt - a.updatedAt)[0].id
          : null;
      return { ...state, conversations: action.conversations, activeConversationId: active };
    }

    case "NEW_CONVERSATION": {
      const conv = createNewConversation();
      const conversations = [conv, ...state.conversations];
      saveConversations(conversations);
      return { ...state, conversations, activeConversationId: conv.id, pipelineSteps: [], streamedContent: "" };
    }

    case "SET_ACTIVE_CONVERSATION":
      return { ...state, activeConversationId: action.id, pipelineSteps: [], streamedContent: "" };

    case "ADD_USER_MESSAGE": {
      const conversations = state.conversations.map((c) => {
        if (c.id !== state.activeConversationId) return c;
        const messages = [...c.messages, action.message];
        const title = c.title || action.message.content.slice(0, 50);
        return { ...c, messages, title, updatedAt: Date.now() };
      });
      saveConversations(conversations);
      return { ...state, conversations };
    }

    case "START_STREAMING":
      return {
        ...state,
        isStreaming: true,
        pipelineSteps: defaultPipelineSteps(),
        streamedContent: "",
      };

    case "PIPELINE_STEP": {
      const pipelineSteps = state.pipelineSteps.map((s) =>
        s.step === action.step ? { ...s, status: action.status, label: action.label } : s
      );
      return { ...state, pipelineSteps };
    }

    case "APPEND_TOKEN":
      return { ...state, streamedContent: state.streamedContent + action.content };

    case "FINISH_STREAMING": {
      const assistantMsg: Message = {
        id: genId(),
        role: "assistant",
        content: state.streamedContent,
        timestamp: Date.now(),
      };
      const conversations = state.conversations.map((c) => {
        if (c.id !== state.activeConversationId) return c;
        return { ...c, messages: [...c.messages, assistantMsg], updatedAt: Date.now() };
      });
      saveConversations(conversations);
      return { ...state, conversations, isStreaming: false, streamedContent: "" };
    }

    case "STREAM_ERROR": {
      const errorMsg: Message = {
        id: genId(),
        role: "assistant",
        content: `⚠️ **Error:** ${action.error}`,
        timestamp: Date.now(),
      };
      const conversations = state.conversations.map((c) => {
        if (c.id !== state.activeConversationId) return c;
        return { ...c, messages: [...c.messages, errorMsg], updatedAt: Date.now() };
      });
      saveConversations(conversations);
      return { ...state, conversations, isStreaming: false, pipelineSteps: [], streamedContent: "" };
    }

    case "DELETE_CONVERSATION": {
      const conversations = state.conversations.filter((c) => c.id !== action.id);
      saveConversations(conversations);
      const activeConversationId =
        state.activeConversationId === action.id
          ? conversations[0]?.id ?? null
          : state.activeConversationId;
      return { ...state, conversations, activeConversationId };
    }

    default:
      return state;
  }
}

// ── Page Component ──────────────────────────────────
export default function ChatPage() {
  const [state, dispatch] = useReducer(chatReducer, initialState);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const abortRef = useRef<AbortController | null>(null);

  // Load conversations from localStorage on mount
  useEffect(() => {
    const convs = loadConversations();
    if (convs.length > 0) {
      dispatch({ type: "LOAD_CONVERSATIONS", conversations: convs });
    } else {
      dispatch({ type: "NEW_CONVERSATION" });
    }
  }, []);

  const activeConversation = state.conversations.find(
    (c) => c.id === state.activeConversationId
  );

  const handleSend = useCallback(
    (content: string) => {
      // Ensure active conversation exists
      if (!state.activeConversationId) {
        dispatch({ type: "NEW_CONVERSATION" });
      }

      const userMessage: Message = {
        id: genId(),
        role: "user",
        content,
        timestamp: Date.now(),
        files: files.length > 0 ? [...files] : undefined,
      };

      dispatch({ type: "ADD_USER_MESSAGE", message: userMessage });
      dispatch({ type: "START_STREAMING" });
      setShowFileUpload(false);
      setFiles([]);

      const controller = streamTask(content, undefined, (event: SSEEvent) => {
        switch (event.type) {
          case "step":
            dispatch({
              type: "PIPELINE_STEP",
              step: event.data.step,
              status: event.data.status,
              label: event.data.label,
            });
            break;
          case "token":
            dispatch({ type: "APPEND_TOKEN", content: event.data.content });
            break;
          case "done":
            dispatch({ type: "FINISH_STREAMING", taskId: event.data.taskId });
            break;
          case "error":
            dispatch({ type: "STREAM_ERROR", error: event.data.message });
            break;
        }
      });

      abortRef.current = controller;
    },
    [state.activeConversationId, files]
  );

  return (
    <div className="flex h-full overflow-hidden">
      {/* Conversation sidebar (desktop) */}
      <div
        className={cn(
          "hidden lg:flex transition-all duration-300",
          sidebarOpen ? "w-64 xl:w-72" : "w-0"
        )}
      >
        {sidebarOpen && (
          <ConversationSidebar
            conversations={state.conversations}
            activeId={state.activeConversationId}
            onSelect={(id) => dispatch({ type: "SET_ACTIVE_CONVERSATION", id })}
            onNew={() => dispatch({ type: "NEW_CONVERSATION" })}
            onDelete={(id) => dispatch({ type: "DELETE_CONVERSATION", id })}
          />
        )}
      </div>

      {/* Main chat area */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Chat header */}
        <div className="flex h-12 items-center gap-2 border-b border-border/50 px-4">
          <button
            type="button"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="hidden lg:flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
            aria-label="Toggle sidebar"
          >
            {sidebarOpen ? (
              <PanelLeftClose className="h-4 w-4" />
            ) : (
              <PanelLeftOpen className="h-4 w-4" />
            )}
          </button>
          <h2 className="text-sm font-medium text-foreground/80 truncate">
            {activeConversation?.title || "New Chat"}
          </h2>
        </div>

        {/* Pipeline indicator */}
        <PipelineIndicator
          steps={state.pipelineSteps}
          visible={state.isStreaming || state.pipelineSteps.some((s) => s.status === "done")}
        />

        {/* Messages */}
        <MessageList
          messages={activeConversation?.messages ?? []}
          streamedContent={state.streamedContent}
          isStreaming={state.isStreaming}
        />

        {/* File upload */}
        {showFileUpload && (
          <FileUpload
            files={files}
            onFilesChange={setFiles}
            onClose={() => setShowFileUpload(false)}
          />
        )}

        {/* Input */}
        <ChatInput
          onSend={handleSend}
          onFileUploadToggle={() => setShowFileUpload(!showFileUpload)}
          disabled={state.isStreaming}
          hasFiles={files.length > 0}
        />
      </div>
    </div>
  );
}
