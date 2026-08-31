export const APPEARANCE_ISSUE_CATEGORIES = [
  { id: "hair", label: "頭髮" },
  { id: "wrong_shirt", label: "著錯衫" },
  { id: "socks", label: "襪" },
  { id: "shoes", label: "皮鞋 / 球鞋" },
  { id: "nails", label: "指甲" },
  { id: "wrong_season", label: "未換季" },
  { id: "school_socks", label: "校襪" },
  { id: "belt", label: "腰帶 / 皮帶" },
  { id: "undershirt", label: "底裙 / 底衫" },
  { id: "school_tie", label: "校呔" },
  { id: "missing_badge", label: "欠校徽" },
  { id: "skirt_length", label: "裙 (長度)" },
  { id: "trousers", label: "褲" },
  { id: "makeup", label: "化妝" },
  { id: "accessories", label: "飾物" },
] as const;

export type AppearanceIssueCategoryId =
  (typeof APPEARANCE_ISSUE_CATEGORIES)[number]["id"];

const categoryLabelMap = new Map(
  APPEARANCE_ISSUE_CATEGORIES.map((item) => [item.id, item.label])
);

export function appearanceCategoryLabel(id: AppearanceIssueCategoryId): string {
  return categoryLabelMap.get(id) ?? id;
}

export function formatAppearanceCategoryLabels(
  categories: AppearanceIssueCategoryId[] | undefined
): string {
  if (!categories || categories.length === 0) return "";
  return categories.map((id) => appearanceCategoryLabel(id)).join("、");
}

export function isAppearanceCategoryId(value: string): value is AppearanceIssueCategoryId {
  return categoryLabelMap.has(value as AppearanceIssueCategoryId);
}
