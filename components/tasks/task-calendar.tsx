"use client";

import { useMemo, useState } from "react";
import { format, startOfMonth } from "date-fns";
import Link from "next/link";
import { Plus } from "lucide-react";
import type { Task } from "@/types/database";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  TaskPriorityBadge,
  TaskStatusBadge,
} from "@/components/shared/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useDict } from "@/components/shared/i18n-provider";

export function TaskCalendar({ tasks }: { tasks: Task[] }) {
  const dict = useDict();
  const [selected, setSelected] = useState<Date>(new Date());
  const [month, setMonth] = useState<Date>(startOfMonth(new Date()));

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

  const selectedKey = format(selected, "yyyy-MM-dd");
  const dayTasks = tasksByDate.get(selectedKey) ?? [];
  const todayKey = format(new Date(), "yyyy-MM-dd");

  return (
    <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
      <Card className="border-border/60 shadow-sm">
        <CardContent className="flex justify-center p-3 pt-4">
          <Calendar
            mode="single"
            month={month}
            onMonthChange={setMonth}
            selected={selected}
            onSelect={(date) => date && setSelected(date)}
            modifiers={{
              hasTasks: (date) =>
                tasksByDate.has(format(date, "yyyy-MM-dd")),
            }}
            modifiersClassNames={{
              hasTasks:
                "relative after:absolute after:bottom-1 after:left-1/2 after:size-1 after:-translate-x-1/2 after:rounded-full after:bg-primary",
            }}
            className="rounded-md"
          />
        </CardContent>
      </Card>

      <Card className="border-border/60 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">
            {format(selected, "EEEE, MMM d")}
          </CardTitle>
          <Link
            href={`/tasks/new?due_date=${selectedKey}`}
            className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
          >
            <Plus className="mr-1 size-3.5" />
            {dict.tasks.addTask}
          </Link>
        </CardHeader>
        <CardContent>
          {dayTasks.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {dict.tasks.noTasksDay}
            </p>
          ) : (
            <ul className="space-y-2">
              {dayTasks.map((task) => {
                const overdue =
                  !!task.due_date &&
                  task.due_date < todayKey &&
                  task.status !== "done";
                return (
                  <li
                    key={task.id}
                    className={cn(
                      "flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5",
                      overdue && "border-destructive/40 bg-destructive/5"
                    )}
                  >
                    <div className="min-w-0">
                      <Link
                        href={`/tasks/${task.id}`}
                        className="text-sm font-medium hover:underline"
                      >
                        {task.title}
                      </Link>
                      {task.lead && (
                        <p className="text-xs text-muted-foreground">
                          {task.lead.title}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <TaskPriorityBadge priority={task.priority} />
                      <TaskStatusBadge status={task.status} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
