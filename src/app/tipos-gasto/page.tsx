"use client";
import { ReceiptText } from "lucide-react";
import { TiposGastoContent } from "@/components/tesoreria/tipos-gasto-content";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

function Breadcrumb() {
  return (
    <nav className="flex items-center gap-2 text-sm mb-4 pl-2">
      <span className="text-gray-600">Tesorería</span>
      <span className="mx-1 text-gray-400">&gt;</span>
      <span className="text-black font-medium">Tipos de Movimientos</span>
    </nav>
  );
}

export default function TiposGastoPage() {
  const { isSignedIn } = useUser();
  const router = useRouter();

  if (!isSignedIn) {
    return (
      <div className="flex flex-col justify-center items-center h-screen text-muted-foreground gap-4">
        <span>Debes iniciar sesión para ver los tipos de movimientos.</span>
        <Button onClick={() => router.push("/sign-in")}>Iniciar Sesión</Button>
      </div>
    );
  }

  return (
    <div className="p-8">
      <Breadcrumb />
      <div className="flex items-center gap-3 mb-2">
        <ReceiptText className="w-8 h-8 text-primary" />
        <h1 className="text-3xl font-extrabold tracking-tight">Tipos de Movimientos</h1>
      </div>
      <div className="mb-6 pl-11">
        <p className="text-gray-500 text-base">
          Gestiona los tipos de movimientos disponibles en el sistema. Configura si son ingresos o egresos, si obligan seleccionar empleado y si afectan la caja.
        </p>
      </div>
      <TiposGastoContent />
    </div>
  );
}