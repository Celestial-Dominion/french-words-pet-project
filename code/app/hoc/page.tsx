import LevelGrid from "@/components/level-grid";
import { GlobalWordSearch, CourseCards } from "@/components/hoc-extras";
import { grammarIndex } from "@/lib/grammar-server";

export const metadata = { title: "Học từ · Từ vựng tiếng Pháp" };

export default function HocIndex() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Học từ theo cấp</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Chọn cấp để học theo phương pháp lặp lại ngắt quãng, duyệt và tra cứu.
        </p>
      </div>
      <GlobalWordSearch />
      <CourseCards grammarIds={grammarIndex().lessons.map((l) => l.id)} />
      <LevelGrid />
    </div>
  );
}
