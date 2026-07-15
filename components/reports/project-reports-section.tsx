"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { format } from "date-fns";
import {
  FileText,
  FolderKanban,
  Loader2,
  Trash2,
  Upload,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { useDict, useI18n } from "@/components/shared/i18n-provider";
import { getDateFnsLocale } from "@/lib/i18n/locale-utils";
import {
  deleteProjectReportAction,
  getProjectReportSignedUrlAction,
  listProjectReportsAction,
  uploadProjectReportAction,
  type ProjectReportFile,
} from "@/lib/actions/project-reports";
import { loadProjects } from "@/lib/projects/storage";
import type { ProjectRecord } from "@/lib/projects/types";
import { cn } from "@/lib/utils";

export function ProjectReportsSection() {
  const dict = useDict();
  const r = dict.fusion.reports;
  const { locale } = useI18n();
  const dateLocale = getDateFnsLocale(locale);
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [reports, setReports] = useState<ProjectReportFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, startTransition] = useTransition();
  const [uploadingProjectId, setUploadingProjectId] = useState<string | null>(
    null
  );
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    setProjects(loadProjects([]));
  }, []);

  function refreshReports() {
    startTransition(async () => {
      const result = await listProjectReportsAction();
      if (!result.success) {
        toast.error(result.error);
        setLoading(false);
        return;
      }
      setReports(result.data);
      setLoading(false);
    });
  }

  useEffect(() => {
    refreshReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reportsByProject = useMemo(() => {
    const map = new Map<string, ProjectReportFile[]>();
    for (const report of reports) {
      const list = map.get(report.projectId) ?? [];
      list.push(report);
      map.set(report.projectId, list);
    }
    return map;
  }, [reports]);

  function handleUpload(project: ProjectRecord, file: File | null) {
    if (!file) return;
    if (file.type !== "application/pdf") {
      toast.error(r.projectPdfOnly);
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error(r.projectPdfTooLarge);
      return;
    }

    const formData = new FormData();
    formData.set("projectId", project.id);
    formData.set("projectTitle", project.title);
    formData.set("label", file.name);
    formData.set("file", file);

    setUploadingProjectId(project.id);
    startTransition(async () => {
      const result = await uploadProjectReportAction(formData);
      setUploadingProjectId(null);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setReports((prev) => [result.data, ...prev]);
      toast.success(r.projectPdfUploaded);
    });
  }

  function handleOpen(report: ProjectReportFile) {
    startTransition(async () => {
      if (report.signedUrl) {
        window.open(report.signedUrl, "_blank", "noopener,noreferrer");
        return;
      }
      const result = await getProjectReportSignedUrlAction(report.id);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      window.open(result.data, "_blank", "noopener,noreferrer");
    });
  }

  function handleDelete(report: ProjectReportFile) {
    startTransition(async () => {
      const result = await deleteProjectReportAction(report.id);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setReports((prev) => prev.filter((row) => row.id !== report.id));
      toast.success(r.projectPdfDeleted);
    });
  }

  return (
    <div className="fl-card">
      <div className="fl-card-head">
        <div>
          <h3>{r.projectReportsTitle}</h3>
          <div className="ch-sub">{r.projectReportsSub}</div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="size-6 animate-spin text-[var(--brand-orange)]" />
        </div>
      ) : projects.length === 0 ? (
        <p className="fl-pad py-10 text-center text-sm fl-faint">
          {r.noProjectsForReports}
        </p>
      ) : (
        <ul className="divide-y divide-[var(--border)]">
          {projects.map((project) => {
            const projectReports = reportsByProject.get(project.id) ?? [];
            const uploading = uploadingProjectId === project.id && pending;

            return (
              <li key={project.id} className="fl-pad space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <span
                      className="grid size-10 shrink-0 place-items-center rounded-xl text-xs font-bold text-white"
                      style={{ background: project.gradient }}
                    >
                      {project.initials}
                    </span>
                    <div className="min-w-0">
                      <p className="font-semibold">{project.title}</p>
                      <p className="fl-tny fl-faint truncate">{project.subtitle}</p>
                    </div>
                  </div>
                  <div>
                    <input
                      ref={(el) => {
                        inputRefs.current[project.id] = el;
                      }}
                      type="file"
                      accept="application/pdf"
                      className="sr-only"
                      onChange={(e) => {
                        const file = e.target.files?.[0] ?? null;
                        handleUpload(project, file);
                        e.target.value = "";
                      }}
                    />
                    <button
                      type="button"
                      className="fl-btn sm ghost"
                      disabled={uploading}
                      onClick={() => inputRefs.current[project.id]?.click()}
                    >
                      {uploading ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Upload className="size-3.5" />
                      )}
                      {r.addProjectPdf}
                    </button>
                  </div>
                </div>

                {projectReports.length === 0 ? (
                  <p className="inline-flex items-center gap-2 text-sm fl-faint">
                    <FolderKanban className="size-3.5" />
                    {r.noProjectPdf}
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {projectReports.map((report) => (
                      <li
                        key={report.id}
                        className={cn(
                          "flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--border)] bg-[var(--glass-hi)] px-3 py-2.5"
                        )}
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <FileText className="size-4 shrink-0 text-[var(--text-dim)]" />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">
                              {report.label}
                            </p>
                            <p className="fl-tny fl-faint">
                              {format(
                                new Date(report.uploadedAt),
                                "dd MMM yyyy · HH:mm",
                                { locale: dateLocale }
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            className="fl-btn sm ghost"
                            disabled={pending}
                            onClick={() => handleOpen(report)}
                          >
                            <ExternalLink className="size-3.5" />
                            {r.openProjectPdf}
                          </button>
                          <button
                            type="button"
                            className="fl-btn sm ghost text-[var(--rose)]"
                            disabled={pending}
                            onClick={() => handleDelete(report)}
                            aria-label={r.deleteProjectPdf}
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
