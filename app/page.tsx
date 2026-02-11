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
    <div className="flex h-screen bg-[#0b1215] text-white font-sans">
      {/* Left panel */}
      <div className="w-[480px] min-w-[400px] flex flex-col border-r border-white/[0.06]">
        <div className="px-6 py-5 border-b border-white/[0.06]">
          <h1 className="text-[15px] font-semibold tracking-[-0.01em] text-white/90">
            Video Creator
          </h1>
          <p className="text-[13px] text-white/40 mt-1">
            Describe your video. Claude writes the code. Remotion renders it.
          </p>
        </div>

        <div className="flex-1 p-6 flex flex-col gap-4">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={`Dark background. Large white text fades in: "Stop making boring videos." Pause. Then smaller text slides up: "AI does it in 30 seconds." End with a gradient swoosh and "Built with Claude Code" centered.`}
            className="flex-1 bg-white/[0.03] rounded-lg p-4 resize-none text-[14px] leading-relaxed border border-white/[0.08] focus:border-white/20 focus:outline-none placeholder:text-white/20 text-white/80"
          />

          <button
            onClick={handleGenerate}
            disabled={loading || !prompt.trim()}
            className="bg-white text-[#0b1215] rounded-lg py-3 text-[14px] font-semibold disabled:opacity-30 hover:bg-white/90 transition-colors cursor-pointer disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg
                  className="animate-spin h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="3"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
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
              className="bg-transparent border border-white/[0.12] text-white/70 rounded-lg py-3 text-[14px] font-medium hover:border-white/25 hover:text-white/90 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {exporting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="animate-spin h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="3"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Rendering MP4...
                </span>
              ) : (
                "Export MP4"
              )}
            </button>
          )}

          {error && (
            <p className="text-red-400/80 text-[13px] leading-relaxed">
              {error}
            </p>
          )}
        </div>
      </div>

      {/* Right panel — video preview */}
      <div className="flex-1 flex items-center justify-center p-8 bg-[#080d10]">
        {videoComponent ? (
          <div className="w-full max-w-[960px]">
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
                borderRadius: "8px",
                overflow: "hidden",
              }}
            />
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 text-white/20">
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            <p className="text-[14px]">Preview will appear here</p>
          </div>
        )}
      </div>
    </div>
  );
}
