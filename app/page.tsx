"use client";

import { useState, useCallback } from "react";
import { Player } from "@remotion/player";
import { compileComponent } from "@/lib/compile-component";

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [videoComponent, setVideoComponent] = useState<React.FC | null>(null);
  const [rawCode, setRawCode] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: prompt }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
        return;
      }
      setRawCode(data.code);
      const compiled = compileComponent(data.code);
      if (compiled) {
        setVideoComponent(() => compiled);
      } else {
        setError("Failed to compile the generated component. Try rephrasing.");
      }
    } catch {
      setError("Generation failed. Check that Claude CLI is available.");
    } finally {
      setLoading(false);
    }
  }, [prompt]);

  const handleExport = useCallback(async () => {
    if (!rawCode) return;
    setExporting(true);
    try {
      const res = await fetch("/api/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: rawCode }),
      });
      if (!res.ok) {
        const err = await res.json();
        setError(err.error || "Export failed");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "marketing-video.mp4";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("Export failed. The render may have timed out.");
    } finally {
      setExporting(false);
    }
  }, [rawCode]);

  return (
    <div className="flex h-screen bg-[#0a0e12] text-[#e8e8e8]">
      {/* Left panel — Input */}
      <div className="w-[440px] min-w-[380px] flex flex-col border-r border-white/[0.06] bg-[#0c1016]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#e8e8e8]" />
            <h1
              className="text-[13px] font-semibold tracking-[-0.02em] uppercase text-white/70"
              style={{ fontFamily: "var(--font-jetbrains-mono), monospace" }}
            >
              Video Creator
            </h1>
          </div>
          <p className="text-[12px] text-white/30 mt-2 leading-relaxed">
            Describe a marketing video in plain English. Claude generates the
            code. Remotion renders it live.
          </p>
        </div>

        {/* Prompt area */}
        <div className="flex-1 p-5 flex flex-col gap-4">
          <div className="flex-1 flex flex-col">
            <label
              className="text-[11px] font-medium text-white/30 uppercase tracking-[0.06em] mb-2"
              style={{ fontFamily: "var(--font-jetbrains-mono), monospace" }}
            >
              Description
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={`Dark background. Bold white headline: "Stop making boring videos." Pause 2 seconds. Subtitle slides up: "AI does it in 30 seconds." Final scene: glowing accent ring expands with "Built with Claude" centered.`}
              className="flex-1 bg-white/[0.02] rounded-md p-4 resize-none text-[14px] leading-[1.7] border border-white/[0.06] focus:border-white/15 focus:outline-none placeholder:text-white/15 text-white/80 transition-colors"
              style={{ fontFamily: "var(--font-space-grotesk), system-ui" }}
            />
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3">
            <button
              onClick={handleGenerate}
              disabled={loading || !prompt.trim()}
              className="bg-[#e8e8e8] text-[#0a0e12] rounded-md py-3 text-[13px] font-semibold tracking-[-0.01em] disabled:opacity-20 hover:bg-white transition-colors cursor-pointer disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Spinner />
                  Generating...
                </span>
              ) : (
                "Generate Video"
              )}
            </button>

            {videoComponent && (
              <button
                onClick={handleExport}
                disabled={exporting}
                className="bg-transparent border border-white/[0.08] text-white/50 rounded-md py-3 text-[13px] font-medium hover:border-white/15 hover:text-white/80 transition-colors cursor-pointer disabled:opacity-20 disabled:cursor-not-allowed"
              >
                {exporting ? (
                  <span className="flex items-center justify-center gap-2">
                    <Spinner />
                    Rendering MP4...
                  </span>
                ) : (
                  "Export MP4"
                )}
              </button>
            )}
          </div>

          {error && (
            <div className="rounded-md bg-red-500/[0.06] border border-red-500/[0.12] px-4 py-3">
              <p className="text-red-400/80 text-[12px] leading-relaxed">
                {error}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/[0.04]">
          <p
            className="text-[10px] text-white/15 tracking-[0.04em]"
            style={{ fontFamily: "var(--font-jetbrains-mono), monospace" }}
          >
            Claude CLI + Remotion + Babel JIT
          </p>
        </div>
      </div>

      {/* Right panel — Preview */}
      <div className="flex-1 flex flex-col">
        {/* Preview header */}
        <div className="px-6 py-4 border-b border-white/[0.04] flex items-center justify-between">
          <span
            className="text-[11px] font-medium text-white/25 uppercase tracking-[0.06em]"
            style={{ fontFamily: "var(--font-jetbrains-mono), monospace" }}
          >
            Preview
          </span>
          {videoComponent && (
            <span
              className="text-[10px] text-white/20"
              style={{ fontFamily: "var(--font-jetbrains-mono), monospace" }}
            >
              1920×1080 · 30fps · 10s
            </span>
          )}
        </div>

        {/* Preview area */}
        <div className="flex-1 flex items-center justify-center p-8 bg-[#080b0e]">
          {videoComponent ? (
            <div className="w-full max-w-[920px]">
              <Player
                component={videoComponent}
                durationInFrames={300}
                compositionWidth={1920}
                compositionHeight={1080}
                fps={30}
                controls
                loop
                style={{
                  width: "100%",
                  borderRadius: "4px",
                  overflow: "hidden",
                }}
              />
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full border border-white/[0.06] flex items-center justify-center">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className="text-white/15 ml-0.5"
                >
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
              </div>
              <p className="text-[13px] text-white/15">
                Preview will appear here
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
      <circle
        className="opacity-20"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
      />
      <path
        className="opacity-80"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}
