"use client";

import { useState } from "react";
import { LiquidacionForm } from "./liquidacion-form";
import { LiquidacionesTable } from "./liquidaciones-table";

export function LiquidacionesContent() {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleLiquidacionGuardada = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="flex flex-col gap-8">
      <LiquidacionForm onLiquidacionGuardada={handleLiquidacionGuardada} />
      <LiquidacionesTable key={refreshKey} />
    </div>
  );
} 