import { readMemory } from "@/lib/memory/finance-memory";

// Read-only: returns the current two-part memory (declarative + procedural) so
// non-web clients (e.g. the Flutter app) can render it. No memory logic changes.
export async function GET() {
  const memory = await readMemory();
  return Response.json(memory);
}
