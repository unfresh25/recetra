"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { createInvitation } from "@/lib/household/actions";

export function InviteButton({ householdName }: { householdName: string }) {
  const [pending, startTransition] = useTransition();
  const [link, setLink] = useState<string>();
  const [message, setMessage] = useState<string>();

  function invite() {
    startTransition(async () => {
      setMessage(undefined);
      const { token, error } = await createInvitation();
      if (!token) {
        setMessage(error);
        return;
      }
      const url = `${window.location.origin}/invite/${token}`;
      setLink(url);
      const shareData = { title: "Recetra", text: `Únete a ${householdName} en Recetra`, url };
      if (navigator.share && navigator.canShare?.(shareData)) {
        try {
          await navigator.share(shareData);
          return;
        } catch {
          // Share sheet dismissed: fall back to copying.
        }
      }
      await copy(url);
    });
  }

  async function copy(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setMessage("Link copiado. Envíaselo a tu pareja.");
    } catch {
      setMessage("Copia el link de abajo y envíaselo a tu pareja.");
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <Button variant="secondary" size="md" block onClick={invite} loading={pending}>
        <Icon name="user-add" className="text-brand" />
        Invitar a mi pareja
      </Button>
      {link ? (
        <button
          type="button"
          onClick={() => copy(link)}
          className="flex items-center gap-2 rounded-field bg-sunken px-4 py-3 text-left text-sm text-ink-muted"
        >
          <span className="min-w-0 flex-1 truncate">{link}</span>
          <Icon name="copy" size={18} />
        </button>
      ) : null}
      {message ? (
        <p role="status" className="text-sm text-ink-muted">
          {message}
        </p>
      ) : null}
      <p className="text-xs text-ink-faint">El link sirve una sola vez y vence en 7 días.</p>
    </div>
  );
}
