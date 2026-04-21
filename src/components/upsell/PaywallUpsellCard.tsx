"use client";

import { useMemo, useState } from "react";

import { useBillingActions } from "@/hooks/useBillingActions";
import type { PaywallSpec, UpsellAction } from "@/lib/paywall-upsell";

export function PaywallUpsellCard({
  spec,
  compact = false,
}: {
  spec: PaywallSpec;
  compact?: boolean;
}) {
  const { startUpgradeCheckout, startAddOnCheckout } = useBillingActions();
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const primary = useMemo(
    () => spec.actions.find((action) => action.recommended) ?? spec.actions[0] ?? null,
    [spec.actions],
  );
  const secondary = useMemo(
    () => spec.actions.filter((action) => action !== primary),
    [spec.actions, primary],
  );

  const trigger = async (action: UpsellAction, index: number) => {
    const key = `${action.kind}-${action.targetTier ?? action.sku ?? index}`;
    setBusyKey(key);
    setError(null);
    try {
      if (action.kind === "upgrade" && action.targetTier) {
        await startUpgradeCheckout(action.targetTier);
        return;
      }
      if (action.kind === "addon" && action.sku) {
        await startAddOnCheckout(action.sku);
        return;
      }
      window.location.href = "/pricing";
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open billing flow");
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <div className="rounded-[4px] border-4 border-black bg-white p-4 shadow-[4px_4px_0_0_#000]">
      <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#004AAD]">
        Upgrade / Add-on
      </p>
      <h3 className={`mt-2 font-black leading-tight text-neutral-900 ${compact ? "text-lg" : "text-2xl"}`}>
        {spec.titleTh}
      </h3>
      <p className="mt-1 text-sm font-semibold text-neutral-500">{spec.titleEn}</p>
      <p className="mt-3 text-sm font-bold leading-relaxed text-neutral-900">{spec.bodyTh}</p>
      <p className="mt-1 text-xs text-neutral-500">{spec.bodyEn}</p>
      {spec.noteTh || spec.noteEn ? (
        <div className="mt-4 rounded-sm border-2 border-dashed border-black bg-neutral-50 p-3">
          {spec.noteTh ? <p className="text-xs font-bold text-neutral-800">{spec.noteTh}</p> : null}
          {spec.noteEn ? <p className="mt-1 text-[11px] text-neutral-500">{spec.noteEn}</p> : null}
        </div>
      ) : null}

      {primary ? (
        <button
          type="button"
          onClick={() => void trigger(primary, 0)}
          disabled={busyKey !== null}
          className="mt-4 w-full rounded-[4px] border-[3px] border-black bg-[#004AAD] px-4 py-3 text-sm font-black uppercase tracking-wide text-white shadow-[4px_4px_0_0_#000] disabled:opacity-60"
        >
          {busyKey ? "กำลังเปิด…" : primary.labelTh}
          <span className="block text-[10px] font-semibold normal-case tracking-normal text-white/80">
            {primary.labelEn}
          </span>
        </button>
      ) : null}

      {secondary.length ? (
        <div className="mt-3 grid gap-2">
          {secondary.map((action, index) => (
            <button
              key={`${action.kind}-${action.targetTier ?? action.sku ?? index}`}
              type="button"
              onClick={() => void trigger(action, index + 1)}
              disabled={busyKey !== null}
              className="rounded-[4px] border-2 border-black bg-[#FFCC00] px-4 py-3 text-left text-xs font-black uppercase tracking-wide text-neutral-900 shadow-[3px_3px_0_0_#000] disabled:opacity-60"
            >
              <span>{action.labelTh}</span>
              <span className="mt-1 block text-[10px] font-semibold normal-case tracking-normal text-neutral-600">
                {action.labelEn}
              </span>
            </button>
          ))}
        </div>
      ) : null}

      {error ? <p className="mt-3 text-xs font-bold text-red-700">{error}</p> : null}
    </div>
  );
}
