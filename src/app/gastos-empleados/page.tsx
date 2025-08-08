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
import { TiposGastoContent } from "@/components/tesoreria/tipos-gasto-content";
import { GastoEmpleado, CreateGastoEmpleadoData } from "@/types/gastoEmpleado";
import { getGastosEmpleados, createGastoEmpleado } from "@/app/actions/gastos-empleados";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

function Breadcrumb() {
  return (
    <nav className="flex items-center gap-2 text-sm mb-4 pl-2">
      <span className="text-gray-600">Tesorería</span>
      <span className="mx-1 text-gray-400">&gt;</span>
      <span className="text-black font-medium">Gastos de mi comercio</span>
    </nav>
  );
}

export default function GastosEmpleadosPage() {
  const { isSignedIn } = useUser();
  const router = useRouter();
  const [gastos, setGastos] = useState<GastoEmpleado[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function fetchGastos() {
      try {
        const data = await getGastosEmpleados();
        setGastos(data);
      } catch (error) {
        console.error('Error fetching gastos:', error);
        toast.error('Error al cargar los gastos');
      }
    }
    fetchGastos();
  }, []);

  const handleAddGasto = async (data: CreateGastoEmpleadoData) => {
    try {
      setIsLoading(true);
      const newGasto = await createGastoEmpleado(data);
      setGastos(prev => [newGasto, ...prev]);
      toast.success('Gasto creado exitosamente');
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error creating gasto:', error);
      toast.error('Error al crear el gasto');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isSignedIn) {
    return (
      <div className="flex flex-col justify-center items-center h-screen text-muted-foreground gap-4">
        <span>Debes iniciar sesión para ver los gastos de empleados.</span>
        <Button onClick={() => router.push("/sign-in")}>Iniciar Sesión</Button>
      </div>
    );
  }

  return (
    <div className="p-8">
      <Breadcrumb />
      <div className="flex items-center gap-3 mb-2">
        <ReceiptText className="w-8 h-8 text-primary" />
        <h1 className="text-3xl font-extrabold tracking-tight">Gastos de mi comercio</h1>
      </div>
      <div className="mb-2 pl-11">
        <p className="text-gray-500 text-base">
          Administra los gastos de empleados, consulta el historial y registra nuevas operaciones.
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
                Nuevo Gasto
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]" preventOutsideClose>
              <DialogHeader>
                <DialogTitle>Nuevo Gasto de Empleado</DialogTitle>
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

      <TiposGastoContent />
    </div>
  );
} 