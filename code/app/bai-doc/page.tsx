import Link from "next/link";
import { LibraryLevelGrid } from "@/components/library-lists";
import { LegacyOpenRedirect } from "@/components/library-screens";
import { readingsIndex } from "@/lib/library-server";

export const metadata = { title: "Bài đọc · Từ vựng tiếng Pháp" };

export default function BaiDocIndex() {
  const items = readingsIndex();
  return (
    <div className="space-y-5">
      <div>
        <Link href="/doc" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
          ← Đọc
        </Link>
        <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Bài đọc</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {items.length} bài ngắn theo sáu cấp A1 → C2. Chọn cấp, lọc theo chủ đề; trong bài chạm một từ để tra nghĩa, nghe cả bài theo
          từng câu.
        </p>
      </div>
      <div className="flex gap-2 text-sm">
        <span className="rounded-lg bg-primary px-3 py-1.5 font-medium text-primary-foreground">Bài đọc</span>
        <Link href="/truyen" className="rounded-lg bg-muted px-3 py-1.5 font-medium">
          Truyện
        </Link>
      </div>
      <LegacyOpenRedirect kind="reading" items={items} />
      <LibraryLevelGrid kind="reading" items={items} noun="bài" />
    </div>
  );
}
