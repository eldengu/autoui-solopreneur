"use client";

import { defineRegistry } from "@json-render/react";
import type { ReactNode } from "react";
import { financeCatalog } from "./finance-catalog";

type Tone = "neutral" | "positive" | "warning" | "danger" | "info";

const toneText: Record<Tone, string> = {
  neutral: "text-zinc-600 dark:text-zinc-300",
  positive: "text-emerald-600 dark:text-emerald-400",
  warning: "text-amber-600 dark:text-amber-400",
  danger: "text-rose-600 dark:text-rose-400",
  info: "text-sky-600 dark:text-sky-400",
};

const toneBadge: Record<Tone, string> = {
  neutral: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200",
  positive:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  warning: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  danger: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
  info: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
};

const toneBar: Record<Tone, string> = {
  neutral: "bg-zinc-400",
  positive: "bg-emerald-500",
  warning: "bg-amber-500",
  danger: "bg-rose-500",
  info: "bg-sky-500",
};

const gapClass = (gap?: "sm" | "md" | "lg") =>
  gap === "sm" ? "gap-2" : gap === "lg" ? "gap-6" : "gap-4";

const trendGlyph = (trend?: "up" | "down" | "flat") =>
  trend === "up" ? "▲" : trend === "down" ? "▼" : "→";

const trendColor = (trend?: "up" | "down" | "flat") =>
  trend === "up"
    ? "text-emerald-600 dark:text-emerald-400"
    : trend === "down"
      ? "text-rose-600 dark:text-rose-400"
      : "text-zinc-500";

export const { registry } = defineRegistry(financeCatalog, {
  components: {
    Card: ({ props, children }) => (
      <section
        className="rounded-xl border border-border bg-card p-5 shadow-sm"
        style={
          props.accent
            ? { borderTopWidth: 3, borderTopColor: props.accent }
            : undefined
        }
      >
        {(props.title || props.subtitle) && (
          <header className="mb-4">
            {props.title && (
              <h2 className="font-semibold text-base text-foreground">
                {props.title}
              </h2>
            )}
            {props.subtitle && (
              <p className="text-muted-foreground text-sm">{props.subtitle}</p>
            )}
          </header>
        )}
        {children as ReactNode}
      </section>
    ),

    Stack: ({ props, children }) => (
      <div
        className={`flex ${
          props.direction === "row" ? "flex-row items-center" : "flex-col"
        } ${gapClass(props.gap)}`}
      >
        {children as ReactNode}
      </div>
    ),

    Grid: ({ props, children }) => (
      <div
        className={`grid ${gapClass(props.gap)}`}
        style={{
          gridTemplateColumns: `repeat(${props.columns ?? 2}, minmax(0, 1fr))`,
        }}
      >
        {children as ReactNode}
      </div>
    ),

    Metric: ({ props }) => (
      <div className="rounded-lg bg-muted/40 p-3">
        <div className="text-muted-foreground text-xs uppercase tracking-wide">
          {props.label}
        </div>
        <div className="mt-1 font-semibold text-foreground text-2xl tabular-nums">
          {props.value}
        </div>
        {props.delta && (
          <div className={`mt-0.5 text-sm ${trendColor(props.trend)}`}>
            {trendGlyph(props.trend)} {props.delta}
          </div>
        )}
        {props.hint && (
          <div className="mt-0.5 text-muted-foreground text-xs">
            {props.hint}
          </div>
        )}
      </div>
    ),

    Badge: ({ props }) => (
      <span
        className={`inline-flex w-fit items-center rounded-full px-2.5 py-1 font-medium text-xs ${
          toneBadge[(props.tone as Tone) ?? "neutral"]
        }`}
      >
        {props.label}
      </span>
    ),

    Text: ({ props }) => {
      const size =
        props.size === "lg" ? "text-lg" : props.size === "sm" ? "text-sm" : "";
      const weight =
        props.weight === "bold"
          ? "font-bold"
          : props.weight === "medium"
            ? "font-medium"
            : "";
      return (
        <p
          className={`${size} ${weight} ${
            props.muted ? "text-muted-foreground" : "text-foreground"
          }`}
        >
          {props.content}
        </p>
      );
    },

    BarGraph: ({ props }) => {
      const data = props.data ?? [];
      const max =
        props.max ?? Math.max(1, ...data.map((d) => d.value));
      return (
        <div className="flex flex-col gap-2">
          {data.map((d) => (
            <div key={d.label} className="flex items-center gap-2">
              <div className="w-24 shrink-0 truncate text-muted-foreground text-xs">
                {d.label}
              </div>
              <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{
                    width: `${(d.value / max) * 100}%`,
                    backgroundColor: d.color,
                  }}
                />
              </div>
              <div className="w-20 shrink-0 text-right text-foreground text-xs tabular-nums">
                {props.unit ?? ""}
                {d.value.toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      );
    },

    LineGraph: ({ props }) => {
      const points = props.points ?? [];
      const w = 240;
      const h = 64;
      const pad = 4;
      const min = Math.min(...points);
      const max = Math.max(...points);
      const range = max - min || 1;
      const coords = points.map((p, i) => {
        const x =
          pad + (i / Math.max(1, points.length - 1)) * (w - pad * 2);
        const y = h - pad - ((p - min) / range) * (h - pad * 2);
        return [x, y] as const;
      });
      const line = coords.map(([x, y]) => `${x},${y}`).join(" ");
      const area = `${pad},${h - pad} ${line} ${w - pad},${h - pad}`;
      const stroke = props.color ?? "var(--color-primary, #6366f1)";
      return (
        <div className="w-full">
          <svg
            aria-label="line chart"
            className="w-full"
            height={h}
            preserveAspectRatio="none"
            role="img"
            viewBox={`0 0 ${w} ${h}`}
          >
            <polygon fill={stroke} opacity={0.12} points={area} />
            <polyline
              fill="none"
              points={line}
              stroke={stroke}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
            />
          </svg>
          {props.labels && (
            <div className="mt-1 flex justify-between text-muted-foreground text-[10px]">
              {props.labels.map((l) => (
                <span key={l}>{l}</span>
              ))}
            </div>
          )}
        </div>
      );
    },

    ProgressBar: ({ props }) => {
      const pct = Math.min(100, Math.max(0, (props.value / props.max) * 100));
      const t = (props.tone as Tone) ?? "info";
      return (
        <div>
          {props.label && (
            <div className="mb-1 flex justify-between text-muted-foreground text-xs">
              <span>{props.label}</span>
              <span className="tabular-nums">{Math.round(pct)}%</span>
            </div>
          )}
          <div className="h-2.5 overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full rounded-full ${toneBar[t]}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      );
    },

    ListItem: ({ props }) => (
      <div className="flex items-center justify-between gap-3 border-border border-b py-2 last:border-b-0">
        <div className="min-w-0">
          <div
            className={`truncate text-sm ${
              props.done
                ? "text-muted-foreground line-through"
                : "text-foreground"
            }`}
          >
            {props.primary}
          </div>
          {props.secondary && (
            <div className="truncate text-muted-foreground text-xs">
              {props.secondary}
            </div>
          )}
        </div>
        {props.badge && (
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 font-medium text-xs ${
              toneBadge[(props.badgeTone as Tone) ?? "neutral"]
            }`}
          >
            {props.badge}
          </span>
        )}
      </div>
    ),
  },
});
