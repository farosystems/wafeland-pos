"use client";

import { LiquidacionesContent } from "@/components/liquidaciones/liquidaciones-content";
import { IconCalculator } from "@tabler/icons-react";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";


export default function LiquidacionesPage() {
  const { isSignedIn } = useUser();
  const router = useRouter();
  if (!isSignedIn) {
    return (
      <div className="flex flex-col justify-center items-center h-screen text-muted-foreground gap-4">
        <span>Debes iniciar sesión para ver las liquidaciones.</span>
        <Button onClick={() => router.push("/sign-in")}>Iniciar Sesión</Button>
      </div>
    );
  }
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