"use client";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { MesasContent } from "@/components/mesas/mesas-content";
import { BreadcrumbBar } from "@/components/BreadcrumbBar";

export default function MesasPage() {
  const { isSignedIn } = useUser();
  const router = useRouter();
  
  if (!isSignedIn) {
    return (
      <div className="flex flex-col justify-center items-center h-screen text-muted-foreground gap-4">
        <span>Debes iniciar sesión para gestionar las mesas.</span>
        <Button onClick={() => router.push("/sign-in")}>Iniciar Sesión</Button>
      </div>
    );
  }
  
  return (
    <div className="mt-6">
      <BreadcrumbBar />
      <MesasContent />
    </div>
  );
}