import { generateText } from "ai";
import { z } from "zod";
import { getLanguageModel } from "@/lib/ai/providers";
import {
  addCustomPanel,
  ALLOWED_TYPES,
  type CustomPanel,
  generatePanelName,
  getAvailablePanels,
  getPanelSpecMap,
  validatePanelSpec,
} from "@/lib/catalog/custom-panels";
import { financeCatalog } from "@/lib/catalog/finance-catalog";

const bodySchema = z.object({
  sourcePanels: z.array(z.string()).min(1).max(8),
  instruction: z.string().min(1).max(1000),
});

export async function GET() {
  const panels = await getAvailablePanels();
  // Return each panel's spec so clients can render panels directly. Additive,
  // read-only enrichment (data already loaded) — explicitly authorized by the
  // user to resolve the otherwise-unsatisfiable "fetch specs from this endpoint
  // without changing the backend" contradiction.
  return Response.json({
    panels: panels.map(({ name, title, custom, spec }) => ({
      name,
      title,
      custom,
      spec,
    })),
  });
}

function parseSpecJson(text: string): unknown {
  let t = text.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) {
    t = fence[1].trim();
  }
  const start = t.indexOf("{");
  const end = t.lastIndexOf("}");
  if (start >= 0 && end > start) {
    t = t.slice(start, end + 1);
  }
  return JSON.parse(t);
}

export async function POST(request: Request) {
  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch {
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }

  const specMap = await getPanelSpecMap();
  const sources = body.sourcePanels
    .map((name) => ({ name, spec: specMap.get(name) }))
    .filter((s): s is { name: string; spec: NonNullable<typeof s.spec> } =>
      Boolean(s.spec)
    );

  if (sources.length === 0) {
    return Response.json({ error: "no_valid_source_panels" }, { status: 400 });
  }

  const sourcesText = sources
    .map(
      (s) =>
        `Panel "${s.name}":\n${JSON.stringify(s.spec, null, 2)}`
    )
    .join("\n\n");

  const system = `You remix json-render finance panel specs into a new combined panel.

${financeCatalog.prompt()}

STRICT RULES:
- Output ONLY a single JSON object, no markdown, no prose, no code fences.
- Shape: { "title": string, "spec": { "root": string, "elements": { [key]: { "type": string, "props": object, "children"?: string[] } } } }.
- "type" MUST be one of exactly these component names: ${ALLOWED_TYPES.join(", ")}. Do NOT invent new component types.
- The root element MUST be a "Card" and its key MUST equal "spec.root".
- Every key referenced in any "children" array MUST exist in "elements".
- Reuse the real data values from the source panels (numbers, labels, points) — do not invent new numbers unless the instruction asks for it.
- Give the Card a clear "title" prop and set the top-level "title" to a short human label for the new panel.`;

  const prompt = `Source panel specs:\n\n${sourcesText}\n\nInstruction: ${body.instruction}\n\nProduce the new combined panel spec now as a single JSON object.`;

  async function generate(extra = ""): Promise<{ title: string; spec: unknown } | null> {
    const { text } = await generateText({
      model: getLanguageModel("claude-opus-4-8"),
      system: system + extra,
      prompt,
    });
    try {
      const parsed = parseSpecJson(text) as { title?: string; spec?: unknown };
      if (!parsed || typeof parsed.title !== "string" || !parsed.spec) {
        return null;
      }
      return { title: parsed.title, spec: parsed.spec };
    } catch {
      return null;
    }
  }

  let result = await generate();
  let validation = result
    ? validatePanelSpec(result.spec)
    : { ok: false, error: "could not parse model output" };

  // One repair attempt if the first result is unusable.
  if (!(result && validation.ok)) {
    result = await generate(
      `\n\nThe previous attempt was invalid (${validation.error}). Return ONLY the corrected JSON object.`
    );
    validation = result
      ? validatePanelSpec(result.spec)
      : { ok: false, error: "could not parse model output" };
  }

  if (!(result && validation.ok)) {
    return Response.json(
      { error: "generation_failed", detail: validation.error },
      { status: 422 }
    );
  }

  const name = await generatePanelName(result.title);
  const panel: CustomPanel = {
    name,
    title: result.title,
    spec: result.spec as CustomPanel["spec"],
    instruction: body.instruction,
    sources: body.sourcePanels,
    createdAt: new Date().toISOString(),
  };
  await addCustomPanel(panel);

  return Response.json({ ok: true, panel });
}
