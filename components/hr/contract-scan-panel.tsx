"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import {
  Camera,
  FileText,
  ImageIcon,
  Trash2,
  ExternalLink,
  Upload,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useDict } from "@/components/shared/i18n-provider";
import type { EmployeeProfile, HrContractScan } from "@/lib/hr/types";
import { getHrContractScanSignedUrlAction } from "@/lib/actions/hr";
import { cn } from "@/lib/utils";
import { HrEmptyMotif } from "@/components/hr/hr-empty-motif";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const MAX_SCAN_BYTES = 3 * 1024 * 1024;
const MAX_IMAGE_DIM = 1920;

type CapturedFile = {
  file: File;
  label?: string;
};

async function compressImageIfNeeded(file: File): Promise<CapturedFile> {
  if (!file.type.startsWith("image/")) {
    return { file, label: file.name.replace(/\.[^.]+$/, "") };
  }

  if (file.size <= MAX_SCAN_BYTES) {
    return { file, label: file.name.replace(/\.[^.]+$/, "") };
  }

  const dataUrl = await readFileAsDataUrl(file);
  const img = await loadImage(dataUrl);
  const scale = Math.min(1, MAX_IMAGE_DIM / Math.max(img.width, img.height));
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.drawImage(img, 0, 0, w, h);

  let quality = 0.88;
  let blob: Blob | null = null;
  while (quality >= 0.45) {
    blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/jpeg", quality)
    );
    if (blob && blob.size <= MAX_SCAN_BYTES) break;
    quality -= 0.1;
  }

  if (!blob || blob.size > MAX_SCAN_BYTES) {
    throw new Error("too_large");
  }

  const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
  return {
    file: new File([blob], name, { type: "image/jpeg" }),
    label: file.name.replace(/\.[^.]+$/, ""),
  };
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function ContractCameraDialog({
  open,
  onOpenChange,
  onCapture,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCapture: (file: CapturedFile) => void;
}) {
  const dict = useDict();
  const h = dict.fusion.hr;
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setReady(false);
  }, []);

  useEffect(() => {
    if (!open) {
      stopStream();
      setError(null);
      return;
    }

    let cancelled = false;

    async function startCamera() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError(h.cameraNotSupported);
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play();
          setReady(true);
        }
      } catch {
        setError(h.cameraPermissionDenied);
      }
    }

    void startCamera();
    return () => {
      cancelled = true;
      stopStream();
    };
  }, [open, h, stopStream]);

  async function handleCapture() {
    const video = videoRef.current;
    if (!video || !ready) return;

    const w = video.videoWidth;
    const vh = video.videoHeight;
    if (!w || !vh) return;

    const scale = Math.min(1, MAX_IMAGE_DIM / Math.max(w, vh));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(w * scale);
    canvas.height = Math.round(vh * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/jpeg", 0.88)
    );
    if (!blob || blob.size > MAX_SCAN_BYTES) {
      toast.error(h.scanTooLarge);
      return;
    }

    const stamp = format(new Date(), "yyyy-MM-dd-HHmm");
    onCapture({
      file: new File([blob], `scan-${stamp}.jpg`, { type: "image/jpeg" }),
      label: `${h.takeScan} ${stamp}`,
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="fl-dialog-content ring-0 sm:max-w-lg">
        <DialogHeader className="fl-dialog-header">
          <DialogTitle>{h.cameraScanner}</DialogTitle>
        </DialogHeader>
        <div className="fl-dialog-body space-y-3">
          {error ? (
            <p className="rounded-lg bg-[var(--glass-hi)] px-4 py-8 text-center text-sm fl-muted">
              {error}
            </p>
          ) : (
            <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-black">
              <video
                ref={videoRef}
                playsInline
                muted
                className="aspect-[4/3] w-full object-cover"
              />
            </div>
          )}
          <p className="fl-tny fl-faint text-center">{h.cameraScannerHint}</p>
        </div>
        <DialogFooter className="fl-dialog-footer gap-2 sm:gap-0">
          <button
            type="button"
            className="fl-btn sm"
            onClick={() => onOpenChange(false)}
          >
            {dict.common.cancel}
          </button>
          <button
            type="button"
            className="fl-btn sm primary"
            disabled={!ready || !!error}
            onClick={() => void handleCapture()}
          >
            <Camera strokeWidth={2} />
            {h.capturePhoto}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export type HrScanUploadInput = {
  memberId: string;
  file: File;
  label?: string;
};

function ContractDropzone({
  pending,
  labelValue,
  onLabelChange,
  onPickFile,
  onDropFile,
  onOpenCamera,
  dropHint,
  labelPlaceholder,
  uploadPdfLabel,
  takeScanLabel,
}: {
  pending: boolean;
  labelValue: string;
  onLabelChange: (value: string) => void;
  onPickFile: (file: File) => void;
  onDropFile: (file: File) => void;
  onOpenCamera: () => void;
  dropHint: string;
  labelPlaceholder: string;
  uploadPdfLabel: string;
  takeScanLabel: string;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) onDropFile(file);
  }

  return (
    <div className="space-y-3">
      <div className="fl-field mb-0">
        <label htmlFor="contract-doc-label" className="fl-field-label">
          {labelPlaceholder}
        </label>
        <input
          id="contract-doc-label"
          type="text"
          className="fl-input"
          value={labelValue}
          disabled={pending}
          placeholder={labelPlaceholder}
          onChange={(e) => onLabelChange(e.target.value)}
        />
      </div>

      <div
        role="button"
        tabIndex={0}
        aria-disabled={pending}
        className={cn(
          "fl-hr-dropzone",
          dragOver && "is-dragover",
          pending && "opacity-60 pointer-events-none"
        )}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="flex size-12 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--glass-solid)]">
          <Upload className="size-5 text-[var(--iris)]" strokeWidth={1.75} />
        </div>
        <div>
          <p className="text-sm font-medium">{uploadPdfLabel}</p>
          <p className="mt-1 text-xs fl-faint">{dropHint}</p>
        </div>
        <div className="flex flex-wrap justify-center gap-2 pt-1">
          <span className="fl-btn sm primary pointer-events-none">
            <FileText strokeWidth={2} />
            PDF / Image
          </span>
          <button
            type="button"
            className="fl-btn sm"
            disabled={pending}
            onClick={(e) => {
              e.stopPropagation();
              onOpenCamera();
            }}
          >
            <Camera strokeWidth={2} />
            {takeScanLabel}
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,.pdf,image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) onPickFile(file);
          }}
        />
      </div>
    </div>
  );
}

export function ContractScanPanel({
  profile,
  onUpload,
  onDelete,
  readOnly = false,
}: {
  profile: EmployeeProfile;
  onUpload?: (input: HrScanUploadInput) => Promise<HrContractScan | null>;
  onDelete?: (scanId: string) => void;
  readOnly?: boolean;
}) {
  const dict = useDict();
  const h = dict.fusion.hr;
  const l = dict.fusion.labels;
  const [pending, startTransition] = useTransition();
  const [cameraOpen, setCameraOpen] = useState(false);
  const [docLabel, setDocLabel] = useState("");

  const scans = profile.contractScans ?? [];

  async function persistCaptured(captured: CapturedFile) {
    if (!onUpload) return;
    const scan = await onUpload({
      memberId: profile.memberId,
      file: captured.file,
      label: docLabel.trim() || captured.label,
    });
    if (scan) {
      setDocLabel("");
      toast.success(h.scanUploaded);
    }
  }

  function processFile(file: File) {
    const isPdf =
      file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    const isImage = file.type.startsWith("image/");

    if (!isPdf && !isImage) {
      toast.error(h.scanInvalidType);
      return;
    }

    if (file.size > MAX_SCAN_BYTES && isPdf) {
      toast.error(h.scanTooLarge);
      return;
    }

    startTransition(async () => {
      try {
        const captured = await compressImageIfNeeded(file);
        if (captured.file.size > MAX_SCAN_BYTES) {
          toast.error(h.scanTooLarge);
          return;
        }
        await persistCaptured(captured);
      } catch {
        toast.error(h.scanTooLarge);
      }
    });
  }

  return (
    <div className="space-y-5">
      <dl className="grid gap-2 text-sm sm:grid-cols-2">
        <div className="flex justify-between gap-3 rounded-lg bg-[var(--glass-hi)] px-3 py-2.5">
          <dt className="fl-muted">{l.contract}</dt>
          <dd className="font-medium">{h.contracts[profile.contractType]}</dd>
        </div>
        <div className="flex justify-between gap-3 rounded-lg bg-[var(--glass-hi)] px-3 py-2.5">
          <dt className="fl-muted">{dict.common.status}</dt>
          <dd className="font-medium">{h.statuses[profile.status]}</dd>
        </div>
        {profile.contractStart ? (
          <div className="flex justify-between gap-3 rounded-lg bg-[var(--glass-hi)] px-3 py-2.5">
            <dt className="fl-muted">{h.contractStart}</dt>
            <dd className="fl-mono text-[13px]">
              {format(new Date(profile.contractStart + "T00:00:00"), "dd MMM yyyy")}
            </dd>
          </div>
        ) : null}
        {profile.contractEnd ? (
          <div className="flex justify-between gap-3 rounded-lg bg-[var(--glass-hi)] px-3 py-2.5">
            <dt className="fl-muted">{h.contractEnd}</dt>
            <dd className="fl-mono text-[13px]">
              {format(new Date(profile.contractEnd + "T00:00:00"), "dd MMM yyyy")}
            </dd>
          </div>
        ) : null}
      </dl>

      {!readOnly && onUpload ? (
        <ContractDropzone
          pending={pending}
          labelValue={docLabel}
          onLabelChange={setDocLabel}
          onPickFile={processFile}
          onDropFile={processFile}
          onOpenCamera={() => setCameraOpen(true)}
          dropHint={h.contractDropHint}
          labelPlaceholder={h.contractDocLabel}
          uploadPdfLabel={h.uploadContract}
          takeScanLabel={h.takeScan}
        />
      ) : null}

      {scans.length === 0 ? (
        <HrEmptyMotif
          icon={FileText}
          title={h.noContractScans}
          description={h.contractScansHint}
          size="md"
        />
      ) : (
        <div className="fl-hr-scan-grid">
          {scans.map((scan) => (
            <ContractScanCard
              key={scan.id}
              memberId={profile.memberId}
              scan={scan}
              viewLabel={h.viewScan}
              deleteLabel={dict.common.delete}
              pdfLabel={h.pdfDocument}
              scanLabel={h.scanDocument}
              onDelete={onDelete ? () => onDelete(scan.id) : undefined}
            />
          ))}
        </div>
      )}

      {!readOnly && onUpload ? (
        <ContractCameraDialog
          open={cameraOpen}
          onOpenChange={setCameraOpen}
          onCapture={(captured) => {
            startTransition(async () => {
              await persistCaptured(captured);
            });
          }}
        />
      ) : null}
    </div>
  );
}

function ContractScanCard({
  memberId,
  scan,
  viewLabel,
  deleteLabel,
  pdfLabel,
  scanLabel,
  onDelete,
}: {
  memberId: string;
  scan: HrContractScan;
  viewLabel: string;
  deleteLabel: string;
  pdfLabel: string;
  scanLabel: string;
  onDelete?: () => void;
}) {
  const dict = useDict();
  const h = dict.fusion.hr;
  const [opening, setOpening] = useState(false);
  const isImage = scan.mimeType.startsWith("image/");
  const isPdf = scan.mimeType === "application/pdf";

  const openInNewTab = useCallback(async () => {
    if (opening) return;
    setOpening(true);
    try {
      const res = await getHrContractScanSignedUrlAction(memberId, scan.id);
      const url = res.success && res.data ? res.data : scan.dataUrl;
      if (!url) {
        toast.error(h.scanPreviewFailed);
        return;
      }
      window.open(url, "_blank", "noopener,noreferrer");
    } finally {
      setOpening(false);
    }
  }, [opening, memberId, scan.id, scan.dataUrl, h.scanPreviewFailed]);

  return (
    <article className="fl-hr-scan-card fl-card overflow-hidden">
      <button
        type="button"
        className="fl-hr-scan-preview relative block w-full cursor-pointer border-0 p-0 text-start"
        aria-label={viewLabel}
        disabled={opening}
        onClick={() => void openInNewTab()}
      >
        {isImage && scan.dataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={scan.dataUrl} alt={scan.fileName} className="size-full object-cover" />
        ) : (
          <div className="flex size-full flex-col items-center justify-center gap-2 bg-[var(--glass-hi)]">
            {isPdf ? (
              <FileText className="size-10 text-[var(--iris)]" strokeWidth={1.5} />
            ) : (
              <ImageIcon className="size-10 fl-faint" strokeWidth={1.5} />
            )}
            <span className="fl-tny fl-faint uppercase">
              {isPdf ? "PDF" : (scan.mimeType.split("/")[1] ?? "file")}
            </span>
          </div>
        )}
        <span
          className={cn(
            "absolute start-2 top-2 fl-badge text-[9px]",
            isPdf ? "b-iris" : "b-green"
          )}
        >
          {isPdf ? pdfLabel : scanLabel}
        </span>
      </button>
      <div className="fl-pad space-y-2">
        <p className="truncate text-[13px] font-medium" title={scan.fileName}>
          {scan.label ?? scan.fileName}
        </p>
        <p className="fl-tny fl-faint">
          {format(new Date(scan.uploadedAt), "dd MMM yyyy · HH:mm")}
        </p>
        <div className="flex gap-1.5">
          <button
            type="button"
            className={cn("fl-btn sm ghost flex-1 justify-center text-[11px]")}
            disabled={opening}
            onClick={() => void openInNewTab()}
          >
            <ExternalLink className="size-3" strokeWidth={2} />
            {viewLabel}
          </button>
          {onDelete ? (
            <button
              type="button"
              className="fl-btn sm ghost text-[11px] text-[var(--rose)]"
              onClick={onDelete}
              title={deleteLabel}
            >
              <Trash2 className="size-3.5" strokeWidth={2} />
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}
