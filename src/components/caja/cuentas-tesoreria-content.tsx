"use client";
import * as React from "react";
import { CreditCard } from "lucide-react";
import { getCuentasTesoreria } from "@/services/cuentasTesoreria";
import { CuentaTesoreria } from "@/types/cuentaTesoreria";

export function CuentasTesoreriaContent() {
  const [cuentas, setCuentas] = React.useState<CuentaTesoreria[]>([]);
  const [error, setError] = React.useState<string | null>(null);

  const fetchCuentas = async () => {
    setError(null);
    try {
      const data = await getCuentasTesoreria();
      setCuentas(data);
    } catch (error) {
      console.error("Error al cargar cuentas de tesorería:", error);
      setError("Error al cargar cuentas de tesorería");
    }
  };

  React.useEffect(() => { fetchCuentas(); }, [fetchCuentas]);

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center gap-3 mb-2">
        <CreditCard className="h-7 w-7 text-primary" />
        <h2 className="text-2xl font-bold">Cuentas de Tesorería</h2>
      </div>
      {error && <div className="text-red-600 text-sm">{error}</div>}
      <div className="rounded-lg border bg-card">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="px-2 py-1 text-left">ID</th>
              <th className="px-2 py-1 text-left">Descripción</th>
              <th className="px-2 py-1 text-left">Tipo</th>
              <th className="px-2 py-1 text-left">Activo</th>
            </tr>
          </thead>
          <tbody>
            {cuentas.map((c) => (
              <tr key={c.id} className="border-b">
                <td className="px-2 py-1">{c.id}</td>
                <td className="px-2 py-1">{c.descripcion}</td>
                <td className="px-2 py-1">{c.tipo}</td>
                <td className="px-2 py-1">{c.activo ? "Sí" : "No"}</td>
              </tr>
            ))}
            {cuentas.length === 0 && (
              <tr><td colSpan={4} className="text-center py-4 text-muted-foreground">No hay cuentas de tesorería.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
} 