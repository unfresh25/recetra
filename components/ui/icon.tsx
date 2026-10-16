import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Calendar03Icon,
  Cancel01Icon,
  ChefHatIcon,
  Copy01Icon,
  FireIcon,
  Home01Icon,
  Location01Icon,
  Logout01Icon,
  Mail01Icon,
  Notification01Icon,
  Restaurant01Icon,
  Share08Icon,
  ShoppingBasket01Icon,
  Store01Icon,
  Tick02Icon,
  UserAdd01Icon,
  UserIcon,
} from "@hugeicons/core-free-icons";

// Single entry point for icons, so the icon set can be swapped in one file (design doc §7).
const icons = {
  "arrow-left": ArrowLeft01Icon,
  "arrow-right": ArrowRight01Icon,
  calendar: Calendar03Icon,
  close: Cancel01Icon,
  "chef-hat": ChefHatIcon,
  copy: Copy01Icon,
  fire: FireIcon,
  home: Home01Icon,
  location: Location01Icon,
  logout: Logout01Icon,
  mail: Mail01Icon,
  bell: Notification01Icon,
  restaurant: Restaurant01Icon,
  share: Share08Icon,
  basket: ShoppingBasket01Icon,
  store: Store01Icon,
  check: Tick02Icon,
  "user-add": UserAdd01Icon,
  user: UserIcon,
} as const;

export type IconName = keyof typeof icons;

export function Icon({
  name,
  size = 22,
  strokeWidth = 1.8,
  className,
}: {
  name: IconName;
  size?: number;
  strokeWidth?: number;
  className?: string;
}) {
  return (
    <HugeiconsIcon
      icon={icons[name]}
      size={size}
      strokeWidth={strokeWidth}
      className={className}
      aria-hidden
    />
  );
}
