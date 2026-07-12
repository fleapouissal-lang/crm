"use client";

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

/** Map stored avatar_url (public Supabase or app proxy) to a displayable src. */
export function resolveAvatarSrc(
  avatarUrl: string | null | undefined,
  userId?: string | null
): string | null {
  if (!avatarUrl) return null;
  if (avatarUrl.startsWith("blob:") || avatarUrl.startsWith("data:")) {
    return avatarUrl;
  }
  if (avatarUrl.startsWith("/api/avatars/")) {
    return avatarUrl;
  }
  const fromPath = avatarUrl.match(/\/avatars\/([0-9a-f-]{36})\//i);
  if (fromPath?.[1]) {
    return `/api/avatars/${fromPath[1]}?v=${encodeURIComponent(avatarUrl.slice(-12))}`;
  }
  if (userId) {
    return `/api/avatars/${userId}?v=${encodeURIComponent(avatarUrl.slice(-12))}`;
  }
  return avatarUrl;
}

type UserAvatarProps = {
  name: string;
  avatarUrl?: string | null;
  userId?: string | null;
  className?: string;
  imageClassName?: string;
  variant?: "sidebar" | "header" | "profile";
};

export function UserAvatar({
  name,
  avatarUrl,
  userId,
  className,
  imageClassName,
  variant = "sidebar",
}: UserAvatarProps) {
  const initials = initialsFromName(name);
  const [failed, setFailed] = useState(false);
  const src = useMemo(
    () => resolveAvatarSrc(avatarUrl, userId),
    [avatarUrl, userId]
  );

  useEffect(() => {
    setFailed(false);
  }, [src]);

  const baseClass =
    variant === "header"
      ? "fusion-avatar"
      : variant === "profile"
        ? "profile-avatar-lg"
        : "fusion-user-ava";

  if (src && !failed) {
    return (
      <div
        className={cn(
          baseClass,
          "relative overflow-hidden p-0",
          className
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt=""
          className={cn(
            "absolute inset-0 size-full object-cover object-center",
            imageClassName
          )}
          onError={() => setFailed(true)}
        />
      </div>
    );
  }

  return <div className={cn(baseClass, className)}>{initials}</div>;
}
