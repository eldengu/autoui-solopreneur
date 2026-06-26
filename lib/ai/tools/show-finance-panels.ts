import { tool } from "ai";
import { z } from "zod";

// Panel names match the `title` field of each entry in lib/catalog/panels.ts.
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
      .array(z.enum(PANEL_NAMES))
      .min(1)
      .max(6)
      .describe(
        "The finance panel component names to show, ordered by relevance. " +
          "Pick different panels for different questions."
      ),
    summary: z
      .string()
      .describe(
        "A one to two sentence plain-language answer to the user's question. " +
          "Do not restate every number — the panels display the details."
      ),
  }),
  // The tool's structured input is echoed back as output so the client can map
  // the panel names to json-render specs and render them in the conversation.
  execute: ({ question, panels, summary }) =>
    Promise.resolve({ question, panels, summary }),
});
