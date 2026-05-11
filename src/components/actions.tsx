"use client";

import { RefreshCw, ScanSearch } from "lucide-react";
import { useFormStatus } from "react-dom";

export function SubmitButton({ label, pendingLabel, icon }: { label: string; pendingLabel: string; icon: "sync" | "scan" }) {
  const status = useFormStatus();
  const Icon = icon === "sync" ? RefreshCw : ScanSearch;

  return (
    <button className="button" disabled={status.pending} type="submit">
      <Icon aria-hidden="true" size={18} />
      {status.pending ? pendingLabel : label}
    </button>
  );
}
