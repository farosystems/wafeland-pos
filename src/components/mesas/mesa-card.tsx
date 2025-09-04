"use client";

import * as React from "react";
import { useDraggable } from "@dnd-kit/core";
import { IconUsers, IconClock, IconCurrencyDollar } from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EstadoMesaTablero } from "@/types/mesa";
import { cn } from "@/lib/utils";

interface MesaCardProps {
  estadoMesa: EstadoMesaTablero;
  onClick: () => void;
  isDragging?: boolean;
  isOverlay?: boolean;
}

export function MesaCard({ estadoMesa, onClick, isDragging = false, isOverlay = false }: MesaCardProps) {
  const { mesa, sesion_activa, estado } = estadoMesa;
  
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: mesa.id.toString(),
    disabled: isOverlay,
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  // Colores según el estado de la mesa
  const getEstadoColors = () => {
    switch (estado) {
      case 'libre':
        return {
          bg: 'bg-green-200 hover:bg-green-300',
          border: 'border-green-400',
          badge: 'bg-green-600 text-white',
          text: 'text-green-900',
        };
      case 'ocupada':
        return {
          bg: 'bg-blue-200 hover:bg-blue-300',
          border: 'border-blue-400',
          badge: 'bg-blue-600 text-white',
          text: 'text-blue-900',
        };
      case 'por_cobrar':
        return {
          bg: 'bg-orange-200 hover:bg-orange-300',
          border: 'border-orange-400',
          badge: 'bg-orange-600 text-white',
          text: 'text-orange-900',
        };
      default:
        return {
          bg: 'bg-gray-200 hover:bg-gray-300',
          border: 'border-gray-400',
          badge: 'bg-gray-600 text-white',
          text: 'text-gray-900',
        };
    }
  };

  const colors = getEstadoColors();

  const estadoLabel = {
    'libre': 'Libre',
    'ocupada': 'Ocupada',
    'por_cobrar': 'Por Cobrar'
  }[estado];

  // Formatear tiempo transcurrido si hay sesión activa
  const getTiempoTranscurrido = () => {
    if (!sesion_activa) return null;
    
    const inicio = new Date(sesion_activa.fecha_apertura);
    const ahora = new Date();
    const diffMs = ahora.getTime() - inicio.getTime();
    const diffMinutos = Math.floor(diffMs / (1000 * 60));
    
    if (diffMinutos < 60) {
      return `${diffMinutos}min`;
    } else {
      const horas = Math.floor(diffMinutos / 60);
      const minutos = diffMinutos % 60;
      return `${horas}h ${minutos}min`;
    }
  };

  const tiempoTranscurrido = getTiempoTranscurrido();

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        "w-40 h-36 cursor-pointer select-none transition-all duration-200",
        isDragging && "opacity-50 scale-105 z-50",
        isOverlay && "rotate-3 shadow-xl"
      )}
    >
      <Card
        className={cn(
          "w-full h-full transition-all duration-200",
          colors.bg,
          colors.border,
          "border-2 shadow-sm hover:shadow-md",
          isDragging && "shadow-lg scale-105"
        )}
        onClick={(e) => {
          e.stopPropagation();
          if (!isDragging) onClick();
        }}
      >
        <CardContent className="p-3 h-full flex flex-col justify-between">
          {/* Header con número y estado */}
          <div className="flex items-center justify-between mb-1">
            <span className={cn("font-bold text-lg", colors.text)}>
              {mesa.numero}
            </span>
            <Badge 
              variant="secondary" 
              className={cn("text-xs px-1 py-0", colors.badge)}
            >
              {estadoLabel}
            </Badge>
          </div>

          {/* Información de capacidad */}
          <div className="flex items-center gap-1 mb-1">
            <IconUsers className="h-3 w-3 text-gray-500" />
            <span className="text-xs text-gray-600">
              {sesion_activa ? `${sesion_activa.comensales}/${mesa.capacidad}` : `${mesa.capacidad}`}
            </span>
          </div>

          {/* Información de sesión activa */}
          {sesion_activa && (
            <div className="space-y-1">
              {tiempoTranscurrido && (
                <div className="flex items-center gap-1">
                  <IconClock className="h-3 w-3 text-gray-500" />
                  <span className="text-xs text-gray-600">{tiempoTranscurrido}</span>
                </div>
              )}
              
              {sesion_activa.total_consumido > 0 && (
                <div className="flex items-center gap-1">
                  <IconCurrencyDollar className="h-3 w-3 text-gray-500" />
                  <span className="text-xs text-gray-600 font-medium">
                    ${sesion_activa.total_consumido.toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Descripción si está libre y no hay sesión */}
          {estado === 'libre' && mesa.descripcion && (
            <span className="text-xs text-gray-500 truncate">
              {mesa.descripcion}
            </span>
          )}
        </CardContent>
      </Card>
    </div>
  );
}