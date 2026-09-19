const http = require("http");
const pool = require("./db");

const servidor = http.createServer(async (req, res) => {
    res.writeHead(200, {
        "Content-Type": "application/json"
    });

    try {
        const resultado = await pool.query(
            "SELECT NOW() AS fecha_servidor"
        );

        res.end(JSON.stringify({
            mensaje: "API de Los Carboneros funcionando",
            postgres: "conectado",
            fecha: resultado.rows[0].fecha_servidor
        }));
    } catch (error) {
        console.error(error);

        res.statusCode = 500;

        res.end(JSON.stringify({
            mensaje: "Error al conectar con PostgreSQL"
        }));
    }
});

servidor.listen(3000, () => {
    console.log("Servidor ejecutándose en http://localhost:3000");
});
