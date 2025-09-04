-- Actualización de tabla sesiones_mesa para manejar estado "por cobrar"
-- Ejecutar este SQL en la base de datos

-- Agregar nuevos campos a la tabla sesiones_mesa
ALTER TABLE sesiones_mesa 
ADD COLUMN IF NOT EXISTS lista_para_cobro BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS fecha_cierre_pedido TIMESTAMP WITH TIME ZONE;

-- Crear comentarios para documentar los nuevos campos
COMMENT ON COLUMN sesiones_mesa.lista_para_cobro IS 'Indica si la mesa está lista para cobro (cerrada para pedidos pero aún no cobrada)';
COMMENT ON COLUMN sesiones_mesa.fecha_cierre_pedido IS 'Fecha y hora cuando se cerró la mesa para pedidos (antes del cobro)';

-- Actualizar la vista de sesiones activas para incluir los nuevos campos
DROP VIEW IF EXISTS vista_sesiones_mesa_activas;

CREATE OR REPLACE VIEW vista_sesiones_mesa_activas AS
SELECT 
    sm.id AS sesion_id,
    sm.fk_id_mesa,
    sm.fk_id_usuario,
    sm.fk_id_lote,
    sm.comensales,
    sm.fecha_apertura,
    sm.fecha_cierre,
    sm.fecha_cierre_pedido,
    sm.abierta,
    sm.lista_para_cobro,
    sm.total_sesion,
    u.nombre AS usuario_nombre,
    u.email AS usuario_email,
    u.rol AS usuario_rol,
    COALESCE(
        (SELECT SUM(dpm.cantidad * dpm.precio_unitario)
         FROM pedidos_mesa pm
         JOIN detalle_pedidos_mesa dpm ON pm.id = dpm.fk_id_pedido_mesa
         WHERE pm.fk_id_sesion_mesa = sm.id
        ), 0
    ) AS total_consumido
FROM sesiones_mesa sm
JOIN usuarios u ON sm.fk_id_usuario = u.id
WHERE sm.abierta = true;

-- Crear función para calcular total de una mesa (si no existe)
CREATE OR REPLACE FUNCTION calcular_total_mesa(sesion_id integer)
RETURNS numeric AS $$
BEGIN
    RETURN COALESCE(
        (SELECT SUM(dpm.cantidad * dpm.precio_unitario)
         FROM pedidos_mesa pm
         JOIN detalle_pedidos_mesa dpm ON pm.id = dpm.fk_id_pedido_mesa
         WHERE pm.fk_id_sesion_mesa = sesion_id
        ), 0
    );
END;
$$ LANGUAGE plpgsql;

-- Comentarios para la función
COMMENT ON FUNCTION calcular_total_mesa(integer) IS 'Calcula el total consumido en una sesión de mesa específica';

-- Actualizar permisos si es necesario
GRANT EXECUTE ON FUNCTION calcular_total_mesa(integer) TO authenticated;