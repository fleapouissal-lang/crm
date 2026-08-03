"use client";

import { MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDict } from "@/components/shared/i18n-provider";
import { cn } from "@/lib/utils";

export type RowActionItem =
  | {
      label: string;
      icon?: React.ReactNode;
      onClick?: () => void;
      destructive?: boolean;
      disabled?: boolean;
      separator?: false;
    }
  | { separator: true };

type ActionButton = Extract<RowActionItem, { label: string }>;

function isSeparator(
  action: RowActionItem
): action is { separator: true } {
  return "separator" in action && action.separator === true;
}

function ActionIconButton({
  action,
  className,
}: {
  action: ActionButton;
  className?: string;
}) {
  return (
    <button
      type="button"
      className={cn(
        "rowbtn",
        action.destructive && "rowbtn--danger",
        className
      )}
      aria-label={action.label}
      title={action.label}
      disabled={action.disabled}
      onClick={(e) => {
        e.stopPropagation();
        action.onClick?.();
      }}
    >
      {action.icon ?? <MoreHorizontal className="size-4" strokeWidth={2} />}
    </button>
  );
}

export function RowActionsMenu({
  actions,
  align = "end",
  /**
   * How many actions to show as clear icons.
   * Remaining actions (if any) stay behind a “…” menu.
   * Omit / Infinity = all actions as icons.
   */
  maxIcons,
}: {
  actions: RowActionItem[];
  align?: "start" | "center" | "end";
  maxIcons?: number;
}) {
  const dict = useDict();
  const actionable = actions.filter((a): a is ActionButton => !isSeparator(a));
  if (actionable.length === 0) return null;

  const limit =
    maxIcons === undefined || !Number.isFinite(maxIcons)
      ? actionable.length
      : Math.max(0, maxIcons);

  const visible = actionable.slice(0, limit);
  const overflow = actionable.slice(limit);

  return (
    <div
      className="flex items-center justify-end gap-0.5"
      onClick={(e) => e.stopPropagation()}
    >
      {visible.map((action, index) => (
        <ActionIconButton
          key={`${action.label}-${index}`}
          action={action}
        />
      ))}

      {overflow.length > 0 ? (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                type="button"
                className="rowbtn"
                aria-label={dict.common.moreActions}
                title={dict.common.moreActions}
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="size-4" strokeWidth={2} />
              </button>
            }
          />
          <DropdownMenuContent align={align} className="z-[100] min-w-[168px]">
            {overflow.map((action, index) => (
              <DropdownMenuItem
                key={`${action.label}-overflow-${index}`}
                variant={action.destructive ? "destructive" : "default"}
                disabled={action.disabled}
                onClick={(e) => {
                  e.stopPropagation();
                  action.onClick?.();
                }}
              >
                {action.icon}
                {action.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </div>
  );
}
