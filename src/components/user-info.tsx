"use client";

import { useUser } from "@clerk/nextjs";

export function UserInfo() {
  const { user, isSignedIn, isLoaded } = useUser();

  if (!isLoaded) return null;
  return isSignedIn ? (
    <div className="flex items-center gap-4">
      <p className="text-sm font-medium">Hola, {user.lastName}</p>
    </div>
  ) : null;
}
