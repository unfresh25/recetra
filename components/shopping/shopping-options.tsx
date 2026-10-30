"use client";

import { Drawer } from "@heroui/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { useCheckedItems } from "./checked-state";

export function ShoppingOptions({ itemIds }: { itemIds: string[] }) {
  const [open, setOpen] = useState(false);
  const { checked, save } = useCheckedItems();
  return <>
    <Button isIconOnly variant="secondary" size="sm" className="size-11 p-0" aria-label="Opciones de compras" onPress={() => setOpen(true)}><Icon name="more" /></Button>
    <Drawer.Backdrop isOpen={open} onOpenChange={setOpen} className="[--focus:var(--color-ink)]">
      <Drawer.Content placement="bottom">
        <Drawer.Dialog className="mx-auto w-full max-w-xl border-t border-line bg-canvas px-5 pb-safe text-ink shadow-none">
          <Drawer.Handle />
          <Drawer.CloseTrigger aria-label="Cerrar" className="btn-ghost"><Icon name="close" size={20} /></Drawer.CloseTrigger>
          <Drawer.Header><Drawer.Heading className="font-display text-2xl">Opciones de compras</Drawer.Heading></Drawer.Header>
          <Drawer.Body>
            <Button variant="ghost" block disabled={!itemIds.some((id) => checked.has(id))} onPress={() => { save(new Set()); setOpen(false); }}>Desmarcar todo</Button>
          </Drawer.Body>
        </Drawer.Dialog>
      </Drawer.Content>
    </Drawer.Backdrop>
  </>;
}
