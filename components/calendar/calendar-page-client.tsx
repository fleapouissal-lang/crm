"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import type { Task } from "@/types/database";
import { useDict, useI18n } from "@/components/shared/i18n-provider";
import { getIntlLocale } from "@/lib/i18n/locale-utils";
import {
  TaskPriorityBadge,
  TaskStatusBadge,
} from "@/components/shared/status-badge";

function buildMonthDays(year: number, monthIndex: number) {
  const first = new Date(year, monthIndex, 1);
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const startPad = (first.getDay() + 6) % 7;
  const today = new Date();
  const days: { date: Date; n: number; dim?: boolean; today?: boolean; key: string }[] =
    [];

  const prevDays = new Date(year, monthIndex, 0).getDate();
  for (let i = startPad - 1; i >= 0; i--) {
    const n = prevDays - i;
    const date = new Date(year, monthIndex - 1, n);
    days.push({
      date,
      n,
      dim: true,
      key: formatKey(date),
    });
  }
  for (let n = 1; n <= daysInMonth; n++) {
    const date = new Date(year, monthIndex, n);
    days.push({
      date,
      n,
      today:
        today.getFullYear() === year &&
        today.getMonth() === monthIndex &&
        today.getDate() === n,
      key: formatKey(date),
    });
  }
  let next = 1;
  while (days.length % 7 !== 0) {
    const date = new Date(year, monthIndex + 1, next);
    days.push({ date, n: next++, dim: true, key: formatKey(date) });
  }
  return days;
}

function formatKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const EVENT_COLORS = ["ir", "gr", "go", "ro"] as const;

export function CalendarPageClient({ tasks }: { tasks: Task[] }) {
  const dict = useDict();
  const { locale } = useI18n();
  const intlLocale = getIntlLocale(locale);
  const l = dict.fusion.labels;
  const d = dict.fusion.dashboard;

  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedKey, setSelectedKey] = useState(() => formatKey(new Date()));

  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const task of tasks) {
      if (!task.due_date) continue;
      const list = map.get(task.due_date) ?? [];
      list.push(task);
      map.set(task.due_date, list);
    }
    return map;
  }, [tasks]);

  const calDays = useMemo(
    () => buildMonthDays(cursor.getFullYear(), cursor.getMonth()),
    [cursor]
  );

  const monthLabel = cursor.toLocaleDateString(intlLocale, {
    month: "long",
    year: "numeric",
  });

  const selectedDate = useMemo(() => {
    const [y, m, d] = selectedKey.split("-").map(Number);
    return new Date(y, m - 1, d);
  }, [selectedKey]);

  const todayLabel = selectedDate.toLocaleDateString(intlLocale, {
    weekday: "long",
    day: "numeric",
    month: "short",
  });

  const dayTasks = tasksByDate.get(selectedKey) ?? [];
  const todayKey = formatKey(new Date());

  function shiftMonth(delta: number) {
    setCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  }

  return (
    <div className="grid gap-[18px] lg:grid-cols-[1fr_300px]">
      <div className="fl-card">
        <div className="fl-card-head">
          <div className="flex items-center gap-3">
            <h3 className="capitalize">{monthLabel}</h3>
            <div className="flex gap-1">
              <button
                type="button"
                className="rowbtn"
                onClick={() => shiftMonth(-1)}
                aria-label="Previous month"
              >
                <ChevronLeft className="size-4" />
              </button>
              <button
                type="button"
                className="rowbtn"
                onClick={() => shiftMonth(1)}
                aria-label="Next month"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
          <div className="fl-seg">
            <button type="button">{l.day}</button>
            <button type="button">{l.week}</button>
            <button type="button" className="on">
              {l.month}
            </button>
          </div>
        </div>
        <div className="fl-pad">
          <div className="cal">
            {d.weekdays.map((day) => (
              <div key={day} className="cdow">
                {day}
              </div>
            ))}
            {calDays.map((day) => {
              const dayList = day.dim ? [] : (tasksByDate.get(day.key) ?? []);
              return (
                <button
                  key={day.key + String(day.dim)}
                  type="button"
                  className={`cday ${day.dim ? "dim" : ""} ${day.today ? "today" : ""} ${
                    !day.dim && day.key === selectedKey ? "selected" : ""
                  }`}
                  onClick={() => {
                    if (!day.dim) setSelectedKey(day.key);
                  }}
                >
                  <div className="cnum">{day.n}</div>
                  {dayList.slice(0, 2).map((task, i) => (
                    <div
                      key={task.id}
                      className={`cev ${EVENT_COLORS[i % EVENT_COLORS.length]}`}
                    >
                      {task.title}
                    </div>
                  ))}
                  {dayList.length > 2 ? (
                    <div className="cev ir">+{dayList.length - 2}</div>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="fl-card">
        <div className="fl-card-head">
          <h3 className="capitalize">{todayLabel}</h3>
        </div>
        <div className="fl-pad flex flex-col gap-0.5">
          {dayTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
              <Clock className="size-5 text-[var(--muted)]" strokeWidth={1.75} />
              <p className="text-[13px] text-[var(--muted)]">{dict.tasks.noTasksDay}</p>
            </div>
          ) : (
            dayTasks.map((task) => {
              const overdue =
                !!task.due_date &&
                task.due_date < todayKey &&
                task.status !== "done";
              return (
                <Link
                  key={task.id}
                  href={`/tasks/${task.id}`}
                  className="list-row flex items-center gap-3 rounded-[11px] py-3"
                >
                  <div
                    className="h-[38px] w-1 rounded-[9px]"
                    style={{
                      background: overdue ? "var(--rose)" : "var(--iris)",
                    }}
                  />
                  <div className="min-w-0 flex-1">
                    <b className="block truncate text-[13px]">{task.title}</b>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      <TaskPriorityBadge priority={task.priority} />
                      <TaskStatusBadge status={task.status} />
                    </div>
                  </div>
                </Link>
              );
            })
          )}
        </div>
        <div className="fl-pad border-t border-[var(--border)]">
          <Link
            href={`/tasks/new?due_date=${selectedKey}`}
            className="fl-btn primary w-full justify-center"
          >
            <Plus strokeWidth={2} />
            {dict.tasks.addTask}
          </Link>
        </div>
      </div>
    </div>
  );
}
