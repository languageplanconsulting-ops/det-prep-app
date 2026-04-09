"use client";

type ActionType = "danger" | "warning" | "info";

const styles: Record<
  ActionType,
  { border: string; btn: string; label: string }
> = {
  danger: {
    border: "border-red-600",
    btn: "bg-red-600 text-white",
    label: "text-red-800",
  },
  warning: {
    border: "border-[#FFCC00]",
    btn: "bg-[#FFCC00] text-black",
    label: "text-yellow-900",
  },
  info: {
    border: "border-[#004AAD]",
    btn: "bg-[#004AAD] text-white",
    label: "text-[#004AAD]",
  },
};

export type ConfirmActionDialogProps = {
  open: boolean;
  title: string;
  titleTh?: string;
  description: string;
  descriptionTh?: string;
  beforeLabel?: string;
  afterLabel?: string;
  affects?: string;
  actionLabel: string;
  actionType: ActionType;
  requireReason: boolean;
  reason: string;
  onReasonChange: (v: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmActionDialog({
  open,
  title,
  titleTh,
  description,
  descriptionTh,
  beforeLabel,
  afterLabel,
  affects,
  actionLabel,
  actionType,
  requireReason,
  reason,
  onReasonChange,
  onConfirm,
  onCancel,
}: ConfirmActionDialogProps) {
  if (!open) return null;

  const s = styles[actionType];

  return (
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal
    >
      <div
        className={`w-full max-w-lg rounded-[4px] border-4 bg-white p-6 shadow-[4px_4px_0_0_#000] ${s.border}`}
        style={{ fontFamily: "var(--font-inter), sans-serif" }}
      >
        <h2 className={`text-lg font-black ${s.label}`}>{title}</h2>
        {titleTh ? (
          <p className="mt-1 text-sm text-neutral-600">{titleTh}</p>
        ) : null}
        <p className="mt-4 text-sm text-neutral-800">{description}</p>
        {descriptionTh ? (
          <p className="mt-2 text-xs text-neutral-600">{descriptionTh}</p>
        ) : null}

        {beforeLabel != null && afterLabel != null ? (
          <p className="ep-stat mt-4 rounded-[4px] border-2 border-black bg-neutral-50 p-2 text-sm">
            <span className="text-neutral-500">Before → After / ก่อน → หลัง</span>
            <br />
            <span className="font-bold">{beforeLabel}</span>
            {" → "}
            <span className="font-bold">{afterLabel}</span>
          </p>
        ) : null}

        {affects ? (
          <p className="mt-3 text-sm font-bold text-neutral-700">
            Affects / ผู้เกี่ยวข้อง: {affects}
          </p>
        ) : null}

        {requireReason ? (
          <label className="mt-4 block text-sm font-bold">
            Reason (required) / เหตุผล (จำเป็น)
            <textarea
              value={reason}
              onChange={(e) => onReasonChange(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-[4px] border-4 border-black bg-white px-3 py-2 ep-stat text-sm shadow-[4px_4px_0_0_#000]"
            />
          </label>
        ) : null}

        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-[4px] border-4 border-black bg-white px-4 py-2 text-sm font-black uppercase shadow-[4px_4px_0_0_#000] hover:translate-x-px hover:translate-y-px hover:shadow-none"
          >
            Cancel / ยกเลิก
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={requireReason && !reason.trim()}
            className={`rounded-[4px] border-4 border-black px-4 py-2 text-sm font-black uppercase shadow-[4px_4px_0_0_#000] hover:translate-x-px hover:translate-y-px hover:shadow-none disabled:opacity-50 ${s.btn}`}
          >
            {actionLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
