-- ============================================================
-- LOS CARBONEROS APP
-- Archivo: 002_seed.sql
-- Descripción:
-- Datos iniciales necesarios para arrancar la aplicación.
--
-- Incluye:
--   - Roles
--   - Usuarios de prueba
--   - Mesas
--   - Productos
--   - Modificadores
--   - Relación producto/modificador
-- ============================================================


BEGIN;


-- ============================================================
-- 1. ROLES
-- ============================================================

INSERT INTO roles (nombre)
VALUES
    ('chef'),
    ('mesero')
ON CONFLICT (nombre) DO NOTHING;



-- ============================================================
-- 2. USUARIOS INICIALES
-- ============================================================
-- IMPORTANTE:
-- Estos PIN son únicamente temporales para desarrollo.
-- Más adelante el backend almacenará PIN cifrado/hasheado.
-- ============================================================


-- Chef
INSERT INTO usuarios (
    nombre,
    pin,
    rol_id,
    activo
)
SELECT
    'Edgar',
    'temporal',
    r.id,
    TRUE
FROM roles r
WHERE r.nombre = 'chef'
AND NOT EXISTS (
    SELECT 1
    FROM usuarios u
    WHERE u.nombre = 'Edgar'
);


-- Mesero
INSERT INTO usuarios (
    nombre,
    pin,
    rol_id,
    activo
)
SELECT
    'Erihvan',
    'temporal',
    r.id,
    TRUE
FROM roles r
WHERE r.nombre = 'mesero'
AND NOT EXISTS (
    SELECT 1
    FROM usuarios u
    WHERE u.nombre = 'Erihvan'
);



-- ============================================================
-- 3. MESAS
-- ============================================================

INSERT INTO mesas (
    numero,
    estado
)
VALUES
    (1, 'LIBRE'),
    (2, 'LIBRE'),
    (3, 'LIBRE'),
    (4, 'LIBRE'),
    (5, 'LIBRE'),
    (6, 'LIBRE')
ON CONFLICT (numero) DO NOTHING;



-- ============================================================
-- 4. PRODUCTOS
-- ============================================================

INSERT INTO productos (
    nombre,
    precio,
    activo
)
VALUES
    ('Orden de asada', 130.00, TRUE),
    ('Media orden', 80.00, TRUE),
    ('Taco de asada', 20.00, TRUE),
    ('Taco mixto', 22.00, TRUE),
    ('Quesadilla', 40.00, TRUE),
    ('Lorenza', 40.00, TRUE),
    ('Hamburguesa con papas', 80.00, TRUE),
    ('Hamburguesa sin papas', 60.00, TRUE),
    ('Orden de papas', 60.00, TRUE),
    ('Media orden de papas', 30.00, TRUE),
    ('Plato de frijol', 15.00, TRUE),
    ('Refresco', 30.00, TRUE),
    ('Agua de chía', 20.00, TRUE)
ON CONFLICT (nombre) DO NOTHING;



-- ============================================================
-- 5. MODIFICADORES
-- ============================================================

INSERT INTO modificadores (
    nombre,
    activo
)
VALUES
    ('Sin frijol', TRUE),
    ('Sin nopal', TRUE),
    ('Aparte', TRUE),
    ('Sin queso blanco', TRUE),
    ('Sin aderezos', TRUE),
    ('Sin ketchup', TRUE),
    ('Sin mostaza', TRUE),
    ('Sin chimichurri', TRUE),
    ('Sin cebolla', TRUE),
    ('Sin lechuga', TRUE),
    ('Sin jitomate', TRUE),
    ('Sin pepinillo', TRUE),
    ('Sin chorizo', TRUE),
    ('Frijol aparte', TRUE)
ON CONFLICT (nombre) DO NOTHING;



-- ============================================================
-- 6. LIMPIEZA DE RELACIONES CONFIGURADAS
-- ============================================================
-- Esto permite volver a ejecutar el seed y asegurarnos de que
-- estos productos tengan exactamente los modificadores
-- definidos actualmente.
-- ============================================================

DELETE FROM producto_modificadores
WHERE producto_id IN (
    SELECT id
    FROM productos
    WHERE nombre IN (
        'Orden de asada',
        'Taco de asada',
        'Taco mixto',
        'Hamburguesa con papas',
        'Hamburguesa sin papas'
    )
);



-- ============================================================
-- 7. ORDEN DE ASADA
-- ============================================================
-- Modificadores:
--   - Sin frijol
--   - Sin nopal
--   - Sin chorizo
--   - Frijol aparte
--
-- Frijol aparte NO tiene costo adicional.
-- ============================================================

INSERT INTO producto_modificadores (
    producto_id,
    modificador_id,
    precio_extra
)
SELECT
    p.id,
    m.id,
    0.00
FROM productos p
CROSS JOIN modificadores m
WHERE p.nombre = 'Orden de asada'
AND m.nombre IN (
    'Sin frijol',
    'Sin nopal',
    'Sin chorizo',
    'Frijol aparte'
)
ON CONFLICT (
    producto_id,
    modificador_id
)
DO NOTHING;



-- ============================================================
-- 8. TACO DE ASADA
-- ============================================================
-- Modificadores:
--   - Sin frijol
--   - Sin nopal
--   - Aparte
-- ============================================================

INSERT INTO producto_modificadores (
    producto_id,
    modificador_id,
    precio_extra
)
SELECT
    p.id,
    m.id,
    0.00
FROM productos p
CROSS JOIN modificadores m
WHERE p.nombre = 'Taco de asada'
AND m.nombre IN (
    'Sin frijol',
    'Sin nopal',
    'Aparte'
)
ON CONFLICT (
    producto_id,
    modificador_id
)
DO NOTHING;



-- ============================================================
-- 9. TACO MIXTO
-- ============================================================
-- Modificadores:
--   - Sin frijol
--   - Sin nopal
--   - Aparte
-- ============================================================

INSERT INTO producto_modificadores (
    producto_id,
    modificador_id,
    precio_extra
)
SELECT
    p.id,
    m.id,
    0.00
FROM productos p
CROSS JOIN modificadores m
WHERE p.nombre = 'Taco mixto'
AND m.nombre IN (
    'Sin frijol',
    'Sin nopal',
    'Aparte'
)
ON CONFLICT (
    producto_id,
    modificador_id
)
DO NOTHING;



-- ============================================================
-- 10. HAMBURGUESA CON PAPAS
-- ============================================================
-- Modificadores:
--   - Sin aderezos
--   - Sin ketchup
--   - Sin mostaza
--   - Sin chimichurri
--   - Sin cebolla
--   - Sin lechuga
--   - Sin jitomate
--   - Sin pepinillo
-- ============================================================

INSERT INTO producto_modificadores (
    producto_id,
    modificador_id,
    precio_extra
)
SELECT
    p.id,
    m.id,
    0.00
FROM productos p
CROSS JOIN modificadores m
WHERE p.nombre = 'Hamburguesa con papas'
AND m.nombre IN (
    'Sin aderezos',
    'Sin ketchup',
    'Sin mostaza',
    'Sin chimichurri',
    'Sin cebolla',
    'Sin lechuga',
    'Sin jitomate',
    'Sin pepinillo'
)
ON CONFLICT (
    producto_id,
    modificador_id
)
DO NOTHING;



-- ============================================================
-- 11. HAMBURGUESA SIN PAPAS
-- ============================================================
-- Modificadores:
--   - Sin aderezos
--   - Sin ketchup
--   - Sin mostaza
--   - Sin chimichurri
--   - Sin cebolla
--   - Sin lechuga
--   - Sin jitomate
--   - Sin pepinillo
-- ============================================================

INSERT INTO producto_modificadores (
    producto_id,
    modificador_id,
    precio_extra
)
SELECT
    p.id,
    m.id,
    0.00
FROM productos p
CROSS JOIN modificadores m
WHERE p.nombre = 'Hamburguesa sin papas'
AND m.nombre IN (
    'Sin aderezos',
    'Sin ketchup',
    'Sin mostaza',
    'Sin chimichurri',
    'Sin cebolla',
    'Sin lechuga',
    'Sin jitomate',
    'Sin pepinillo'
)
ON CONFLICT (
    producto_id,
    modificador_id
)
DO NOTHING;



COMMIT;