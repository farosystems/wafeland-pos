import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function HomePage() {
  const { userId } = await auth();

  if (userId) {
    redirect("/home");
  }

  // Página pública si no está logueado
  return (
    <>
      <div className="flex flex-col items-center justify-center min-h-screen px-4 text-center">
        <h1 className="text-4xl font-bold mb-4">
          Sistema de Punto de Venta (POS)
        </h1>
        <p className="text-muted-foreground mb-6">
          Debés iniciar sesión para continuar
        </p>

        <div className="flex flex-col gap-2">
          <Link href="/sign-in">
            <Button>Iniciar Sesión</Button>
          </Link>
        </div>
      </div>
    </>
  );
}
