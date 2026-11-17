/**
 * Colonne « Émotions » de la vue tableau : badge des emojis, ou « Noter »
 * en pointillés quand aucune émotion n'est saisie. Un clic ouvre le choix
 * des émotions du dernier visionnage du titre (chargé à l'ouverture).
 */

"use client";

import { useEffect, useState } from "react";
import { Popover as PopoverPrimitive } from "@base-ui/react/popover";
import { actionBadgeClass } from "@/components/common/ActionBadge";
import { MultiChipGroup } from "@/components/watches/WatchContextChips";
import { useWatches } from "@/hooks/api/useWatches";
import { useUpdateWatchContext } from "@/hooks/api/useUpdateWatchContext";
import {
  WATCH_EMOTION_OPTIONS,
  WatchEmotion,
  emotionEmojis,
  emotionLabels,
} from "@/lib/watchContext";

type EmotionsBadgeMenuProps = {
  titleId: string;
  titleName: string;
  emotions?: string[] | null;
};

export function EmotionsBadgeMenu({
  titleId,
  titleName,
  emotions,
}: EmotionsBadgeMenuProps) {
  const [open, setOpen] = useState(false);
  const emojis = emotionEmojis(emotions);
  const labels = emotionLabels(emotions);

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger
        render={
          <button
            type="button"
            className={actionBadgeClass(!emojis)}
            aria-label={`Émotions pour ${titleName}${labels ? ` : ${labels}` : ""}`}
            title={labels ?? undefined}
          >
            {emojis || "Noter"}
          </button>
        }
      />
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Positioner
          className="isolate z-50 outline-none"
          sideOffset={4}
          align="start"
        >
          <PopoverPrimitive.Popup className="z-50 w-80 rounded-lg bg-popover p-3 text-sm text-popover-foreground shadow-md ring-1 ring-foreground/10 outline-none">
            {open && <EmotionsEditor titleId={titleId} />}
          </PopoverPrimitive.Popup>
        </PopoverPrimitive.Positioner>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}

function EmotionsEditor({ titleId }: { titleId: string }) {
  const { data, isLoading } = useWatches({ title_id: titleId, limit: 1 });
  const updateContext = useUpdateWatchContext();
  const watch = data?.items?.[0];
  const [values, setValues] = useState<string[]>([]);
  useEffect(() => setValues(watch?.emotion ?? []), [watch?.id, watch?.emotion]);

  if (isLoading) {
    return <p className="text-xs text-muted-foreground">Chargement…</p>;
  }
  if (!watch) {
    return (
      <p className="text-xs text-muted-foreground">
        Marquez d&apos;abord le titre comme vu pour noter vos émotions.
      </p>
    );
  }

  const toggle = (value: WatchEmotion) => {
    const next = values.includes(value)
      ? values.filter((v) => v !== value)
      : [...values, value];
    setValues(next);
    updateContext.mutate({
      watchId: watch.id,
      data: { emotion: next.length > 0 ? (next as WatchEmotion[]) : null },
    });
  };

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">
        Émotions du dernier visionnage
        {watch.date_vue
          ? ` (${new Date(watch.date_vue).toLocaleDateString("fr-FR")})`
          : ""}
      </p>
      <MultiChipGroup
        options={WATCH_EMOTION_OPTIONS}
        values={values}
        onToggle={toggle}
      />
    </div>
  );
}
