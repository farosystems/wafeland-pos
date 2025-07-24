"use client";
import { useUser } from "@clerk/nextjs";

export default function DashboardPage() {
  const { user, isSignedIn } = useUser();

  if (!isSignedIn) {
    return null;
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f7fbfd" }} className="flex flex-col items-center justify-center">
      <div className="bg-white rounded-xl shadow-lg p-10 flex flex-col items-center gap-4">
        <div className="w-24 h-24 rounded-full bg-[#00adde] flex items-center justify-center mb-2">
          <span className="text-4xl font-bold text-white">
            {user?.firstName?.[0] || user?.username?.[0] || "U"}
          </span>
        </div>
        <h1 className="text-3xl font-bold text-[#011031] text-center">
          ¡Bienvenido{user?.firstName ? ", " + user.firstName : ""}!
        </h1>
        <p className="text-lg text-[#011031] text-center max-w-md">
          Nos alegra tenerte en el sistema de Punto de Venta{' '}
          <span className="font-semibold text-[#00adde]" style={{ whiteSpace: 'nowrap' }}>FA-RO</span>.
          <br/>
          Desde aquí podrás gestionar tus productos, ventas, clientes y mucho más.
        </p>
      </div>
    </div>
  );
}
