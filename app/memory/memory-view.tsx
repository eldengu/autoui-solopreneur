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

export function MemoryView({
  declarativeSpec,
  proceduralSpec,
}: {
  declarativeSpec: PanelSpec;
  proceduralSpec: PanelSpec;
}) {
  return (
    <StateProvider initialState={{}}>
      <ActionProvider handlers={{}}>
        <VisibilityProvider>
          <ValidationProvider>
            <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
              <Renderer
                registry={registry}
                spec={declarativeSpec as unknown as RendererSpec}
              />
              <Renderer
                registry={registry}
                spec={proceduralSpec as unknown as RendererSpec}
              />
            </div>
          </ValidationProvider>
        </VisibilityProvider>
      </ActionProvider>
    </StateProvider>
  );
}
