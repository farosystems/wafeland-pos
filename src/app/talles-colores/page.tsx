"use client";
import { IconRuler, IconPalette } from "@tabler/icons-react";
import { TallesTableBlock } from "@/components/talles/talles-table-block";
import { ColoresTableBlock } from "@/components/colores/colores-table-block";

export default function TallesColoresPage() {
  return (
    <div className="w-full min-h-screen py-8 px-4">
      <h1 className="text-3xl font-bold mb-8 flex items-center gap-3">
        <IconRuler className="w-8 h-8 text-primary" />
        Talles y Colores
      </h1>
      <div className="mb-12 w-full">
        <TallesTableBlock />
      </div>
      <div className="w-full">
        <ColoresTableBlock />
      </div>
    </div>
  );
} 