import { z } from "zod";
import { PANEL_NAMES } from "@/lib/ai/tools/show-finance-panels";
import { recordFeedback } from "@/lib/memory/finance-memory";

const bodySchema = z.object({
  question: z.string().min(1).max(500),
  panel: z.enum(PANEL_NAMES),
  vote: z.union([z.literal(1), z.literal(-1)]),
});

export async function POST(request: Request) {
  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch {
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }

  const { before, after } = await recordFeedback(body);

  return Response.json({ ok: true, before, after });
}
