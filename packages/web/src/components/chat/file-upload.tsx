"use client";

import { useState, useRef, useCallback, type DragEvent } from "react";
import { Upload, X, FileText, Image as ImageIcon, FileCode } from "lucide-react";
import { cn } from "@/lib/utils";
import type { UploadedFile } from "@/types/chat";

interface FileUploadProps {
  files: UploadedFile[];
  onFilesChange: (files: UploadedFile[]) => void;
  onClose: () => void;
}

const ACCEPTED_TYPES = [
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/json",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(type: string) {
  if (type.startsWith("image/")) return <ImageIcon className="h-4 w-4" />;
  if (type.includes("json") || type.includes("csv")) return <FileCode className="h-4 w-4" />;
  return <FileText className="h-4 w-4" />;
}

export function FileUpload({ files, onFilesChange, onClose }: FileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback(
    (fileList: FileList | File[]) => {
      const arr = Array.from(fileList);
      const readPromises: Promise<UploadedFile | null>[] = arr.map((file) => {
        if (!ACCEPTED_TYPES.includes(file.type)) return Promise.resolve(null);
        if (file.size > MAX_FILE_SIZE) return Promise.resolve(null);

        return new Promise<UploadedFile>((resolve) => {
          const meta: UploadedFile = {
            id: `file_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            name: file.name,
            size: file.size,
            type: file.type,
          };

          // Read text-based files content
          if (file.type.startsWith('text/') || file.type === 'application/json') {
            const reader = new FileReader();
            reader.onload = () => {
              meta.content = reader.result as string;
              resolve(meta);
            };
            reader.onerror = () => resolve(meta); // fallback without content
            reader.readAsText(file);
          } else {
            resolve(meta);
          }
        });
      });

      Promise.all(readPromises).then((results) => {
        const newFiles = results.filter((f): f is UploadedFile => f !== null);
        if (newFiles.length > 0) {
          onFilesChange([...files, ...newFiles]);
        }
      });
    },
    [files, onFilesChange]
  );

  const removeFile = (id: string) => {
    onFilesChange(files.filter((f) => f.id !== id));
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  };

  return (
    <div className="border-t border-border bg-card/50 backdrop-blur-sm px-4 py-3 animate-in slide-in-from-bottom-2 duration-200">
      <div className="mx-auto max-w-3xl space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Attach Files
          </span>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Close file upload"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Drop zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed py-6 transition-all duration-200",
            isDragOver
              ? "border-violet-500 bg-violet-500/10 shadow-[0_0_20px_rgba(139,92,246,0.15)]"
              : "border-border/60 hover:border-border hover:bg-secondary/30"
          )}
        >
          <div
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-xl transition-colors",
              isDragOver
                ? "bg-violet-500/20 text-violet-400"
                : "bg-secondary text-muted-foreground"
            )}
          >
            <Upload className="h-5 w-5" />
          </div>
          <div className="text-center">
            <p className="text-sm text-foreground/80">
              {isDragOver ? "Drop files here" : "Drag & drop or click to browse"}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              txt, md, json, csv, images — max 10MB
            </p>
          </div>
        </div>

        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPTED_TYPES.join(",")}
          className="hidden"
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files);
            e.target.value = "";
          }}
        />

        {/* File list */}
        {files.length > 0 && (
          <div className="space-y-1.5">
            {files.map((file) => (
              <div
                key={file.id}
                className="flex items-center gap-3 rounded-lg bg-secondary/50 px-3 py-2 text-sm animate-in fade-in-0 slide-in-from-left-1 duration-200"
              >
                <span className="text-muted-foreground">{getFileIcon(file.type)}</span>
                <span className="flex-1 truncate text-foreground/80">{file.name}</span>
                <span className="text-xs text-muted-foreground shrink-0">
                  {formatFileSize(file.size)}
                </span>
                <button
                  type="button"
                  onClick={() => removeFile(file.id)}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                  aria-label={`Remove ${file.name}`}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
