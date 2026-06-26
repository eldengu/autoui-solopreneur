import { defineCatalog } from "@json-render/core";
import { schema } from "@json-render/react/schema";
import { z } from "zod";

// Primitive ("built-in") components for the solopreneur finance catalog.
// The 6 finance panels are json-render specs that compose these primitives.
const tone = z
  .enum(["neutral", "positive", "warning", "danger", "info"])
  .optional();

const barDatum = z.object({
  label: z.string(),
  value: z.number(),
  color: z.string().optional(),
});

export const financeCatalog = defineCatalog(schema, {
  components: {
    Card: {
      props: z.object({
        title: z.string().optional(),
        subtitle: z.string().optional(),
        accent: z.string().optional(),
      }),
      description: "A titled container that holds other components.",
    },
    Stack: {
      props: z.object({
        direction: z.enum(["row", "col"]).optional(),
        gap: z.enum(["sm", "md", "lg"]).optional(),
      }),
      description: "Vertical or horizontal flex layout container.",
    },
    Grid: {
      props: z.object({
        columns: z.number().optional(),
        gap: z.enum(["sm", "md", "lg"]).optional(),
      }),
      description: "Responsive grid layout container.",
    },
    Metric: {
      props: z.object({
        label: z.string(),
        value: z.string(),
        delta: z.string().optional(),
        trend: z.enum(["up", "down", "flat"]).optional(),
        hint: z.string().optional(),
      }),
      description: "A single KPI: label, big value, optional delta and hint.",
    },
    Badge: {
      props: z.object({
        label: z.string(),
        tone,
      }),
      description: "A small colored status pill.",
    },
    Text: {
      props: z.object({
        content: z.string(),
        muted: z.boolean().optional(),
        size: z.enum(["sm", "base", "lg"]).optional(),
        weight: z.enum(["normal", "medium", "bold"]).optional(),
      }),
      description: "A line of text.",
    },
    BarGraph: {
      props: z.object({
        data: z.array(barDatum),
        unit: z.string().optional(),
        max: z.number().optional(),
      }),
      description: "Horizontal bar chart from {label,value} data.",
    },
    LineGraph: {
      props: z.object({
        points: z.array(z.number()),
        labels: z.array(z.string()).optional(),
        unit: z.string().optional(),
        color: z.string().optional(),
      }),
      description: "A compact sparkline / line chart from numeric points.",
    },
    ProgressBar: {
      props: z.object({
        value: z.number(),
        max: z.number(),
        label: z.string().optional(),
        tone,
      }),
      description: "A labeled progress bar showing value vs max.",
    },
    ListItem: {
      props: z.object({
        primary: z.string(),
        secondary: z.string().optional(),
        badge: z.string().optional(),
        badgeTone: tone,
        done: z.boolean().optional(),
      }),
      description: "A row with primary/secondary text and an optional badge.",
    },
  },
  actions: {},
});
