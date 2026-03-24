"use client";


import { useReducer, useCallback, useEffect, useState, useRef } from "react";
import { ChatInput } from "@/components/chat/chat-input";
import { FileUpload } from "@/components/chat/file-upload";
import { MessageList } from "@/components/chat/message-list";
import { PipelineIndicator } from "@/components/chat/pipeline-indicator";
import { ConversationSidebar } from "@/components/chat/conversation-sidebar";
import {
  streamTask,
  fetchConversations,
  createConversation as apiCreateConversation,
  fetchConversation,
  updateConversationTitle,
  deleteConversation as apiDeleteConversation,
  type ApiConversation,
} from "@/lib/api";
import type {
  ChatState,
  ChatAction,
  Message,
  Conversation,
  PipelineStep,
  UploadedFile,
  SSEEvent,
  ArchitectState,
} from "@/types/chat";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSearchParams, useRouter as useNextRouter } from "next/navigation";

// ── Helpers ─────────────────────────────────────────

function genId(): string {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Convert API conversation to local state format */
function apiToLocal(api: ApiConversation): Conversation {
  return {
    id: api._id,
    title: api.title,
    messages: (api.messages ?? []).map((m) => ({
      id: genId(),
      role: m.role,
      content: m.content,
      timestamp: new Date(m.timestamp).getTime(),
      files: m.files?.map((f) => ({ id: genId(), name: f.name, size: f.size, type: f.type })),
    })),
    createdAt: new Date(api.createdAt).getTime(),
    updatedAt: new Date(api.updatedAt).getTime(),
  };
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

const defaultArchitectState: ArchitectState = {
  isAwaitingInput: false,
  generationType: null,
  history: [],
  originalTask: "",
  originalFiles: [],
};

// ── Reducer ─────────────────────────────────────────

const initialState: ChatState = {
  conversations: [],
  activeConversationId: null,
  isStreaming: false,
  pipelineSteps: [],
  streamedContent: "",
  architect: defaultArchitectState,
};

function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case "LOAD_CONVERSATIONS": {
      return { ...state, conversations: action.conversations };
    }

    case "UPDATE_CONVERSATION": {
      const conversations = state.conversations.map((c) =>
        c.id === action.conversation.id ? action.conversation : c
      );
      return { ...state, conversations };
    }

    case "NEW_CONVERSATION": {
      // We'll handle creation via API — this just sets the new conv into state
      return state;
    }

    case "SET_ACTIVE_CONVERSATION":
      return { ...state, activeConversationId: action.id, pipelineSteps: [], streamedContent: "", architect: defaultArchitectState };

    case "ADD_USER_MESSAGE": {
      const conversations = state.conversations.map((c) => {
        if (c.id !== state.activeConversationId) return c;
        const messages = [...c.messages, action.message];
        const title = c.title || action.message.content.slice(0, 50);
        return { ...c, messages, title, updatedAt: Date.now() };
      });
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
      // If the step doesn't exist yet (e.g. 'architect'), add it dynamically
      const exists = state.pipelineSteps.some((s) => s.step === action.step);
      let pipelineSteps: PipelineStep[];
      const now = Date.now();
      if (exists) {
        pipelineSteps = state.pipelineSteps.map((s) =>
          s.step === action.step
            ? {
                ...s,
                status: action.status,
                label: action.label,
                error: action.error,
                startedAt: action.status === 'running' ? now : s.startedAt,
              }
            : s
        );
      } else {
        pipelineSteps = [
          ...state.pipelineSteps,
          {
            step: action.step,
            label: action.label,
            status: action.status,
            error: action.error,
            startedAt: action.status === 'running' ? now : undefined,
          },
        ];
      }
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
        isDeliverable: action.isDeliverable,
        deliverableType: action.deliverableType as 'skill' | 'agent' | undefined,
      };
      const conversations = state.conversations.map((c) => {
        if (c.id !== state.activeConversationId) return c;
        return { ...c, messages: [...c.messages, assistantMsg], updatedAt: Date.now() };
      });
      return { ...state, conversations, isStreaming: false, streamedContent: "", architect: defaultArchitectState };
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
      return { ...state, conversations, isStreaming: false, pipelineSteps: [], streamedContent: "", architect: defaultArchitectState };
    }

    case "DELETE_CONVERSATION": {
      const conversations = state.conversations.filter((c) => c.id !== action.id);
      const activeConversationId =
        state.activeConversationId === action.id
          ? conversations[0]?.id ?? null
          : state.activeConversationId;
      return { ...state, conversations, activeConversationId };
    }

    case "ARCHITECT_AWAITING_INPUT": {
      return {
        ...state,
        isStreaming: false,
        architect: {
          isAwaitingInput: true,
          generationType: action.generationType,
          history: [
            ...state.architect.history,
            // The streamed content is the architect's questions
          ],
          originalTask: action.originalTask || state.architect.originalTask,
          originalFiles: action.originalFiles ?? state.architect.originalFiles,
        },
      };
    }

    case "ARCHITECT_RESET": {
      return { ...state, architect: defaultArchitectState };
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
  const [loading, setLoading] = useState(true);
  const abortRef = useRef<AbortController | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchParams = useSearchParams();
  const nextRouter = useNextRouter();
  const [attachedSkill, setAttachedSkill] = useState<{ id: string; name: string } | null>(null);

  // Track the current generationType for the ongoing stream
  const generationTypeRef = useRef<'skill' | 'agent' | null>(null);
  const originalTaskRef = useRef<string>("");
  // Track skill ID from "Use" button on Skills page
  const useSkillIdRef = useRef<string | null>(null);

  // Read skill query params from "Use" button on Skills page
  useEffect(() => {
    const skillId = searchParams.get("skill");
    const skillName = searchParams.get("skillName");
    if (skillName && skillId) {
      setAttachedSkill({ id: skillId, name: skillName });
      useSkillIdRef.current = skillId;
      // Clear query params from URL to avoid re-triggering
      nextRouter.replace("/", { scroll: false });
    }
  }, [searchParams, nextRouter]);

  // Keep a ref to conversations for use in callbacks (avoids stale closures)
  const conversationsRef = useRef(state.conversations);
  conversationsRef.current = state.conversations;

  // Load conversations from API on mount
  useEffect(() => {
    let cancelled = false;
    async function loadConversations() {
      try {
        const result = await fetchConversations({ limit: 50 });
        if (cancelled) return;
        const convs = result.conversations.map(apiToLocal);
        dispatch({ type: "LOAD_CONVERSATIONS", conversations: convs });
        if (convs.length > 0) {
          const sorted = [...convs].sort((a, b) => b.updatedAt - a.updatedAt);
          dispatch({ type: "SET_ACTIVE_CONVERSATION", id: sorted[0].id });
        }
      } catch (err) {
        console.error("Failed to load conversations:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadConversations();
    return () => { cancelled = true; };
  }, []);

  const activeConversation = state.conversations.find(
    (c) => c.id === state.activeConversationId
  );

  // ── Create new conversation via API ────────────────
  const handleNewConversation = useCallback(async () => {
    try {
      const apiConv = await apiCreateConversation();
      const conv: Conversation = apiToLocal(apiConv);
      dispatch({
        type: "LOAD_CONVERSATIONS", // Use LOAD_CONVERSATIONS to add the new conversation
        conversations: [conv, ...conversationsRef.current], // Use ref to avoid stale closure
      });
      dispatch({ type: "SET_ACTIVE_CONVERSATION", id: conv.id });
    } catch (err) {
      console.error("Failed to create conversation:", err);
    }
  }, []); // No dependency on state.conversations due to conversationsRef

  // ── Delete conversation via API ────────────────────
  const handleDeleteConversation = useCallback(async (id: string) => {
    try {
      await apiDeleteConversation(id);
      dispatch({ type: "DELETE_CONVERSATION", id });
    } catch (err) {
      console.error("Failed to delete conversation:", err);
    }
  }, []);

  // ── Load full conversation when switching ──────────
  const handleSelectConversation = useCallback(async (id: string) => {
    dispatch({ type: "SET_ACTIVE_CONVERSATION", id });

    // Check if we already have messages loaded (use ref to avoid stale closure)
    const existing = conversationsRef.current.find((c) => c.id === id);
    if (existing && existing.messages.length > 0) return;

    // Fetch full conversation with messages from API
    try {
      const apiConv = await fetchConversation(id);
      const fullConv = apiToLocal(apiConv);
      dispatch({ type: "UPDATE_CONVERSATION", conversation: fullConv });
    } catch (err) {
      console.error("Failed to fetch conversation:", err);
    }
  }, []);

  // ── SSE event handler ─────────────────────────────
  const createSSEHandler = useCallback((_conversationId: string, _taskContent: string) => {
    // Reset the timeout watchdog on every event
    const resetWatchdog = () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        dispatch({ type: "STREAM_ERROR", error: "Connection timeout — no response from server for 60 seconds" });
        abortRef.current?.abort();
      }, 60_000);
    };

    return (event: SSEEvent) => {
      resetWatchdog();

      switch (event.type) {
        case "step":
          dispatch({
            type: "PIPELINE_STEP",
            step: event.data.step,
            status: event.data.status,
            label: event.data.label,
          });
          // If a step failed, also treat it as a stream error
          if (event.data.status === 'failed') {
            dispatch({ type: "STREAM_ERROR", error: event.data.label });
          }
          break;
        case "token":
          dispatch({ type: "APPEND_TOKEN", content: event.data.content });
          break;
        case "architect_questions": {
          // The architect is asking clarifying questions
          // The token events already streamed the questions as content
          // Mark that we're awaiting user input
          dispatch({
            type: "ARCHITECT_AWAITING_INPUT",
            generationType: generationTypeRef.current ?? 'skill',
            originalTask: originalTaskRef.current,
            originalFiles: files,
          });
          break;
        }
        case "heartbeat":
          // Keepalive — no action needed, watchdog was already reset
          break;
        case "done": {
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          const doneData = event.data;
          if (doneData.status === 'awaiting_input') {
            // Architect is asking questions — don't finish streaming normally,
            // instead finalize the current message and set follow-up state
            dispatch({
              type: "FINISH_STREAMING",
            });
            dispatch({
              type: "ARCHITECT_AWAITING_INPUT",
              generationType: generationTypeRef.current ?? 'skill',
              originalTask: originalTaskRef.current,
              originalFiles: files,
            });
          } else {
            dispatch({
              type: "FINISH_STREAMING",
              taskId: doneData.taskId,
              isDeliverable: doneData.isDeliverable,
              deliverableType: doneData.type,
            });
          }
          break;
        }
        case "error":
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          dispatch({ type: "STREAM_ERROR", error: event.data.message });
          break;
      }
    };
  }, [files]);

  // ── Main send handler ─────────────────────────────
  const handleSend = useCallback(
    async (content: string) => {
      let conversationId = state.activeConversationId;

      // Create a new conversation if there isn't one
      if (!conversationId) {
        try {
          const apiConv = await apiCreateConversation(content.slice(0, 50));
          const conv = apiToLocal(apiConv);
          const updatedConvs = [conv, ...conversationsRef.current];
          dispatch({ type: "LOAD_CONVERSATIONS", conversations: updatedConvs });
          dispatch({ type: "SET_ACTIVE_CONVERSATION", id: conv.id });
          conversationId = conv.id;
        } catch (err) {
          console.error("Failed to create conversation:", err);
          return;
        }
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

      // Update title if first message
      const conv = conversationsRef.current.find((c) => c.id === conversationId);
      if (conv && !conv.title) {
        updateConversationTitle(conversationId!, content.slice(0, 50)).catch(console.error);
      }

      // Prepare files for API
      const apiFiles = files.length > 0
        ? files.map((f) => ({ name: f.name, type: f.type, size: f.size, content: f.content }))
        : undefined;

      // Check if this is a follow-up to architect questions
      let options: Record<string, unknown> | undefined;
      if (state.architect.isAwaitingInput) {
        options = {
          isArchitectFollowUp: true,
          generationType: state.architect.generationType,
          architectHistory: state.architect.history,
        };
        originalTaskRef.current = state.architect.originalTask;
      }

      // Pass skillId if coming from "Use" button on Skills page
      const skillId = useSkillIdRef.current ?? attachedSkill?.id ?? null;
      if (skillId) {
        useSkillIdRef.current = null; // Clear after use
        setAttachedSkill(null); // Clear badge
      }

      setFiles([]);

      const controller = streamTask(content, options, createSSEHandler(conversationId!, content), { conversationId: conversationId!, files: apiFiles, skillId: skillId ?? undefined });

      abortRef.current = controller;
    },
    [state.activeConversationId, files, state.architect, createSSEHandler]
  );

  // ── Generate handler (Skill / Agent buttons) ──────
  const handleGenerate = useCallback(
    async (content: string, type: 'skill' | 'agent') => {
      generationTypeRef.current = type;
      originalTaskRef.current = content;

      let conversationId = state.activeConversationId;

      // Create a new conversation if there isn't one
      if (!conversationId) {
        try {
          const apiConv = await apiCreateConversation(content.slice(0, 50));
          const conv = apiToLocal(apiConv);
          const updatedConvs = [conv, ...conversationsRef.current];
          dispatch({ type: "LOAD_CONVERSATIONS", conversations: updatedConvs });
          dispatch({ type: "SET_ACTIVE_CONVERSATION", id: conv.id });
          conversationId = conv.id;
        } catch (err) {
          console.error("Failed to create conversation:", err);
          return;
        }
      }

      const userMessage: Message = {
        id: genId(),
        role: "user",
        content: `[Generate ${type === 'agent' ? 'Agent' : 'Skill'}] ${content}`,
        timestamp: Date.now(),
        files: files.length > 0 ? [...files] : undefined,
      };

      dispatch({ type: "ADD_USER_MESSAGE", message: userMessage });
      dispatch({ type: "START_STREAMING" });
      setShowFileUpload(false);

      // Update title if first message
      const conv = conversationsRef.current.find((c) => c.id === conversationId);
      if (conv && !conv.title) {
        updateConversationTitle(conversationId!, content.slice(0, 50)).catch(console.error);
      }

      const apiFiles = files.length > 0
        ? files.map((f) => ({ name: f.name, type: f.type, size: f.size, content: f.content }))
        : undefined;

      setFiles([]);

      const controller = streamTask(
        content,
        { generationType: type },
        createSSEHandler(conversationId!, content),
        { conversationId: conversationId!, files: apiFiles },
      );

      abortRef.current = controller;
    },
    [state.activeConversationId, files, createSSEHandler]
  );

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading conversations...</p>
        </div>
      </div>
    );
  }

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
            onSelect={handleSelectConversation}
            onNew={handleNewConversation}
            onDelete={handleDeleteConversation}
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
          onGenerate={handleGenerate}
          onFileUploadToggle={() => setShowFileUpload(!showFileUpload)}
          disabled={state.isStreaming}
          hasFiles={files.length > 0}
          attachedSkill={attachedSkill}
          onDetachSkill={() => {
            setAttachedSkill(null);
            useSkillIdRef.current = null;
          }}
          isArchitectFollowUp={state.architect.isAwaitingInput}
        />
      </div>
    </div>
  );
}
