"use client";
import React, { useEffect, useState, useMemo, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { getClientes } from "@/services/clientes";
import { getUsuarios } from "@/services/usuarios";
import { getTiposComprobantes } from "@/services/tiposComprobantes";
import { getCuentasTesoreria } from "@/services/cuentasTesoreria";
import { getArticles } from "@/services/articles";
import { createOrdenVenta } from "@/services/ordenesVenta";
import { createOrdenVentaDetalle } from "@/services/ordenesVentaDetalle";
import { createOrdenVentaMediosPago } from "@/services/ordenesVentaMediosPago";
import { getLoteCajaAbiertaPorUsuario } from "@/services/lotesOperaciones";
import { Cliente } from "@/types/cliente";
import { Usuario } from "@/types/usuario";
import { TipoComprobante } from "@/types/tipoComprobante";
import { CuentaTesoreria } from "@/types/cuentaTesoreria";
import { Article } from "@/types/article";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { formatCurrency, DEFAULT_CURRENCY, DEFAULT_LOCALE } from "@/lib/utils";
import { createMovimientoStock } from "@/services/movimientosStock";
import { createCuentaCorriente } from "@/services/cuentasCorrientes";
import { registrarMovimientoCaja } from "@/services/detalleLotesOperaciones";
import { useUser } from "@clerk/nextjs";
import { useTalles } from "@/hooks/use-talles";
import { useColores } from "@/hooks/use-colores";
import { useVariantes } from "@/hooks/use-variantes";
import { editVariante } from "@/services/variantes";
import { Scan, X } from "lucide-react";

interface VentaFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVentaGuardada?: () => void; // Callback para refrescar la tabla de ventas
  // Opcional: venta a editar
}

// Cambiar la definición de detalle para tipar correctamente
interface DetalleLinea {
  articulo: Article | null;
  cantidad: number;
  precio: number;
  subtotal: number;
  input: string;
  talle: number | null; // Nuevo campo para el talle
  color: number | null; // Nuevo campo para el color
  variante: number | null; // Nuevo campo para la variante
  descuentoPorcentaje: number; // Nuevo campo para descuento por porcentaje
  descuentoFijo: number; // Nuevo campo para descuento por importe fijo
}

// Función para formatear número con separadores de miles
const formatNumberWithCommas = (value: string): string => {
  // Remover todo excepto números y punto decimal
  const cleanValue = value.replace(/[^\d.]/g, '');
  
  // Si está vacío, retornar vacío
  if (!cleanValue) return '';
  
  // Separar parte entera y decimal
  const parts = cleanValue.split('.');
  const integerPart = parts[0];
  const decimalPart = parts[1] || '';
  
  // Formatear parte entera con comas
  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  
  // Combinar con decimal si existe
  return decimalPart ? `${formattedInteger}.${decimalPart}` : formattedInteger;
};

// Función para desformatear número (remover comas)
const unformatNumber = (value: string): string => {
  return value.replace(/,/g, '');
};

export function VentaFormDialog({ open, onOpenChange, onVentaGuardada }: VentaFormDialogProps) {
  const { user } = useUser();
  // Datos para selects
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [tiposComprobantes, setTiposComprobantes] = useState<TipoComprobante[]>([]);
  const [cuentasTesoreria, setCuentasTesoreria] = useState<CuentaTesoreria[]>([]);
  const [articulos, setArticulos] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [usuarioActual, setUsuarioActual] = useState<Usuario | null>(null);
  const { talles } = useTalles();
  const { colores } = useColores();
  const { variantes } = useVariantes();
  
  // Log para verificar si el hook se está ejecutando
  console.log('🔧 VentaFormDialog - Hook useVariantes ejecutado, variantes:', variantes.length);
  
  // Estados para el picking
  const [modoPicking, setModoPicking] = useState(false);
  const [codigoBarrasInput, setCodigoBarrasInput] = useState("");
  const [pickingInputRef] = useState(useRef<HTMLInputElement>(null));

  useEffect(() => {
    if (open) {
      setLoading(true);
      Promise.all([
        getClientes(),
        getUsuarios(),
        getTiposComprobantes(),
        getCuentasTesoreria(),
        getArticles(),
      ]).then(([c, u, tc, ct, a]) => {
        setClientes(c);
        setUsuarios(u);
        setTiposComprobantes(tc);
        setCuentasTesoreria(ct);
        setArticulos(a);
        // Buscar usuario actual por email
        if (user?.emailAddresses?.[0]?.emailAddress) {
          const actual = u.find(us => us.email === user.emailAddresses[0].emailAddress);
          setUsuarioActual(actual || null);
          // Si es cobrador, setearlo automáticamente
          if (actual && actual.rol !== "supervisor") {
            setUsuarioSeleccionado(actual.id);
          }
        }
        setLoading(false);
      });
    }
  }, [open, user]);

  // Estado de tabs y formulario (simplificado, estructura)
  const [tab, setTab] = useState("detalle");

  // Estado para el detalle de la venta
  const [detalle, setDetalle] = useState<DetalleLinea[]>([
    { articulo: null, cantidad: 1, precio: 0, subtotal: 0, input: "", talle: null, color: null, variante: null, descuentoPorcentaje: 0, descuentoFijo: 0 },
  ]);
  const [showSugerencias, setShowSugerencias] = useState<number | null>(null); // idx de línea con sugerencias abiertas
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  // Limpiar el detalle cuando se cierra el popup
  useEffect(() => {
    if (!open) {
      // Al cerrar el modal, siempre resetear a una línea vacía (modo manual)
      setDetalle([{ articulo: null, cantidad: 1, precio: 0, subtotal: 0, input: "", talle: null, color: null, variante: null, descuentoPorcentaje: 0, descuentoFijo: 0 }]);
      setShowSugerencias(null);
      // Resetear a valores por defecto
      setClienteSeleccionado(1); // Consumidor final
      setUsuarioSeleccionado(1); // Jony
      setTipoComprobanteSeleccionado(1); // Factura
      setIsClosing(false);
      // Limpiar búsqueda de cliente
      setBusquedaCliente("");
      setMostrarSugerenciasCliente(false);
      // Limpiar modo picking
      setModoPicking(false);
      setCodigoBarrasInput("");
    }
  }, [open]);

  // Log para verificar datos cargados
  useEffect(() => {
    if (open && variantes.length > 0) {
      console.log('📊 Datos cargados en el modal de venta:');
      console.log('📦 Variantes totales:', variantes.length);
      console.log('🏷️ Variantes con códigos de barras:', variantes.filter(v => v.codigo_barras).length);
      console.log('📋 Primeras 5 variantes con códigos:', variantes.filter(v => v.codigo_barras).slice(0, 5).map(v => ({ id: v.id, codigo: v.codigo_barras, articulo: v.articulo_descripcion })));
      console.log('🛍️ Artículos totales:', articulos.length);
      console.log('🔍 Verificando si hay variantes con stock > 0:', variantes.filter(v => v.codigo_barras && v.stock_unitario > 0).length);
      console.log('📋 Variantes con stock y códigos:', variantes.filter(v => v.codigo_barras && v.stock_unitario > 0).map(v => ({ id: v.id, codigo: v.codigo_barras, stock: v.stock_unitario, articulo: v.articulo_descripcion })));
    }
  }, [open, variantes, articulos]);

  // Cerrar sugerencias de cliente cuando se hace clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.cliente-search-container')) {
        setMostrarSugerenciasCliente(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Filtrar solo artículos activos
  const articulosActivos = useMemo(() => articulos.filter(a => a.activo), [articulos]);

  // Filtrar solo cuentas de tesorería activas
  const cuentasTesoreriaValidas = cuentasTesoreria.filter(c => c.descripcion && c.descripcion.trim() !== "");

  // Filtrar solo tipos de comprobante activos y con reingresa_stock = false
  const tiposComprobantesValidos = tiposComprobantes.filter(tc => tc.activo && tc.descripcion && tc.descripcion.trim() !== "" && tc.reingresa_stock === false);

  // Filtrar solo clientes (tipo = "cliente")
  const clientesFiltrados = useMemo(() => clientes.filter(c => c.tipo === "cliente"), [clientes]);

  // Estado para búsqueda de clientes
  const [busquedaCliente, setBusquedaCliente] = useState("");
  const [mostrarSugerenciasCliente, setMostrarSugerenciasCliente] = useState(false);

  // Filtrar clientes por búsqueda
  const clientesParaMostrar = useMemo(() => {
    if (!busquedaCliente.trim()) return clientesFiltrados;
    const busqueda = busquedaCliente.toLowerCase();
    return clientesFiltrados.filter(c => 
      (c.razon_social || "").toLowerCase().includes(busqueda) ||
      (c.email || "").toLowerCase().includes(busqueda) ||
      (c.num_doc || "").toLowerCase().includes(busqueda)
    );
  }, [clientesFiltrados, busquedaCliente]);

  // Calcular total con descuentos
  const total = detalle.reduce((acc, d) => {
    if (d.cantidad && d.precio) {
      const subtotalSinDescuento = d.cantidad * d.precio;
      const descuentoPorcentaje = (subtotalSinDescuento * d.descuentoPorcentaje) / 100;
      const descuentoFijo = d.descuentoFijo;
      const subtotalConDescuento = subtotalSinDescuento - descuentoPorcentaje - descuentoFijo;
      return acc + Math.max(0, subtotalConDescuento);
    }
    return acc;
  }, 0);

  // Función para manejar cambios en el detalle
  function handleDetalleChange(idx: number, field: string, value: string | number) {
    setDetalle(detalle => {
      const nuevo = [...detalle];
      if (field === "articulo") {
        const art = articulosActivos.find(a => a.id === Number(value));
        nuevo[idx].articulo = art || null;
        nuevo[idx].precio = art ? art.precio_unitario : 0;
        nuevo[idx].input = art ? art.descripcion : "";
        // Solo poner cantidad en 1 si está vacía o no es válida
        if (!nuevo[idx].cantidad || isNaN(nuevo[idx].cantidad) || nuevo[idx].cantidad <= 0) {
          nuevo[idx].cantidad = 1;
        }
        setShowSugerencias(null); // Cerrar sugerencias al seleccionar
      } else if (field === "cantidad") {
        nuevo[idx].cantidad = Math.max(1, Number(value));
      } else if (field === "precio") {
        nuevo[idx].precio = Math.max(0, Number(value));
      } else if (field === "input") {
        nuevo[idx].input = String(value);
        setShowSugerencias(idx); // Abrir sugerencias al escribir
      } else if (field === "descuentoPorcentaje") {
        const numValue = Number(value);
        if (isNaN(numValue)) {
          nuevo[idx].descuentoPorcentaje = 0;
        } else {
          nuevo[idx].descuentoPorcentaje = Math.max(0, Math.min(100, numValue));
        }
      } else if (field === "descuentoFijo") {
        const numValue = Number(value);
        if (isNaN(numValue)) {
          nuevo[idx].descuentoFijo = 0;
        } else {
          nuevo[idx].descuentoFijo = Math.max(0, numValue);
        }
      }
      // Calcular subtotal con descuentos
      const subtotalSinDescuento = nuevo[idx].cantidad * nuevo[idx].precio;
      const descuentoPorcentaje = (subtotalSinDescuento * nuevo[idx].descuentoPorcentaje) / 100;
      const descuentoFijo = nuevo[idx].descuentoFijo;
      nuevo[idx].subtotal = Math.max(0, subtotalSinDescuento - descuentoPorcentaje - descuentoFijo);
      return nuevo;
    });
  }

  // Autocompletado: sugerencias por input
  function getSugerencias(input: string) {
    if (!input) return [];
    return articulosActivos.filter(a =>
      a.descripcion.toLowerCase().includes(input.toLowerCase())
    ).slice(0, 3);
  }

  // Agregar línea
  function agregarLinea() {
    setDetalle(detalle => [...detalle, { articulo: null, cantidad: 1, precio: 0, subtotal: 0, input: "", talle: null, color: null, variante: null, descuentoPorcentaje: 0, descuentoFijo: 0 }]);
    setTimeout(() => {
      const idx = detalle.length;
      if (inputRefs.current[idx]) inputRefs.current[idx]?.focus();
    }, 0);
  }
  // Quitar línea
  function quitarLinea(idx: number) {
    setDetalle(detalle => {
      const nuevoDetalle = detalle.filter((_, i) => i !== idx);
      // Si estamos en modo picking y no quedan artículos, mantener el array vacío
      // Si no estamos en modo picking y no quedan artículos, agregar una línea vacía
      if (nuevoDetalle.length === 0) {
        if (modoPicking) {
          return []; // En modo picking, mantener vacío
        } else {
          return [{ articulo: null, cantidad: 1, precio: 0, subtotal: 0, input: "", talle: null, color: null, variante: null, descuentoPorcentaje: 0, descuentoFijo: 0 }];
        }
      }
      return nuevoDetalle;
    });
  }

  // Estado para el detalle de medios de pago
  const [mediosPago, setMediosPago] = useState<{ cuenta: CuentaTesoreria | null; monto: number; montoFormateado: string }[]>([
    { cuenta: null, monto: 0, montoFormateado: "" },
  ]);

  // Calcular suma de medios de pago
  const sumaMediosPago = mediosPago.reduce((acc, m) => acc + (m.monto || 0), 0);
  const diferenciaMediosPago = sumaMediosPago - total;
  const mediosPagoIncompletos = diferenciaMediosPago !== 0;

  // Validar cuentas duplicadas
  const cuentasSeleccionadas = mediosPago
    .filter(m => m.cuenta)
    .map(m => m.cuenta!.id);
  const cuentasDuplicadas = cuentasSeleccionadas.length !== new Set(cuentasSeleccionadas).size;
  const hayCuentasDuplicadas = cuentasDuplicadas;

  // Estado para saber si el usuario modificó manualmente el monto del primer medio de pago
  const [primerMontoEditado, setPrimerMontoEditado] = useState(false);

  // Cuando cambia el total y hay al menos un medio de pago, autorellenar el primer monto si no fue editado manualmente
  useEffect(() => {
    if (!primerMontoEditado && mediosPago.length > 0) {
      setMediosPago((prev) => [{ ...prev[0], monto: total, montoFormateado: formatNumberWithCommas(total.toString()) }, ...prev.slice(1)]);
    }
  }, [total, mediosPago.length, primerMontoEditado]);

  // Limpiar el detalle de medios de pago cuando se cierra el popup
  useEffect(() => {
    if (!open) {
      setMediosPago([{ cuenta: null, monto: 0, montoFormateado: "" }]);
      setPrimerMontoEditado(false);
    }
  }, [open]);

  // Handler para cambio de monto
  function handleMontoChange(idx: number, value: string) {
    const formattedValue = formatNumberWithCommas(value);
    const unformattedValue = unformatNumber(value);
    const numericValue = parseFloat(unformattedValue) || 0;
    
    setMediosPago((prev) => {
      const nuevo = [...prev];
      nuevo[idx].monto = numericValue;
      nuevo[idx].montoFormateado = formattedValue;
      return nuevo;
    });
    if (idx === 0) setPrimerMontoEditado(true);
  }

  // Handler para agregar/quitar medios de pago
  function agregarMedioPago() {
    setMediosPago((prev) => [...prev, { cuenta: null, monto: 0, montoFormateado: "" }]);
  }
  function quitarMedioPago(idx: number) {
    setMediosPago((prev) => prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev);
    if (idx === 0) setPrimerMontoEditado(false);
  }

  // Estados para selects principales
  const [clienteSeleccionado, setClienteSeleccionado] = useState<number | null>(1); // Consumidor final
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState<number | null>(1); // Jony
  const [tipoComprobanteSeleccionado, setTipoComprobanteSeleccionado] = useState<number | null>(1); // Factura
  const [loteAbierto, setLoteAbierto] = useState<number | null>(null); // Debe obtenerse del contexto o consulta

  // En el form principal (cabecera), los selects deben actualizar estos estados
  // Ejemplo:
  // <select value={clienteSeleccionado ?? ""} onChange={e => setClienteSeleccionado(Number(e.target.value) || null)}>
  // ...
  // <select value={usuarioSeleccionado ?? ""} onChange={e => setUsuarioSeleccionado(Number(e.target.value) || null)}>
  // ...
  // <select value={tipoComprobanteSeleccionado ?? ""} onChange={e => setTipoComprobanteSeleccionado(Number(e.target.value) || null)}>
  // ...
  // El lote abierto puede obtenerse de un hook/useEffect al abrir el modal

  useEffect(() => {
    async function fetchLoteAbierto() {
      if (usuarioSeleccionado) {
        const lote = await getLoteCajaAbiertaPorUsuario(usuarioSeleccionado);
        setLoteAbierto(lote ? lote.id_lote : 0);
      } else {
        setLoteAbierto(0);
      }
    }
    if (open) {
      fetchLoteAbierto();
    }
  }, [open, usuarioSeleccionado]);

  // Estado para error
  const [error, setError] = useState<string | null>(null);
  const [showLoteError, setShowLoteError] = useState(false);
  const [showMediosPagoError, setShowMediosPagoError] = useState(false);
  const [showTrialEnded, setShowTrialEnded] = useState(false);
  const [showClienteConsumidorFinalError, setShowClienteConsumidorFinalError] = useState(false);
  const [showMaxCuentaCorrienteError, setShowMaxCuentaCorrienteError] = useState(false);
  const [toast, setToast] = useState<{ show: boolean, message: string }>({ show: false, message: "" });
  function showToast(message: string) {
    console.log('🍞 Toast:', message);
    setToast({ show: true, message });
    setTimeout(() => setToast({ show: false, message: "" }), 2500);
  }
  const [showStockError, setShowStockError] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [showConfirmClose, setShowConfirmClose] = useState(false);

  // Función para verificar si hay datos sin guardar
  const hasUnsavedData = () => {
    return detalle.some(d => d.articulo && d.cantidad > 0) || 
           mediosPago.some(m => m.cuenta && m.monto > 0);
  };

  // Utilidad para formatear fecha local a 'YYYY-MM-DD HH:mm:ss'
  function formatLocalDateTime(date: Date) {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  }

  // En handleGuardarVenta:
  async function handleGuardarVenta() {
    setLoading(true);
    setError(null);
    try {
      // Validar prueba gratis
      const usuarios = await getUsuarios();
      const usuario = usuarios.find(u => u.id === usuarioSeleccionado);
      if (usuario && usuario.prueba_gratis) {
        const creado = new Date(usuario.creado_el);
        const hoy = new Date();
        const diffMs = hoy.getTime() - creado.getTime();
        const diffDias = 15 - Math.floor(diffMs / (1000 * 60 * 60 * 24));
        if (diffDias <= 0) {
          setShowTrialEnded(true);
          setLoading(false);
          return;
        }
      }
      // Validar selects y lote
      if (!clienteSeleccionado || !usuarioSeleccionado || !tipoComprobanteSeleccionado || !loteAbierto || loteAbierto === 0) {
        setShowLoteError(true);
        setLoading(false);
        return;
      }
      // Validar que haya al menos un medio de pago
      if (!mediosPago || mediosPago.length === 0 || mediosPago.every(m => !m.cuenta || m.monto <= 0)) {
        setShowMediosPagoError(true);
        setLoading(false);
        return;
      }

      // Validar que si el medio de pago es CUENTA CORRIENTE, el cliente no sea el de id 1 (Consumidor Final)
      const medioPagoCuentaCorriente = mediosPago.find(m => m.cuenta && m.cuenta.descripcion.toUpperCase() === "CUENTA CORRIENTE");
      if (medioPagoCuentaCorriente) {
        if (clienteSeleccionado === 1) {
          setShowClienteConsumidorFinalError(true);
          setLoading(false);
          return;
        }
        // Validar máximo cuenta corriente
        const cliente = clientesFiltrados.find(c => c.id === clienteSeleccionado);
        if (cliente && typeof cliente.maximo_cuenta_corriente === 'number' && cliente.maximo_cuenta_corriente > 0 && total > cliente.maximo_cuenta_corriente) {
          setShowMaxCuentaCorrienteError(true);
          setLoading(false);
          return;
        }
      }
      // Calcular total y subtotal de la venta
      // Usar la variable 'total' que ya incluye los descuentos aplicados
      const totalVenta = total;
      // 1. Crear la orden de venta principal
      const hoy = formatLocalDateTime(new Date());
      const ordenVenta = await createOrdenVenta({
        fk_id_entidades: clienteSeleccionado,
        fk_id_usuario: usuarioSeleccionado,
        fk_id_lote: loteAbierto,
        fk_id_tipo_comprobante: tipoComprobanteSeleccionado,
        fecha: hoy,
        total: totalVenta,
        subtotal: totalVenta,
      });
      // 2. Crear los detalles de artículos
      for (const d of detalle) {
        if (d.articulo && d.cantidad > 0) {
          await createOrdenVentaDetalle({
            fk_id_orden: ordenVenta.id,
            fk_id_articulo: d.articulo.id,
            cantidad: d.cantidad,
            precio_unitario: d.precio,
            fk_id_talle: d.talle ?? null,
            fk_id_color: d.color ?? null,
          });
          // Registrar movimiento de stock (FACTURA)
          await createMovimientoStock({
            fk_id_orden: ordenVenta.id,
            fk_id_articulos: d.articulo.id,
            origen: "FACTURA",
            tipo: "salida",
            cantidad: -Math.abs(d.cantidad),
            fk_id_talle: d.talle ?? null,
            fk_id_color: d.color ?? null,
            stock_actual: 0, // Se calculará después del descuento
          });
          // Descontar stock_unitario de la variante si corresponde
          if (d.talle && d.color && d.articulo) {
            const variante = variantes.find(v => v.fk_id_articulo === d.articulo!.id && v.fk_id_talle === d.talle && v.fk_id_color === d.color);
            if (variante) {
              await editVariante(variante.id, { stock_unitario: (variante.stock_unitario ?? 0) - d.cantidad });
            }
          }
        }
      }
      // 3. Crear los medios de pago
      for (const m of mediosPago) {
        if (m.cuenta && m.monto > 0) {
          await createOrdenVentaMediosPago({
            fk_id_orden: ordenVenta.id,
            fk_id_cuenta_tesoreria: m.cuenta.id,
            monto_pagado: m.monto,
          });
          // Registrar ingreso en caja solo si NO es cuenta corriente (robusto)
          if (!m.cuenta.descripcion.toUpperCase().replace(/\s/g, '').includes("CUENTACORRIENTE")) {
            await registrarMovimientoCaja({
              fk_id_lote: loteAbierto!,
              fk_id_cuenta_tesoreria: m.cuenta.id,
              tipo: "ingreso",
              monto: m.monto,
            });
          }
        }
      }
      // Lógica CUENTA CORRIENTE
      const cuentaCorrienteTesoreria = mediosPago.find(m => m.cuenta && m.cuenta.descripcion.toUpperCase() === "CUENTA CORRIENTE");
      if (cuentaCorrienteTesoreria) {
        await createCuentaCorriente({
          fk_id_orden: ordenVenta.id,
          fk_id_cliente: clienteSeleccionado,
          total: totalVenta,
          saldo: totalVenta,
          estado: "pendiente",
        });
      }
      // 4. Crear los impuestos
      // Elimina el estado y handlers de impuestos si no se usan en otro lado
      // for (const imp of impuestos) {
      //   await createOrdenVentaImpuestos({
      //     id_orden: ordenVenta.id,
      //     porcentaje_iva: imp.porcentaje_iva,
      //     base_gravada: imp.base_gravada,
      //     monto_iva: imp.monto_iva,
      //   });
      // }
      // 5. Refrescar la tabla de ventas (si hay callback o prop para hacerlo)
      if (onVentaGuardada) onVentaGuardada();
      // 6. Cerrar el popup y mostrar feedback
      onOpenChange(false);
      showToast("Venta registrada con éxito");
      // Opcional: mostrar toast de éxito
    } catch (e: unknown) {
      console.error("Error al guardar la venta:", e);
      setError(e instanceof Error ? e.message : "Error al guardar la venta");
    }
    setLoading(false);
  }

  // Elimina el estado y handlers de impuestos si no se usan en otro lado
  // const [impuestos, setImpuestos] = useState([
  //   { porcentaje_iva: 21, base_gravada: 0, monto_iva: 0 },
  // ]);

  // Handler para cambio de impuesto
  // function handleImpuestoChange(idx: number, field: 'porcentaje_iva' | 'base_gravada' | 'monto_iva', value: number) {
  //   setImpuestos(impuestos => {
  //     const nuevo = [...impuestos];
  //     nuevo[idx][field] = value;
  //     return nuevo;
  //   });
  // }
  // Handler para agregar/quitar impuesto
  // function agregarImpuesto() {
  //   setImpuestos(impuestos => [...impuestos, { porcentaje_iva: 21, base_gravada: 0, monto_iva: 0 }]);
  // }
  // function quitarImpuesto(idx: number) {
  //   setImpuestos(impuestos => impuestos.length > 1 ? impuestos.filter((_, i) => i !== idx) : impuestos);
  // }

  // Usuarios para el select
  const usuariosParaSelect = usuarioActual?.rol === "supervisor"
    ? usuarios
    : usuarioActual
      ? usuarios.filter(u => u.email === usuarioActual.email)
      : [];



  // Función para obtener variantes disponibles para un artículo
  function getVariantesDisponibles(articuloId: number | null) {
    return variantes.filter(v => v.fk_id_articulo === articuloId && v.stock_unitario > 0);
  }

  // Función para buscar variante por código de barras
  function buscarVariantePorCodigoBarras(codigo: string) {
    console.log('🔍 Buscando código de barras:', codigo);
    console.log('📦 Variantes disponibles:', variantes.length);
    console.log('📋 Variantes con códigos:', variantes.filter(v => v.codigo_barras).map(v => ({ id: v.id, codigo: v.codigo_barras, stock: v.stock_unitario })));
    
    // Buscar por código exacto (sin verificar stock inicialmente)
    const variante = variantes.find(v => v.codigo_barras === codigo);
    console.log('✅ Variante encontrada:', variante);
    
    return variante;
  }

  // Función para agregar artículo desde picking
  function agregarArticuloDesdePicking(codigoBarras: string) {
    console.log('🚀 Iniciando agregarArticuloDesdePicking con código:', codigoBarras);
    
    const variante = buscarVariantePorCodigoBarras(codigoBarras);
    if (!variante) {
      console.log('❌ Variante no encontrada');
      showToast("Código de barras no encontrado");
      return;
    }

    // Verificar stock pero ser más permisivo
    if (variante.stock_unitario <= 0) {
      console.log('⚠️ Variante encontrada pero sin stock:', variante.stock_unitario);
      showToast(`Artículo encontrado pero sin stock disponible (Stock: ${variante.stock_unitario})`);
      // Continuar de todas formas para permitir agregar el artículo
    }

    console.log('📦 Variante encontrada:', variante);
    const articulo = articulos.find(a => a.id === variante.fk_id_articulo);
    console.log('🛍️ Artículos disponibles:', articulos.length);
    console.log('🎯 Artículo encontrado:', articulo);
    
    if (!articulo) {
      console.log('❌ Artículo no encontrado');
      showToast("Artículo no encontrado");
      return;
    }

    // Verificar si ya existe en el detalle
    const existeEnDetalle = detalle.find(d => 
      d.articulo?.id === articulo.id && 
      d.talle === variante.fk_id_talle && 
      d.color === variante.fk_id_color
    );

    if (existeEnDetalle) {
      // Incrementar cantidad si ya existe
      setDetalle(detalle => detalle.map(d => 
        d.articulo?.id === articulo.id && 
        d.talle === variante.fk_id_talle && 
        d.color === variante.fk_id_color
          ? { ...d, cantidad: d.cantidad + 1 }
          : d
      ));
    } else {
      // Agregar nueva línea
      setDetalle(detalle => [...detalle, {
        articulo: articulo,
        cantidad: 1,
        precio: articulo.precio_unitario,
        subtotal: articulo.precio_unitario,
        input: articulo.descripcion,
        talle: variante.fk_id_talle,
        color: variante.fk_id_color,
        variante: variante.id,
        descuentoPorcentaje: 0,
        descuentoFijo: 0,
      }]);
    }

    showToast(`Agregado: ${articulo.descripcion} (${talles.find(t => t.id === variante.fk_id_talle)?.descripcion || 'Sin talle'} - ${colores.find(c => c.id === variante.fk_id_color)?.descripcion || 'Sin color'})`);
  }

  // Función para manejar el cambio en el input de código de barras
  function handleCodigoBarrasChange(e: React.ChangeEvent<HTMLInputElement>) {
    const valor = e.target.value;
    setCodigoBarrasInput(valor);
  }

  // Función para agregar artículo desde el botón
  function handleAgregarCodigoBarras() {
    if (codigoBarrasInput.trim()) {
      console.log('🎯 Botón Agregar presionado con valor:', codigoBarrasInput.trim());
      console.log('🔍 Llamando a agregarArticuloDesdePicking...');
      agregarArticuloDesdePicking(codigoBarrasInput.trim());
      setCodigoBarrasInput("");
      // Mantener el foco en el input para continuar escaneando
      setTimeout(() => pickingInputRef.current?.focus(), 100);
    }
  }

  // Función para activar/desactivar modo picking
  function toggleModoPicking() {
    setModoPicking(!modoPicking);
    if (!modoPicking) {
      // Activar modo picking - limpiar el detalle para que no queden líneas vacías
      console.log('🔍 Activando modo picking...');
      console.log('📦 Variantes disponibles:', variantes.length);
      console.log('🏷️ Variantes con códigos:', variantes.filter(v => v.codigo_barras).length);
      console.log('📋 Códigos disponibles:', variantes.filter(v => v.codigo_barras).map(v => v.codigo_barras));
      // Limpiar el detalle para que solo se agreguen artículos por picking
      setDetalle([]);
      setTimeout(() => pickingInputRef.current?.focus(), 100);
    } else {
      // Desactivar modo picking
      setCodigoBarrasInput("");
      // Si no hay artículos en el detalle, agregar una línea vacía para el modo manual
      if (detalle.length === 0) {
        setDetalle([{ articulo: null, cantidad: 1, precio: 0, subtotal: 0, input: "", talle: null, color: null, variante: null, descuentoPorcentaje: 0, descuentoFijo: 0 }]);
      }
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(newOpen) => {
        // Si está intentando cerrar
        if (!newOpen) {
          // Si está cargando o hay errores críticos, no permitir cerrar
          if (loading || isClosing || showLoteError || showMediosPagoError || showTrialEnded || showClienteConsumidorFinalError || showMaxCuentaCorrienteError || showStockError) {
            return;
          }
          
          // Si hay datos sin guardar, mostrar confirmación
          if (hasUnsavedData()) {
            setShowConfirmClose(true);
            return;
          }
          
          // Cerrar normalmente
          setIsClosing(true);
          setTimeout(() => {
            setIsClosing(false);
            onOpenChange(false);
          }, 100);
        } else {
          onOpenChange(newOpen);
        }
      }}>
        <div style={{ maxHeight: 'none', overflow: 'visible' }}>
        <DialogContent 
          className="max-w-6xl max-h-none h-auto overflow-visible" 
          style={{ maxHeight: 'none', overflow: 'visible' }}
          preventOutsideClose 
          onEscapeKeyDown={(e) => {
            if (loading || isClosing) {
              e.preventDefault();
            }
          }}
          onInteractOutside={(e) => {
            if (loading || isClosing) {
              e.preventDefault();
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>Nueva Venta</DialogTitle>
            <DialogDescription>
              Completa los datos para registrar una nueva venta.
            </DialogDescription>
          </DialogHeader>
          {loading ? (
            <div className="text-center py-8">Cargando datos...</div>
          ) : (
            <Tabs value={tab} onValueChange={setTab} className="mt-2">
                <TabsList>
                  <TabsTrigger value="detalle">Artículos</TabsTrigger>
                  <TabsTrigger value="medios">Medios de pago</TabsTrigger>
                  <TabsTrigger value="cabecera">Cliente</TabsTrigger>
                  <TabsTrigger value="verificacion">Verificación</TabsTrigger>
                </TabsList>
                              <TabsContent value="detalle">
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span>Agrega artículos, cantidad y precio:</span>
                    <Button
                      type="button"
                      variant={modoPicking ? "destructive" : "outline"}
                      size="sm"
                      onClick={toggleModoPicking}
                      className="flex items-center gap-2"
                    >
                      {modoPicking ? (
                        <>
                          <X className="w-4 h-4" />
                          Desactivar Picking
                        </>
                      ) : (
                        <>
                          <Scan className="w-4 h-4" />
                          Activar Picking
                        </>
                      )}
                    </Button>
                  </div>
                  
                  {modoPicking && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Scan className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-medium text-blue-800">Modo Picking Activo</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          ref={pickingInputRef}
                          type="text"
                          className="flex-1 border border-blue-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Escanee el código de barras..."
                          value={codigoBarrasInput}
                          onChange={handleCodigoBarrasChange}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAgregarCodigoBarras();
                            }
                          }}
                          autoFocus
                        />
                        <Button
                          type="button"
                          size="sm"
                          onClick={handleAgregarCodigoBarras}
                          disabled={!codigoBarrasInput.trim()}
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          Agregar
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
                <div className="overflow-visible">
                  <table className="w-full text-sm border mb-2">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="px-3 py-2 w-1/4">Artículo</th>
                      <th className="px-3 py-2 w-20">Talle</th>
                      <th className="px-3 py-2 w-20">Color</th>
                      <th className="px-3 py-2 w-20">Cantidad</th>
                      <th className="px-3 py-2 w-24">Precio</th>
                      <th className="px-3 py-2 w-20">Desc. %</th>
                      <th className="px-3 py-2 w-20">Desc. $</th>
                      <th className="px-3 py-2 w-24">Subtotal</th>
                      <th className="px-3 py-2 w-16"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {detalle.map((d, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-3 py-2">
                          <div className="relative">
                            <input
                              type="text"
                              className="w-full border rounded px-2 py-1"
                              placeholder="Buscar artículo..."
                              value={d.input}
                              onChange={e => handleDetalleChange(idx, "input", e.target.value)}
                              autoComplete="off"
                              ref={el => { inputRefs.current[idx] = el; }}
                              onFocus={() => d.input && setShowSugerencias(idx)}
                              onBlur={() => setTimeout(() => setShowSugerencias(s => (s === idx ? null : s)), 120)}
                            />
                            {d.input && showSugerencias === idx && getSugerencias(d.input).length > 0 && (
                              <div className="absolute z-50 bg-white border rounded shadow-lg w-full mt-1" style={{ maxHeight: 'none', overflow: 'visible' }}>
                                {getSugerencias(d.input).map(a => (
                                  <div
                                    key={a.id}
                                    className="px-3 py-2 hover:bg-gray-100 cursor-pointer flex justify-between border-b last:border-b-0"
                                    onClick={() => handleDetalleChange(idx, "articulo", a.id)}
                                  >
                                    <span className="font-medium">{a.descripcion}</span>
                                    <span className="text-xs text-gray-500">${a.precio_unitario}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <select
                            className="w-full border rounded px-2 py-1"
                            value={d.talle ?? ""}
                            onChange={e => {
                              const talle = e.target.value ? Number(e.target.value) : null;
                              setDetalle(detalle => detalle.map((linea, i) => i === idx ? { ...linea, talle, color: null, variante: null } : linea));
                            }}
                            disabled={!d.articulo}
                          >
                            <option value="">Talle</option>
                            {getVariantesDisponibles(d.articulo?.id ?? null).filter(v => !d.color || v.fk_id_color === d.color).map(v => v.fk_id_talle).filter((v, i, arr) => arr.indexOf(v) === i).map(talleId => {
                              const talle = talles.find(t => t.id === talleId);
                              return talle ? <option key={talle.id} value={talle.id}>{talle.descripcion}</option> : null;
                            })}
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <select
                            className="w-full border rounded px-2 py-1"
                            value={d.color ?? ""}
                            onChange={e => {
                              const color = e.target.value ? Number(e.target.value) : null;
                              setDetalle(detalle => detalle.map((linea, i) => i === idx ? { ...linea, color, variante: null } : linea));
                            }}
                            disabled={!d.articulo}
                          >
                            <option value="">Color</option>
                            {getVariantesDisponibles(d.articulo?.id ?? null).filter(v => !d.talle || v.fk_id_talle === d.talle).map(v => v.fk_id_color).filter((v, i, arr) => arr.indexOf(v) === i).map(colorId => {
                              const color = colores.find(c => c.id === colorId);
                              return color ? <option key={color.id} value={color.id}>{color.descripcion}</option> : null;
                            })}
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min="1"
                            className={cn(
                              "w-20 border rounded px-2 py-1 text-right",
                              !d.cantidad || isNaN(d.cantidad) || Number(d.cantidad) <= 0 ? "border-red-500 bg-red-50" : ""
                            )}
                            value={d.cantidad === 0 ? "" : d.cantidad}
                            onChange={e => handleDetalleChange(idx, "cantidad", e.target.value === "" ? "" : Number(e.target.value))}
                            placeholder="Cantidad"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min={0}
                            className="w-24 border rounded px-2 py-1"
                            value={d.precio}
                            onChange={e => handleDetalleChange(idx, "precio", e.target.value)}
                            disabled={!d.articulo}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <div className="relative">
                            <input
                              type="number"
                              min={0}
                              max={100}
                              step={0.01}
                              className="w-20 border rounded px-2 py-1 text-right pr-7"
                              value={d.descuentoPorcentaje || ""}
                              onChange={e => handleDetalleChange(idx, "descuentoPorcentaje", e.target.value)}
                              placeholder="0"
                              title="Descuento por porcentaje (0-100%)"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                }
                              }}
                            />
                            <span className="absolute right-2.5 top-1/2 transform -translate-y-1/2 text-sm font-medium text-gray-700">%</span>
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <div className="relative">
                            <input
                              type="number"
                              min={0}
                              step={0.01}
                              className="w-20 border rounded px-2 py-1 text-right pr-7"
                              value={d.descuentoFijo || ""}
                              onChange={e => handleDetalleChange(idx, "descuentoFijo", e.target.value)}
                              placeholder="0"
                              title="Descuento por importe fijo"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                }
                              }}
                            />
                            <span className="absolute right-2.5 top-1/2 transform -translate-y-1/2 text-sm font-medium text-gray-700">$</span>
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <div className="text-right">
                            <div className={cn(
                              "font-medium",
                              (d.descuentoPorcentaje > 0 || d.descuentoFijo > 0) ? "text-green-600" : ""
                            )}>
                              {formatCurrency(d.subtotal, DEFAULT_CURRENCY, DEFAULT_LOCALE)}
                            </div>
                            {(d.descuentoPorcentaje > 0 || d.descuentoFijo > 0) && (
                              <div className="text-xs text-gray-500">
                                {d.descuentoPorcentaje > 0 && `-${d.descuentoPorcentaje}%`}
                                {d.descuentoPorcentaje > 0 && d.descuentoFijo > 0 && " "}
                                {d.descuentoFijo > 0 && `-${formatCurrency(d.descuentoFijo, DEFAULT_CURRENCY, DEFAULT_LOCALE)}`}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <button
                            className="text-red-600 hover:underline"
                            onClick={() => quitarLinea(idx)}
                            disabled={detalle.length === 1}
                          >
                            Quitar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
                <div className="flex justify-between items-center">
                  <button className="text-blue-600 hover:underline" onClick={agregarLinea}>+ Agregar línea</button>
                  <div className="font-bold">Total: {formatCurrency(total, DEFAULT_CURRENCY, DEFAULT_LOCALE)}</div>
                </div>
              </TabsContent>
              <TabsContent value="medios">
                <div className="mb-2">Selecciona cuentas de tesorería y montos pagados (estructura)</div>
                <table className="min-w-full text-sm mb-2">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="px-2 py-1 text-left">Cuenta Tesorería</th>
                      <th className="px-2 py-1 text-left">Monto pagado</th>
                      <th className="px-2 py-1"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {mediosPago.map((m, idx) => (
                      <tr key={idx}>
                        <td className="px-2 py-1">
                          <select
                            className="w-full border rounded px-2 py-1"
                            value={m.cuenta?.id || ""}
                            onChange={e => {
                              const cuenta = cuentasTesoreriaValidas.find(c => c.id === Number(e.target.value)) || null;
                              setMediosPago((prev) => prev.map((mp, i) => i === idx ? { ...mp, cuenta } : mp));
                            }}
                          >
                            <option value="">Seleccionar cuenta</option>
                            {cuentasTesoreriaValidas.map((c) => (
                              <option key={c.id} value={c.id}>{c.descripcion}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-2 py-1">
                          <input
                            type="text"
                            className="w-32 border rounded px-2 py-1 text-right"
                            value={m.montoFormateado}
                            onChange={e => handleMontoChange(idx, e.target.value)}
                            placeholder="Monto"
                          />
                        </td>
                        <td className="px-2 py-1">
                          <Button size="sm" variant="destructive" onClick={() => quitarMedioPago(idx)} disabled={mediosPago.length === 1}>Quitar</Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <Button size="sm" variant="outline" onClick={agregarMedioPago}>Agregar medio de pago</Button>
                {mediosPagoIncompletos && (
                  <div className="text-red-600 text-xs mt-1">
                    La suma de los montos de los medios de pago debe ser igual al total de la venta ({formatCurrency(total, DEFAULT_CURRENCY, DEFAULT_LOCALE)}). Diferencia: {diferenciaMediosPago > 0 ? "+" : ""}{formatCurrency(diferenciaMediosPago, DEFAULT_CURRENCY, DEFAULT_LOCALE)}
                  </div>
                )}
                {hayCuentasDuplicadas && (
                  <div className="text-red-600 text-xs mt-1">
                    Hay cuentas de tesorería duplicadas en los medios de pago. Por favor, corrige.
                  </div>
                )}
              </TabsContent>
              <TabsContent value="cabecera">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block mb-1 font-medium">Cliente</label>
                    <div className="relative cliente-search-container">
                      <input
                        type="text"
                        className="w-full border rounded px-2 py-1"
                        placeholder="Buscar cliente..."
                        value={busquedaCliente}
                        onChange={(e) => {
                          setBusquedaCliente(e.target.value);
                          setMostrarSugerenciasCliente(true);
                        }}
                        onFocus={() => setMostrarSugerenciasCliente(true)}
                      />
                      {mostrarSugerenciasCliente && clientesParaMostrar.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto">
                          {clientesParaMostrar.map(c => (
                            <div
                              key={c.id}
                              className="px-3 py-2 hover:bg-gray-100 cursor-pointer border-b last:border-b-0"
                              onClick={() => {
                                setClienteSeleccionado(c.id);
                                setBusquedaCliente(c.razon_social);
                                setMostrarSugerenciasCliente(false);
                              }}
                            >
                              <div className="font-medium">{c.razon_social}</div>
                              <div className="text-sm text-gray-500">
                                {c.email} • {c.tipo_doc}: {c.num_doc}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      {clienteSeleccionado && (
                                                 <div className="mt-1 text-sm text-gray-600">
                           Cliente seleccionado: {clientesFiltrados.find(c => c.id === clienteSeleccionado)?.razon_social}
                         </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block mb-1 font-medium">Usuario</label>
                    <select
                      className="w-full border rounded px-2 py-1"
                      value={usuarioSeleccionado ?? ""}
                      onChange={e => setUsuarioSeleccionado(Number(e.target.value) || null)}
                      disabled={usuarioActual?.rol !== "supervisor"}
                    >
                      <option value="">Seleccionar usuario</option>
                      {usuariosParaSelect.map(u => (
                        <option key={u.id} value={u.id}>{u.nombre}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block mb-1 font-medium">Tipo de comprobante</label>
                    <select className="w-full border rounded px-2 py-1" value={tipoComprobanteSeleccionado ?? ""} onChange={e => setTipoComprobanteSeleccionado(Number(e.target.value) || null)}>
                      <option value="">Seleccionar tipo</option>
                      {tiposComprobantesValidos.map((tc) => (
                        <option key={tc.id} value={tc.id}>{tc.descripcion}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block mb-1 font-medium">Fecha</label>
                    <input type="date" className="w-full border rounded px-2 py-1" value={format(new Date(), "yyyy-MM-dd")}
                      readOnly disabled />
                  </div>
                </div>
                {error && <div className="text-red-600 mt-2">{error}</div>}
              </TabsContent>
              {/* <TabsContent value="impuestos">
                <div className="mb-2">Detalle de impuestos:</div>
                <table className="min-w-full text-sm border mb-2">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="px-2 py-1">% IVA</th>
                      <th className="px-2 py-1">Base gravada</th>
                      <th className="px-2 py-1">Monto IVA</th>
                      <th className="px-2 py-1"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {impuestos.map((imp, idx) => (
                      <tr key={idx}>
                        <td className="px-2 py-1">
                          <select className="w-24 border rounded px-2 py-1" value={imp.porcentaje_iva} onChange={e => handleImpuestoChange(idx, 'porcentaje_iva', Number(e.target.value))}>
                            <option value={0}>0%</option>
                            <option value={10.5}>10.5%</option>
                            <option value={21}>21%</option>
                            <option value={27}>27%</option>
                          </select>
                        </td>
                        <td className="px-2 py-1">
                          <input type="number" className="w-24 border rounded px-2 py-1" value={imp.base_gravada} onChange={e => handleImpuestoChange(idx, 'base_gravada', Number(e.target.value))} />
                        </td>
                        <td className="px-2 py-1">
                          <input type="number" className="w-24 border rounded px-2 py-1" value={imp.monto_iva} onChange={e => handleImpuestoChange(idx, 'monto_iva', Number(e.target.value))} />
                        </td>
                        <td className="px-2 py-1">
                          <button className="text-red-600 hover:underline" onClick={() => quitarImpuesto(idx)}>Quitar</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <button className="text-blue-600 hover:underline" onClick={agregarImpuesto}>+ Agregar línea</button>
              </TabsContent> */}
              <TabsContent value="verificacion">
                <div className="mb-2 font-bold">Verificación final de la venta</div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block mb-1 font-medium">Cliente</label>
                    <div className="border rounded px-2 py-1 bg-gray-50">{clientesFiltrados.find(c => c.id === clienteSeleccionado)?.razon_social || "-"}</div>
                  </div>
                  <div>
                    <label className="block mb-1 font-medium">Usuario</label>
                    <div className="border rounded px-2 py-1 bg-gray-50">{usuariosParaSelect.find(u => u.id === usuarioSeleccionado)?.nombre || "-"}</div>
                  </div>
                  <div>
                    <label className="block mb-1 font-medium">Tipo de comprobante</label>
                    <div className="border rounded px-2 py-1 bg-gray-50">{tiposComprobantesValidos.find(tc => tc.id === tipoComprobanteSeleccionado)?.descripcion || "-"}</div>
                  </div>
                  <div>
                    <label className="block mb-1 font-medium">Fecha</label>
                    <div className="border rounded px-2 py-1 bg-gray-50">{format(new Date(), "yyyy-MM-dd")}</div>
                  </div>
                  <div>
                    <label className="block mb-1 font-medium">Subtotal</label>
                    <input type="number" className="w-full border rounded px-2 py-1" value={total} readOnly />
                  </div>
                  <div>
                    <label className="block mb-1 font-medium">Total</label>
                    <input type="number" className="w-full border rounded px-2 py-1" value={total} readOnly />
                  </div>
                </div>
                <div className="mb-2 font-semibold">Resumen de artículos, medios de pago e impuestos cargados:</div>
                {/* Aquí puedes mostrar un resumen tabular de los detalles y medios de pago si lo deseas */}
                
                {/* Resumen de artículos */}
                <div className="mb-4">
                  <div className="font-semibold text-sm mb-2">Artículos ({detalle.filter(d => d.articulo && d.cantidad > 0).length}):</div>
                  <div className="border rounded p-2 bg-gray-50 max-h-32 overflow-y-auto">
                    {detalle.filter(d => d.articulo && d.cantidad > 0).map((d, idx) => {
                      const subtotalSinDescuento = d.cantidad * d.precio;
                      const descuentoPorcentaje = (subtotalSinDescuento * d.descuentoPorcentaje) / 100;
                      const descuentoFijo = d.descuentoFijo;
                      const totalDescuentos = descuentoPorcentaje + descuentoFijo;
                      
                      return (
                        <div key={idx} className="flex justify-between text-sm py-1">
                          <span>{d.articulo?.descripcion}</span>
                          <div className="text-right">
                            <div>{d.cantidad} x {formatCurrency(d.precio, DEFAULT_CURRENCY, DEFAULT_LOCALE)} = {formatCurrency(subtotalSinDescuento, DEFAULT_CURRENCY, DEFAULT_LOCALE)}</div>
                            {(d.descuentoPorcentaje > 0 || d.descuentoFijo > 0) && (
                              <div className="text-xs text-red-600">
                                -{formatCurrency(totalDescuentos, DEFAULT_CURRENCY, DEFAULT_LOCALE)} = {formatCurrency(d.subtotal, DEFAULT_CURRENCY, DEFAULT_LOCALE)}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {detalle.filter(d => d.articulo && d.cantidad > 0).length === 0 && (
                      <div className="text-gray-500 text-sm">No hay artículos agregados</div>
                    )}
                  </div>
                </div>

                {/* Resumen de medios de pago */}
                <div className="mb-4">
                  <div className="font-semibold text-sm mb-2">Medios de pago ({mediosPago.filter(m => m.cuenta && m.monto > 0).length}):</div>
                  <div className="border rounded p-2 bg-gray-50">
                    {mediosPago.filter(m => m.cuenta && m.monto > 0).map((m, idx) => (
                      <div key={idx} className="flex justify-between text-sm py-1">
                        <span>{m.cuenta?.descripcion}</span>
                        <span>{formatCurrency(m.monto, DEFAULT_CURRENCY, DEFAULT_LOCALE)}</span>
                      </div>
                    ))}
                    {mediosPago.filter(m => m.cuenta && m.monto > 0).length === 0 && (
                      <div className="text-gray-500 text-sm">No hay medios de pago configurados</div>
                    )}
                    {mediosPago.filter(m => m.cuenta && m.monto > 0).length > 0 && (
                      <div className="border-t pt-2 mt-2">
                        <div className="flex justify-between font-semibold">
                          <span>Total medios de pago:</span>
                          <span>{formatCurrency(sumaMediosPago, DEFAULT_CURRENCY, DEFAULT_LOCALE)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Total venta:</span>
                          <span>{formatCurrency(total, DEFAULT_CURRENCY, DEFAULT_LOCALE)}</span>
                        </div>
                        <div className={`flex justify-between text-sm ${diferenciaMediosPago === 0 ? 'text-green-600' : 'text-red-600'}`}>
                          <span>Diferencia:</span>
                          <span>{diferenciaMediosPago > 0 ? '+' : ''}{formatCurrency(diferenciaMediosPago, DEFAULT_CURRENCY, DEFAULT_LOCALE)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Resumen de impuestos */}
                <div className="mb-4">
                  <div className="font-semibold text-sm mb-2">Impuestos ({/*impuestos.length*/}):</div>
                  <div className="border rounded p-2 bg-gray-50">
                    {/* {impuestos.map((imp, idx) => (
                      <div key={idx} className="flex justify-between text-sm py-1">
                        <span>IVA {imp.porcentaje_iva}%</span>
                        <span>Base: ${imp.base_gravada.toFixed(2)} | IVA: ${imp.monto_iva.toFixed(2)}</span>
                      </div>
                    ))} */}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          )}
          <div className="flex justify-end gap-2 mt-6">
            <Button 
              variant="outline" 
              onClick={() => {
                if (!loading && !isClosing) {
                  if (hasUnsavedData()) {
                    setShowConfirmClose(true);
                  } else {
                    setIsClosing(true);
                    setTimeout(() => {
                      setIsClosing(false);
                      onOpenChange(false);
                    }, 100);
                  }
                }
              }}
              disabled={loading || isClosing}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleGuardarVenta}
              disabled={loading || isClosing || !detalle.some(linea => linea.cantidad > 0) || detalle.some(linea => !linea.cantidad || isNaN(linea.cantidad) || Number(linea.cantidad) <= 0) || mediosPagoIncompletos || hayCuentasDuplicadas}
            >
              {loading ? "Guardando..." : "Guardar venta"}
            </Button>
            {detalle.some(linea => !linea.cantidad || isNaN(linea.cantidad) || Number(linea.cantidad) <= 0) && (
              <div className="text-red-600 text-xs mt-1">Todas las líneas deben tener una cantidad válida mayor a 0.</div>
            )}
          </div>
        </DialogContent>
        </div>
      </Dialog>
      {/* Modal de error de caja/lote */}
      <Dialog open={showLoteError} onOpenChange={setShowLoteError}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Caja cerrada</DialogTitle>
            <DialogDescription>
              Debe haber una caja abierta para registrar la venta. Por favor, abra la caja antes de continuar.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end mt-4">
            <Button onClick={() => setShowLoteError(false)}>Cerrar</Button>
          </div>
        </DialogContent>
      </Dialog>
      {toast.show && (
        <div className="fixed top-6 right-6 z-50 bg-green-600 text-white px-6 py-3 rounded shadow-lg animate-fade-in">
          {toast.message}
        </div>
      )}
      {/* Modal de error de medios de pago */}
      <Dialog open={showMediosPagoError} onOpenChange={setShowMediosPagoError}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Error en medios de pago</DialogTitle>
          </DialogHeader>
          <div className="text-red-600 mb-4">Debes agregar al menos un detalle de cuenta de tesorería y monto válido.</div>
          <div className="flex justify-end">
            <Button onClick={() => setShowMediosPagoError(false)}>Aceptar</Button>
          </div>
        </DialogContent>
      </Dialog>
      {/* Modal de prueba gratis finalizada */}
      <Dialog open={showTrialEnded} onOpenChange={setShowTrialEnded}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Prueba gratis finalizada</DialogTitle>
            <DialogDescription>
              La prueba gratis ha finalizado. Debe abonar para continuar usando el sistema.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end mt-4">
            <Button onClick={() => setShowTrialEnded(false)}>Cerrar</Button>
          </div>
        </DialogContent>
      </Dialog>
      {/* Modal de error para CUENTA CORRIENTE y Consumidor Final */}
      <Dialog open={showClienteConsumidorFinalError} onOpenChange={setShowClienteConsumidorFinalError}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Error de cliente</DialogTitle>
            <DialogDescription>
              No se puede utilizar el medio de pago &quot;Cuenta Corriente&quot; si el cliente es &quot;Consumidor Final&quot;. Por favor, selecciona un cliente válido.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end mt-4">
            <Button onClick={() => setShowClienteConsumidorFinalError(false)}>Cerrar</Button>
          </div>
        </DialogContent>
      </Dialog>
      {/* Modal de error de máximo cuenta corriente */}
      <Dialog open={showMaxCuentaCorrienteError} onOpenChange={setShowMaxCuentaCorrienteError}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Límite de cuenta corriente superado</DialogTitle>
            <DialogDescription>
              El total de la venta supera el máximo permitido para cuenta corriente de este cliente. Por favor, revisa el límite o elige otro medio de pago.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end mt-4">
            <Button onClick={() => setShowMaxCuentaCorrienteError(false)}>Cerrar</Button>
          </div>
        </DialogContent>
      </Dialog>
      {/* Modal de error de stock */}
      <Dialog open={showStockError} onOpenChange={setShowStockError}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Stock insuficiente</DialogTitle>
            <DialogDescription>
              No hay stock disponible para la combinación seleccionada de artículo, talle y color. Por favor, revisa el stock antes de continuar.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end mt-4">
            <Button onClick={() => setShowStockError(false)}>Cerrar</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de confirmación de cierre */}
      <Dialog open={showConfirmClose} onOpenChange={setShowConfirmClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Cerrar sin guardar?</DialogTitle>
            <DialogDescription>
              Hay datos sin guardar en el formulario. ¿Estás seguro de que quieres cerrar sin guardar la venta?
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button 
              variant="outline" 
              onClick={() => setShowConfirmClose(false)}
            >
              Continuar editando
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => {
                setShowConfirmClose(false);
                setIsClosing(true);
                setTimeout(() => {
                  setIsClosing(false);
                  onOpenChange(false);
                }, 100);
              }}
            >
              Cerrar sin guardar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
} 