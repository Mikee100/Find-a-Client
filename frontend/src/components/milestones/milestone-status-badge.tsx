import { MilestoneStatus } from "@/lib/api";

function formatStatus(status: MilestoneStatus): string {
  return status
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function statusClass(status: MilestoneStatus): string {
  switch (status) {
    case "PENDING":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "FUNDED":
    case "IN_PROGRESS":
      return "border-sky-200 bg-sky-50 text-sky-700";
    case "SUBMITTED":
      return "border-indigo-200 bg-indigo-50 text-indigo-700";
    case "RELEASED":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "DISPUTED":
      return "border-rose-200 bg-rose-50 text-rose-700";
    case "REFUNDED":
      return "border-slate-300 bg-slate-100 text-slate-700";
    default:
      return "border-slate-300 bg-slate-50 text-slate-700";
  }
}

export default function MilestoneStatusBadge({ status }: { status: MilestoneStatus }) {
  return (
    <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${statusClass(status)}`}>
      {formatStatus(status)}
    </span>
  );
}
