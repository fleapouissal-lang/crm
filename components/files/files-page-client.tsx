"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { format } from "date-fns";
import {
  ChevronDown,
  Download,
  Eye,
  FileText,
  Folder,
  FolderPlus,
  ImageIcon,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { useDict, useI18n } from "@/components/shared/i18n-provider";
import { getDateFnsLocale } from "@/lib/i18n/locale-utils";
import {
  createFileFolderAction,
  deleteFileFolderAction,
  deleteFileFolderItemAction,
  getFileFolderItemSignedUrlAction,
  listFileFoldersAction,
  renameFileFolderItemAction,
  uploadFileFolderItemAction,
  type FileFolder,
  type FileFolderItem,
} from "@/lib/actions/org-files";
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

const ACCEPT =
  "application/pdf,image/jpeg,image/jpg,image/png,image/webp,.pdf,.jpg,.jpeg,.png,.webp";

function matchesQuery(value: string, query: string) {
  return value.toLowerCase().includes(query);
}

function isImageMime(mime: string) {
  return mime.toLowerCase().startsWith("image/");
}

function FileTypeIcon({ mime }: { mime: string }) {
  if (isImageMime(mime)) {
    return <ImageIcon className="size-4 shrink-0 text-[var(--text-dim)]" />;
  }
  return <FileText className="size-4 shrink-0 text-[var(--text-dim)]" />;
}

export function FilesPageClient() {
  const dict = useDict();
  const t = dict.fusion.files;
  const { locale } = useI18n();
  const dateLocale = getDateFnsLocale(locale);

  const [folders, setFolders] = useState<FileFolder[]>([]);
  const [files, setFiles] = useState<FileFolderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, startTransition] = useTransition();
  const [openFolderId, setOpenFolderId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [deleteFolder, setDeleteFolder] = useState<FileFolder | null>(null);
  const [deleteFile, setDeleteFile] = useState<FileFolderItem | null>(null);
  const [renameFile, setRenameFile] = useState<FileFolderItem | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [uploadingFolderId, setUploadingFolderId] = useState<string | null>(
    null
  );
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  function refresh() {
    startTransition(async () => {
      const result = await listFileFoldersAction();
      if (!result.success) {
        toast.error(result.error);
        setLoading(false);
        return;
      }
      setFolders(result.data.folders);
      setFiles(result.data.files);
      setLoading(false);
    });
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const query = search.trim().toLowerCase();

  const filesByFolder = useMemo(() => {
    const map = new Map<string, FileFolderItem[]>();
    for (const file of files) {
      const list = map.get(file.folderId) ?? [];
      list.push(file);
      map.set(file.folderId, list);
    }
    return map;
  }, [files]);

  const visibleFolders = useMemo(() => {
    if (!query) return folders;
    return folders.filter((folder) => {
      if (matchesQuery(folder.name, query)) return true;
      const folderFiles = filesByFolder.get(folder.id) ?? [];
      return folderFiles.some(
        (file) =>
          matchesQuery(file.label, query) || matchesQuery(file.fileName, query)
      );
    });
  }, [folders, filesByFolder, query]);

  function getVisibleFiles(folderId: string) {
    const folderFiles = filesByFolder.get(folderId) ?? [];
    if (!query) return folderFiles;
    return folderFiles.filter(
      (file) =>
        matchesQuery(file.label, query) || matchesQuery(file.fileName, query)
    );
  }

  function handleCreateFolder() {
    const name = folderName.trim();
    if (!name) {
      toast.error(t.folderNameRequired);
      return;
    }
    startTransition(async () => {
      const result = await createFileFolderAction(name);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setFolders((prev) => [result.data, ...prev]);
      setOpenFolderId(result.data.id);
      setFolderName("");
      setCreateOpen(false);
      toast.success(t.folderCreated);
    });
  }

  function handleUpload(folderId: string, file: File | null) {
    if (!file) return;
    const mime = (file.type || "").toLowerCase();
    const allowed =
      mime === "application/pdf" ||
      mime === "image/jpeg" ||
      mime === "image/jpg" ||
      mime === "image/png" ||
      mime === "image/webp";
    if (!allowed) {
      toast.error(t.fileTypeInvalid);
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error(t.fileTooLarge);
      return;
    }

    const formData = new FormData();
    formData.set("folderId", folderId);
    formData.set("label", file.name);
    formData.set("file", file);

    setUploadingFolderId(folderId);
    startTransition(async () => {
      const result = await uploadFileFolderItemAction(formData);
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
      setOpenFolderId(folderId);
      toast.success(t.fileUploaded);
    });
  }

  async function resolveSignedUrl(
    file: FileFolderItem,
    download = false
  ): Promise<string | null> {
    if (!download && file.signedUrl) return file.signedUrl;
    const result = await getFileFolderItemSignedUrlAction(file.id, {
      download,
    });
    if (!result.success) {
      toast.error(result.error);
      return null;
    }
    return result.data;
  }

  function handleViewFile(file: FileFolderItem) {
    startTransition(async () => {
      const url = await resolveSignedUrl(file, false);
      if (!url) return;
      window.open(url, "_blank", "noopener,noreferrer");
    });
  }

  function handleDownloadFile(file: FileFolderItem) {
    startTransition(async () => {
      const url = await resolveSignedUrl(file, true);
      if (!url) return;
      const a = document.createElement("a");
      a.href = url;
      a.rel = "noopener noreferrer";
      a.download = file.label;
      document.body.appendChild(a);
      a.click();
      a.remove();
    });
  }

  function handleRenameFile() {
    if (!renameFile) return;
    const next = renameValue.trim();
    if (!next) {
      toast.error(t.fileNameRequired);
      return;
    }
    startTransition(async () => {
      const result = await renameFileFolderItemAction(renameFile.id, next);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setFiles((prev) =>
        prev.map((row) => (row.id === result.data.id ? result.data : row))
      );
      setRenameFile(null);
      setRenameValue("");
      toast.success(t.fileRenamed);
    });
  }

  return (
    <>
      <div className="fl-card fl-clients-card">
        <div className="fl-clients-toolbar">
          <div className="fl-clients-toolbar__head">
            <div className="min-w-0">
              <h2 className="fl-clients-toolbar__title">{t.title}</h2>
              <p className="mt-0.5 text-[12px] fl-faint">{t.subtitle}</p>
            </div>
            <div className="fl-clients-toolbar__actions">
              <div className="fl-clients-search-wrap">
                <Search strokeWidth={2} />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t.searchPlaceholder}
                  className="fl-clients-search"
                />
              </div>
              <button
                type="button"
                className="fl-btn primary sm fl-toolbar-create shrink-0"
                onClick={() => setCreateOpen(true)}
              >
                <FolderPlus strokeWidth={2} className="size-3.5" />
                <span className="fl-toolbar-create__label hidden sm:inline">
                  {t.newFolder}
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
            <p className="text-sm fl-faint">{t.noFolders}</p>
            <button
              type="button"
              className="fl-btn primary sm"
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="size-3.5" strokeWidth={2} />
              {t.newFolder}
            </button>
          </div>
        ) : visibleFolders.length === 0 ? (
          <div className="fl-pad py-14 text-center text-sm fl-faint">
            {t.noSearchResults}
          </div>
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {visibleFolders.map((folder) => {
              const isOpen = openFolderId === folder.id;
              const folderFiles = isOpen ? getVisibleFiles(folder.id) : [];
              const uploading = uploadingFolderId === folder.id && pending;

              return (
                <li key={folder.id} className="fl-pad space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <button
                      type="button"
                      className="flex min-w-0 flex-1 items-center gap-3 text-start"
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
                          {t.folderFileCount.replace(
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
                        accept={ACCEPT}
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
                        {t.addFile}
                      </button>
                      <button
                        type="button"
                        className="rowbtn rowbtn--danger"
                        disabled={pending}
                        aria-label={t.deleteFolder}
                        title={t.deleteFolder}
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
                        {query ? t.noSearchResults : t.noFolderFiles}
                      </p>
                    ) : (
                      <ul className="space-y-2">
                        {folderFiles.map((file) => (
                          <li
                            key={file.id}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--border)] bg-[var(--glass-hi)] px-3 py-2.5"
                          >
                            <div className="flex min-w-0 items-center gap-2">
                              {file.signedUrl && isImageMime(file.mimeType) ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={file.signedUrl}
                                  alt=""
                                  className="size-9 shrink-0 rounded-lg object-cover"
                                />
                              ) : (
                                <FileTypeIcon mime={file.mimeType} />
                              )}
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium">
                                  {file.label}
                                </p>
                                <p className="fl-tny fl-faint">
                                  {isImageMime(file.mimeType)
                                    ? t.typeImage
                                    : t.typePdf}
                                  {" · "}
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
                                aria-label={t.viewFile}
                                title={t.viewFile}
                                onClick={() => handleViewFile(file)}
                              >
                                <Eye className="size-4" strokeWidth={2} />
                              </button>
                              <button
                                type="button"
                                className="rowbtn"
                                disabled={pending}
                                aria-label={t.downloadFile}
                                title={t.downloadFile}
                                onClick={() => handleDownloadFile(file)}
                              >
                                <Download className="size-4" strokeWidth={2} />
                              </button>
                              <button
                                type="button"
                                className="rowbtn"
                                disabled={pending}
                                aria-label={t.renameFile}
                                title={t.renameFile}
                                onClick={() => {
                                  setRenameFile(file);
                                  setRenameValue(file.label);
                                }}
                              >
                                <Pencil className="size-4" strokeWidth={2} />
                              </button>
                              <button
                                type="button"
                                className="rowbtn rowbtn--danger"
                                disabled={pending}
                                aria-label={t.deleteFile}
                                title={t.deleteFile}
                                onClick={() => setDeleteFile(file)}
                              >
                                <Trash2 className="size-4" strokeWidth={2} />
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
                <span>{t.newFolder}</span>
                <span className="text-xs font-normal fl-faint">
                  {t.newFolderHint}
                </span>
              </span>
            </DialogTitle>
          </DialogHeader>
          <div className="fl-dialog-body space-y-4">
            <div className="fl-field">
              <label className="fl-field-label" htmlFor="file-folder-name">
                {t.folderName}
              </label>
              <Input
                id="file-folder-name"
                className="fl-input"
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                placeholder={t.folderNamePlaceholder}
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
              {pending ? dict.common.working : t.createFolder}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!renameFile}
        onOpenChange={(open) => {
          if (!open) {
            setRenameFile(null);
            setRenameValue("");
          }
        }}
      >
        <DialogContent className="fl-dialog-content ring-0 sm:max-w-md">
          <DialogHeader className="fl-dialog-header">
            <DialogTitle className="flex items-center gap-3">
              <span
                className="grid size-10 place-items-center rounded-xl text-white shadow-sm"
                style={{ background: "var(--grad-brand)" }}
              >
                <Pencil className="size-5" strokeWidth={1.75} />
              </span>
              <span className="flex flex-col gap-0.5">
                <span>{t.renameFileTitle}</span>
                <span className="text-xs font-normal fl-faint">
                  {t.renameFileHint}
                </span>
              </span>
            </DialogTitle>
          </DialogHeader>
          <div className="fl-dialog-body space-y-4">
            <div className="fl-field">
              <label className="fl-field-label" htmlFor="org-file-name">
                {t.fileName}
              </label>
              <Input
                id="org-file-name"
                className="fl-input"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                placeholder={t.fileNamePlaceholder}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleRenameFile();
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
              onClick={() => {
                setRenameFile(null);
                setRenameValue("");
              }}
            >
              {dict.common.cancel}
            </button>
            <button
              type="button"
              className="fl-btn sm primary"
              disabled={pending || !renameValue.trim()}
              onClick={handleRenameFile}
            >
              {pending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Pencil className="size-3.5" />
              )}
              {pending ? dict.common.working : t.renameFile}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={!!deleteFolder}
        onOpenChange={(open) => {
          if (!open) setDeleteFolder(null);
        }}
        title={t.deleteFolderTitle}
        description={t.deleteFolderConfirm.replace(
          "{name}",
          deleteFolder?.name ?? ""
        )}
        confirmLabel={dict.common.delete}
        onConfirm={async () => {
          if (!deleteFolder) return;
          const result = await deleteFileFolderAction(deleteFolder.id);
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
          toast.success(t.folderDeleted);
        }}
      />

      <DeleteConfirmDialog
        open={!!deleteFile}
        onOpenChange={(open) => {
          if (!open) setDeleteFile(null);
        }}
        title={t.deleteFileTitle}
        description={t.deleteFileConfirm.replace(
          "{name}",
          deleteFile?.label ?? ""
        )}
        confirmLabel={dict.common.delete}
        onConfirm={async () => {
          if (!deleteFile) return;
          const result = await deleteFileFolderItemAction(deleteFile.id);
          if (!result.success) {
            toast.error(result.error);
            return;
          }
          setFiles((prev) => prev.filter((row) => row.id !== deleteFile.id));
          setFolders((prev) =>
            prev.map((f) =>
              f.id === deleteFile.folderId
                ? { ...f, fileCount: Math.max(0, f.fileCount - 1) }
                : f
            )
          );
          setDeleteFile(null);
          toast.success(t.fileDeleted);
        }}
      />
    </>
  );
}
