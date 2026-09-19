const express = require("express");
const pool = require("./db");

const app = express();
const PORT = 3000;

app.use(express.json());

// Ruta de prueba
app.get("/", (req, res) => {
    res.json({
        mensaje: "API de Los Carboneros funcionando"
    });
});

// Obtener productos activos
app.get("/api/productos", async (req, res) => {
    try {
        const resultado = await pool.query(`
            SELECT
                id,
                nombre,
                precio,
                activo
            FROM productos
            WHERE activo = TRUE
            ORDER BY id
        `);

        res.json(resultado.rows);
    } catch (error) {
        console.error("Error al obtener productos:", error);

        res.status(500).json({
            mensaje: "Error interno del servidor"
        });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
});

// Obtener mesas
app.get("/api/mesas", async (req, res) => {
    try {
        const resultado = await pool.query(`
            SELECT
                id,
                numero,
                estado
            FROM mesas
            ORDER BY numero
        `);

        res.json(resultado.rows);
    } catch (error) {
        console.error("Error al obtener mesas:", error);

        res.status(500).json({
            mensaje: "Error interno del servidor"
        });
    }
});

// Abrir una mesa
app.post("/api/cuentas/mesa", async (req, res) => {
    const { mesa_id, mesero_id } = req.body;

    if (!mesa_id || !mesero_id) {
        return res.status(400).json({
            mensaje: "mesa_id y mesero_id son obligatorios"
        });
    }

    const cliente = await pool.connect();

    try {
        await cliente.query("BEGIN");

        // Bloqueamos la mesa mientras hacemos la operación
        const mesaResultado = await cliente.query(
            `
            SELECT id, numero, estado
            FROM mesas
            WHERE id = $1
            FOR UPDATE
            `,
            [mesa_id]
        );

        if (mesaResultado.rows.length === 0) {
            await cliente.query("ROLLBACK");

            return res.status(404).json({
                mensaje: "La mesa no existe"
            });
        }

        const mesa = mesaResultado.rows[0];

        if (mesa.estado !== "LIBRE") {
            await cliente.query("ROLLBACK");

            return res.status(409).json({
                mensaje: `La Mesa ${mesa.numero} no está libre`
            });
        }

        const cuentaResultado = await cliente.query(
            `
            INSERT INTO cuentas (
                tipo,
                mesa_id,
                mesero_id
            )
            VALUES (
                'MESA',
                $1,
                $2
            )
            RETURNING *
            `,
            [mesa_id, mesero_id]
        );

        await cliente.query(
            `
            UPDATE mesas
            SET estado = 'OCUPADA'
            WHERE id = $1
            `,
            [mesa_id]
        );

        await cliente.query("COMMIT");

        res.status(201).json({
            mensaje: `Mesa ${mesa.numero} abierta correctamente`,
            cuenta: cuentaResultado.rows[0]
        });

    } catch (error) {
        await cliente.query("ROLLBACK");

        console.error("Error al abrir mesa:", error);

        res.status(500).json({
            mensaje: "Error interno del servidor"
        });

    } finally {
        cliente.release();
    }
});

// Obtener cuentas abiertas
app.get("/api/cuentas/abiertas", async (req, res) => {
    try {
        const resultado = await pool.query(`
            SELECT
                cuentas.id,
                cuentas.tipo,
                cuentas.estado,
                cuentas.nombre_cliente,
                cuentas.fecha_apertura,

                mesas.id AS mesa_id,
                mesas.numero AS mesa,

                usuarios.id AS mesero_id,
                usuarios.nombre AS mesero

            FROM cuentas

            LEFT JOIN mesas
                ON cuentas.mesa_id = mesas.id

            JOIN usuarios
                ON cuentas.mesero_id = usuarios.id

            WHERE cuentas.estado IN (
                'ABIERTA',
                'PENDIENTE_PAGO'
            )

            ORDER BY cuentas.fecha_apertura
        `);

        res.json(resultado.rows);

    } catch (error) {
        console.error("Error al obtener cuentas abiertas:", error);

        res.status(500).json({
            mensaje: "Error interno del servidor"
        });
    }
});

// Crear una orden
app.post("/api/ordenes", async (req, res) => {
    const {
        cuenta_id,
        creado_por,
        tipo_entrega,
        items
    } = req.body;

    // Validaciones básicas
    if (!cuenta_id || !creado_por || !tipo_entrega) {
        return res.status(400).json({
            mensaje: "cuenta_id, creado_por y tipo_entrega son obligatorios"
        });
    }

    if (!["EN_MESA", "PARA_LLEVAR"].includes(tipo_entrega)) {
        return res.status(400).json({
            mensaje: "tipo_entrega no válido"
        });
    }

    if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
            mensaje: "La orden debe contener al menos un producto"
        });
    }

    const cliente = await pool.connect();

    try {
        await cliente.query("BEGIN");

        // Verificar que la cuenta exista y siga abierta
        const cuentaResultado = await cliente.query(
            `
            SELECT
                id,
                tipo,
                estado
            FROM cuentas
            WHERE id = $1
            FOR UPDATE
            `,
            [cuenta_id]
        );

        if (cuentaResultado.rows.length === 0) {
            await cliente.query("ROLLBACK");

            return res.status(404).json({
                mensaje: "La cuenta no existe"
            });
        }

        const cuenta = cuentaResultado.rows[0];

        if (cuenta.estado !== "ABIERTA") {
            await cliente.query("ROLLBACK");

            return res.status(409).json({
                mensaje: "La cuenta ya no está abierta"
            });
        }

        // Una cuenta telefónica siempre debe ser PARA_LLEVAR
        if (
            cuenta.tipo === "PARA_LLEVAR" &&
            tipo_entrega !== "PARA_LLEVAR"
        ) {
            await cliente.query("ROLLBACK");

            return res.status(400).json({
                mensaje: "Una cuenta para llevar no puede tener entrega EN_MESA"
            });
        }

        // Verificar usuario
        const usuarioResultado = await cliente.query(
            `
            SELECT id
            FROM usuarios
            WHERE id = $1
            AND activo = TRUE
            `,
            [creado_por]
        );

        if (usuarioResultado.rows.length === 0) {
            await cliente.query("ROLLBACK");

            return res.status(404).json({
                mensaje: "El usuario no existe o está inactivo"
            });
        }

        // Crear encabezado de la orden
        const ordenResultado = await cliente.query(
            `
            INSERT INTO ordenes (
                cuenta_id,
                creado_por,
                tipo_entrega
            )
            VALUES ($1, $2, $3)
            RETURNING *
            `,
            [
                cuenta_id,
                creado_por,
                tipo_entrega
            ]
        );

        const orden = ordenResultado.rows[0];

        const itemsCreados = [];

        // Crear cada item
        for (const item of items) {
            const {
                producto_id,
                cantidad,
                nota_especial
            } = item;

            const modificadores = [
                ...new Set(item.modificadores || [])
            ];

            if (
                !producto_id ||
                !Number.isInteger(cantidad) ||
                cantidad <= 0
            ) {
                throw new Error("ITEM_INVALIDO");
            }

            // Obtener el producto y SU PRECIO REAL
            const productoResultado = await cliente.query(
                `
                SELECT
                    id,
                    nombre,
                    precio
                FROM productos
                WHERE id = $1
                AND activo = TRUE
                `,
                [producto_id]
            );

            if (productoResultado.rows.length === 0) {
                throw new Error("PRODUCTO_INVALIDO");
            }

            const producto = productoResultado.rows[0];

            // Guardar item con precio histórico
            const itemResultado = await cliente.query(
                `
                INSERT INTO orden_items (
                    orden_id,
                    producto_id,
                    cantidad,
                    precio_unitario,
                    nota_especial
                )
                VALUES ($1, $2, $3, $4, $5)
                RETURNING *
                `,
                [
                    orden.id,
                    producto_id,
                    cantidad,
                    producto.precio,
                    nota_especial || null
                ]
            );

            const itemCreado = itemResultado.rows[0];

            const modificadoresCreados = [];

            // Guardar modificadores seleccionados
            for (const modificador_id of modificadores) {

                // Comprobar que el modificador sea válido
                // específicamente para ese producto
                const modificadorResultado = await cliente.query(
                    `
                    SELECT
                        m.id,
                        m.nombre,
                        pm.precio_extra
                    FROM producto_modificadores pm

                    JOIN modificadores m
                        ON pm.modificador_id = m.id

                    WHERE pm.producto_id = $1
                    AND pm.modificador_id = $2
                    AND m.activo = TRUE
                    `,
                    [
                        producto_id,
                        modificador_id
                    ]
                );

                if (modificadorResultado.rows.length === 0) {
                    throw new Error("MODIFICADOR_INVALIDO");
                }

                const modificador =
                    modificadorResultado.rows[0];

                await cliente.query(
                    `
                    INSERT INTO orden_item_modificadores (
                        orden_item_id,
                        modificador_id,
                        precio_extra
                    )
                    VALUES ($1, $2, $3)
                    `,
                    [
                        itemCreado.id,
                        modificador_id,
                        modificador.precio_extra
                    ]
                );

                modificadoresCreados.push({
                    id: modificador.id,
                    nombre: modificador.nombre,
                    precio_extra: modificador.precio_extra
                });
            }

            itemsCreados.push({
                id: itemCreado.id,
                producto_id: producto.id,
                producto: producto.nombre,
                cantidad: itemCreado.cantidad,
                precio_unitario: itemCreado.precio_unitario,
                nota_especial: itemCreado.nota_especial,
                modificadores: modificadoresCreados
            });
        }

        await cliente.query("COMMIT");

        res.status(201).json({
            mensaje: "Orden creada correctamente",
            orden: {
                id: orden.id,
                cuenta_id: orden.cuenta_id,
                tipo_entrega: orden.tipo_entrega,
                estado: orden.estado,
                fecha_creacion: orden.fecha_creacion,
                items: itemsCreados
            }
        });

    } catch (error) {
        await cliente.query("ROLLBACK");

        if (error.message === "ITEM_INVALIDO") {
            return res.status(400).json({
                mensaje: "Hay un producto con cantidad o información inválida"
            });
        }

        if (error.message === "PRODUCTO_INVALIDO") {
            return res.status(400).json({
                mensaje: "Uno de los productos no existe o está inactivo"
            });
        }

        if (error.message === "MODIFICADOR_INVALIDO") {
            return res.status(400).json({
                mensaje: "Uno de los modificadores no es válido para ese producto"
            });
        }

        console.error("Error al crear orden:", error);

        res.status(500).json({
            mensaje: "Error interno del servidor"
        });

    } finally {
        cliente.release();
    }
});

// Obtener órdenes activas para cocina
app.get("/api/ordenes/cocina", async (req, res) => {
    try {
        const resultado = await pool.query(`
            SELECT
                o.id AS orden_id,
                o.estado,
                o.tipo_entrega,
                o.fecha_creacion,

                c.tipo AS tipo_cuenta,
                c.nombre_cliente,

                m.numero AS mesa,

                u.nombre AS mesero,

                oi.id AS item_id,
                oi.cantidad,
                oi.nota_especial,
                oi.precio_unitario,

                p.id AS producto_id,
                p.nombre AS producto,

                COALESCE(
                    (
                        SELECT json_agg(
                            json_build_object(
                                'id', mod.id,
                                'nombre', mod.nombre,
                                'precio_extra', oim.precio_extra
                            )
                            ORDER BY mod.id
                        )
                        FROM orden_item_modificadores oim
                        JOIN modificadores mod
                            ON oim.modificador_id = mod.id
                        WHERE oim.orden_item_id = oi.id
                    ),
                    '[]'::json
                ) AS modificadores

            FROM ordenes o

            JOIN cuentas c
                ON o.cuenta_id = c.id

            LEFT JOIN mesas m
                ON c.mesa_id = m.id

            JOIN usuarios u
                ON o.creado_por = u.id

            JOIN orden_items oi
                ON o.id = oi.orden_id

            JOIN productos p
                ON oi.producto_id = p.id

            WHERE o.estado IN (
                'PENDIENTE',
                'PREPARANDO',
                'LISTO'
            )

            ORDER BY
                o.fecha_creacion ASC,
                oi.id ASC
        `);

        const ordenesMap = new Map();

        for (const fila of resultado.rows) {

            if (!ordenesMap.has(fila.orden_id)) {
                ordenesMap.set(fila.orden_id, {
                    id: fila.orden_id,
                    estado: fila.estado,
                    tipo_entrega: fila.tipo_entrega,
                    fecha_creacion: fila.fecha_creacion,

                    tipo_cuenta: fila.tipo_cuenta,
                    nombre_cliente: fila.nombre_cliente,

                    mesa: fila.mesa,
                    mesero: fila.mesero,

                    items: []
                });
            }

            ordenesMap.get(fila.orden_id).items.push({
                id: fila.item_id,
                producto_id: fila.producto_id,
                producto: fila.producto,
                cantidad: fila.cantidad,
                precio_unitario: fila.precio_unitario,
                nota_especial: fila.nota_especial,
                modificadores: fila.modificadores
            });
        }

        const ordenes = Array.from(ordenesMap.values());

        res.json(ordenes);

    } catch (error) {
        console.error(
            "Error al obtener órdenes de cocina:",
            error
        );

        res.status(500).json({
            mensaje: "Error interno del servidor"
        });
    }
});

// Cambiar estado de una orden
app.patch("/api/ordenes/:id/estado", async (req, res) => {
    const ordenId = Number(req.params.id);
    const { estado } = req.body;

    if (!Number.isInteger(ordenId) || ordenId <= 0) {
        return res.status(400).json({
            mensaje: "ID de orden inválido"
        });
    }

    const estadosPermitidos = [
        "PENDIENTE",
        "PREPARANDO",
        "LISTO",
        "ENTREGADO",
        "CANCELADO"
    ];

    if (!estadosPermitidos.includes(estado)) {
        return res.status(400).json({
            mensaje: "Estado de orden inválido"
        });
    }

    try {
        // Obtener estado actual
        const ordenResultado = await pool.query(
            `
            SELECT
                id,
                estado
            FROM ordenes
            WHERE id = $1
            `,
            [ordenId]
        );

        if (ordenResultado.rows.length === 0) {
            return res.status(404).json({
                mensaje: "La orden no existe"
            });
        }

        const estadoActual = ordenResultado.rows[0].estado;

        // Transiciones permitidas
        const transiciones = {
            PENDIENTE: [
                "PREPARANDO",
                "CANCELADO"
            ],

            PREPARANDO: [
                "LISTO",
                "CANCELADO"
            ],

            LISTO: [
                "ENTREGADO"
            ],

            ENTREGADO: [],

            CANCELADO: []
        };

        if (!transiciones[estadoActual].includes(estado)) {
            return res.status(409).json({
                mensaje:
                    `No se puede cambiar una orden de ${estadoActual} a ${estado}`
            });
        }

        const resultado = await pool.query(
            `
            UPDATE ordenes
            SET
                estado = $1::VARCHAR(30),

                fecha_listo = CASE
                    WHEN $1::VARCHAR(30) = 'LISTO'
                        THEN CURRENT_TIMESTAMP
                    ELSE fecha_listo
                END

            WHERE id = $2

            RETURNING
                id,
                cuenta_id,
                tipo_entrega,
                estado,
                fecha_creacion,
                fecha_listo
            `,
            [
                estado,
                ordenId
            ]
        );

        res.json({
            mensaje: "Estado actualizado correctamente",
            orden: resultado.rows[0]
        });

    } catch (error) {
        console.error(
            "Error al cambiar estado de orden:",
            error
        );

        res.status(500).json({
            mensaje: "Error interno del servidor"
        });
    }
});

// Cobrar y cerrar una cuenta
app.post("/api/cuentas/:id/cobrar", async (req, res) => {
    const cuentaId = Number(req.params.id);

    const {
        metodo_pago,
        registrado_por
    } = req.body;

    if (!Number.isInteger(cuentaId) || cuentaId <= 0) {
        return res.status(400).json({
            mensaje: "ID de cuenta inválido"
        });
    }

    const metodosPermitidos = [
        "EFECTIVO",
        "TARJETA",
        "TRANSFERENCIA"
    ];

    if (!metodosPermitidos.includes(metodo_pago)) {
        return res.status(400).json({
            mensaje: "Método de pago inválido"
        });
    }

    if (!registrado_por) {
        return res.status(400).json({
            mensaje: "registrado_por es obligatorio"
        });
    }

    const cliente = await pool.connect();

    try {
        await cliente.query("BEGIN");

        // Bloquear la cuenta mientras se procesa el cobro
        const cuentaResultado = await cliente.query(
            `
            SELECT
                id,
                tipo,
                mesa_id,
                mesero_id,
                estado
            FROM cuentas
            WHERE id = $1
            FOR UPDATE
            `,
            [cuentaId]
        );

        if (cuentaResultado.rows.length === 0) {
            await cliente.query("ROLLBACK");

            return res.status(404).json({
                mensaje: "La cuenta no existe"
            });
        }

        const cuenta = cuentaResultado.rows[0];

        if (
            cuenta.estado !== "ABIERTA" &&
            cuenta.estado !== "PENDIENTE_PAGO"
        ) {
            await cliente.query("ROLLBACK");

            return res.status(409).json({
                mensaje: `La cuenta está en estado ${cuenta.estado}`
            });
        }

        // Evitar cobrar dos veces la misma cuenta
        const ventaExistente = await cliente.query(
            `
            SELECT id
            FROM ventas
            WHERE cuenta_id = $1
            `,
            [cuentaId]
        );

        if (ventaExistente.rows.length > 0) {
            await cliente.query("ROLLBACK");

            return res.status(409).json({
                mensaje: "Esta cuenta ya fue cobrada"
            });
        }

        // Verificar que no existan órdenes sin terminar
        const ordenesPendientes = await cliente.query(
            `
            SELECT COUNT(*)::INTEGER AS cantidad
            FROM ordenes
            WHERE cuenta_id = $1
            AND estado NOT IN (
                'ENTREGADO',
                'CANCELADO'
            )
            `,
            [cuentaId]
        );

        const cantidadPendientes =
            ordenesPendientes.rows[0].cantidad;

        if (cantidadPendientes > 0) {
            await cliente.query("ROLLBACK");

            return res.status(409).json({
                mensaje:
                    `No se puede cobrar. Hay ${cantidadPendientes} orden(es) sin terminar`
            });
        }

        // Verificar usuario que registra el cobro
        const usuarioResultado = await cliente.query(
            `
            SELECT id
            FROM usuarios
            WHERE id = $1
            AND activo = TRUE
            `,
            [registrado_por]
        );

        if (usuarioResultado.rows.length === 0) {
            await cliente.query("ROLLBACK");

            return res.status(404).json({
                mensaje:
                    "El usuario que registra el cobro no existe o está inactivo"
            });
        }

        // Calcular el total.
        // Las órdenes CANCELADAS no participan.
        // También contempla modificadores con precio extra.
        const totalResultado = await cliente.query(
            `
            SELECT
                COALESCE(
                    SUM(
                        oi.cantidad * oi.precio_unitario
                        +
                        oi.cantidad * COALESCE(
                            (
                                SELECT SUM(oim.precio_extra)
                                FROM orden_item_modificadores oim
                                WHERE oim.orden_item_id = oi.id
                            ),
                            0
                        )
                    ),
                    0
                ) AS total

            FROM ordenes o

            JOIN orden_items oi
                ON o.id = oi.orden_id

            WHERE o.cuenta_id = $1
            AND o.estado = 'ENTREGADO'
            `,
            [cuentaId]
        );

        const total = totalResultado.rows[0].total;

        if (Number(total) <= 0) {
            await cliente.query("ROLLBACK");

            return res.status(409).json({
                mensaje:
                    "La cuenta no contiene productos entregados para cobrar"
            });
        }

        // Registrar venta
        const ventaResultado = await cliente.query(
            `
            INSERT INTO ventas (
                cuenta_id,
                total,
                metodo_pago,
                registrado_por
            )
            VALUES ($1, $2, $3, $4)

            RETURNING
                id,
                cuenta_id,
                total,
                metodo_pago,
                registrado_por,
                fecha_venta
            `,
            [
                cuentaId,
                total,
                metodo_pago,
                registrado_por
            ]
        );

        // Cerrar cuenta
        await cliente.query(
            `
            UPDATE cuentas
            SET
                estado = 'CERRADA',
                fecha_cierre = CURRENT_TIMESTAMP
            WHERE id = $1
            `,
            [cuentaId]
        );

        // Si era una cuenta de mesa, liberar la mesa
        if (cuenta.mesa_id !== null) {
            await cliente.query(
                `
                UPDATE mesas
                SET estado = 'LIBRE'
                WHERE id = $1
                `,
                [cuenta.mesa_id]
            );
        }

        await cliente.query("COMMIT");

        res.status(201).json({
            mensaje: "Cuenta cobrada correctamente",
            venta: ventaResultado.rows[0]
        });

    } catch (error) {
        await cliente.query("ROLLBACK");

        console.error("Error al cobrar cuenta:", error);

        res.status(500).json({
            mensaje: "Error interno del servidor"
        });

    } finally {
        cliente.release();
    }
});