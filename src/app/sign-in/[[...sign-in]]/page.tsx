"use client";
import { useSignIn } from "@clerk/nextjs";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { LighthouseLogo } from "@/components/ui/lighthouse-logo";

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
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Background azul claro con nubes */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-100 via-blue-50 to-cyan-100"></div>
      
      {/* Nubes sutiles */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-32 bg-blue-200/30 rounded-full blur-3xl"></div>
        <div className="absolute top-1/3 right-1/4 w-80 h-24 bg-cyan-200/40 rounded-full blur-2xl"></div>
        <div className="absolute bottom-1/4 left-1/3 w-72 h-28 bg-blue-200/25 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 right-1/3 w-64 h-20 bg-cyan-200/35 rounded-full blur-2xl"></div>
        <div className="absolute bottom-1/3 right-1/4 w-88 h-32 bg-blue-200/20 rounded-full blur-3xl"></div>
      </div>

      {/* Contenedor principal */}
      <div className="relative z-10 w-full max-w-md mx-4">
        {/* Card translúcido */}
        <div className="bg-white/70 backdrop-blur-md rounded-3xl shadow-xl border border-white/30 p-8">
          {/* Logo y título */}
          <div className="text-center mb-8">
            <LighthouseLogo 
              size={180} 
              variant="default" 
              showText={false}
              className="mb-6"
            />
            
            <h2 className="text-3xl font-bold text-gray-800 mb-2">Iniciar Sesión</h2>
            <p className="text-gray-600 text-sm">Accede a tu cuenta de gestión</p>
          </div>

          {/* Formulario */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Campo Email/Usuario */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Email o usuario</label>
              <div className="relative">
                <input
                  type="text"
                  value={identifier}
                  onChange={e => setIdentifier(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-white/80 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 text-gray-800 placeholder-gray-500 hover:bg-white hover:border-gray-300"
                  placeholder="Ingresa tu email o usuario"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Campo Contraseña */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Contraseña</label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-white/80 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 text-gray-800 placeholder-gray-500 hover:bg-white hover:border-gray-300"
                  placeholder="Ingresa tu contraseña"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Link "Olvidé mi contraseña" */}
            <div className="text-left">
              <a href="#" className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors">
                ¿Olvidaste tu contraseña?
              </a>
            </div>

            {/* Mensaje de error */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <div className="flex items-center">
                  <svg className="h-5 w-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-red-700 text-sm font-medium">{error}</span>
                </div>
              </div>
            )}

            {/* Botón de ingreso */}
            <Button 
              type="submit" 
              disabled={loading} 
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none active:scale-[0.98]"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Ingresando...
                </div>
              ) : (
                "Ingresar"
              )}
            </Button>
          </form>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-gray-200/50">
            <p className="text-center text-xs text-gray-500">
              Los derechos de política y privacidad son de FaroAi
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
