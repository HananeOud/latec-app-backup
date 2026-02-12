import { useState, useEffect, useRef, useCallback } from "react";
import {
  Upload,
  FileText,
  X,
  Loader2,
  Trash2,
  ArrowRight,
  Search,
  AlertCircle,
} from "lucide-react";
import { MarkdownRenderer } from "@/components/shared/MarkdownRenderer";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PdfFile {
  name: string;
  size: number;
  data: string; // base64
}

// LocalStorage keys
const LS_OLD_PDF = "compare_old_pdf";
const LS_NEW_PDF = "compare_new_pdf";
const LS_ANALYSIS = "compare_analysis";
const LS_IMPACT = "compare_impact";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove the data:...;base64, prefix
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function savePdfToStorage(key: string, pdf: PdfFile | null) {
  if (pdf) {
    try {
      localStorage.setItem(key, JSON.stringify(pdf));
    } catch {
      // localStorage full — silently ignore
    }
  } else {
    localStorage.removeItem(key);
  }
}

function loadPdfFromStorage(key: string): PdfFile | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as PdfFile) : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// PdfDropZone
// ---------------------------------------------------------------------------

function PdfDropZone({
  label,
  file,
  onFile,
  onRemove,
  disabled,
}: {
  label: string;
  file: PdfFile | null;
  onFile: (f: PdfFile) => void;
  onRemove: () => void;
  disabled: boolean;
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (f: File) => {
      if (f.type !== "application/pdf") return;
      const data = await readFileAsBase64(f);
      onFile({ name: f.name, size: f.size, data });
    },
    [onFile],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const f = e.dataTransfer.files?.[0];
      if (f) handleFile(f);
    },
    [handleFile],
  );

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const onDragLeave = useCallback(() => setIsDragOver(false), []);

  const onClick = useCallback(() => {
    if (!disabled) inputRef.current?.click();
  }, [disabled]);

  const onInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (f) handleFile(f);
      // Reset so the same file can be re-selected
      e.target.value = "";
    },
    [handleFile],
  );

  if (file) {
    return (
      <div className="flex-1 min-w-0 rounded-xl border border-[var(--color-border)]/40 bg-[var(--color-background)]/60 backdrop-blur-sm p-5 transition-all duration-300">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-[var(--color-accent-primary)]/10 flex items-center justify-center">
              <FileText className="h-5 w-5 text-[var(--color-accent-primary)]" />
            </div>
            <div className="min-w-0">
              <p
                className="text-sm font-medium text-[var(--color-text-heading)] truncate"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                {label}
              </p>
              <p className="text-xs text-[var(--color-text-muted)] truncate mt-0.5">
                {file.name} ({formatFileSize(file.size)})
              </p>
            </div>
          </div>
          {!disabled && (
            <button
              onClick={onRemove}
              className="flex-shrink-0 p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-error)] hover:bg-[var(--color-error)]/10 transition-all duration-200 cursor-pointer"
              title="Remove file"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex-1 min-w-0 rounded-xl border-2 border-dashed p-6 transition-all duration-300 cursor-pointer group ${
        isDragOver
          ? "border-[var(--color-accent-primary)] bg-[var(--color-accent-primary)]/5"
          : "border-[var(--color-border)]/40 hover:border-[var(--color-accent-primary)]/50 hover:bg-[var(--color-accent-primary)]/[0.02]"
      } ${disabled ? "opacity-50 pointer-events-none" : ""}`}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onClick={onClick}
    >
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={onInputChange}
      />
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="w-10 h-10 rounded-lg bg-[var(--color-muted)]/50 flex items-center justify-center group-hover:bg-[var(--color-accent-primary)]/10 transition-colors duration-300">
          <Upload className="h-5 w-5 text-[var(--color-text-muted)] group-hover:text-[var(--color-accent-primary)] transition-colors duration-300" />
        </div>
        <div>
          <p
            className="text-sm font-medium text-[var(--color-text-heading)]"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            {label}
          </p>
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
            Drag & drop or click to browse (PDF)
          </p>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ResultCard
// ---------------------------------------------------------------------------

function ResultCard({
  title,
  icon: Icon,
  content,
  isStreaming,
}: {
  title: string;
  icon: React.ElementType;
  content: string;
  isStreaming: boolean;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isStreaming) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [content, isStreaming]);

  return (
    <div className="rounded-xl border border-[var(--color-border)]/30 bg-[var(--color-background)]/80 backdrop-blur-sm shadow-sm overflow-hidden animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
      {/* Accent top bar */}
      <div className="h-1 bg-[var(--color-accent-primary)]" />

      {/* Header */}
      <div className="flex items-center gap-2.5 px-6 py-4 border-b border-[var(--color-border)]/20">
        <Icon className="h-5 w-5 text-[var(--color-accent-primary)]" />
        <h3
          className="text-base font-semibold text-[var(--color-text-heading)]"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {title}
        </h3>
        {isStreaming && (
          <Loader2 className="h-4 w-4 text-[var(--color-accent-primary)] animate-spin ml-auto" />
        )}
      </div>

      {/* Content */}
      <div className="px-6 py-5">
        <MarkdownRenderer content={content} />
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ToolsView (main)
// ---------------------------------------------------------------------------

export function ToolsView() {
  // PDF state
  const [oldPdf, setOldPdf] = useState<PdfFile | null>(null);
  const [newPdf, setNewPdf] = useState<PdfFile | null>(null);

  // Result state
  const [analysisResult, setAnalysisResult] = useState("");
  const [impactResult, setImpactResult] = useState("");

  // Loading state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isFindingImpact, setIsFindingImpact] = useState(false);

  // Error state
  const [analysisError, setAnalysisError] = useState("");
  const [impactError, setImpactError] = useState("");

  // Abort controllers
  const analyzeAbortRef = useRef<AbortController | null>(null);
  const impactAbortRef = useRef<AbortController | null>(null);

  // -----------------------------------------------------------------------
  // Restore from localStorage on mount
  // -----------------------------------------------------------------------
  useEffect(() => {
    setOldPdf(loadPdfFromStorage(LS_OLD_PDF));
    setNewPdf(loadPdfFromStorage(LS_NEW_PDF));
    setAnalysisResult(localStorage.getItem(LS_ANALYSIS) || "");
    setImpactResult(localStorage.getItem(LS_IMPACT) || "");
  }, []);

  // -----------------------------------------------------------------------
  // Persist helpers
  // -----------------------------------------------------------------------
  const handleSetOldPdf = useCallback((pdf: PdfFile | null) => {
    setOldPdf(pdf);
    savePdfToStorage(LS_OLD_PDF, pdf);
  }, []);

  const handleSetNewPdf = useCallback((pdf: PdfFile | null) => {
    setNewPdf(pdf);
    savePdfToStorage(LS_NEW_PDF, pdf);
  }, []);

  // -----------------------------------------------------------------------
  // Clear everything
  // -----------------------------------------------------------------------
  const handleClear = useCallback(() => {
    // Abort any running streams
    analyzeAbortRef.current?.abort();
    impactAbortRef.current?.abort();

    setOldPdf(null);
    setNewPdf(null);
    setAnalysisResult("");
    setImpactResult("");
    setAnalysisError("");
    setImpactError("");
    setIsAnalyzing(false);
    setIsFindingImpact(false);

    localStorage.removeItem(LS_OLD_PDF);
    localStorage.removeItem(LS_NEW_PDF);
    localStorage.removeItem(LS_ANALYSIS);
    localStorage.removeItem(LS_IMPACT);
  }, []);

  // -----------------------------------------------------------------------
  // SSE streaming helper
  // -----------------------------------------------------------------------
  const streamSSE = useCallback(
    async (
      url: string,
      body: FormData | string,
      isFormData: boolean,
      onDelta: (text: string) => void,
      abortRef: React.MutableRefObject<AbortController | null>,
    ): Promise<void> => {
      const controller = new AbortController();
      abortRef.current = controller;

      const backendUrl = import.meta.env.VITE_BACKEND_URL || "";
      const headers: Record<string, string> = {};
      if (!isFormData) {
        headers["Content-Type"] = "application/json";
      }

      const response = await fetch(`${backendUrl}/api${url}`, {
        method: "POST",
        headers,
        body,
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API returned ${response.status}: ${errorText}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error("No response body");

      let buffer = "";
      let lastUpdate = 0;
      const UPDATE_INTERVAL = 50;
      let accumulated = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.trim() || !line.startsWith("data: ")) continue;
            const data = line.slice(6).trim();
            if (!data || data === "[DONE]") continue;

            try {
              const event = JSON.parse(data);

              if (event.type === "error") {
                throw new Error(event.error || "Unknown error from server");
              }

              if (
                event.type === "response.output_text.delta" &&
                event.delta
              ) {
                accumulated += event.delta;
                const now = Date.now();
                if (now - lastUpdate >= UPDATE_INTERVAL) {
                  onDelta(accumulated);
                  lastUpdate = now;
                }
              }
            } catch (parseErr) {
              if (
                parseErr instanceof Error &&
                parseErr.message.startsWith("Unknown error") ||
                (parseErr instanceof Error && !parseErr.message.startsWith("Unexpected"))
              ) {
                throw parseErr;
              }
              // Skip unparseable lines
            }
          }
        }
      } finally {
        // Flush any remaining content
        if (accumulated) {
          onDelta(accumulated);
        }
      }
    },
    [],
  );

  // -----------------------------------------------------------------------
  // Analyze documents
  // -----------------------------------------------------------------------
  const handleAnalyze = useCallback(async () => {
    if (!oldPdf || !newPdf) return;

    setIsAnalyzing(true);
    setAnalysisResult("");
    setAnalysisError("");
    setImpactResult("");
    setImpactError("");
    localStorage.removeItem(LS_ANALYSIS);
    localStorage.removeItem(LS_IMPACT);

    try {
      // Convert base64 back to binary for upload
      const oldBlob = new Blob(
        [Uint8Array.from(atob(oldPdf.data), (c) => c.charCodeAt(0))],
        { type: "application/pdf" },
      );
      const newBlob = new Blob(
        [Uint8Array.from(atob(newPdf.data), (c) => c.charCodeAt(0))],
        { type: "application/pdf" },
      );

      const formData = new FormData();
      formData.append("old_file", oldBlob, oldPdf.name);
      formData.append("new_file", newBlob, newPdf.name);

      let finalText = "";
      await streamSSE(
        "/compare/analyze",
        formData,
        true,
        (text) => {
          finalText = text;
          setAnalysisResult(text);
        },
        analyzeAbortRef,
      );

      // Persist final result
      try {
        localStorage.setItem(LS_ANALYSIS, finalText);
      } catch {
        // ignore
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      const msg = err instanceof Error ? err.message : "Analysis failed";
      setAnalysisError(msg);
    } finally {
      setIsAnalyzing(false);
    }
  }, [oldPdf, newPdf, streamSSE]);

  // -----------------------------------------------------------------------
  // Find impacted documents
  // -----------------------------------------------------------------------
  const handleFindImpact = useCallback(async () => {
    if (!analysisResult) return;

    setIsFindingImpact(true);
    setImpactResult("");
    setImpactError("");
    localStorage.removeItem(LS_IMPACT);

    try {
      let finalText = "";
      await streamSSE(
        "/compare/impact",
        JSON.stringify({ changes_text: analysisResult }),
        false,
        (text) => {
          finalText = text;
          setImpactResult(text);
        },
        impactAbortRef,
      );

      try {
        localStorage.setItem(LS_IMPACT, finalText);
      } catch {
        // ignore
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      const msg = err instanceof Error ? err.message : "Impact analysis failed";
      setImpactError(msg);
    } finally {
      setIsFindingImpact(false);
    }
  }, [analysisResult, streamSSE]);

  // -----------------------------------------------------------------------
  // Derived state
  // -----------------------------------------------------------------------
  const bothUploaded = !!oldPdf && !!newPdf;
  const hasAnalysis = analysisResult.length > 0;
  const hasImpact = impactResult.length > 0;
  const isProcessing = isAnalyzing || isFindingImpact;

  return (
    <div className="w-full h-full bg-transparent overflow-y-auto">
      <div className="max-w-4xl mx-auto px-6 py-10 space-y-8">
        {/* ---- Header ---- */}
        <div className="flex items-center justify-between">
          <div>
            <h1
              className="text-2xl font-bold text-[var(--color-text-heading)] tracking-[-0.02em]"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Document Comparison
            </h1>
            <p className="text-sm text-[var(--color-text-muted)] mt-1">
              Upload two PDF versions to analyze what changed
            </p>
          </div>
          {(oldPdf || newPdf || hasAnalysis || hasImpact) && (
            <button
              onClick={handleClear}
              disabled={isProcessing}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-[var(--color-text-muted)] hover:text-[var(--color-error)] hover:bg-[var(--color-error)]/10 border border-[var(--color-border)]/30 hover:border-[var(--color-error)]/30 transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
            >
              <Trash2 className="h-4 w-4" />
              Clear All
            </button>
          )}
        </div>

        {/* ---- Upload Section ---- */}
        <div className="flex flex-col sm:flex-row gap-4">
          <PdfDropZone
            label="Old Version"
            file={oldPdf}
            onFile={(f) => handleSetOldPdf(f)}
            onRemove={() => handleSetOldPdf(null)}
            disabled={isProcessing}
          />
          <PdfDropZone
            label="New Version"
            file={newPdf}
            onFile={(f) => handleSetNewPdf(f)}
            onRemove={() => handleSetNewPdf(null)}
            disabled={isProcessing}
          />
        </div>

        {/* ---- Compare Button ---- */}
        <button
          onClick={handleAnalyze}
          disabled={!bothUploaded || isProcessing}
          className="w-full flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl text-white font-semibold text-[0.9375rem] bg-[var(--color-accent-primary)] hover:brightness-110 active:scale-[0.99] transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Analyzing documents...
            </>
          ) : (
            <>
              Compare Documents
              <ArrowRight className="h-5 w-5" />
            </>
          )}
        </button>

        {/* ---- Analysis Error ---- */}
        {analysisError && (
          <div className="flex items-start gap-3 p-4 rounded-xl border border-[var(--color-error)]/30 bg-[var(--color-error)]/5">
            <AlertCircle className="h-5 w-5 text-[var(--color-error)] flex-shrink-0 mt-0.5" />
            <p className="text-sm text-[var(--color-error)]">{analysisError}</p>
          </div>
        )}

        {/* ---- Analysis Result ---- */}
        {(hasAnalysis || isAnalyzing) && !analysisError && (
          <ResultCard
            title="Changes Analysis"
            icon={FileText}
            content={analysisResult}
            isStreaming={isAnalyzing}
          />
        )}

        {/* ---- Find Impacted Documents Button ---- */}
        {hasAnalysis && !isAnalyzing && (
          <button
            onClick={handleFindImpact}
            disabled={isProcessing}
            className="w-full flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl font-semibold text-[0.9375rem] border-2 border-[var(--color-accent-primary)] text-[var(--color-accent-primary)] hover:bg-[var(--color-accent-primary)]/5 active:scale-[0.99] transition-all duration-200 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            {isFindingImpact ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Searching knowledge base...
              </>
            ) : (
              <>
                <Search className="h-5 w-5" />
                Find Impacted Documents
              </>
            )}
          </button>
        )}

        {/* ---- Impact Error ---- */}
        {impactError && (
          <div className="flex items-start gap-3 p-4 rounded-xl border border-[var(--color-error)]/30 bg-[var(--color-error)]/5">
            <AlertCircle className="h-5 w-5 text-[var(--color-error)] flex-shrink-0 mt-0.5" />
            <p className="text-sm text-[var(--color-error)]">{impactError}</p>
          </div>
        )}

        {/* ---- Impact Result ---- */}
        {(hasImpact || isFindingImpact) && !impactError && (
          <ResultCard
            title="Impacted Documents"
            icon={Search}
            content={impactResult}
            isStreaming={isFindingImpact}
          />
        )}

        {/* Bottom spacer */}
        <div className="h-8" />
      </div>
    </div>
  );
}
