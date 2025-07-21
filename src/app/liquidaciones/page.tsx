"use client";

import { LiquidacionesContent } from "@/components/liquidaciones/liquidaciones-content";
import { IconCalculator } from "@tabler/icons-react";


export default function LiquidacionesPage() {
  return (
    <div className="w-full px-8 mt-6">
      <div className="flex flex-col items-start">
        <div className="flex items-center gap-3 mb-4 pl-6">
          <IconCalculator className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-bold">Liquidación de Sueldos</h1>
        </div>
      </div>
      <LiquidacionesContent />
    </div>
  );
} 