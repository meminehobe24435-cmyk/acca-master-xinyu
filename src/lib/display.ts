import { SOURCE_TYPES, COPYRIGHT_STATUS } from "@/lib/constants";
import type { PublicQuestion } from "@/lib/serializers";

export function DISPLAY_META(q: PublicQuestion) {
  return {
    standardReference: q.meta.standardReference,
    taxYear: q.meta.taxYear,
    jurisdiction: q.meta.jurisdiction,
    sourceLabel: q.meta.sourceName ?? SOURCE_TYPES[q.meta.sourceType]?.label ?? q.meta.sourceType,
    sourceEn: SOURCE_TYPES[q.meta.sourceType]?.en ?? q.meta.sourceType,
    copyrightLabel: COPYRIGHT_STATUS["original"] ?? "原创",
  };
}
