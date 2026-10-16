import { Icon } from "@/components/ui/icon";
import type { Enums } from "@/lib/supabase/database.types";

export function PlatformIcon({ platform, size = 16 }: { platform: Enums<"source_platform">; size?: number }) {
  if (platform === "manual") return <Icon name="chef-hat" size={size} />;
  return <Icon name={platform} size={size} />;
}
