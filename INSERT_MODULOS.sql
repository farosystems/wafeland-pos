-- 📋 INSERTAR MÓDULOS EXISTENTES DEL SISTEMA

-- Insertar todos los módulos del sistema en orden
INSERT INTO public.modulos (nombre, descripcion, icono, ruta, orden) VALUES
('dashboard', 'Dashboard', 'BarChart3', '/dashboard', 1),
('articulos', 'Gestión de Artículos', 'Package', '/articles', 2),
('clientes', 'Gestión de Clientes', 'Users', '/clientes', 3),
('ventas', 'Ventas', 'ShoppingCart', '/ventas', 4),
('mis-ventas', 'Mis Ventas', 'FileText', '/mis-ventas', 5),
('pagos', 'Pagos', 'CreditCard', '/pagos', 6),
('cuentas-corrientes', 'Cuentas Corrientes', 'Receipt', '/cuentas-corrientes', 7),
('movimientos-stock', 'Movimientos de Stock', 'Truck', '/movimientos-stock', 8),
('importacion-stock', 'Importación de Stock', 'Upload', '/importacion-stock', 9),
('stock-faltante', 'Stock Faltante', 'AlertTriangle', '/stock-faltante', 10),
('caja', 'Caja', 'CashRegister', '/caja', 11),
('empleados', 'Empleados', 'UserCheck', '/empleados', 12),
('gastos-empleados', 'Gastos de Empleados', 'DollarSign', '/gastos-empleados', 13),
('liquidaciones', 'Liquidaciones', 'Calculator', '/liquidaciones', 14),
('talles-colores', 'Talles y Colores', 'Palette', '/talles-colores', 15),
('variantes-productos', 'Variantes de Productos', 'Layers', '/variantes-productos', 16),
('agrupadores', 'Agrupadores', 'Folder', '/agrupadores', 17),
('informes', 'Informes', 'BarChart3', '/informes', 18),
('usuarios', 'Usuarios', 'Users', '/usuarios', 19);

-- Verificar que se insertaron correctamente
SELECT * FROM modulos ORDER BY orden; 