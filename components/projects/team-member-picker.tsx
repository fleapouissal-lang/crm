"use client";

import { Check } from "lucide-react";
import { useDict } from "@/components/shared/i18n-provider";
import type { TeamMemberOption } from "@/lib/team/members";
import { FlAva } from "@/components/fusion/primitives";
import { cn } from "@/lib/utils";

export function TeamMemberPicker({
  options,
  value,
  onChange,
}: {
  options: TeamMemberOption[];
  value: string[];
  onChange: (ids: string[]) => void;
}) {
  const dict = useDict();
  const p = dict.fusion.projects;

  function toggle(id: string) {
    if (value.includes(id)) {
      onChange(value.filter((x) => x !== id));
    } else {
      onChange([...value, id]);
    }
  }

  if (options.length === 0) {
    return (
      <p className="text-xs fl-faint">{p.noTeamAvailable}</p>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {options.map((member) => {
          const selected = value.includes(member.id);
          return (
            <button
              key={member.id}
              type="button"
              onClick={() => toggle(member.id)}
              className={cn(
                "fl-team-pick",
                selected && "fl-team-pick--on"
              )}
              aria-pressed={selected}
            >
              <FlAva
                sm
                style={{
                  background: member.color,
                  width: 28,
                  height: 28,
                  fontSize: 10,
                }}
              >
                {member.initials}
              </FlAva>
              <span className="min-w-0 text-left">
                <span className="block truncate text-[12.5px] font-medium leading-tight">
                  {member.name}
                </span>
                {member.role ? (
                  <span className="block truncate text-[10.5px] fl-faint">
                    {member.role}
                  </span>
                ) : null}
              </span>
              {selected ? (
                <Check className="size-3.5 shrink-0 text-[var(--emerald)]" strokeWidth={2.5} />
              ) : (
                <span className="size-3.5 shrink-0" />
              )}
            </button>
          );
        })}
      </div>
      <p className="fl-tny fl-faint">
        {value.length === 0
          ? p.noMembersSelected
          : p.membersSelected.replace("{count}", String(value.length))}
      </p>
    </div>
  );
}
