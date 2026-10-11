import Link from "next/link";
import { LibraryLevelGrid } from "@/components/library-lists";
import { LegacyOpenRedirect } from "@/components/library-screens";
import { storiesIndex } from "@/lib/library-server";

export const metadata = { title: "Truyện · Từ vựng tiếng Pháp" };

export default function TruyenIndex() {
  const items = storiesIndex();
  return (
    <div className="space-y-5">
      <div>
        <Link href="/doc" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
          ← Đọc
        </Link>
        <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Truyện</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {items.length} truyện nhiều chương — đọc rộng, gặp lại từ qua nhân vật và sự kiện. Đọc tới cuối chương cuối là tự tính đã đọc
          (hoặc tích ô tròn để đánh dấu tay).
        </p>
      </div>
      <div className="flex gap-2 text-sm">
        <Link href="/bai-doc" className="rounded-lg bg-muted px-3 py-1.5 font-medium">
          Bài đọc
        </Link>
        <span className="rounded-lg bg-primary px-3 py-1.5 font-medium text-primary-foreground">Truyện</span>
      </div>
      <LegacyOpenRedirect kind="story" items={items} />
      <LibraryLevelGrid kind="story" items={items} noun="truyện" />
    </div>
  );
}
