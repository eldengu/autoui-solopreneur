// Build json-render specs from memory.json using ONLY the existing
// finance-catalog primitives (Card, Stack, ListItem, Text, BarGraph, Metric).
// No new components or styles are introduced.

import type { FinanceMemory } from "@/lib/memory/finance-memory";
import type { PanelElement, PanelSpec } from "./panels";

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

/** LEFT column: an append-only timeline of individual votes as ListItems. */
export function buildDeclarativeSpec(memory: FinanceMemory): PanelSpec {
  const facts = [...memory.declarative].reverse(); // newest first
  const elements: Record<string, PanelElement> = {
    card: {
      type: "Card",
      props: {
        title: "Declarative — what happened",
        subtitle: `${memory.declarative.length} feedback ${
          memory.declarative.length === 1 ? "event" : "events"
        } logged, newest first`,
        accent: "#6366f1",
      },
      children: ["stack"],
    },
    stack: {
      type: "Stack",
      props: { direction: "col", gap: "sm" },
      children: [],
    },
  };

  if (facts.length === 0) {
    elements.empty = {
      type: "Text",
      props: { content: "No feedback recorded yet.", muted: true, size: "sm" },
    };
    elements.stack.children = ["empty"];
    return { root: "card", elements };
  }

  const childKeys: string[] = [];
  facts.forEach((fact, i) => {
    const key = `fact-${i}`;
    const up = fact.vote > 0;
    elements[key] = {
      type: "ListItem",
      props: {
        primary: `${fact.question} → ${fact.panel}`,
        secondary: `${fact.questionType} · ${formatTime(fact.timestamp)}`,
        badge: up ? "👍 +1" : "👎 −1",
        badgeTone: up ? "positive" : "danger",
      },
    };
    childKeys.push(key);
  });
  elements.stack.children = childKeys;

  return { root: "card", elements };
}

/** RIGHT column: consolidated per-question-type scores as BarGraphs + Metrics. */
export function buildProceduralSpec(memory: FinanceMemory): PanelSpec {
  const types = Object.keys(memory.procedural).sort();
  const elements: Record<string, PanelElement> = {
    card: {
      type: "Card",
      props: {
        title: "Procedural — what became habit",
        subtitle: `${types.length} question ${
          types.length === 1 ? "type" : "types"
        } consolidated from feedback`,
        accent: "#10b981",
      },
      children: ["stack"],
    },
    stack: {
      type: "Stack",
      props: { direction: "col", gap: "lg" },
      children: [],
    },
  };

  if (types.length === 0) {
    elements.empty = {
      type: "Text",
      props: {
        content: "No habits formed yet — vote on panels to build scores.",
        muted: true,
        size: "sm",
      },
    };
    elements.stack.children = ["empty"];
    return { root: "card", elements };
  }

  const groupKeys: string[] = [];
  types.forEach((type, i) => {
    const scores = memory.procedural[type];
    const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    const [topPanel, topScore] = ranked[0];

    const groupKey = `group-${i}`;
    const headerKey = `header-${i}`;
    const metricKey = `metric-${i}`;
    const barKey = `bar-${i}`;

    elements[headerKey] = {
      type: "Text",
      props: { content: type, weight: "medium", size: "base" },
    };
    elements[metricKey] = {
      type: "Metric",
      props: {
        label: "Preferred panel",
        value: topPanel,
        delta: `${topScore > 0 ? "+" : ""}${topScore} net votes`,
        trend: topScore > 0 ? "up" : topScore < 0 ? "down" : "flat",
      },
    };
    elements[barKey] = {
      type: "BarGraph",
      props: {
        data: ranked.map(([panel, score]) => ({
          label: panel,
          value: score,
          color: score >= 0 ? "#10b981" : "#f43f5e",
        })),
      },
    };
    elements[groupKey] = {
      type: "Stack",
      props: { direction: "col", gap: "sm" },
      children: [headerKey, metricKey, barKey],
    };
    groupKeys.push(groupKey);
  });
  elements.stack.children = groupKeys;

  return { root: "card", elements };
}
