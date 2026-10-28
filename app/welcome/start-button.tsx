"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

export function StartButton({ className }: { className?: string }) {
  const router = useRouter();

  return (
    <Button
      onPress={() => router.push("/login")}
      variant="secondary"
      // Inverted over the photo: white pill, ink label.
      className={cn("btn-float w-56 bg-white text-[18px] text-black", className)}
    >
      Empecemos
    </Button>
  );
}
