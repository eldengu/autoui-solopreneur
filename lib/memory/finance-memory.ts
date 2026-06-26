import "server-only";

import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

// Two-part memory inspired by human memory models:
// - declarative: append-only log of individual facts ("what happened").
// - procedural: derived per-questionType panel scores ("the consolidated skill"),
//   always recomputed from the declarative log.

export type Vote = 1 | -1;

export type DeclarativeFact = {
  question: string;
  questionType: string;
  panel: string;
  vote: Vote;
  timestamp: string;
};

export type ProceduralScores = Record<string, Record<string, number>>;

export type FinanceMemory = {
  declarative: DeclarativeFact[];
  procedural: ProceduralScores;
};

const MEMORY_PATH = join(process.cwd(), "memory.json");

const EMPTY_MEMORY: FinanceMemory = { declarative: [], procedural: {} };

// Serialize read-modify-write so concurrent feedback requests don't clobber.
let writeChain: Promise<unknown> = Promise.resolve();

/**
 * Classify a free-text finance question into a coarse "question type" bucket.
 * Procedural scores are keyed by these buckets so learning generalizes across
 * similarly-phrased questions.
 */
export function classifyQuestion(question: string): string {
  const q = question.toLowerCase();
  if (/\btax(es|ed)?\b|irs|deduction|write[- ]?off/.test(q)) {
    return "taxes";
  }
  if (/runway|going under|burn|run out|survive|how long|last\b/.test(q)) {
    return "runway";
  }
  if (/income|revenue|earn|made|sales|client|invoice paid/.test(q)) {
    return "income";
  }
  if (/spend|expense|cost|where.*money go|burn rate|budget/.test(q)) {
    return "expenses";
  }
  if (/cash|bank|balance|how much.*(have|left)|liquid/.test(q)) {
    return "cash";
  }
  if (/business|doing|overall|overview|how am i|how's it going|health/.test(q)) {
    return "overview";
  }
  return "general";
}

export async function readMemory(): Promise<FinanceMemory> {
  try {
    const raw = await readFile(MEMORY_PATH, "utf8");
    const parsed = JSON.parse(raw) as Partial<FinanceMemory>;
    return {
      declarative: parsed.declarative ?? [],
      procedural: parsed.procedural ?? {},
    };
  } catch {
    return { declarative: [], procedural: {} };
  }
}

/** Recompute procedural scores from the full declarative log. */
export function recomputeProcedural(
  declarative: DeclarativeFact[]
): ProceduralScores {
  const scores: ProceduralScores = {};
  for (const fact of declarative) {
    const byType = (scores[fact.questionType] ??= {});
    byType[fact.panel] = (byType[fact.panel] ?? 0) + fact.vote;
  }
  return scores;
}

/**
 * Append one fact to the declarative log and recompute procedural scores.
 * Returns the before/after snapshots of memory.
 */
export function recordFeedback(input: {
  question: string;
  panel: string;
  vote: Vote;
}): Promise<{ before: FinanceMemory; after: FinanceMemory }> {
  const run = writeChain.then(async () => {
    const before = await readMemory();

    const fact: DeclarativeFact = {
      question: input.question,
      questionType: classifyQuestion(input.question),
      panel: input.panel,
      vote: input.vote,
      timestamp: new Date().toISOString(),
    };

    const declarative = [...before.declarative, fact];
    const after: FinanceMemory = {
      declarative,
      procedural: recomputeProcedural(declarative),
    };

    await writeFile(MEMORY_PATH, `${JSON.stringify(after, null, 2)}\n`, "utf8");
    return { before, after };
  });

  // Keep the chain alive even if this run rejects.
  writeChain = run.catch(() => EMPTY_MEMORY);
  return run;
}

export async function getProceduralScores(): Promise<ProceduralScores> {
  const memory = await readMemory();
  return memory.procedural;
}

/**
 * Format procedural scores as a short guidance block for the system prompt so
 * Claude prefers higher-scored panels for similar future questions.
 */
export function formatProceduralForPrompt(procedural: ProceduralScores): string {
  const types = Object.keys(procedural);
  if (types.length === 0) {
    return "";
  }

  const lines: string[] = [];
  for (const type of types) {
    const ranked = Object.entries(procedural[type])
      .filter(([, score]) => score !== 0)
      .sort((a, b) => b[1] - a[1])
      .map(([panel, score]) => `${panel} (${score > 0 ? "+" : ""}${score})`);
    if (ranked.length > 0) {
      lines.push(`- ${type}: ${ranked.join(", ")}`);
    }
  }

  if (lines.length === 0) {
    return "";
  }

  return `\n\nLearned panel preferences from user feedback (higher score = more useful; prefer higher-scored panels, avoid clearly negative ones for that question type):\n${lines.join(
    "\n"
  )}`;
}
