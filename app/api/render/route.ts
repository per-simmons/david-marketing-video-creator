import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import fs from "fs";
import path from "path";
import os from "os";

export const maxDuration = 120;

export async function POST(req: Request) {
  const { code } = await req.json();

  const tmpDir = path.join(os.tmpdir(), `remotion-${Date.now()}`);
  fs.mkdirSync(tmpDir, { recursive: true });

  try {
    // Write the generated component with proper imports
    const videoCode = `
import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate, Sequence, Img } from "remotion";

${code}
`;
    fs.writeFileSync(path.join(tmpDir, "Video.tsx"), videoCode);

    // Write Remotion entry point
    fs.writeFileSync(
      path.join(tmpDir, "index.ts"),
      `
import { registerRoot } from "remotion";
import { Root } from "./Root";
registerRoot(Root);
`
    );

    fs.writeFileSync(
      path.join(tmpDir, "Root.tsx"),
      `
import React from "react";
import { Composition } from "remotion";
import Video from "./Video";
export const Root: React.FC = () => (
  <Composition id="GeneratedVideo" component={Video} durationInFrames={300} fps={30} width={1920} height={1080} />
);
`
    );

    // Write a tsconfig for the temp project
    fs.writeFileSync(
      path.join(tmpDir, "tsconfig.json"),
      JSON.stringify({
        compilerOptions: {
          target: "ES2017",
          module: "esnext",
          moduleResolution: "bundler",
          jsx: "react-jsx",
          esModuleInterop: true,
          skipLibCheck: true,
          strict: false,
        },
      })
    );

    const bundleLocation = await bundle({
      entryPoint: path.join(tmpDir, "index.ts"),
    });

    const composition = await selectComposition({
      serveUrl: bundleLocation,
      id: "GeneratedVideo",
    });

    const outputPath = path.join(tmpDir, "output.mp4");
    await renderMedia({
      composition,
      serveUrl: bundleLocation,
      codec: "h264",
      outputLocation: outputPath,
    });

    const videoBuffer = fs.readFileSync(outputPath);

    return new Response(videoBuffer, {
      headers: {
        "Content-Type": "video/mp4",
        "Content-Disposition": 'attachment; filename="marketing-video.mp4"',
      },
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Render failed";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  } finally {
    // Clean up temp directory
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // ignore cleanup errors
    }
  }
}
