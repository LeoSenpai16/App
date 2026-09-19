const express = require("express");
const pool = require("../db");

const router = express.Router();

// Obtener productos activos
router.get("/", async (req, res) => {
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
        console.error(
            "Error al obtener productos:",
            error
        );

        res.status(500).json({
            mensaje: "Error interno del servidor"
        });
    }
});

// Obtener modificadores disponibles de un producto
router.get("/:id/modificadores", async (req, res) => {
    const productoId = Number(req.params.id);

    if (
        !Number.isInteger(productoId) ||
        productoId <= 0
    ) {
        return res.status(400).json({
            mensaje: "ID de producto inválido"
        });
    }

    try {
        // Verificar que el producto exista
        const productoResultado = await pool.query(
            `
            SELECT
                id,
                nombre,
                activo
            FROM productos
            WHERE id = $1
            `,
            [productoId]
        );

        if (productoResultado.rows.length === 0) {
            return res.status(404).json({
                mensaje: "El producto no existe"
            });
        }

        const producto = productoResultado.rows[0];

        if (!producto.activo) {
            return res.status(409).json({
                mensaje: "El producto está inactivo"
            });
        }

        const resultado = await pool.query(
            `
            SELECT
                m.id,
                m.nombre,
                pm.precio_extra

            FROM producto_modificadores pm

            JOIN modificadores m
                ON pm.modificador_id = m.id

            WHERE pm.producto_id = $1
            AND m.activo = TRUE

            ORDER BY m.id
            `,
            [productoId]
        );

        res.json({
            producto: {
                id: producto.id,
                nombre: producto.nombre
            },

            modificadores: resultado.rows
        });

    } catch (error) {
        console.error(
            "Error al obtener modificadores:",
            error
        );

        res.status(500).json({
            mensaje: "Error interno del servidor"
        });
    }
});

module.exports = router;