import * as Babel from "@babel/standalone";
import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
  Sequence,
  Img,
} from "remotion";

export function compileComponent(code: string): React.FC | null {
  try {
    let stripped = code
      // Strip import statements
      .replace(/^import\s+.*$/gm, "")
      // Strip markdown code fences
      .replace(/```[\s\S]*?```/g, "")
      .replace(/```\w*\s*/g, "")
      .replace(/```\s*/g, "")
      .trim();

    // Strip preamble text (anything before the first code line)
    const lines = stripped.split("\n");
    const codeStartIdx = lines.findIndex((line) =>
      /^\s*(const |let |var |function |\/\/|\/\*|export )/.test(line)
    );
    if (codeStartIdx > 0) {
      stripped = lines.slice(codeStartIdx).join("\n");
    }

    // Handle "export default ComponentName;" at end
    const defaultExportMatch = stripped.match(
      /export\s+default\s+(\w+)\s*;?\s*$/m
    );
    if (defaultExportMatch) {
      const name = defaultExportMatch[1];
      stripped = stripped.replace(
        /export\s+default\s+\w+\s*;?\s*$/m,
        `const __Component__ = ${name};`
      );
    }

    // Handle "export default function X" or "export default const X"
    stripped = stripped.replace(
      /^export\s+default\s+/m,
      "const __Component__ = "
    );

    // Handle remaining exports
    stripped = stripped.replace(/^export\s+/gm, "");

    // If there's still no __Component__, find the main component declaration
    if (!stripped.includes("__Component__")) {
      // Look for React.FC type annotation or function component patterns
      const fcMatch = stripped.match(
        /(?:const|function)\s+(\w+)\s*(?::\s*React\.FC)?/
      );
      if (fcMatch) {
        const name = fcMatch[1];
        stripped += `\nconst __Component__ = ${name};`;
      }
    }

    const transpiled = Babel.transform(stripped, {
      presets: ["react", "typescript"],
      filename: "component.tsx",
    });

    if (!transpiled?.code) return null;

    const factory = new Function(
      "React",
      "AbsoluteFill",
      "useCurrentFrame",
      "useVideoConfig",
      "spring",
      "interpolate",
      "Sequence",
      "Img",
      `${transpiled.code}\nreturn typeof __Component__ !== "undefined" ? __Component__ : null;`
    );

    return factory(
      React,
      AbsoluteFill,
      useCurrentFrame,
      useVideoConfig,
      spring,
      interpolate,
      Sequence,
      Img
    );
  } catch (err) {
    console.error("JIT compilation failed:", err);
    return null;
  }
}
