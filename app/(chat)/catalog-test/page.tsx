import { connection } from "next/server";
import { getAvailablePanels } from "@/lib/catalog/custom-panels";
import { CatalogTestView } from "./catalog-view";

export default async function CatalogTestPage() {
  // Force per-request rendering so newly created custom panels show up.
  await connection();
  const panels = await getAvailablePanels();

  return (
    <CatalogTestView
      panels={panels.map((p) => ({
        name: p.name,
        title: p.title,
        spec: p.spec,
        custom: p.custom,
      }))}
    />
  );
}
