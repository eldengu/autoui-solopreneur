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
import { panels } from "@/lib/catalog/panels";

type RendererSpec = ComponentProps<typeof Renderer>["spec"];

export default function CatalogTestPage() {
  return (
    <StateProvider initialState={{}}>
      <ActionProvider handlers={{}}>
        <VisibilityProvider>
          <ValidationProvider>
            <CatalogTestContent />
          </ValidationProvider>
        </VisibilityProvider>
      </ActionProvider>
    </StateProvider>
  );
}

function CatalogTestContent() {
  return (
    <main className="min-h-dvh bg-background p-6 text-foreground sm:p-10">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8">
          <h1 className="font-bold text-2xl">Finance Catalog — Panel Preview</h1>
          <p className="text-muted-foreground text-sm">
            Six solopreneur finance panels rendered from json-render specs that
            compose the catalog primitives (Metric, BarGraph, LineGraph, Card,
            Badge, ProgressBar, Grid, Stack, Text, ListItem).
          </p>
        </header>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {panels.map((panel) => (
            <div data-panel={panel.id} key={panel.id}>
              <div className="mb-2 font-mono text-muted-foreground text-xs">
                {panel.title}
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
  );
}
