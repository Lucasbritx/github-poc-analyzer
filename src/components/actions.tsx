"use client";

import { RefreshCw, ScanSearch, Sparkles } from "lucide-react";
import { useFormStatus } from "react-dom";

export function SubmitButton({ label, pendingLabel, icon }: { label: string; pendingLabel: string; icon: "sync" | "scan" | "sparkles" }) {
  const status = useFormStatus();
  const Icon = icon === "sync" ? RefreshCw : icon === "sparkles" ? Sparkles : ScanSearch;

  return (
    <button className="button" disabled={status.pending} type="submit">
      <Icon aria-hidden="true" size={18} />
      {status.pending ? pendingLabel : label}
    </button>
  );
}
