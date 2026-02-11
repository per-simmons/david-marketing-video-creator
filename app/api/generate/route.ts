import { execFile } from "child_process";
import { promisify } from "util";
import { writeFileSync, unlinkSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

const execFileAsync = promisify(execFile);

const SYSTEM_PROMPT = `You are a Remotion video component generator. Given a description of a marketing video, generate a single React component that uses Remotion primitives to create the described animation.

Rules:
- Export a default React.FC component
- Use these imports (they will be injected, do NOT include import statements):
  React, AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate, Sequence, Img
- The video is 1920x1080 at 30fps, 300 frames total (10 seconds)
- Use spring() for bounce/entrance animations
- Use interpolate() with { extrapolateRight: "clamp" } for smooth transitions
- Use <Sequence from={X} durationInFrames={Y}> for scene transitions
- Use <AbsoluteFill> for full-screen positioning
- Keep it to 3-4 scenes max for a 10-second video (300 frames)
- Use inline styles (no CSS imports)
- Make it visually polished: dark backgrounds (#0b1215, #1a1a2e), clean typography (system fonts), smooth animations
- Do NOT use any external dependencies beyond Remotion primitives
- Do NOT use Img or any image loading
- Return ONLY the raw component code
- Do NOT wrap the code in markdown code fences or backticks
- Do NOT include any explanation or commentary
- The component must be a function expression assigned to a variable or a named function declaration, then exported as default
- Example structure:
  const MyVideo: React.FC = () => { ... };
  export default MyVideo;`;

export async function POST(req: Request) {
  const { description } = await req.json();

  const fullPrompt = `${SYSTEM_PROMPT}\n\nCreate a 10-second marketing video component for: ${description}`;

  // Write prompt to a temp file to avoid shell escaping issues
  const tmpFile = join(tmpdir(), `claude-prompt-${Date.now()}.txt`);
  writeFileSync(tmpFile, fullPrompt);

  try {
    const { stdout } = await execFileAsync(
      "/bin/sh",
      ["-c", `cat "${tmpFile}" | claude --print`],
      { timeout: 90000, maxBuffer: 1024 * 1024 }
    );

    // Clean up the response
    let code = stdout.trim();

    // Strip markdown fences
    code = code.replace(/^```(?:tsx?|jsx?|javascript|typescript)?\s*\n?/gm, "");
    code = code.replace(/```\s*$/gm, "");

    // Strip preamble text before the actual code
    // Look for the first line that looks like code (const, function, import, //, etc.)
    const lines = code.split("\n");
    const codeStartIdx = lines.findIndex((line) =>
      /^\s*(const |let |var |function |\/\/|\/\*|import |export )/.test(line)
    );
    if (codeStartIdx > 0) {
      code = lines.slice(codeStartIdx).join("\n");
    }

    // Strip trailing explanation text after the code ends
    // Code ends at the last "export default" line or last closing brace/semicolon before explanation
    const exportDefaultIdx = code.lastIndexOf("export default");
    if (exportDefaultIdx !== -1) {
      // Find the end of the export default statement
      const afterExport = code.indexOf("\n", exportDefaultIdx);
      if (afterExport !== -1) {
        const remaining = code.slice(afterExport + 1).trim();
        // If what follows looks like explanation text (starts with **, -, or a sentence)
        if (/^(\*\*|---|[A-Z][a-z]|This |The |What |How |Note)/.test(remaining)) {
          code = code.slice(0, afterExport + 1).trim();
        }
      }
    }

    code = code.trim();

    return new Response(JSON.stringify({ code }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  } finally {
    try {
      unlinkSync(tmpFile);
    } catch {
      // ignore
    }
  }
}
