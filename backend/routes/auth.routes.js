const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const pool = require("../db");

const router = express.Router();


// ============================================================
// LOGIN
// ============================================================

router.post("/login", async (req, res) => {
    const {
        usuario_id,
        pin
    } = req.body;

    const usuarioId = Number(usuario_id);

    if (
        !Number.isInteger(usuarioId) ||
        usuarioId <= 0
    ) {
        return res.status(400).json({
            mensaje: "usuario_id inválido"
        });
    }

    if (
        typeof pin !== "string" ||
        pin.length === 0
    ) {
        return res.status(400).json({
            mensaje: "El PIN es obligatorio"
        });
    }

    try {
        const resultado = await pool.query(
            `
            SELECT
                u.id,
                u.nombre,
                u.pin,
                u.activo,
                r.nombre AS rol

            FROM usuarios u

            JOIN roles r
                ON u.rol_id = r.id

            WHERE u.id = $1
            `,
            [usuarioId]
        );

        // Usamos el mismo mensaje para usuario/PIN incorrecto.
        // Así no revelamos información innecesaria.
        if (resultado.rows.length === 0) {
            return res.status(401).json({
                mensaje: "Credenciales incorrectas"
            });
        }

        const usuario = resultado.rows[0];

        if (!usuario.activo) {
            return res.status(401).json({
                mensaje: "Credenciales incorrectas"
            });
        }

        const pinCorrecto =
            await bcrypt.compare(
                pin,
                usuario.pin
            );

        if (!pinCorrecto) {
            return res.status(401).json({
                mensaje: "Credenciales incorrectas"
            });
        }

        if (!process.env.JWT_SECRET) {
            console.error(
                "JWT_SECRET no está configurado"
            );

            return res.status(500).json({
                mensaje: "Error de configuración del servidor"
            });
        }

        const token = jwt.sign(
            {
                nombre: usuario.nombre,
                rol: usuario.rol
            },

            process.env.JWT_SECRET,

            {
                subject: String(usuario.id),
                expiresIn: "12h"
            }
        );

        res.json({
            mensaje: "Inicio de sesión correcto",

            token,

            usuario: {
                id: usuario.id,
                nombre: usuario.nombre,
                rol: usuario.rol
            }
        });

    } catch (error) {
        console.error(
            "Error al iniciar sesión:",
            error
        );

        res.status(500).json({
            mensaje: "Error interno del servidor"
        });
    }
});


module.exports = router;