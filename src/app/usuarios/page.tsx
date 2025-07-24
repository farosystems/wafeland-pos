"use client";
import { UsuariosContent } from "@/components/clientes/usuarios-content";
import { BreadcrumbBar } from "@/components/BreadcrumbBar";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export default function UsuariosPage() {
  const { isSignedIn } = useUser();
  const router = useRouter();
  if (!isSignedIn) {
    return (
      <div className="flex flex-col justify-center items-center h-screen text-muted-foreground gap-4">
        <span>Debes iniciar sesión para ver los usuarios.</span>
        <Button onClick={() => router.push("/sign-in")}>Iniciar Sesión</Button>
      </div>
    );
  }
  return <div className="mt-6"><BreadcrumbBar /><UsuariosContent /></div>;
} 