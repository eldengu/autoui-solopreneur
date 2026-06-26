"use client";

import { PlusIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";

type AvailablePanel = { name: string; title: string; custom: boolean };

export function PanelRemixButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [panels, setPanels] = useState<AvailablePanel[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [instruction, setInstruction] = useState("");
  const [loading, setLoading] = useState(false);

  async function loadPanels() {
    try {
      const res = await fetch("/api/custom-panels");
      const data = await res.json();
      setPanels(data.panels ?? []);
    } catch {
      toast.error("Could not load panels");
    }
  }

  function toggle(name: string) {
    setSelected((cur) =>
      cur.includes(name) ? cur.filter((n) => n !== name) : [...cur, name]
    );
  }

  async function create() {
    if (selected.length === 0) {
      toast.error("Select at least one panel to combine");
      return;
    }
    if (!instruction.trim()) {
      toast.error("Describe how to combine the panels");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/custom-panels", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sourcePanels: selected,
          instruction: instruction.trim(),
        }),
      });
      const data = await res.json();
      if (!(res.ok && data.ok)) {
        toast.error(
          data.detail ? `Failed: ${data.detail}` : "Failed to create panel"
        );
        return;
      }
      toast.success(`Created "${data.panel.name}" — see it on the Catalog page`);
      setOpen(false);
      setSelected([]);
      setInstruction("");
      router.refresh();
    } catch {
      toast.error("Failed to create panel");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog
      onOpenChange={(o) => {
        setOpen(o);
        if (o) {
          loadPanels();
        }
      }}
      open={open}
    >
      <DialogTrigger asChild>
        <Button
          aria-label="Create custom panel"
          className="h-7 w-7 rounded-lg border border-border/40 p-1 text-muted-foreground transition-colors hover:border-border hover:text-foreground"
          type="button"
          variant="ghost"
        >
          <PlusIcon size={14} style={{ width: 14, height: 14 }} />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a custom panel</DialogTitle>
          <DialogDescription>
            Select one or more panels and describe how to combine them. Claude
            builds a new panel from the existing primitives and saves it.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Panels to combine</Label>
            <div className="flex flex-wrap gap-2">
              {panels.length === 0 && (
                <span className="text-muted-foreground text-xs">Loading…</span>
              )}
              {panels.map((p) => (
                <button
                  className={cn(
                    "rounded-lg border px-2.5 py-1 text-xs transition-colors",
                    selected.includes(p.name)
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border text-muted-foreground hover:bg-muted"
                  )}
                  key={p.name}
                  onClick={() => toggle(p.name)}
                  type="button"
                >
                  {p.name}
                  {p.custom && " ★"}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="remix-instruction">Instruction</Label>
            <Textarea
              className="min-h-20 text-sm"
              id="remix-instruction"
              onChange={(e) => setInstruction(e.target.value)}
              placeholder="e.g. Merge these into one compact panel with the cash metric and the runway bar"
              value={instruction}
            />
          </div>
        </div>

        <DialogFooter>
          <Button disabled={loading} onClick={create} type="button">
            {loading ? "Creating…" : "Create panel"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
