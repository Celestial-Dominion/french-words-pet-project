import { GraduationCap, Repeat, BookOpenText, TrendingUp, Medal, type LucideIcon } from "lucide-react";

export interface NavTab {
  href: string;
  label: string;
  icon: LucideIcon;
  match: string[];
}

// Nguồn duy nhất cho cả MainNav (desktop) & BottomNav (mobile).
export const NAV_TABS: NavTab[] = [
  { href: "/", label: "Học", icon: GraduationCap, match: ["/", "/hoc", "/phat-am"] },
  { href: "/on-tap", label: "Ôn tập", icon: Repeat, match: ["/on-tap"] },
  { href: "/bai-doc", label: "Đọc", icon: BookOpenText, match: ["/bai-doc", "/truyen"] },
  { href: "/tien-do", label: "Tiến độ", icon: TrendingUp, match: ["/tien-do"] },
  { href: "/tu-luyen", label: "Binh nghiệp", icon: Medal, match: ["/tu-luyen"] },
];
