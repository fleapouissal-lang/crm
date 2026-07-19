"use client";

import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";

type AdaptivePaginationOptions = {
  rowHeight?: number;
  minDesktopRows?: number;
  maxDesktopRows?: number;
  mobileRows?: number;
  reservedTop?: number;
  reservedBottom?: number;
  resetKey?: string;
};

export function useAdaptivePagination<T>(
  items: T[],
  {
    rowHeight = 58,
    minDesktopRows = 6,
    maxDesktopRows = 20,
    mobileRows = 10,
    reservedTop = 360,
    reservedBottom = 84,
    resetKey = "",
  }: AdaptivePaginationOptions = {}
) {
  const [pageState, setPageState] = useState({ key: resetKey, page: 1 });
  const [pageSize, setPageSize] = useState(mobileRows);

  const calculatePageSize = useCallback(() => {
    if (window.innerWidth < 768) {
      setPageSize(mobileRows);
      return;
    }

    const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
    const availableHeight = Math.max(
      0,
      viewportHeight - reservedTop - reservedBottom
    );
    const rows = Math.floor(availableHeight / rowHeight);
    setPageSize(Math.min(maxDesktopRows, Math.max(minDesktopRows, rows)));
  }, [
    maxDesktopRows,
    minDesktopRows,
    mobileRows,
    reservedTop,
    reservedBottom,
    rowHeight,
  ]);

  useLayoutEffect(() => {
    const frame = window.requestAnimationFrame(calculatePageSize);
    const viewport = window.visualViewport;
    window.addEventListener("resize", calculatePageSize);
    viewport?.addEventListener("resize", calculatePageSize);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", calculatePageSize);
      viewport?.removeEventListener("resize", calculatePageSize);
    };
  }, [calculatePageSize]);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const requestedPage = pageState.key === resetKey ? pageState.page : 1;
  const page = Math.min(requestedPage, totalPages);
  const setPage = useCallback(
    (nextPage: number) => {
      setPageState({ key: resetKey, page: nextPage });
    },
    [resetKey]
  );

  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, page, pageSize]);

  return {
    page,
    pageSize,
    pageItems,
    setPage,
    totalItems: items.length,
    totalPages,
  };
}
