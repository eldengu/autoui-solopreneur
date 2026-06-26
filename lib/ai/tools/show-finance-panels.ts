import { tool } from "ai";
import { z } from "zod";
import { getAvailablePanels } from "@/lib/catalog/custom-panels";

// Built-in panel names (match the `title` field of each entry in panels.ts).
// Custom panels add more names at runtime, so the tool accepts any string.
export const PANEL_NAMES = [
  "CashPanel",
  "TaxPanel",
  "IncomePanel",
  "ExpensePanel",
  "TodoPanel",
  "RunwayPanel",
] as const;

export type PanelName = (typeof PANEL_NAMES)[number];

export const showFinancePanels = tool({
  description:
    "Answer a solopreneur's money/finance/business question by displaying " +
    "interactive finance panels instead of plain text. Choose the panels most " +
    "relevant to the question and order them by importance.",
  inputSchema: z.object({
    question: z
      .string()
      .describe(
        "The user's finance question this answers, in a short canonical form " +
          "(e.g. 'How are my taxes?'). Used to record per-question feedback."
      ),
    panels: z
      .array(z.string())
      .min(1)
      .max(8)
      .describe(
        "The finance panel names to show, ordered by relevance. Use the " +
          "available panel names (built-in or custom). Pick different panels " +
          "for different questions."
      ),
    summary: z
      .string()
      .describe(
        "A one to two sentence plain-language answer to the user's question. " +
          "Do not restate every number — the panels display the details."
      ),
  }),
  // Resolve the selected panel names (built-in or custom) to their json-render
  // specs so the client can render them in the conversation.
  execute: async ({ question, panels, summary }) => {
    const available = await getAvailablePanels();
    const byName = new Map(available.map((p) => [p.name, p]));
    const specs = panels
      .map((name) => byName.get(name))
      .filter((p): p is NonNullable<typeof p> => Boolean(p))
      .map((p) => ({ name: p.name, title: p.title, spec: p.spec }));
    return { question, panels, summary, specs };
  },
});
