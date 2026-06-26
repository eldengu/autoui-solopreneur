import { connection } from "next/server";
import {
  buildDeclarativeSpec,
  buildProceduralSpec,
} from "@/lib/catalog/memory-specs";
import { readMemory } from "@/lib/memory/finance-memory";
import { MemoryView } from "./memory-view";

export default async function MemoryPage() {
  // Force per-request rendering so the page reflects the latest memory.json.
  await connection();
  const memory = await readMemory();
  const declarativeSpec = buildDeclarativeSpec(memory);
  const proceduralSpec = buildProceduralSpec(memory);

  return (
    <main className="min-h-dvh bg-background p-6 text-foreground sm:p-10">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8">
          <h1 className="font-bold text-2xl">Memory</h1>
          <p className="text-muted-foreground text-sm">
            How the assistant remembers your panel feedback. The left column is
            the append-only declarative log of individual votes; the right column
            is the procedural memory — consolidated scores per question type that
            build up from the facts on the left and steer which panels are shown
            next.
          </p>
        </header>

        <MemoryView
          declarativeSpec={declarativeSpec}
          proceduralSpec={proceduralSpec}
        />
      </div>
    </main>
  );
}
