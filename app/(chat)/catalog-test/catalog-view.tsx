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
import type { PanelSpec } from "@/lib/catalog/panels";

type RendererSpec = ComponentProps<typeof Renderer>["spec"];

type CatalogPanel = {
  name: string;
  title: string;
  spec: PanelSpec;
  custom: boolean;
};

export function CatalogTestView({ panels }: { panels: CatalogPanel[] }) {
  return (
    <StateProvider initialState={{}}>
      <ActionProvider handlers={{}}>
        <VisibilityProvider>
          <ValidationProvider>
            <main className="min-h-dvh bg-background p-6 text-foreground sm:p-10">
              <div className="mx-auto max-w-6xl">
                <header className="mb-8">
                  <h1 className="font-bold text-2xl">
                    Finance Catalog — Panel Preview
                  </h1>
                  <p className="text-muted-foreground text-sm">
                    Built-in solopreneur finance panels plus any custom panels
                    you remixed, all rendered from json-render specs that compose
                    the catalog primitives (Metric, BarGraph, LineGraph, Card,
                    Badge, ProgressBar, Grid, Stack, Text, ListItem).
                  </p>
                </header>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                  {panels.map((panel) => (
                    <div data-panel={panel.name} key={panel.name}>
                      <div className="mb-2 flex items-center gap-2 font-mono text-muted-foreground text-xs">
                        {panel.name}
                        {panel.custom && (
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] text-primary">
                            custom
                          </span>
                        )}
                      </div>
                      <Renderer
                        registry={registry}
                        spec={panel.spec as unknown as RendererSpec}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </main>
          </ValidationProvider>
        </VisibilityProvider>
      </ActionProvider>
    </StateProvider>
  );
}
