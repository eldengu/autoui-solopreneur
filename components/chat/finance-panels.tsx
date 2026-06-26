"use client";

import {
  ActionProvider,
  Renderer,
  StateProvider,
  ValidationProvider,
  VisibilityProvider,
} from "@json-render/react";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import { type ComponentProps, useState } from "react";
import { registry } from "@/lib/catalog/finance-registry";
import { panels as catalogPanels } from "@/lib/catalog/panels";
import { cn } from "@/lib/utils";

type RendererSpec = ComponentProps<typeof Renderer>["spec"];

// Map panel name (e.g. "TaxPanel") -> json-render spec from the catalog.
const specByName = new Map(catalogPanels.map((p) => [p.title, p.spec]));

type Vote = 1 | -1;

function PanelFeedback({
  question,
  panel,
}: {
  question: string;
  panel: string;
}) {
  const [vote, setVote] = useState<Vote | null>(null);
  const [pending, setPending] = useState(false);

  async function sendVote(value: Vote) {
    if (pending) {
      return;
    }
    setPending(true);
    setVote(value);
    try {
      await fetch("/api/finance-feedback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question, panel, vote: value }),
      });
    } catch {
      // Non-fatal: keep the optimistic selection.
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mt-2 flex items-center justify-end gap-1.5">
      <span className="mr-1 text-[11px] text-muted-foreground">
        {vote ? "Thanks for the feedback" : "Helpful?"}
      </span>
      <button
        aria-label="Thumbs up"
        className={cn(
          "rounded-md border border-border p-1 transition-colors hover:bg-muted",
          vote === 1 && "border-emerald-500/50 bg-emerald-500/10 text-emerald-600"
        )}
        disabled={pending}
        onClick={() => sendVote(1)}
        type="button"
      >
        <ThumbsUp size={14} />
      </button>
      <button
        aria-label="Thumbs down"
        className={cn(
          "rounded-md border border-border p-1 transition-colors hover:bg-muted",
          vote === -1 && "border-rose-500/50 bg-rose-500/10 text-rose-600"
        )}
        disabled={pending}
        onClick={() => sendVote(-1)}
        type="button"
      >
        <ThumbsDown size={14} />
      </button>
    </div>
  );
}

export function FinancePanels({
  output,
}: {
  output: { question?: string; panels?: string[]; summary?: string } | undefined;
}) {
  const names = (output?.panels ?? []).filter((name) => specByName.has(name));
  const question = output?.question ?? "";

  if (names.length === 0) {
    return null;
  }

  return (
    <StateProvider initialState={{}}>
      <ActionProvider handlers={{}}>
        <VisibilityProvider>
          <ValidationProvider>
            <div className="flex w-full flex-col gap-3">
              {output?.summary && (
                <p className="text-[13px] text-foreground leading-[1.65]">
                  {output.summary}
                </p>
              )}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {names.map((name) => (
                  <div data-finance-panel={name} key={name}>
                    <Renderer
                      registry={registry}
                      spec={specByName.get(name) as unknown as RendererSpec}
                    />
                    <PanelFeedback panel={name} question={question} />
                  </div>
                ))}
              </div>
            </div>
          </ValidationProvider>
        </VisibilityProvider>
      </ActionProvider>
    </StateProvider>
  );
}
