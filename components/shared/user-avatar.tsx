"use client";

import { cn } from "@/lib/utils";

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

type UserAvatarProps = {
  name: string;
  avatarUrl?: string | null;
  className?: string;
  imageClassName?: string;
  variant?: "sidebar" | "header" | "profile";
};

export function UserAvatar({
  name,
  avatarUrl,
  className,
  imageClassName,
  variant = "sidebar",
}: UserAvatarProps) {
  const initials = initialsFromName(name);
  const baseClass =
    variant === "header"
      ? "fusion-avatar"
      : variant === "profile"
        ? "profile-avatar-lg"
        : "fusion-user-ava";

  if (avatarUrl) {
    return (
      <div className={cn(baseClass, "overflow-hidden p-0", className)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={avatarUrl}
          alt={name}
          className={cn("size-full object-cover", imageClassName)}
        />
      </div>
    );
  }

  return <div className={cn(baseClass, className)}>{initials}</div>;
}
