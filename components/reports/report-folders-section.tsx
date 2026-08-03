"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { format } from "date-fns";
import {
  ChevronDown,
  ExternalLink,
  FileText,
  Folder,
  FolderPlus,
  Loader2,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { useDict, useI18n } from "@/components/shared/i18n-provider";
import { getDateFnsLocale } from "@/lib/i18n/locale-utils";
import {
  createReportFolderAction,
  deleteReportFolderAction,
  deleteReportFolderFileAction,
  getReportFolderFileSignedUrlAction,
  listReportFoldersAction,
  uploadReportFolderFileAction,
  type ReportFolder,
  type ReportFolderFile,
} from "@/lib/actions/report-folders";
import { DeleteConfirmDialog } from "@/components/shared/delete-confirm-dialog";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export function ReportFoldersSection() {
  const dict = useDict();
  const r = dict.fusion.reports;
  const { locale } = useI18n();
  const dateLocale = getDateFnsLocale(locale);

  const [folders, setFolders] = useState<ReportFolder[]>([]);
  const [files, setFiles] = useState<ReportFolderFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, startTransition] = useTransition();
  const [openFolderId, setOpenFolderId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [deleteFolder, setDeleteFolder] = useState<ReportFolder | null>(null);
  const [uploadingFolderId, setUploadingFolderId] = useState<string | null>(
    null
  );
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  function refresh() {
    startTransition(async () => {
      const result = await listReportFoldersAction();
      if (!result.success) {
        toast.error(result.error);
        setLoading(false);
        return;
      }
      setFolders(result.data.folders);
      setFiles(result.data.files);
      setLoading(false);
      if (!openFolderId && result.data.folders[0]) {
        setOpenFolderId(result.data.folders[0].id);
      }
    });
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filesByFolder = useMemo(() => {
    const map = new Map<string, ReportFolderFile[]>();
    for (const file of files) {
      const list = map.get(file.folderId) ?? [];
      list.push(file);
      map.set(file.folderId, list);
    }
    return map;
  }, [files]);

  function handleCreateFolder() {
    const name = folderName.trim();
    if (!name) {
      toast.error(r.folderNameRequired);
      return;
    }
    startTransition(async () => {
      const result = await createReportFolderAction(name);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setFolders((prev) => [result.data, ...prev]);
      setOpenFolderId(result.data.id);
      setFolderName("");
      setCreateOpen(false);
      toast.success(r.folderCreated);
    });
  }

  function handleUpload(folderId: string, file: File | null) {
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
    formData.set("folderId", folderId);
    formData.set("label", file.name);
    formData.set("file", file);

    setUploadingFolderId(folderId);
    startTransition(async () => {
      const result = await uploadReportFolderFileAction(formData);
      setUploadingFolderId(null);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setFiles((prev) => [result.data, ...prev]);
      setFolders((prev) =>
        prev.map((f) =>
          f.id === folderId ? { ...f, fileCount: f.fileCount + 1 } : f
        )
      );
      toast.success(r.projectPdfUploaded);
    });
  }

  function handleOpenFile(file: ReportFolderFile) {
    startTransition(async () => {
      if (file.signedUrl) {
        window.open(file.signedUrl, "_blank", "noopener,noreferrer");
        return;
      }
      const result = await getReportFolderFileSignedUrlAction(file.id);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      window.open(result.data, "_blank", "noopener,noreferrer");
    });
  }

  function handleDeleteFile(file: ReportFolderFile) {
    startTransition(async () => {
      const result = await deleteReportFolderFileAction(file.id);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setFiles((prev) => prev.filter((row) => row.id !== file.id));
      setFolders((prev) =>
        prev.map((f) =>
          f.id === file.folderId
            ? { ...f, fileCount: Math.max(0, f.fileCount - 1) }
            : f
        )
      );
      toast.success(r.projectPdfDeleted);
    });
  }

  return (
    <>
      <div className="fl-card fl-clients-card">
        <div className="fl-clients-toolbar">
          <div className="fl-clients-toolbar__head">
            <div className="min-w-0">
              <h2 className="fl-clients-toolbar__title">{r.foldersTitle}</h2>
              <p className="mt-0.5 text-[12px] fl-faint">{r.foldersSub}</p>
            </div>
            <div className="fl-clients-toolbar__actions">
              <button
                type="button"
                className="fl-btn primary sm fl-toolbar-create shrink-0"
                onClick={() => setCreateOpen(true)}
              >
                <FolderPlus strokeWidth={2} className="size-3.5" />
                <span className="fl-toolbar-create__label hidden sm:inline">
                  {r.newFolder}
                </span>
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-14">
            <Loader2 className="size-6 animate-spin text-[var(--brand-orange)]" />
          </div>
        ) : folders.length === 0 ? (
          <div className="fl-pad flex flex-col items-center gap-3 py-14 text-center">
            <Folder className="size-8 text-[var(--text-faint)]" strokeWidth={1.5} />
            <p className="text-sm fl-faint">{r.noFolders}</p>
            <button
              type="button"
              className="fl-btn primary sm"
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="size-3.5" strokeWidth={2} />
              {r.newFolder}
            </button>
          </div>
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {folders.map((folder) => {
              const folderFiles = filesByFolder.get(folder.id) ?? [];
              const isOpen = openFolderId === folder.id;
              const uploading = uploadingFolderId === folder.id && pending;

              return (
                <li key={folder.id} className="fl-pad space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <button
                      type="button"
                      className="flex min-w-0 items-center gap-3 text-start"
                      onClick={() =>
                        setOpenFolderId(isOpen ? null : folder.id)
                      }
                    >
                      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--glass-hi)] text-[var(--iris)]">
                        <Folder className="size-5" strokeWidth={1.75} />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-semibold">
                          {folder.name}
                        </span>
                        <span className="fl-tny fl-faint">
                          {r.folderFileCount.replace(
                            "{count}",
                            String(folder.fileCount)
                          )}
                          {" · "}
                          {format(new Date(folder.createdAt), "dd MMM yyyy", {
                            locale: dateLocale,
                          })}
                        </span>
                      </span>
                      <ChevronDown
                        className={cn(
                          "size-4 shrink-0 text-[var(--text-faint)] transition-transform",
                          isOpen && "rotate-180"
                        )}
                      />
                    </button>

                    <div className="flex items-center gap-1">
                      <input
                        ref={(el) => {
                          inputRefs.current[folder.id] = el;
                        }}
                        type="file"
                        accept="application/pdf"
                        className="sr-only"
                        onChange={(e) => {
                          const file = e.target.files?.[0] ?? null;
                          handleUpload(folder.id, file);
                          e.target.value = "";
                        }}
                      />
                      <button
                        type="button"
                        className="fl-btn sm ghost"
                        disabled={uploading}
                        onClick={() => {
                          setOpenFolderId(folder.id);
                          inputRefs.current[folder.id]?.click();
                        }}
                      >
                        {uploading ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Upload className="size-3.5" />
                        )}
                        {r.addPdf}
                      </button>
                      <button
                        type="button"
                        className="rowbtn rowbtn--danger"
                        disabled={pending}
                        aria-label={r.deleteFolder}
                        title={r.deleteFolder}
                        onClick={() => setDeleteFolder(folder)}
                      >
                        <Trash2 className="size-4" strokeWidth={2} />
                      </button>
                    </div>
                  </div>

                  {isOpen ? (
                    folderFiles.length === 0 ? (
                      <p className="inline-flex items-center gap-2 text-sm fl-faint">
                        <FileText className="size-3.5" />
                        {r.noFolderFiles}
                      </p>
                    ) : (
                      <ul className="space-y-2">
                        {folderFiles.map((file) => (
                          <li
                            key={file.id}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--border)] bg-[var(--glass-hi)] px-3 py-2.5"
                          >
                            <div className="flex min-w-0 items-center gap-2">
                              <FileText className="size-4 shrink-0 text-[var(--text-dim)]" />
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium">
                                  {file.label}
                                </p>
                                <p className="fl-tny fl-faint">
                                  {format(
                                    new Date(file.uploadedAt),
                                    "dd MMM yyyy · HH:mm",
                                    { locale: dateLocale }
                                  )}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-0.5">
                              <button
                                type="button"
                                className="rowbtn"
                                disabled={pending}
                                aria-label={r.openProjectPdf}
                                title={r.openProjectPdf}
                                onClick={() => handleOpenFile(file)}
                              >
                                <ExternalLink className="size-4" />
                              </button>
                              <button
                                type="button"
                                className="rowbtn rowbtn--danger"
                                disabled={pending}
                                aria-label={r.deleteProjectPdf}
                                title={r.deleteProjectPdf}
                                onClick={() => handleDeleteFile(file)}
                              >
                                <Trash2 className="size-4" />
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="fl-dialog-content ring-0 sm:max-w-md">
          <DialogHeader className="fl-dialog-header">
            <DialogTitle className="flex items-center gap-3">
              <span
                className="grid size-10 place-items-center rounded-xl text-white shadow-sm"
                style={{ background: "var(--grad-brand)" }}
              >
                <FolderPlus className="size-5" strokeWidth={1.75} />
              </span>
              <span className="flex flex-col gap-0.5">
                <span>{r.newFolder}</span>
                <span className="text-xs font-normal fl-faint">
                  {r.newFolderHint}
                </span>
              </span>
            </DialogTitle>
          </DialogHeader>
          <div className="fl-dialog-body space-y-4">
            <div className="fl-field">
              <label className="fl-field-label" htmlFor="report-folder-name">
                {r.folderName}
              </label>
              <Input
                id="report-folder-name"
                className="fl-input"
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                placeholder={r.folderNamePlaceholder}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleCreateFolder();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter className="fl-dialog-footer">
            <button
              type="button"
              className="fl-btn sm ghost"
              disabled={pending}
              onClick={() => setCreateOpen(false)}
            >
              {dict.common.cancel}
            </button>
            <button
              type="button"
              className="fl-btn sm primary"
              disabled={pending || !folderName.trim()}
              onClick={handleCreateFolder}
            >
              {pending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <FolderPlus className="size-3.5" />
              )}
              {pending ? dict.common.working : r.createFolder}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={!!deleteFolder}
        onOpenChange={(open) => {
          if (!open) setDeleteFolder(null);
        }}
        title={r.deleteFolderTitle}
        description={r.deleteFolderConfirm.replace(
          "{name}",
          deleteFolder?.name ?? ""
        )}
        confirmLabel={dict.common.delete}
        onConfirm={async () => {
          if (!deleteFolder) return;
          const result = await deleteReportFolderAction(deleteFolder.id);
          if (!result.success) {
            toast.error(result.error);
            return;
          }
          setFolders((prev) => prev.filter((f) => f.id !== deleteFolder.id));
          setFiles((prev) =>
            prev.filter((f) => f.folderId !== deleteFolder.id)
          );
          if (openFolderId === deleteFolder.id) setOpenFolderId(null);
          setDeleteFolder(null);
          toast.success(r.folderDeleted);
        }}
      />
    </>
  );
}
