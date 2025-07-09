"use client";

import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="relative w-full h-screen bg-black/60 backdrop-blur-sm flex items-center justify-center">
      <div className="z-10">
        <SignUp path="/sign-up" routing="path" />
      </div>
    </div>
  );
}
