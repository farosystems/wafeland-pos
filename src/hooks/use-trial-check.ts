import { useUser } from "@clerk/nextjs";
import { useCallback, useState } from "react";
import { getUsuarios } from "@/services/usuarios";

export function useTrialCheck() {
  const { user } = useUser();
  const [isTrialExpired, setIsTrialExpired] = useState(false);

  const checkTrial = useCallback(async (onExpired?: () => void) => {
    try {
      const usuarios = await getUsuarios();
      const usuario = usuarios.find(u => u.email === user?.emailAddresses?.[0]?.emailAddress);
      if (usuario && usuario.prueba_gratis) {
        const creado = new Date(usuario.creado_el);
        const hoy = new Date();
        const diffMs = hoy.getTime() - creado.getTime();
        const diffDias = 15 - Math.floor(diffMs / (1000 * 60 * 60 * 24));
        if (diffDias <= 0) {
          setIsTrialExpired(true);
          if (onExpired) onExpired();
          return true;
        }
      }
      setIsTrialExpired(false);
      return false;
    } catch {
      setIsTrialExpired(false);
      return false;
    }
  }, [user]);

  return { checkTrial, isTrialExpired };
} 