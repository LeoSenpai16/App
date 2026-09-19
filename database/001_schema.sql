CREATE TABLE roles (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE usuarios (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    pin VARCHAR(255) NOT NULL,
    rol_id INTEGER NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,

    CONSTRAINT fk_usuarios_roles
        FOREIGN KEY (rol_id)
        REFERENCES roles(id)
);

CREATE TABLE mesas (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    numero INTEGER NOT NULL UNIQUE,
    estado VARCHAR(30) NOT NULL DEFAULT 'LIBRE',

    CONSTRAINT chk_mesas_estado
        CHECK (
            estado IN (
                'LIBRE',
                'OCUPADA',
                'PENDIENTE_PAGO'
            )
        )
);

CREATE TABLE productos (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    precio NUMERIC(10,2) NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,

    CONSTRAINT chk_productos_precio
        CHECK (precio >= 0)
);

CREATE TABLE cuentas (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    tipo VARCHAR(20) NOT NULL,
    mesa_id INTEGER,
    mesero_id INTEGER NOT NULL,
    nombre_cliente VARCHAR(100),

    estado VARCHAR(30) NOT NULL DEFAULT 'ABIERTA',

    fecha_apertura TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_cierre TIMESTAMP,

    CONSTRAINT fk_cuentas_mesas
        FOREIGN KEY (mesa_id)
        REFERENCES mesas(id),

    CONSTRAINT fk_cuentas_mesero
        FOREIGN KEY (mesero_id)
        REFERENCES usuarios(id),

    CONSTRAINT chk_cuentas_tipo
        CHECK (
            tipo IN (
                'MESA',
                'PARA_LLEVAR'
            )
        ),

    CONSTRAINT chk_cuentas_estado
        CHECK (
            estado IN (
                'ABIERTA',
                'PENDIENTE_PAGO',
                'CERRADA',
                'CANCELADA'
            )
        ),

    CONSTRAINT chk_cuentas_tipo_datos
        CHECK (
            (tipo = 'MESA' AND mesa_id IS NOT NULL)
            OR
            (
                tipo = 'PARA_LLEVAR'
                AND mesa_id IS NULL
                AND nombre_cliente IS NOT NULL
            )
        )
);

CREATE TABLE ordenes (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    cuenta_id INTEGER NOT NULL,
    creado_por INTEGER NOT NULL,

    tipo_entrega VARCHAR(20) NOT NULL,
    estado VARCHAR(30) NOT NULL DEFAULT 'PENDIENTE',

    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_listo TIMESTAMP,

    CONSTRAINT fk_ordenes_cuentas
        FOREIGN KEY (cuenta_id)
        REFERENCES cuentas(id),

    CONSTRAINT fk_ordenes_usuario
        FOREIGN KEY (creado_por)
        REFERENCES usuarios(id),

    CONSTRAINT chk_ordenes_tipo_entrega
        CHECK (
            tipo_entrega IN (
                'EN_MESA',
                'PARA_LLEVAR'
            )
        ),

    CONSTRAINT chk_ordenes_estado
        CHECK (
            estado IN (
                'PENDIENTE',
                'PREPARANDO',
                'LISTO',
                'ENTREGADO',
                'CANCELADO'
            )
        )
);

CREATE TABLE orden_items (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    orden_id INTEGER NOT NULL,
    producto_id INTEGER NOT NULL,

    cantidad INTEGER NOT NULL,
    precio_unitario NUMERIC(10,2) NOT NULL,

    nota_especial VARCHAR(255),

    CONSTRAINT fk_orden_items_orden
        FOREIGN KEY (orden_id)
        REFERENCES ordenes(id),

    CONSTRAINT fk_orden_items_producto
        FOREIGN KEY (producto_id)
        REFERENCES productos(id),

    CONSTRAINT chk_orden_items_cantidad
        CHECK (cantidad > 0),

    CONSTRAINT chk_orden_items_precio
        CHECK (precio_unitario >= 0)
);

CREATE TABLE modificadores (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    activo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE producto_modificadores (
    producto_id INTEGER NOT NULL,
    modificador_id INTEGER NOT NULL,
    precio_extra NUMERIC(10,2) NOT NULL DEFAULT 0,

    PRIMARY KEY (producto_id, modificador_id),

    CONSTRAINT fk_producto_modificadores_producto
        FOREIGN KEY (producto_id)
        REFERENCES productos(id),

    CONSTRAINT fk_producto_modificadores_modificador
        FOREIGN KEY (modificador_id)
        REFERENCES modificadores(id),

    CONSTRAINT chk_producto_modificadores_precio
        CHECK (precio_extra >= 0)
);

CREATE TABLE orden_item_modificadores (
    orden_item_id INTEGER NOT NULL,
    modificador_id INTEGER NOT NULL,
    precio_extra NUMERIC(10,2) NOT NULL DEFAULT 0,

    PRIMARY KEY (orden_item_id, modificador_id),

    CONSTRAINT fk_orden_item_modificadores_item
        FOREIGN KEY (orden_item_id)
        REFERENCES orden_items(id),

    CONSTRAINT fk_orden_item_modificadores_modificador
        FOREIGN KEY (modificador_id)
        REFERENCES modificadores(id),

    CONSTRAINT chk_orden_item_modificadores_precio
        CHECK (precio_extra >= 0)
);

CREATE TABLE ventas (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    cuenta_id INTEGER NOT NULL UNIQUE,
    total NUMERIC(10,2) NOT NULL,
    metodo_pago VARCHAR(30) NOT NULL,
    registrado_por INTEGER NOT NULL,

    fecha_venta TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_ventas_cuenta
        FOREIGN KEY (cuenta_id)
        REFERENCES cuentas(id),

    CONSTRAINT fk_ventas_usuario
        FOREIGN KEY (registrado_por)
        REFERENCES usuarios(id),

    CONSTRAINT chk_ventas_total
        CHECK (total >= 0),

    CONSTRAINT chk_ventas_metodo_pago
        CHECK (
            metodo_pago IN (
                'EFECTIVO',
                'TARJETA',
                'TRANSFERENCIA'
            )
        )
);