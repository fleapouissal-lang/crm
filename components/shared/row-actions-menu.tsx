"use client";

import { MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDict } from "@/components/shared/i18n-provider";

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

export function RowActionsMenu({
  actions,
  align = "end",
}: {
  actions: RowActionItem[];
  align?: "start" | "center" | "end";
}) {
  const dict = useDict();
  const actionable = actions.filter((a) => !("separator" in a && a.separator));
  if (actionable.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            className="rowbtn"
            aria-label={dict.common.moreActions}
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal className="size-4" strokeWidth={2} />
          </button>
        }
      />
      <DropdownMenuContent align={align} className="z-[100] min-w-[168px]">
        {actions.map((action, index) =>
          "separator" in action && action.separator ? (
            <DropdownMenuSeparator key={`sep-${index}`} />
          ) : (
            <DropdownMenuItem
              key={`${action.label}-${index}`}
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
          )
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
