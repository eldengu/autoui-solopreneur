"use client";

import {
  ActionProvider,
  Renderer,
  StateProvider,
  ValidationProvider,
  VisibilityProvider,
} from "@json-render/react";
import type { ComponentProps } from "react";
import { registry } from "@/lib/catalog/finance-registry";
import { panels as catalogPanels } from "@/lib/catalog/panels";

type RendererSpec = ComponentProps<typeof Renderer>["spec"];

// Map panel name (e.g. "TaxPanel") -> json-render spec from the catalog.
const specByName = new Map(catalogPanels.map((p) => [p.title, p.spec]));

export function FinancePanels({
  output,
}: {
  output: { panels?: string[]; summary?: string } | undefined;
}) {
  const names = (output?.panels ?? []).filter((name) => specByName.has(name));

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
