"use client";

// Màn đọc theo route /bai-doc/[cấp]/[id], /truyen/[cấp]/[id]: trang tĩnh chỉ mang id — nội dung bài (JSON theo cấp)
// tải phía client khi mở. "Bài tiếp theo" = bài kế trong chỉ mục (hết cấp thì sang cấp sau).
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loadReadings, loadReadingsIndex, loadStories, loadStoriesIndex, type ReadingDoc, type StoryDoc } from "@/lib/data";
import { libraryHref, libraryLevelHref } from "@/lib/library";
import Reader from "@/components/reader";
import StoryReader, { type NextItem } from "@/components/story-reader";

type Load<T> = { doc: T; next: NextItem | null } | "missing" | null;

function nextOf<T extends { id: string; level: number; title_fr: string; title_vi: string }>(index: T[], id: string, kind: "reading" | "story"): NextItem | null {
  const i = index.findIndex((x) => x.id === id);
  const n = i >= 0 ? index[i + 1] : undefined;
  return n ? { href: libraryHref(kind, n.level, n.id), title_fr: n.title_fr, title_vi: n.title_vi } : null;
}

export function ReadingScreen({ level, id }: { level: number; id: string }) {
  const router = useRouter();
  const [state, setState] = useState<Load<ReadingDoc>>(null);
  useEffect(() => {
    let live = true;
    Promise.all([loadReadings(level), loadReadingsIndex()])
      .then(([docs, index]) => {
        const doc = docs.find((d) => d.id === id);
        if (live) setState(doc ? { doc, next: nextOf(index, id, "reading") } : "missing");
      })
      .catch(() => live && setState("missing"));
    return () => {
      live = false;
    };
  }, [level, id]);
  if (state === null) return <p className="text-sm text-muted-foreground">Đang tải…</p>;
  if (state === "missing") return <p className="text-sm text-destructive">Không tải được bài đọc. Kiểm tra kết nối rồi tải lại trang.</p>;
  return <Reader key={state.doc.id} doc={state.doc} next={state.next} onBack={() => router.push(libraryLevelHref("reading", level))} />;
}

export function StoryScreen({ level, id }: { level: number; id: string }) {
  const router = useRouter();
  const [state, setState] = useState<Load<StoryDoc>>(null);
  useEffect(() => {
    let live = true;
    Promise.all([loadStories(level), loadStoriesIndex()])
      .then(([docs, index]) => {
        const doc = docs.find((d) => d.id === id);
        if (live) setState(doc ? { doc, next: nextOf(index, id, "story") } : "missing");
      })
      .catch(() => live && setState("missing"));
    return () => {
      live = false;
    };
  }, [level, id]);
  if (state === null) return <p className="text-sm text-muted-foreground">Đang tải…</p>;
  if (state === "missing") return <p className="text-sm text-destructive">Không tải được truyện. Kiểm tra kết nối rồi tải lại trang.</p>;
  return <StoryReader key={state.doc.id} doc={state.doc} next={state.next} onBack={() => router.push(libraryLevelHref("story", level))} />;
}

/** Liên kết cũ "/bai-doc?open=<id>" (gợi ý sau phiên học, thẻ từ của bản trước) → chuyển sang trang bài mới. */
export function LegacyOpenRedirect({ kind, items }: { kind: "reading" | "story"; items: { id: string; level: number }[] }) {
  const router = useRouter();
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("open");
    const m = id ? items.find((x) => x.id === id) : undefined;
    if (m) router.replace(libraryHref(kind, m.level, m.id));
  }, [kind, items, router]);
  return null;
}
