const bcrypt = require("bcryptjs");
const pool = require("../db");

async function configurarPin() {
    const [nombre, pin] = process.argv.slice(2);

    if (!nombre || !pin) {
        console.log(
            'Uso: node scripts/configurar-pin.js "Nombre" PIN'
        );

        process.exit(1);
    }

    if (!/^\d{4,8}$/.test(pin)) {
        console.log(
            "El PIN debe contener entre 4 y 8 números."
        );

        process.exit(1);
    }

    try {
        const usuarioResultado = await pool.query(
            `
            SELECT id, nombre
            FROM usuarios
            WHERE nombre = $1
            `,
            [nombre]
        );

        if (usuarioResultado.rows.length === 0) {
            console.log("El usuario no existe.");
            return;
        }

        const hash = await bcrypt.hash(pin, 12);

        await pool.query(
            `
            UPDATE usuarios
            SET pin = $1
            WHERE nombre = $2
            `,
            [hash, nombre]
        );

        console.log(
            `PIN actualizado correctamente para ${nombre}`
        );

    } catch (error) {
        console.error(
            "Error al configurar PIN:",
            error
        );

    } finally {
        await pool.end();
    }
}

configurarPin();