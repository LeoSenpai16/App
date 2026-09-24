const express = require("express");
const pool = require("../db");

const {
    verificarToken,
    permitirRoles
} = require("../middleware/auth.middleware");

const router = express.Router();

// Obtener mesas
router.get( "/", verificarToken, permitirRoles("mesero", "chef"), async (req, res) => {
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
        console.error(
            "Error al obtener mesas:",
            error
        );

        res.status(500).json({
            mensaje: "Error interno del servidor"
        });
    }
});

module.exports = router;