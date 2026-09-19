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

module.exports = router;