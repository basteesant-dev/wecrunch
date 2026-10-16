import {
  Award, BadgePercent, Building2, CalendarDays, ChefHat, CircleCheck, Clock, Coffee, Coins, Drumstick, Ear, Flame, Gift,
  Globe, GraduationCap, Handshake, HeartHandshake, IndianRupee, Layers, Mail, MapPin, Maximize2, Megaphone,
  MessageCircleQuestion, MonitorSmartphone, Package, Percent, Phone, Quote, ShieldCheck, ShoppingCart, Sparkles, Star,
  Store, TrendingUp, Truck, Undo2, UserCog, Users, Utensils, Wallet, Wrench, type LucideIcon,
} from "lucide-react";
import type { IconName } from "@/lib/icons";

const ICONS: Record<IconName, LucideIcon> = {
  Award, BadgePercent, Building2, CalendarDays, ChefHat, CircleCheck, Clock, Coffee, Coins, Drumstick, Ear, Flame, Gift,
  Globe, GraduationCap, Handshake, HeartHandshake, IndianRupee, Layers, Mail, MapPin, Maximize2, Megaphone,
  MessageCircleQuestion, MonitorSmartphone, Package, Percent, Phone, Quote, ShieldCheck, ShoppingCart, Sparkles, Star,
  Store, TrendingUp, Truck, Undo2, UserCog, Users, Utensils, Wallet, Wrench,
};

export function Icon({ name, className = "size-6" }: { name?: string | null; className?: string }) {
  const C = name ? ICONS[name as IconName] : undefined;
  return C ? <C className={className} aria-hidden="true" strokeWidth={1.75} /> : null;
}
