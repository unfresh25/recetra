"use client";

import { Accordion } from "@heroui/react";
import { Button } from "@/components/ui/button";

export type FaqGroup = { title: string; items: { q: string; a: string }[] };

export function Faq({ groups }: { groups: FaqGroup[] }) {
  return (
    <div className="mt-10 flex flex-col gap-10">
      {groups.map((group) => (
        <section key={group.title}>
          <h2 className="mb-1 text-[13px] font-semibold tracking-[0.08em] text-ink-muted uppercase">{group.title}</h2>
          <Accordion className="w-full">
            {group.items.map((item) => (
              <Accordion.Item key={item.q}>
                <Accordion.Heading>
                  <Accordion.Trigger className="px-0 py-4 text-left font-display text-[18px] leading-snug text-ink">
                    {item.q}
                    <Accordion.Indicator className="text-ink-muted" />
                  </Accordion.Trigger>
                </Accordion.Heading>
                <Accordion.Panel>
                  <Accordion.Body className="px-0 pt-0 pb-5 text-[16px] leading-relaxed text-ink-muted">
                    {item.a}
                  </Accordion.Body>
                </Accordion.Panel>
              </Accordion.Item>
            ))}
          </Accordion>
        </section>
      ))}
    </div>
  );
}

export function ContactButton({ email }: { email: string }) {
  return (
    <Button
      size="md"
      onPress={() => {
        window.location.href = `mailto:${email}?subject=${encodeURIComponent("Ayuda con Mise")}`;
      }}
    >
      Escríbenos
    </Button>
  );
}
