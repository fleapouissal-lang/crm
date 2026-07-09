"use client";

import { useRef, useState, useTransition } from "react";
import { Camera, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { removeAvatar, uploadAvatar } from "@/lib/actions/auth";
import { useDict } from "@/components/shared/i18n-provider";
import { UserAvatar } from "@/components/shared/user-avatar";
import { cn } from "@/lib/utils";

const MAX_BYTES = 2 * 1024 * 1024;
const MAX_DIM = 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

async function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
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

async function prepareAvatarFile(file: File): Promise<File> {
  if (!ALLOWED.has(file.type)) {
    throw new Error("invalid_type");
  }

  if (!file.type.startsWith("image/")) {
    throw new Error("invalid_type");
  }

  if (file.size <= MAX_BYTES && file.type !== "image/png") {
    return file;
  }

  const dataUrl = await readFileAsDataUrl(file);
  const img = await loadImage(dataUrl);
  const scale = Math.min(1, MAX_DIM / Math.max(img.width, img.height));
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

  while (quality >= 0.5) {
    blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", quality)
    );
    if (blob && blob.size <= MAX_BYTES) break;
    quality -= 0.1;
  }

  if (!blob || blob.size > MAX_BYTES) {
    throw new Error("too_large");
  }

  return new File([blob], "avatar.jpg", { type: "image/jpeg" });
}

export function ProfileAvatarEditor({
  name,
  initialUrl,
  onChange,
}: {
  name: string;
  initialUrl?: string | null;
  onChange?: (url: string | null) => void;
}) {
  const s = useDict().fusion.settings;
  const inputRef = useRef<HTMLInputElement>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialUrl ?? null);
  const [pending, startTransition] = useTransition();

  function handleSelect(file: File | null) {
    if (!file) return;

    startTransition(async () => {
      try {
        const prepared = await prepareAvatarFile(file);
        const fd = new FormData();
        fd.set("avatar", prepared);
        const result = await uploadAvatar(fd);
        if (!result.success) {
          toast.error(result.error);
          return;
        }
        const nextUrl = result.data.avatar_url;
        setAvatarUrl(nextUrl);
        onChange?.(nextUrl);
        toast.success(s.avatarSaved);
      } catch (err) {
        const code = err instanceof Error ? err.message : "";
        if (code === "invalid_type") toast.error(s.avatarInvalidType);
        else if (code === "too_large") toast.error(s.avatarTooLarge);
        else toast.error(s.avatarUploadFailed);
      }
    });
  }

  function handleRemove() {
    startTransition(async () => {
      const result = await removeAvatar();
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setAvatarUrl(null);
      onChange?.(null);
      toast.success(s.avatarRemoved);
    });
  }

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
      <div className="relative shrink-0">
        <UserAvatar name={name} avatarUrl={avatarUrl} variant="profile" />
        <button
          type="button"
          className={cn(
            "absolute -bottom-1 -right-1 grid size-9 place-items-center rounded-xl",
            "border border-[var(--border)] bg-[var(--bg-2)] text-[var(--text)] shadow-sm",
            "transition hover:border-[var(--gold)] hover:text-[var(--gold)]",
            pending && "pointer-events-none opacity-60"
          )}
          aria-label={s.changePhoto}
          onClick={() => inputRef.current?.click()}
          disabled={pending}
        >
          {pending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Camera className="size-4" strokeWidth={1.75} />
          )}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0] ?? null;
            e.target.value = "";
            handleSelect(file);
          }}
        />
      </div>

      <div className="min-w-0 flex-1 text-center sm:text-left">
        <p className="text-sm font-medium">{s.profilePhoto}</p>
        <p className="mt-1 text-xs fl-faint">{s.profilePhotoHint}</p>
        <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
          <button
            type="button"
            className="fl-btn sm"
            disabled={pending}
            onClick={() => inputRef.current?.click()}
          >
            <Camera className="size-3.5" />
            {avatarUrl ? s.changePhoto : s.addPhoto}
          </button>
          {avatarUrl ? (
            <button
              type="button"
              className="fl-btn sm ghost text-[var(--rose)]"
              disabled={pending}
              onClick={handleRemove}
            >
              <Trash2 className="size-3.5" />
              {s.removePhoto}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
