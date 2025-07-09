"use client";

import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="relative w-full h-screen bg-black/60 backdrop-blur-sm flex items-center justify-center">
      <SignIn />
    </div>
  );
}
