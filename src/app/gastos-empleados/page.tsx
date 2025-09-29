"use client";
import { useEffect, useState } from "react";
import { GastosEmpleadosTable } from "@/components/tesoreria/gastos-empleados-table";
import { GastoEmpleadoForm } from "@/components/tesoreria/gasto-empleado-form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { ReceiptText } from "lucide-react";
import { GastoEmpleado, CreateGastoEmpleadoData } from "@/types/gastoEmpleado";
import { getGastosLoteActivo } from "@/services/gastosEmpleados";
import { createGastoEmpleado } from "@/app/actions/gastos-empleados";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import { getTiposGasto } from "@/services/tiposGasto";
import { getEmpleados } from "@/services/empleados";

function Breadcrumb() {
  return (
    <nav className="flex items-center gap-2 text-sm mb-4 pl-2">
      <span className="text-gray-600">Tesorería</span>
      <span className="mx-1 text-gray-400">&gt;</span>
      <span className="text-black font-medium">Movimientos del día</span>
    </nav>
  );
}

export default function GastosEmpleadosPage() {
  const { isSignedIn } = useUser();
  const router = useRouter();
  const [gastos, setGastos] = useState<GastoEmpleado[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [tiposGasto, setTiposGasto] = useState<any[]>([]);
  const [empleados, setEmpleados] = useState<any[]>([]);

  useEffect(() => {
    async function fetchData() {
      try {
        const [gastosData, tiposData, empleadosData] = await Promise.all([
          getGastosLoteActivo(),
          getTiposGasto(),
          getEmpleados(),
        ]);
        setGastos(gastosData);
        setTiposGasto(tiposData);
        setEmpleados(empleadosData);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Error al cargar los datos');
      }
    }
    fetchData();
  }, []);

  const handleAddGasto = async (data: CreateGastoEmpleadoData) => {
    try {
      setIsLoading(true);
      const newGasto = await createGastoEmpleado(data);
      setGastos(prev => [newGasto, ...prev]);
      
      // Obtener información para el toast
      const tipoGasto = tiposGasto.find(t => t.id === data.fk_tipo_gasto);
      const empleado = data.fk_empleado ? empleados.find(e => e.id === data.fk_empleado) : null;
      
      // Mostrar toast de éxito con detalles
      toast.success(`¡Movimiento de ${formatCurrency(data.monto)} registrado exitosamente!`, {
        description: `${tipoGasto?.descripcion || 'Tipo de movimiento'}${empleado ? ` - ${empleado.nombre}` : ''}${data.descripcion ? ` - ${data.descripcion}` : ''}`,
        duration: 4000,
      });
      
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error creating gasto:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error al crear el movimiento';
      toast.error('Error al crear el movimiento', {
        description: errorMessage,
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isSignedIn) {
    return (
      <div className="flex flex-col justify-center items-center h-screen text-muted-foreground gap-4">
        <span>Debes iniciar sesión para ver los movimientos del día.</span>
        <Button onClick={() => router.push("/sign-in")}>Iniciar Sesión</Button>
      </div>
    );
  }

  return (
    <div className="p-8">
      <Breadcrumb />
      <div className="flex items-center gap-3 mb-2">
        <ReceiptText className="w-8 h-8 text-primary" />
        <h1 className="text-3xl font-extrabold tracking-tight">Movimientos del día</h1>
      </div>
      <div className="mb-2 pl-11">
        <p className="text-gray-500 text-base">
          Consulta y registra los movimientos financieros del día actual del lote operativo activo.
        </p>
      </div>
      <div className="flex items-center justify-between mb-4">
        <div />
        <div className="flex gap-2">
          {/* Botón para dar de alta un nuevo gasto */}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Nuevo Movimiento
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]" preventOutsideClose>
              <DialogHeader>
                <DialogTitle>Nuevo Movimiento</DialogTitle>
              </DialogHeader>
              <GastoEmpleadoForm
                onSubmit={handleAddGasto}
                onCancel={() => setIsDialogOpen(false)}
                isLoading={isLoading}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>
      {/* Eliminar loading y fetchGastos si no se usan. */}
      <GastosEmpleadosTable data={gastos} />
    </div>
  );
} 