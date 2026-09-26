import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarClock, ListChecks, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest } from "@/lib/queryClient";
import { TASK_TYPE_LABELS, type TaskType } from "@shared/crm";
import type { CrmTask } from "@shared/schema";
import {
  CrmPageHeader,
  EmptyState,
  QueryError,
  TaskFormDialog,
  formatDue,
  useCrmMutation,
} from "@/components/crm/crm-ui";

type TaskRow = CrmTask & { leadName: string | null; dealTitle: string | null };

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function groupOpen(tasks: TaskRow[], now = new Date()) {
  const today = startOfDay(now);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  return [
    { key: "overdue", label: "Overdue", items: tasks.filter((t) => new Date(t.dueAt) < today), tone: "text-rose-600" },
    {
      key: "today",
      label: "Today",
      items: tasks.filter((t) => new Date(t.dueAt) >= today && new Date(t.dueAt) < tomorrow),
      tone: "text-foreground",
    },
    { key: "upcoming", label: "Upcoming", items: tasks.filter((t) => new Date(t.dueAt) >= tomorrow), tone: "text-foreground" },
  ].filter((g) => g.items.length > 0);
}

function TaskList({ scope }: { scope: "follow_ups" | "tasks" }) {
  const isFollowUps = scope === "follow_ups";
  const [status, setStatus] = useState<"open" | "done">("open");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CrmTask | null>(null);

  const { data, isLoading, error } = useQuery<{ tasks: TaskRow[] }>({
    queryKey: [`/api/crm/tasks?scope=${scope}&status=${status}`],
  });
  const tasks = data?.tasks ?? [];

  const toggle = useCrmMutation(({ id, completed }: { id: string; completed: boolean }) =>
    apiRequest("PATCH", `/api/crm/tasks/${id}`, { completed }),
  );
  const remove = useCrmMutation((id: string) => apiRequest("DELETE", `/api/crm/tasks/${id}`), { success: "Removed" });

  const openNew = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const row = (task: TaskRow) => (
    <li key={task.id} className="flex items-start gap-3 px-4 py-3" data-testid={`row-task-${task.id}`}>
      <Checkbox
        className="mt-0.5"
        checked={!!task.completedAt}
        onCheckedChange={(checked) => toggle.mutate({ id: task.id, completed: checked === true })}
        aria-label={task.completedAt ? `Mark “${task.title}” as not done` : `Mark “${task.title}” as done`}
      />
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-medium ${task.completedAt ? "text-muted-foreground line-through" : "text-foreground"}`}>
          {task.title}
        </p>
        <p className="mt-0.5 flex flex-wrap gap-x-2 text-xs text-muted-foreground">
          <span>{TASK_TYPE_LABELS[task.type as TaskType] ?? task.type}</span>
          <span>·</span>
          <span>{task.completedAt ? `Done ${formatDue(task.completedAt)}` : formatDue(task.dueAt)}</span>
          {task.leadName && (
            <>
              <span>·</span>
              <span className="text-foreground/80">{task.leadName}</span>
            </>
          )}
          {task.dealTitle && (
            <>
              <span>·</span>
              <span className="text-foreground/80">{task.dealTitle}</span>
            </>
          )}
        </p>
      </div>
      <div className="flex shrink-0 gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          aria-label={`Edit “${task.title}”`}
          onClick={() => {
            setEditing(task);
            setFormOpen(true);
          }}
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
          aria-label={`Delete “${task.title}”`}
          onClick={() => remove.mutate(task.id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </li>
  );

  return (
    <div className="mx-auto max-w-4xl">
      <CrmPageHeader
        title={isFollowUps ? "Follow-ups" : "Tasks"}
        description={
          isFollowUps
            ? "Calls, meetings and messages you've promised customers."
            : "Internal to-dos for you and your team."
        }
        actions={
          <Button onClick={openNew} data-testid="button-add-task">
            <Plus className="mr-2 h-4 w-4" aria-hidden /> {isFollowUps ? "Schedule follow-up" : "Add task"}
          </Button>
        }
      />
      <Tabs value={status} onValueChange={(v) => setStatus(v as "open" | "done")} className="mb-4">
        <TabsList>
          <TabsTrigger value="open">Open</TabsTrigger>
          <TabsTrigger value="done">Done</TabsTrigger>
        </TabsList>
      </Tabs>

      {error ? (
        <QueryError error={error} />
      ) : isLoading ? (
        <Skeleton className="h-48 rounded-xl" />
      ) : tasks.length === 0 ? (
        <EmptyState
          icon={isFollowUps ? CalendarClock : ListChecks}
          title={status === "done" ? "Nothing completed yet" : isFollowUps ? "No follow-ups scheduled" : "No open tasks"}
          description={
            status === "done"
              ? "Completed items will appear here."
              : isFollowUps
                ? "Schedule calls and meetings against your leads and deals so nothing slips."
                : "Add internal to-dos to keep the team on track."
          }
          action={
            status === "open" && (
              <Button onClick={openNew}>
                <Plus className="mr-2 h-4 w-4" aria-hidden /> {isFollowUps ? "Schedule follow-up" : "Add task"}
              </Button>
            )
          }
        />
      ) : status === "done" ? (
        <ul className="divide-y rounded-xl border bg-card shadow-sm">{tasks.map(row)}</ul>
      ) : (
        <div className="space-y-5">
          {groupOpen(tasks).map((group) => (
            <section key={group.key}>
              <h2 className={`mb-2 text-xs font-semibold uppercase tracking-wide ${group.tone}`}>
                {group.label} <span className="font-normal text-muted-foreground">({group.items.length})</span>
              </h2>
              <ul className="divide-y rounded-xl border bg-card shadow-sm">{group.items.map(row)}</ul>
            </section>
          ))}
        </div>
      )}

      <TaskFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        task={editing}
        defaultType={isFollowUps ? "follow_up" : "task"}
      />
    </div>
  );
}

export function FollowUpsPage() {
  return <TaskList scope="follow_ups" />;
}

export function TasksPage() {
  return <TaskList scope="tasks" />;
}
