"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useDict } from "@/components/shared/i18n-provider";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const dict = useDict();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
      <h2 className="text-xl font-semibold">{dict.errors.somethingWrong}</h2>
      <p className="max-w-md text-sm text-muted-foreground">
        {error.message || dict.errors.somethingWrong}
      </p>
      <Button onClick={reset}>{dict.errors.tryAgain}</Button>
    </div>
  );
}
