"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileUp, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { importLeadsFromCsv } from "@/lib/actions/leads";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const SAMPLE = `title,company,contact_name,phone,email,website,city,source,sales_project
Cafe Atlas,Cafe Atlas,Karim,+212612345678,,cafeatlas.ma,Casablanca,manual,Fusion Leap
Boutique Nora,Boutique Nora,Nora,+212698765432,nora@example.com,,Rabat,csv_import,Fusion Leap
`;

export function LeadImportDialog({
  open,
  onOpenChange,
  defaultSalesProject = "Fusion Leap",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultSalesProject?: string;
}) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [pending, startTransition] = useTransition();

  function onFile(file: File | null) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setText(String(reader.result || ""));
    reader.readAsText(file);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="fl-dialog-content sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileUp className="size-4" />
            Importer des prospects (CSV)
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <p className="text-xs fl-faint">
            Colonnes: title, company, contact_name, phone, email, website, city,
            country, source, notes, sales_project. Téléphone ou email obligatoire.
          </p>
          <input
            type="file"
            accept=".csv,text/csv"
            className="block w-full text-xs"
            onChange={(e) => onFile(e.target.files?.[0] || null)}
          />
          <textarea
            className="fl-input min-h-40 w-full rounded-md border border-[var(--border)] p-3 font-mono text-xs"
            placeholder={SAMPLE}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <button
            type="button"
            className="fl-btn sm ghost"
            onClick={() => setText(SAMPLE)}
          >
            Charger un exemple
          </button>
        </div>
        <DialogFooter>
          <button
            type="button"
            className="fl-btn sm"
            disabled={pending}
            onClick={() => onOpenChange(false)}
          >
            Annuler
          </button>
          <button
            type="button"
            className="fl-btn primary sm"
            disabled={pending || !text.trim()}
            onClick={() =>
              startTransition(async () => {
                const result = await importLeadsFromCsv(text, defaultSalesProject);
                if (!result.success) {
                  toast.error(result.error);
                  return;
                }
                const { imported, skipped, errors } = result.data;
                toast.success(
                  `${imported} importé(s)${skipped ? `, ${skipped} ignoré(s)` : ""}`
                );
                if (errors.length) toast.message(errors[0]);
                onOpenChange(false);
                setText("");
                router.refresh();
              })
            }
          >
            {pending ? <Loader2 className="size-4 animate-spin" /> : "Importer"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
