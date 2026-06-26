import "server-only";

import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { panels as builtinPanels } from "./panels";
import type { PanelSpec } from "./panels";

// Custom panels are stored as runtime data (not source code), like memory.json.
export type CustomPanel = {
  name: string;
  title: string;
  spec: PanelSpec;
  instruction?: string;
  sources?: string[];
  createdAt: string;
};

export type AvailablePanel = {
  name: string;
  title: string;
  spec: PanelSpec;
  custom: boolean;
};

// The ONLY component types a panel spec may use — the existing finance-registry
// primitives. No new component types are allowed.
export const ALLOWED_TYPES = [
  "Card",
  "Stack",
  "Grid",
  "Metric",
  "Badge",
  "Text",
  "BarGraph",
  "LineGraph",
  "ProgressBar",
  "ListItem",
] as const;

const CUSTOM_PANELS_PATH = join(process.cwd(), "custom-panels.json");

let writeChain: Promise<unknown> = Promise.resolve();

export async function readCustomPanels(): Promise<CustomPanel[]> {
  try {
    const raw = await readFile(CUSTOM_PANELS_PATH, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as CustomPanel[]) : [];
  } catch {
    return [];
  }
}

/** All panels available to the app: the 6 built-ins plus any custom ones. */
export async function getAvailablePanels(): Promise<AvailablePanel[]> {
  const custom = await readCustomPanels();
  const builtins: AvailablePanel[] = builtinPanels.map((p) => ({
    name: p.title,
    title: p.title,
    spec: p.spec,
    custom: false,
  }));
  const customAvailable: AvailablePanel[] = custom.map((p) => ({
    name: p.name,
    title: p.title,
    spec: p.spec,
    custom: true,
  }));
  return [...builtins, ...customAvailable];
}

export async function getPanelSpecMap(): Promise<Map<string, PanelSpec>> {
  const all = await getAvailablePanels();
  return new Map(all.map((p) => [p.name, p.spec]));
}

/** Validate that a generated spec only uses allowed primitives and is well-formed. */
export function validatePanelSpec(spec: unknown): {
  ok: boolean;
  error?: string;
} {
  if (!spec || typeof spec !== "object") {
    return { ok: false, error: "spec is not an object" };
  }
  const s = spec as PanelSpec;
  if (typeof s.root !== "string" || !s.elements || typeof s.elements !== "object") {
    return { ok: false, error: "spec must have a root string and elements map" };
  }
  if (!s.elements[s.root]) {
    return { ok: false, error: `root "${s.root}" is not in elements` };
  }
  const allowed = new Set<string>(ALLOWED_TYPES);
  for (const [key, el] of Object.entries(s.elements)) {
    if (!el || typeof el !== "object") {
      return { ok: false, error: `element "${key}" is invalid` };
    }
    if (!allowed.has(el.type)) {
      return {
        ok: false,
        error: `element "${key}" uses disallowed type "${el.type}"`,
      };
    }
    if (el.children) {
      if (!Array.isArray(el.children)) {
        return { ok: false, error: `element "${key}" children must be an array` };
      }
      for (const child of el.children) {
        if (!s.elements[child]) {
          return {
            ok: false,
            error: `element "${key}" references missing child "${child}"`,
          };
        }
      }
    }
  }
  return { ok: true };
}

function pascalCase(input: string): string {
  const cleaned = input
    .replace(/[^a-zA-Z0-9 ]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join("");
  return cleaned || "Custom";
}

/** Generate a unique panel identifier that doesn't collide with existing names. */
export async function generatePanelName(title: string): Promise<string> {
  const existing = new Set((await getAvailablePanels()).map((p) => p.name));
  let base = pascalCase(title);
  if (!base.endsWith("Panel")) {
    base = `${base}Panel`;
  }
  if (!existing.has(base)) {
    return base;
  }
  let i = 2;
  while (existing.has(`${base}${i}`)) {
    i++;
  }
  return `${base}${i}`;
}

/** Append a new custom panel to custom-panels.json (serialized writes). */
export function addCustomPanel(
  panel: CustomPanel
): Promise<CustomPanel[]> {
  const run = writeChain.then(async () => {
    const current = await readCustomPanels();
    const next = [...current, panel];
    await writeFile(
      CUSTOM_PANELS_PATH,
      `${JSON.stringify(next, null, 2)}\n`,
      "utf8"
    );
    return next;
  });
  writeChain = run.catch(() => []);
  return run;
}
