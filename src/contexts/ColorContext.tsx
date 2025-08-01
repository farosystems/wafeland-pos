'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { getConfiguracionEmpresa } from '@/services/configuracion';

interface ColorContextType {
  selectedColor: string;
  setSelectedColor: (color: string) => void;
  config: any;
  loading: boolean;
}

const ColorContext = createContext<ColorContextType | undefined>(undefined);

export function ColorProvider({ children }: { children: React.ReactNode }) {
  const [selectedColor, setSelectedColor] = useState('#22c55e'); // Verde por defecto
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const configData = await getConfiguracionEmpresa();
        if (configData) {
          setConfig(configData);
          if (configData.color_primario) {
            setSelectedColor(configData.color_primario);
          }
        }
      } catch (error) {
        console.error('Error loading configuration:', error);
      } finally {
        setLoading(false);
      }
    };

    loadConfig();
  }, []);

  return (
    <ColorContext.Provider value={{ selectedColor, setSelectedColor, config, loading }}>
      {children}
    </ColorContext.Provider>
  );
}

export function useColor() {
  const context = useContext(ColorContext);
  if (context === undefined) {
    throw new Error('useColor must be used within a ColorProvider');
  }
  return context;
} 