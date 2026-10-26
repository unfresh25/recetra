"use client";

import { Drawer } from "@heroui/react";
import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/ui/icon";

export function CreateSheet() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Drawer isOpen={isOpen} onOpenChange={setIsOpen}>
      <Drawer.Trigger
        aria-label="Crear"
        className="flex size-13 items-center justify-center rounded-full bg-ink text-white shadow-none"
      >
        <Icon name="add" size={28} strokeWidth={2} />
      </Drawer.Trigger>
      <Drawer.Backdrop variant="opaque">
        <Drawer.Content placement="bottom">
          <Drawer.Dialog className="mx-auto w-full max-w-xl bg-canvas px-5 pb-safe text-ink shadow-none">
            <Drawer.Header className="flex-row items-center justify-between">
              <Drawer.Heading className="font-display text-2xl font-bold">Crear</Drawer.Heading>
              <Drawer.CloseTrigger aria-label="Cerrar" className="static flex size-11 items-center justify-center rounded-full text-ink shadow-none">
                <Icon name="close" />
              </Drawer.CloseTrigger>
            </Drawer.Header>
            <Drawer.Body className="px-0">
              <ul className="divide-y divide-line">
                <li>
                  <Link href="/recipes/import" onClick={() => setIsOpen(false)} className="flex items-center gap-4 py-5">
                    <Icon name="link" size={24} />
                    <span className="min-w-0 flex-1">
                      <span className="block font-display font-bold">Importar receta</span>
                      <span className="block text-sm text-ink-muted">Desde TikTok, Instagram o YouTube</span>
                    </span>
                    <Icon name="arrow-right" size={18} className="text-ink-muted" />
                  </Link>
                </li>
                <li>
                  <button type="button" disabled className="flex w-full items-center gap-4 py-5 text-left text-ink-muted">
                    <Icon name="pencil" size={24} />
                    <span>
                      <span className="block font-display font-bold">Subir mi receta</span>
                      <span className="block text-sm">Próximamente</span>
                    </span>
                  </button>
                </li>
                <li>
                  <button type="button" disabled className="flex w-full items-center gap-4 py-5 text-left text-ink-muted">
                    <Icon name="camera" size={24} />
                    <span>
                      <span className="block font-display font-bold">Grabarme cocinando</span>
                      <span className="block text-sm">Próximamente</span>
                    </span>
                  </button>
                </li>
              </ul>
            </Drawer.Body>
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </Drawer>
  );
}
