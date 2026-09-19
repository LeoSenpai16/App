const express = require("express");
const pool = require("../db");

const router = express.Router();


// Reporte de ventas del día
router.get("/hoy", async (req, res) => {
    try {

        // 1. Ventas totales
        const ventasResultado = await pool.query(`
            SELECT
                COALESCE(
                    SUM(total),
                    0
                ) AS ventas_totales

            FROM ventas

            WHERE fecha_venta::date = CURRENT_DATE
        `);


        // 2. Número de órdenes realizadas
        const ordenesResultado = await pool.query(`
            SELECT
                COUNT(o.id)::INTEGER
                AS ordenes_realizadas

            FROM ventas v

            JOIN cuentas c
                ON v.cuenta_id = c.id

            JOIN ordenes o
                ON c.id = o.cuenta_id

            WHERE
                v.fecha_venta::date = CURRENT_DATE

            AND
                o.estado <> 'CANCELADO'
        `);


        // 3. Producto más vendido
        const productoResultado = await pool.query(`
            SELECT
                p.id,
                p.nombre,
                SUM(oi.cantidad)::INTEGER
                    AS cantidad_vendida

            FROM ventas v

            JOIN cuentas c
                ON v.cuenta_id = c.id

            JOIN ordenes o
                ON c.id = o.cuenta_id

            JOIN orden_items oi
                ON o.id = oi.orden_id

            JOIN productos p
                ON oi.producto_id = p.id

            WHERE
                v.fecha_venta::date = CURRENT_DATE

            AND
                o.estado <> 'CANCELADO'

            GROUP BY
                p.id,
                p.nombre

            ORDER BY
                cantidad_vendida DESC

            LIMIT 1
        `);


        // 4. Ventas por mesero
        const meserosResultado = await pool.query(`
            SELECT
                u.id,
                u.nombre AS mesero,

                COUNT(v.id)::INTEGER
                    AS cuentas_cobradas,

                COALESCE(
                    SUM(v.total),
                    0
                ) AS total_vendido

            FROM ventas v

            JOIN cuentas c
                ON v.cuenta_id = c.id

            JOIN usuarios u
                ON c.mesero_id = u.id

            WHERE
                v.fecha_venta::date = CURRENT_DATE

            GROUP BY
                u.id,
                u.nombre

            ORDER BY
                total_vendido DESC
        `);


        res.json({
            fecha: new Date().toISOString(),

            ventas_totales:
                ventasResultado.rows[0]
                    .ventas_totales,

            ordenes_realizadas:
                ordenesResultado.rows[0]
                    .ordenes_realizadas,

            producto_mas_vendido:
                productoResultado.rows[0] || null,

            ventas_por_mesero:
                meserosResultado.rows
        });

    } catch (error) {

        console.error(
            "Error al generar reporte del día:",
            error
        );

        res.status(500).json({
            mensaje:
                "Error interno del servidor"
        });
    }
});


module.exports = router;