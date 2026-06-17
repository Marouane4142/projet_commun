import { statusClass, statusLabels } from "@/lib/format";
import type { ReadingStatus } from "@/lib/types";

export function StatusBadge({ status }: { status: ReadingStatus }) {
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-black ${statusClass(status)}`}>
      {statusLabels[status]}
    </span>
  );
}
