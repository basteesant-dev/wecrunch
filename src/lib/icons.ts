// Icon names editors can choose from. Rendered by components/site/Icon.tsx.
export const ICON_NAMES = [
  "Wallet", "CalendarDays", "IndianRupee", "Users", "UserCog", "Undo2", "Wrench", "Store", "Ear",
  "Package", "MonitorSmartphone", "Handshake", "Globe", "MessageCircleQuestion", "ShoppingCart",
  "Gift", "Building2", "Coins", "Maximize2", "Layers", "Award", "ChefHat", "CircleCheck", "Phone",
  "Mail", "MapPin", "Quote", "Star", "Clock", "TrendingUp", "ShieldCheck", "Truck", "Sparkles",
  "Flame", "Coffee", "Drumstick", "Percent", "BadgePercent", "HeartHandshake", "GraduationCap",
  "Megaphone", "Utensils",
] as const;

export type IconName = (typeof ICON_NAMES)[number];
