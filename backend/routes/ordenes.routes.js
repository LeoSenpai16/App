const express = require("express");
const pool = require("../db");

const {
    verificarToken,
    permitirRoles
} = require("../middleware/auth.middleware");

const router = express.Router();


// Crear orden
router.post("/", verificarToken, permitirRoles("mesero"), async (req, res) => {
    const {
        cuenta_id,
        tipo_entrega,
        items
    } = req.body;

        const creado_por = req.usuario.id;

    if (
        !cuenta_id ||
        !tipo_entrega
    ) {
        return res.status(400).json({
            mensaje:
                "cuenta_id y tipo_entrega son obligatorios"
        });
    }
    if (
        ![
            "EN_MESA",
            "PARA_LLEVAR"
        ].includes(tipo_entrega)
    ) {
        return res.status(400).json({
            mensaje:
                "tipo_entrega no válido"
        });
    }

    if (
        !Array.isArray(items) ||
        items.length === 0
    ) {
        return res.status(400).json({
            mensaje:
                "La orden debe contener al menos un producto"
        });
    }

    const cliente = await pool.connect();

    try {
        await cliente.query("BEGIN");

        // Revisar cuenta
        const cuentaResultado =
            await cliente.query(
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

        if (
            cuentaResultado.rows.length === 0
        ) {
            await cliente.query("ROLLBACK");

            return res.status(404).json({
                mensaje:
                    "La cuenta no existe"
            });
        }

        const cuenta =
            cuentaResultado.rows[0];

        if (cuenta.estado !== "ABIERTA") {
            await cliente.query("ROLLBACK");

            return res.status(409).json({
                mensaje:
                    "La cuenta ya no está abierta"
            });
        }

        if (
            cuenta.tipo === "PARA_LLEVAR" &&
            tipo_entrega !== "PARA_LLEVAR"
        ) {
            await cliente.query("ROLLBACK");

            return res.status(400).json({
                mensaje:
                    "Una cuenta para llevar no puede tener entrega EN_MESA"
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
                [creado_por]
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

        // Crear orden
        const ordenResultado =
            await cliente.query(
                `
                INSERT INTO ordenes (
                    cuenta_id,
                    creado_por,
                    tipo_entrega
                )

                VALUES (
                    $1,
                    $2,
                    $3
                )

                RETURNING *
                `,
                [
                    cuenta_id,
                    creado_por,
                    tipo_entrega
                ]
            );

        const orden =
            ordenResultado.rows[0];

        const itemsCreados = [];

        for (const item of items) {
            const {
                producto_id,
                cantidad,
                nota_especial
            } = item;

            const modificadores = [
                ...new Set(
                    item.modificadores || []
                )
            ];

            if (
                !producto_id ||
                !Number.isInteger(cantidad) ||
                cantidad <= 0
            ) {
                throw new Error(
                    "ITEM_INVALIDO"
                );
            }

            // Buscar producto
            const productoResultado =
                await cliente.query(
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

            if (
                productoResultado.rows.length === 0
            ) {
                throw new Error(
                    "PRODUCTO_INVALIDO"
                );
            }

            const producto =
                productoResultado.rows[0];

            // Crear item
            const itemResultado =
                await cliente.query(
                    `
                    INSERT INTO orden_items (
                        orden_id,
                        producto_id,
                        cantidad,
                        precio_unitario,
                        nota_especial
                    )

                    VALUES (
                        $1,
                        $2,
                        $3,
                        $4,
                        $5
                    )

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

            const itemCreado =
                itemResultado.rows[0];

            const modificadoresCreados = [];

            for (
                const modificador_id
                of modificadores
            ) {

                const modificadorResultado =
                    await cliente.query(
                        `
                        SELECT
                            m.id,
                            m.nombre,
                            pm.precio_extra

                        FROM
                            producto_modificadores
                            pm

                        JOIN modificadores m
                            ON pm.modificador_id
                            = m.id

                        WHERE
                            pm.producto_id = $1

                        AND
                            pm.modificador_id = $2

                        AND
                            m.activo = TRUE
                        `,
                        [
                            producto_id,
                            modificador_id
                        ]
                    );

                if (
                    modificadorResultado
                        .rows.length === 0
                ) {
                    throw new Error(
                        "MODIFICADOR_INVALIDO"
                    );
                }

                const modificador =
                    modificadorResultado
                        .rows[0];

                await cliente.query(
                    `
                    INSERT INTO
                        orden_item_modificadores (
                            orden_item_id,
                            modificador_id,
                            precio_extra
                        )

                    VALUES (
                        $1,
                        $2,
                        $3
                    )
                    `,
                    [
                        itemCreado.id,
                        modificador_id,
                        modificador.precio_extra
                    ]
                );

                modificadoresCreados.push({
                    id:
                        modificador.id,

                    nombre:
                        modificador.nombre,

                    precio_extra:
                        modificador.precio_extra
                });
            }

            itemsCreados.push({
                id:
                    itemCreado.id,

                producto_id:
                    producto.id,

                producto:
                    producto.nombre,

                cantidad:
                    itemCreado.cantidad,

                precio_unitario:
                    itemCreado.precio_unitario,

                nota_especial:
                    itemCreado.nota_especial,

                modificadores:
                    modificadoresCreados
            });
        }

        await cliente.query("COMMIT");

        res.status(201).json({
            mensaje:
                "Orden creada correctamente",

            orden: {
                id:
                    orden.id,

                cuenta_id:
                    orden.cuenta_id,

                tipo_entrega:
                    orden.tipo_entrega,

                estado:
                    orden.estado,

                fecha_creacion:
                    orden.fecha_creacion,

                items:
                    itemsCreados
            }
        });

    } catch (error) {
        await cliente.query("ROLLBACK");

        if (
            error.message ===
            "ITEM_INVALIDO"
        ) {
            return res.status(400).json({
                mensaje:
                    "Hay un producto con cantidad o información inválida"
            });
        }

        if (
            error.message ===
            "PRODUCTO_INVALIDO"
        ) {
            return res.status(400).json({
                mensaje:
                    "Uno de los productos no existe o está inactivo"
            });
        }

        if (
            error.message ===
            "MODIFICADOR_INVALIDO"
        ) {
            return res.status(400).json({
                mensaje:
                    "Uno de los modificadores no es válido para ese producto"
            });
        }

        console.error(
            "Error al crear orden:",
            error
        );

        res.status(500).json({
            mensaje:
                "Error interno del servidor"
        });

    } finally {
        cliente.release();
    }
});


// Obtener órdenes de cocina
router.get("/cocina", async (req, res) => {
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
                                'id',
                                mod.id,

                                'nombre',
                                mod.nombre,

                                'precio_extra',
                                oim.precio_extra
                            )

                            ORDER BY mod.id
                        )

                        FROM
                            orden_item_modificadores
                            oim

                        JOIN modificadores mod
                            ON
                                oim.modificador_id
                                = mod.id

                        WHERE
                            oim.orden_item_id
                            = oi.id
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

            if (
                !ordenesMap.has(
                    fila.orden_id
                )
            ) {
                ordenesMap.set(
                    fila.orden_id,
                    {
                        id:
                            fila.orden_id,

                        estado:
                            fila.estado,

                        tipo_entrega:
                            fila.tipo_entrega,

                        fecha_creacion:
                            fila.fecha_creacion,

                        tipo_cuenta:
                            fila.tipo_cuenta,

                        nombre_cliente:
                            fila.nombre_cliente,

                        mesa:
                            fila.mesa,

                        mesero:
                            fila.mesero,

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
                        fila.modificadores
                });
        }

        const ordenes =
            Array.from(
                ordenesMap.values()
            );

        res.json(ordenes);

    } catch (error) {
        console.error(
            "Error al obtener órdenes de cocina:",
            error
        );

        res.status(500).json({
            mensaje:
                "Error interno del servidor"
        });
    }
});


// Cambiar estado
router.patch(
    "/:id/estado",
    async (req, res) => {

        const ordenId =
            Number(req.params.id);

        const {
            estado
        } = req.body;

        if (
            !Number.isInteger(ordenId) ||
            ordenId <= 0
        ) {
            return res.status(400).json({
                mensaje:
                    "ID de orden inválido"
            });
        }

        const estadosPermitidos = [
            "PENDIENTE",
            "PREPARANDO",
            "LISTO",
            "ENTREGADO",
            "CANCELADO"
        ];

        if (
            !estadosPermitidos.includes(
                estado
            )
        ) {
            return res.status(400).json({
                mensaje:
                    "Estado de orden inválido"
            });
        }

        try {

            const ordenResultado =
                await pool.query(
                    `
                    SELECT
                        id,
                        estado

                    FROM ordenes

                    WHERE id = $1
                    `,
                    [ordenId]
                );

            if (
                ordenResultado.rows.length
                === 0
            ) {
                return res.status(404).json({
                    mensaje:
                        "La orden no existe"
                });
            }

            const estadoActual =
                ordenResultado.rows[0]
                    .estado;

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

            if (
                !transiciones[
                    estadoActual
                ].includes(estado)
            ) {
                return res
                    .status(409)
                    .json({
                        mensaje:
                            `No se puede cambiar una orden de ${estadoActual} a ${estado}`
                    });
            }

            const resultado =
                await pool.query(
                    `
                    UPDATE ordenes

                    SET
                        estado =
                            $1::VARCHAR(30),

                        fecha_listo =
                            CASE
                                WHEN
                                    $1::VARCHAR(30)
                                    = 'LISTO'

                                THEN
                                    CURRENT_TIMESTAMP

                                ELSE
                                    fecha_listo
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
                mensaje:
                    "Estado actualizado correctamente",

                orden:
                    resultado.rows[0]
            });

        } catch (error) {
            console.error(
                "Error al cambiar estado de orden:",
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