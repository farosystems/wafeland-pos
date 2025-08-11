'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ArticlesError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error('Error en la página de artículos:', error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 px-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center pb-4">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-red-600 mb-2">
            Error en Gestión de Artículos
          </CardTitle>
          <CardDescription className="text-gray-600 text-base">
            No se pudo cargar la información de artículos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center space-y-2">
            <p className="text-sm text-gray-500">
              {error.message || 'Error desconocido al cargar artículos'}
            </p>
            {error.digest && (
              <p className="text-xs text-gray-400">
                Código: {error.digest}
              </p>
            )}
          </div>
          
          <div className="flex flex-col gap-3">
            <Button 
              onClick={reset}
              className="w-full bg-blue-600 hover:bg-blue-700"
              size="lg"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Reintentar
            </Button>
            <Button 
              variant="outline"
              onClick={() => window.location.href = '/home'}
              className="w-full"
              size="lg"
            >
              Volver al Inicio
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
