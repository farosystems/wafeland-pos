"use client";
import { useSignIn } from "@clerk/nextjs";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function CustomSignIn() {
  const { signIn, setActive } = useSignIn();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (!signIn) throw new Error("Clerk no está listo");
      const result = await signIn.create({
        identifier,
        password,
      });
      await setActive({ session: result.createdSessionId });
      window.location.href = "/home";
    } catch {
      setError("Usuario o contraseña incorrectos");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#fff" }} className="flex items-center justify-center">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full max-w-xs bg-white p-8 rounded-xl shadow-lg items-center">
        <img src="/favicon.png" alt="Logo Faro" style={{ width: 120, height: 120, objectFit: "contain", marginBottom: 12 }} />
        <h2 className="text-2xl font-bold text-center mb-2" style={{ color: "#011031" }}>Iniciar Sesión</h2>
        <input
          type="text"
          placeholder="Email o usuario"
          value={identifier}
          onChange={e => setIdentifier(e.target.value)}
          required
          className="px-4 py-2 rounded border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#00adde] text-[#011031] w-full"
          style={{ background: "#f7fbfd" }}
        />
        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          className="px-4 py-2 rounded border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#00adde] text-[#011031] w-full"
          style={{ background: "#f7fbfd" }}
        />
        <Button type="submit" disabled={loading} style={{ background: "#00adde", color: "#fff" }} className="w-full font-semibold hover:opacity-90 mt-2">
          {loading ? "Ingresando..." : "Ingresar"}
        </Button>
        {error && <div className="text-red-600 text-sm text-center w-full">{error}</div>}
      </form>
    </div>
  );
}
