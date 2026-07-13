// Gamification — theo theme cấp bậc quân đội Pháp. Logic thuần (không phụ thuộc DB).

// XP cộng khi hành động (giữ tinh thần +3/+5/+2 của app HSK).
export const XP = { newWord: 5, review: 3, practice: 2 } as const;

// 21 cấp bậc Lục quân Pháp, thăng theo SỐ TỪ ĐÃ HỌC (ngưỡng giãn trên thang ~11k).
export interface Rank {
  fr: string;
  vi: string;
  minWords: number;
}
export const RANKS: Rank[] = [
  { fr: "Soldat", vi: "Binh nhì", minWords: 0 },
  { fr: "Soldat de 1re classe", vi: "Binh nhất", minWords: 20 },
  { fr: "Caporal", vi: "Hạ sĩ", minWords: 50 },
  { fr: "Caporal-chef", vi: "Hạ sĩ nhất", minWords: 100 },
  { fr: "Sergent", vi: "Trung sĩ", minWords: 175 },
  { fr: "Sergent-chef", vi: "Trung sĩ nhất", minWords: 275 },
  { fr: "Adjudant", vi: "Thượng sĩ", minWords: 400 },
  { fr: "Adjudant-chef", vi: "Thượng sĩ nhất", minWords: 560 },
  { fr: "Major", vi: "Thượng sĩ trưởng", minWords: 760 },
  { fr: "Aspirant", vi: "Chuẩn úy", minWords: 1000 },
  { fr: "Sous-lieutenant", vi: "Thiếu úy", minWords: 1300 },
  { fr: "Lieutenant", vi: "Trung úy", minWords: 1700 },
  { fr: "Capitaine", vi: "Đại úy", minWords: 2200 },
  { fr: "Commandant", vi: "Thiếu tá", minWords: 2800 },
  { fr: "Lieutenant-colonel", vi: "Trung tá", minWords: 3500 },
  { fr: "Colonel", vi: "Đại tá", minWords: 4400 },
  { fr: "Général de brigade", vi: "Chuẩn tướng", minWords: 5500 },
  { fr: "Général de division", vi: "Thiếu tướng", minWords: 6800 },
  { fr: "Général de corps d'armée", vi: "Trung tướng", minWords: 8300 },
  { fr: "Général d'armée", vi: "Đại tướng", minWords: 10000 },
  { fr: "Maréchal de France", vi: "Thống chế Pháp", minWords: 11000 },
];

export interface RankProgress {
  index: number;
  rank: Rank;
  next?: Rank;
  toNext: number; // số từ còn thiếu để lên cấp (0 nếu đã max)
  progress: number; // 0..1 trong khoảng cấp hiện tại → cấp sau
}

export function rankForWords(words: number): RankProgress {
  let index = 0;
  for (let i = 0; i < RANKS.length; i++) if (words >= RANKS[i].minWords) index = i;
  const rank = RANKS[index];
  const next = RANKS[index + 1];
  if (!next) return { index, rank, toNext: 0, progress: 1 };
  const span = next.minWords - rank.minWords;
  const done = words - rank.minWords;
  return { index, rank, next, toNext: next.minWords - words, progress: Math.min(1, done / span) };
}

// ---- Huy hiệu ----
export interface Stats {
  words: number; // số từ đã đưa vào học
  xp: number;
  streak: number; // chuỗi ngày liên tiếp
  reads: number; // số bài đọc/truyện đã đọc
  reviews: number; // tổng lượt ôn (mọi ngày)
  correct: number; // tổng lượt trả lời đúng
  activeDays: number; // tổng số ngày có học
  matured: number; // số từ nhớ bền (FSRS stability ≥ 21 ngày)
  maxDayReviews: number; // lượt ôn cao nhất trong 1 ngày
  weekend: boolean; // từng học cuối tuần
  byLevel: Record<number, number>; // số từ đã học theo cấp
}

// ---- Huy hiệu theo NHÓM nhiều bậc (như HSK) ----
// Mỗi nhóm có 1 chỉ số + danh sách ngưỡng (tier); mỗi tier = 1 huy hiệu.
export interface BadgeGroup {
  group: string;
  name: string; // tên nhóm (theme quân đội Pháp)
  desc: string; // mô tả ngắn
  lore: string; // lời dẫn
  icon: string; // emoji đại diện
  metric: keyof Pick<Stats, "words" | "streak" | "xp" | "reviews" | "correct" | "reads" | "activeDays" | "matured" | "maxDayReviews">;
  unit: string;
  tiers: number[];
}

export const BADGE_GROUPS: BadgeGroup[] = [
  {
    group: "words", name: "Chiêu binh", desc: "Số từ đã học", icon: "🎖️",
    lore: "Mỗi từ thuộc lòng là một tân binh gia nhập đội ngũ. Quân số càng đông, sức mạnh Pháp ngữ càng lớn.",
    metric: "words", unit: "từ", tiers: [10, 25, 50, 100, 250, 500, 1000, 2000, 3500, 5000, 7500, 9000, 11000],
  },
  {
    group: "streak", name: "Trực chiến", desc: "Chuỗi ngày liên tiếp", icon: "🔥",
    lore: "Người lính giỏi không rời vị trí. Mỗi ngày học liên tục giữ cho ngọn lửa kỷ luật cháy mãi — nghỉ một ngày là chuỗi đứt.",
    metric: "streak", unit: "ngày", tiers: [3, 7, 14, 30, 60, 100, 150, 180, 270, 365, 500, 730],
  },
  {
    group: "xp", name: "Quân công", desc: "Tổng điểm XP", icon: "✨",
    lore: "Chiến công tích lũy từ mỗi câu trả lời đúng. XP càng cao, quân hàm càng gần.",
    metric: "xp", unit: "XP", tiers: [100, 500, 1000, 2500, 5000, 10000, 25000, 50000, 100000, 200000],
  },
  {
    group: "reviews", name: "Thao luyện", desc: "Tổng lượt ôn", icon: "⚔️",
    lore: "Thao trường đổ mồ hôi, chiến trường bớt đổ máu. Mỗi lượt ôn là một buổi rèn quân.",
    metric: "reviews", unit: "lượt", tiers: [100, 500, 1000, 2500, 5000, 10000, 25000, 50000, 100000],
  },
  {
    group: "correct", name: "Thiện xạ", desc: "Số lượt trả lời đúng", icon: "🎯",
    lore: "Bắn trúng mục tiêu — mỗi câu đúng là một phát ăn điểm. Tay nghề càng cao, tỉ lệ trúng càng dày.",
    metric: "correct", unit: "câu", tiers: [50, 200, 500, 1000, 2500, 5000, 10000, 25000, 50000],
  },
  {
    group: "matured", name: "Cựu binh", desc: "Từ nhớ bền (dài hạn)", icon: "🏅",
    lore: "Từ đã in sâu vào trí nhớ dài hạn (ổn định ≥ 3 tuần) — không phải nhớ tạm rồi quên. Đây mới là vốn từ THẬT.",
    metric: "matured", unit: "từ", tiers: [25, 100, 300, 800, 2000, 4000, 7000, 11000],
  },
  {
    group: "maxday", name: "Tổng lực", desc: "Lượt ôn nhiều nhất trong 1 ngày", icon: "⚡",
    lore: "Có những ngày xông trận không ngơi tay. Kỷ lục số lượt ôn trong một ngày cho thấy khí thế tổng lực.",
    metric: "maxDayReviews", unit: "lượt/ngày", tiers: [25, 50, 100, 150, 200, 300, 500],
  },
  {
    group: "reads", name: "Quân báo", desc: "Bài đọc & truyện hoàn thành", icon: "📖",
    lore: "Đọc để thấy từ sống trong văn cảnh thật. Đọc nhiều, hiểu sâu, nắm tình hình như xem tình báo.",
    metric: "reads", unit: "bài", tiers: [3, 10, 25, 50, 76],
  },
  {
    group: "days", name: "Nhật ký hành quân", desc: "Tổng số ngày học", icon: "🗓️",
    lore: "Đếm số ngày bạn ra thao trường. Đường dài mới biết ngựa hay — góp ngày thành chiến dịch.",
    metric: "activeDays", unit: "ngày", tiers: [3, 10, 30, 60, 100, 200, 300, 365, 500, 730],
  },
];

// Huy hiệu "Chiến dịch": hoàn thành (học hết) từng cấp CEFR.
export const CAMPAIGN_BADGES = [
  { id: "camp-1", level: 1, cefr: "A1", need: 800 },
  { id: "camp-2", level: 2, cefr: "A2", need: 1200 },
  { id: "camp-3", level: 3, cefr: "B1", need: 2000 },
  { id: "camp-4", level: 4, cefr: "B2", need: 2500 },
  { id: "camp-5", level: 5, cefr: "C1", need: 3000 },
  { id: "camp-6", level: 6, cefr: "C2", need: 1500 },
];

// Huy hiệu đặc biệt (điều kiện đơn, tính từ dữ liệu sẵn có).
export interface SpecialBadge {
  id: string;
  name: string;
  icon: string;
  hint: string;
  test: (s: Stats) => boolean;
}
export const SPECIAL_BADGES: SpecialBadge[] = [
  { id: "sp-first", name: "Khai hỏa", icon: "🚩", hint: "Học từ đầu tiên", test: (s) => s.words >= 1 },
  { id: "sp-week", name: "Tuần lễ vàng", icon: "🗓️", hint: "Chuỗi 7 ngày liên tiếp", test: (s) => s.streak >= 7 },
  { id: "sp-weekend", name: "Cuối tuần chăm", icon: "📅", hint: "Học vào T7/CN", test: (s) => s.weekend },
  { id: "sp-100words", name: "Đại đội", icon: "💯", hint: "Học được 100 từ", test: (s) => s.words >= 100 },
  { id: "sp-multi", name: "Đa binh chủng", icon: "🎏", hint: "Có từ đã học ở cả 6 cấp", test: (s) => [1, 2, 3, 4, 5, 6].every((l) => (s.byLevel[l] ?? 0) > 0) },
  { id: "sp-half", name: "Nửa chặng đường", icon: "⛰️", hint: "Học được 5.500 từ", test: (s) => s.words >= 5500 },
  { id: "sp-elite", name: "Tinh nhuệ", icon: "🎗️", hint: "1.000 từ nhớ bền", test: (s) => s.matured >= 1000 },
  { id: "sp-century", name: "Bách chiến", icon: "🛡️", hint: "≥100 lượt ôn trong 1 ngày", test: (s) => s.maxDayReviews >= 100 },
  { id: "sp-blitz", name: "Cuồng phong", icon: "🌪️", hint: "≥250 lượt ôn trong 1 ngày", test: (s) => s.maxDayReviews >= 250 },
  { id: "sp-persist", name: "Trường kỳ", icon: "🏔️", hint: "Học đủ 100 ngày (tổng)", test: (s) => s.activeDays >= 100 },
  { id: "sp-sharp", name: "Thần xạ", icon: "🎯", hint: "5.000 câu trả lời đúng", test: (s) => s.correct >= 5000 },
  { id: "sp-allcamp", name: "Toàn thắng", icon: "🏆", hint: "Hoàn thành cả 6 chiến dịch CEFR", test: (s) => CAMPAIGN_BADGES.every((c) => (s.byLevel[c.level] ?? 0) >= c.need) },
  { id: "sp-marechal", name: "Thống chế", icon: "👑", hint: "Học trọn toàn bộ 11.000 từ", test: (s) => s.words >= 11000 },
];

// ---- Flatten thành từng huy hiệu để hiển thị ----
export interface Badge {
  id: string;
  group: string;
  groupName: string;
  name: string; // vd "Chiêu binh V"
  icon: string;
  hint: string; // ngưỡng cần đạt
  earned: boolean;
  value: number; // giá trị hiện tại của chỉ số
  threshold: number; // ngưỡng của tier
}

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];

export interface BadgeGroupView {
  group: string;
  name: string;
  desc: string;
  lore: string;
  icon: string;
  earned: number;
  total: number;
  next?: { threshold: number; value: number; unit: string }; // tier kế tiếp chưa đạt
  badges: Badge[];
}

export function badgeGroups(s: Stats): BadgeGroupView[] {
  const views = BADGE_GROUPS.map((g) => {
    const value = s[g.metric] as number;
    const badges: Badge[] = g.tiers.map((t, i) => ({
      id: `${g.group}-${i}`,
      group: g.group,
      groupName: g.name,
      name: `${g.name} ${ROMAN[i]}`,
      icon: g.icon,
      hint: `${t.toLocaleString("vi")} ${g.unit}`,
      earned: value >= t,
      value,
      threshold: t,
    }));
    const earned = badges.filter((b) => b.earned).length;
    const nextTier = g.tiers.find((t) => value < t);
    return {
      group: g.group,
      name: g.name,
      desc: g.desc,
      lore: g.lore,
      icon: g.icon,
      earned,
      total: badges.length,
      next: nextTier ? { threshold: nextTier, value, unit: g.unit } : undefined,
      badges,
    };
  });

  // nhóm Chiến dịch (theo cấp)
  const campBadges: Badge[] = CAMPAIGN_BADGES.map((c) => {
    const learned = s.byLevel[c.level] ?? 0;
    return {
      id: c.id,
      group: "campaign",
      groupName: "Chiến dịch",
      name: `Chiến dịch ${c.cefr}`,
      icon: "🏴",
      hint: `Học hết ${c.need.toLocaleString("vi")} từ cấp ${c.cefr}`,
      earned: learned >= c.need,
      value: learned,
      threshold: c.need,
    };
  });
  views.push({
    group: "campaign", name: "Chiến dịch", desc: "Chinh phục từng cấp CEFR",
    lore: "Mỗi cấp là một chiến dịch. Học hết từ vựng của cấp = cắm cờ chiến thắng.",
    icon: "🏴",
    earned: campBadges.filter((b) => b.earned).length,
    total: campBadges.length,
    next: undefined,
    badges: campBadges,
  });

  // nhóm Đặc biệt
  const spBadges: Badge[] = SPECIAL_BADGES.map((b) => ({
    id: b.id,
    group: "special",
    groupName: "Chiến tích",
    name: b.name,
    icon: b.icon,
    hint: b.hint,
    earned: b.test(s),
    value: 0,
    threshold: 0,
  }));
  views.push({
    group: "special", name: "Chiến tích", desc: "Cột mốc đặc biệt",
    lore: "Những dấu ấn riêng trên đường binh nghiệp.",
    icon: "🌟",
    earned: spBadges.filter((b) => b.earned).length,
    total: spBadges.length,
    next: undefined,
    badges: spBadges,
  });

  return views;
}

export function badgeTotals(s: Stats): { earned: number; total: number } {
  const gs = badgeGroups(s);
  return {
    earned: gs.reduce((a, g) => a + g.earned, 0),
    total: gs.reduce((a, g) => a + g.total, 0),
  };
}
