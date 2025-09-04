"use client";

import * as React from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  UniqueIdentifier,
} from "@dnd-kit/core";
import { restrictToWindowEdges } from "@dnd-kit/modifiers";
import { EstadoMesaTablero } from "@/types/mesa";
import { MesaCard } from "./mesa-card";

interface TableroMesasProps {
  estadoMesas: EstadoMesaTablero[];
  onMesaMove: (mesaId: number, nuevaPosicion: { x: number; y: number }) => Promise<void>;
  onMesaClick: (estadoMesa: EstadoMesaTablero) => void;
}

export function TableroMesas({ estadoMesas, onMesaMove, onMesaClick }: TableroMesasProps) {
  const [activeId, setActiveId] = React.useState<UniqueIdentifier | null>(null);
  const [draggedMesa, setDraggedMesa] = React.useState<EstadoMesaTablero | null>(null);

  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: {
      distance: 8,
    },
  });

  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: {
      delay: 200,
      tolerance: 8,
    },
  });

  const sensors = useSensors(mouseSensor, touchSensor);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveId(active.id);
    
    const mesa = estadoMesas.find((m) => m.mesa.id.toString() === active.id);
    setDraggedMesa(mesa || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, delta } = event;
    setActiveId(null);
    setDraggedMesa(null);

    if (!delta.x && !delta.y) return;

    const mesa = estadoMesas.find((m) => m.mesa.id.toString() === active.id);
    if (!mesa) return;

    // Calcular nueva posición basada en el delta
    const nuevaPosicion = {
      x: Math.max(0, mesa.mesa.posicion_x + delta.x),
      y: Math.max(0, mesa.mesa.posicion_y + delta.y),
    };

    try {
      await onMesaMove(mesa.mesa.id, nuevaPosicion);
    } catch (error) {
      console.error("Error al mover mesa:", error);
    }
  };

  // Si no hay mesas, mostrar mensaje informativo
  if (estadoMesas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <p className="text-lg mb-2">No hay mesas configuradas</p>
        <p className="text-sm">Usa el botón &ldquo;Gestionar Mesas&rdquo; para crear tu primera mesa</p>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      modifiers={[restrictToWindowEdges]}
    >
      <div className="relative w-full h-full">
        {estadoMesas.map((estadoMesa) => (
          <div
            key={estadoMesa.mesa.id}
            style={{
              position: 'absolute',
              left: estadoMesa.mesa.posicion_x,
              top: estadoMesa.mesa.posicion_y,
              zIndex: activeId === estadoMesa.mesa.id.toString() ? 1000 : 1,
            }}
          >
            <MesaCard
              estadoMesa={estadoMesa}
              onClick={() => onMesaClick(estadoMesa)}
              isDragging={activeId === estadoMesa.mesa.id.toString()}
            />
          </div>
        ))}
      </div>

      {/* Overlay que se muestra durante el drag */}
      <DragOverlay>
        {draggedMesa && (
          <MesaCard
            estadoMesa={draggedMesa}
            onClick={() => {}}
            isDragging={true}
            isOverlay={true}
          />
        )}
      </DragOverlay>
    </DndContext>
  );
}