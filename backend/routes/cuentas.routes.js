const express = require("express");
const pool = require("../db");

const {
    verificarToken,
    permitirRoles
} = require("../middleware/auth.middleware");

const router = express.Router();


// Obtener cuentas abiertas
router.get( "/abiertas", verificarToken, permitirRoles("mesero", "chef"), async (req, res) => {
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
        console.error(
            "Error al obtener cuentas abiertas:",
            error
        );

        res.status(500).json({
            mensaje: "Error interno del servidor"
        });
    }
});

// Abrir una mesa
router.post(
    "/mesa",
    verificarToken,
    permitirRoles("mesero"),
    async (req, res) => {

        const mesaId = Number(req.body.mesa_id);

        // El mesero ya NO viene del teléfono.
        // Se obtiene del JWT verificado.
        const meseroId = req.usuario.id;

        if (
            !Number.isInteger(mesaId) ||
            mesaId <= 0
        ) {
            return res.status(400).json({
                mensaje: "mesa_id inválido"
            });
        }

        const cliente = await pool.connect();

        try {
            await cliente.query("BEGIN");

            const mesaResultado = await cliente.query(
                `
                SELECT
                    id,
                    numero,
                    estado
                FROM mesas
                WHERE id = $1
                FOR UPDATE
                `,
                [mesaId]
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
                    mensaje:
                        `La Mesa ${mesa.numero} no está libre`
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
                [
                    mesaId,
                    meseroId
                ]
            );

            await cliente.query(
                `
                UPDATE mesas
                SET estado = 'OCUPADA'
                WHERE id = $1
                `,
                [mesaId]
            );

            await cliente.query("COMMIT");

            res.status(201).json({
                mensaje:
                    `Mesa ${mesa.numero} abierta correctamente`,

                cuenta:
                    cuentaResultado.rows[0]
            });

        } catch (error) {
            await cliente.query("ROLLBACK");

            console.error(
                "Error al abrir mesa:",
                error
            );

            res.status(500).json({
                mensaje: "Error interno del servidor"
            });

        } finally {
            cliente.release();
        }
    }
);

// Cobrar y cerrar cuenta
router.post(
    "/:id/cobrar",
    verificarToken,
    permitirRoles("mesero"),
    async (req, res) => {

        const cuentaId = Number(req.params.id);

        const {
            metodo_pago
        } = req.body;

        // El usuario que cobra se obtiene del JWT
        const registrado_por = req.usuario.id;

    if (
        !Number.isInteger(cuentaId) ||
        cuentaId <= 0
    ) {
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

    const cliente = await pool.connect();

    try {
        await cliente.query("BEGIN");

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
                mensaje:
                    `La cuenta está en estado ${cuenta.estado}`
            });
        }

        // Evitar doble cobro
        const ventaExistente =
            await cliente.query(
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
                mensaje:
                    "Esta cuenta ya fue cobrada"
            });
        }

        // Revisar órdenes pendientes
        const ordenesPendientes =
            await cliente.query(
                `
                SELECT
                    COUNT(*)::INTEGER AS cantidad

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

        // Revisar usuario
        const usuarioResultado =
            await cliente.query(
                `
                SELECT id
                FROM usuarios

                WHERE id = $1
                AND activo = TRUE
                `,
                [registrado_por]
            );

        if (
            usuarioResultado.rows.length === 0
        ) {
            await cliente.query("ROLLBACK");

            return res.status(404).json({
                mensaje:
                    "El usuario no existe o está inactivo"
            });
        }

        // Calcular total
        const totalResultado =
            await cliente.query(
                `
                SELECT
                    COALESCE(
                        SUM(
                            oi.cantidad
                            * oi.precio_unitario

                            +

                            oi.cantidad
                            * COALESCE(
                                (
                                    SELECT
                                        SUM(
                                            oim.precio_extra
                                        )

                                    FROM
                                        orden_item_modificadores
                                        oim

                                    WHERE
                                        oim.orden_item_id
                                        = oi.id
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

        const total =
            totalResultado.rows[0].total;

        if (Number(total) <= 0) {
            await cliente.query("ROLLBACK");

            return res.status(409).json({
                mensaje:
                    "La cuenta no contiene productos entregados para cobrar"
            });
        }

        // Crear venta
        const ventaResultado =
            await cliente.query(
                `
                INSERT INTO ventas (
                    cuenta_id,
                    total,
                    metodo_pago,
                    registrado_por
                )

                VALUES (
                    $1,
                    $2,
                    $3,
                    $4
                )

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
                fecha_cierre =
                    CURRENT_TIMESTAMP

            WHERE id = $1
            `,
            [cuentaId]
        );

        // Liberar mesa
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
            mensaje:
                "Cuenta cobrada correctamente",

            venta:
                ventaResultado.rows[0]
        });

    } catch (error) {
        await cliente.query("ROLLBACK");

        console.error(
            "Error al cobrar cuenta:",
            error
        );

        res.status(500).json({
            mensaje: "Error interno del servidor"
        });

    } finally {
        cliente.release();
    }
});
// Crear cuenta para pedido por llamada / para llevar
router.post(
    "/para-llevar",
    verificarToken,
    permitirRoles("mesero"),
    async (req, res) => {

        const {
            nombre_cliente
        } = req.body;

        // El mesero se obtiene del JWT
        const meseroId = req.usuario.id;

        if (
            typeof nombre_cliente !== "string" ||
            nombre_cliente.trim().length === 0
        ) {
            return res.status(400).json({
                mensaje: "El nombre del cliente es obligatorio"
            });
        }

        try {
            // Comprobar que el usuario siga existiendo y activo
            const usuarioResultado = await pool.query(
                `
                SELECT
                    id,
                    nombre
                FROM usuarios
                WHERE id = $1
                AND activo = TRUE
                `,
                [meseroId]
            );

            if (usuarioResultado.rows.length === 0) {
                return res.status(401).json({
                    mensaje: "Usuario no disponible"
                });
            }

            const resultado = await pool.query(
                `
                INSERT INTO cuentas (
                    tipo,
                    mesa_id,
                    mesero_id,
                    nombre_cliente
                )
                VALUES (
                    'PARA_LLEVAR',
                    NULL,
                    $1,
                    $2
                )

                RETURNING
                    id,
                    tipo,
                    mesa_id,
                    mesero_id,
                    nombre_cliente,
                    estado,
                    fecha_apertura
                `,
                [
                    meseroId,
                    nombre_cliente.trim()
                ]
            );

            res.status(201).json({
                mensaje: "Pedido para llevar abierto correctamente",
                cuenta: resultado.rows[0]
            });

        } catch (error) {
            console.error(
                "Error al crear pedido para llevar:",
                error
            );

            res.status(500).json({
                mensaje: "Error interno del servidor"
            });
        }
    }
);

// Obtener detalle completo de una cuenta
router.get(
    "/:id/detalle",
    verificarToken,
    permitirRoles("mesero", "chef"),
    async (req, res) => {

        const cuentaId = Number(req.params.id);

        if (
            !Number.isInteger(cuentaId) ||
            cuentaId <= 0
        ) {
            return res.status(400).json({
                mensaje: "ID de cuenta inválido"
            });
        }

        try {

            // ==================================================
            // 1. Obtener información general de la cuenta
            // ==================================================

            const cuentaResultado = await pool.query(
                `
                SELECT
                    c.id,
                    c.tipo,
                    c.estado,
                    c.nombre_cliente,
                    c.mesero_id,
                    c.fecha_apertura,
                    c.fecha_cierre,

                    m.numero AS mesa,

                    u.nombre AS mesero

                FROM cuentas c

                LEFT JOIN mesas m
                    ON c.mesa_id = m.id

                JOIN usuarios u
                    ON c.mesero_id = u.id

                WHERE c.id = $1
                `,
                [cuentaId]
            );

            if (cuentaResultado.rows.length === 0) {
                return res.status(404).json({
                    mensaje: "La cuenta no existe"
                });
            }

            const cuenta = cuentaResultado.rows[0];


            // ==================================================
            // 2. Seguridad:
            // Un mesero solamente puede consultar sus cuentas.
            // El chef puede consultar cualquier cuenta.
            // ==================================================

            if (
                req.usuario.rol === "mesero" &&
                cuenta.mesero_id !== req.usuario.id
            ) {
                return res.status(403).json({
                    mensaje:
                        "No tienes permiso para consultar esta cuenta"
                });
            }


            // ==================================================
            // 3. Obtener órdenes e items
            // ==================================================

            const ordenesResultado = await pool.query(
                `
                SELECT
                    o.id AS orden_id,
                    o.estado AS orden_estado,
                    o.tipo_entrega,
                    o.fecha_creacion,
                    o.fecha_listo,

                    oi.id AS item_id,
                    oi.cantidad,
                    oi.precio_unitario,
                    oi.nota_especial,

                    p.id AS producto_id,
                    p.nombre AS producto,

                    COALESCE(
                        (
                            SELECT json_agg(
                                json_build_object(
                                    'id',
                                    mod.id,

                                    'nombre',
                                    mod.nombre,

                                    'precio_extra',
                                    oim.precio_extra
                                )
                                ORDER BY mod.id
                            )

                            FROM orden_item_modificadores oim

                            JOIN modificadores mod
                                ON oim.modificador_id = mod.id

                            WHERE oim.orden_item_id = oi.id
                        ),
                        '[]'::json
                    ) AS modificadores,

                    (
                        oi.cantidad
                        *
                        (
                            oi.precio_unitario
                            +
                            COALESCE(
                                (
                                    SELECT SUM(
                                        oim2.precio_extra
                                    )

                                    FROM orden_item_modificadores oim2

                                    WHERE
                                        oim2.orden_item_id = oi.id
                                ),
                                0
                            )
                        )
                    )::NUMERIC(10,2) AS subtotal

                FROM ordenes o

                JOIN orden_items oi
                    ON o.id = oi.orden_id

                JOIN productos p
                    ON oi.producto_id = p.id

                WHERE o.cuenta_id = $1

                AND o.estado <> 'CANCELADO'

                ORDER BY
                    o.fecha_creacion ASC,
                    oi.id ASC
                `,
                [cuentaId]
            );


            // ==================================================
            // 4. Calcular total desde PostgreSQL
            // ==================================================

            const totalResultado = await pool.query(
                `
                SELECT

                    COALESCE(
                        SUM(
                            oi.cantidad
                            *
                            (
                                oi.precio_unitario
                                +
                                COALESCE(
                                    (
                                        SELECT SUM(
                                            oim.precio_extra
                                        )

                                        FROM
                                            orden_item_modificadores oim

                                        WHERE
                                            oim.orden_item_id = oi.id
                                    ),
                                    0
                                )
                            )
                        ),
                        0
                    )::NUMERIC(10,2) AS total

                FROM ordenes o

                JOIN orden_items oi
                    ON o.id = oi.orden_id

                WHERE o.cuenta_id = $1

                AND o.estado <> 'CANCELADO'
                `,
                [cuentaId]
            );


            // ==================================================
            // 5. Agrupar items dentro de cada orden
            // ==================================================

            const ordenesMap = new Map();

            for (const fila of ordenesResultado.rows) {

                if (!ordenesMap.has(fila.orden_id)) {

                    ordenesMap.set(
                        fila.orden_id,
                        {
                            id: fila.orden_id,

                            estado:
                                fila.orden_estado,

                            tipo_entrega:
                                fila.tipo_entrega,

                            fecha_creacion:
                                fila.fecha_creacion,

                            fecha_listo:
                                fila.fecha_listo,

                            items: []
                        }
                    );
                }


                ordenesMap
                    .get(fila.orden_id)
                    .items
                    .push({
                        id:
                            fila.item_id,

                        producto_id:
                            fila.producto_id,

                        producto:
                            fila.producto,

                        cantidad:
                            fila.cantidad,

                        precio_unitario:
                            fila.precio_unitario,

                        nota_especial:
                            fila.nota_especial,

                        modificadores:
                            fila.modificadores,

                        subtotal:
                            fila.subtotal
                    });
            }


            const ordenes =
                Array.from(
                    ordenesMap.values()
                );


            // ==================================================
            // 6. Respuesta
            // ==================================================

            res.json({
                id:
                    cuenta.id,

                tipo:
                    cuenta.tipo,

                estado:
                    cuenta.estado,

                mesa:
                    cuenta.mesa,

                nombre_cliente:
                    cuenta.nombre_cliente,

                mesero: {
                    id:
                        cuenta.mesero_id,

                    nombre:
                        cuenta.mesero
                },

                fecha_apertura:
                    cuenta.fecha_apertura,

                fecha_cierre:
                    cuenta.fecha_cierre,

                ordenes,

                total:
                    totalResultado.rows[0].total
            });

        } catch (error) {

            console.error(
                "Error al obtener detalle de cuenta:",
                error
            );

            res.status(500).json({
                mensaje:
                    "Error interno del servidor"
            });
        }
    }
);


module.exports = router;