const express = require("express");

const productosRoutes = require("./routes/productos.routes");
const mesasRoutes = require("./routes/mesas.routes");
const cuentasRoutes = require("./routes/cuentas.routes");
const ordenesRoutes = require("./routes/ordenes.routes");
const reportesRoutes = require("./routes/reportes.routes");
const authRoutes = require("./routes/auth.routes");
const cors = require("cors");   

const app = express();
const PORT = 3000;

app.use(express.json());

app.use(
    cors({
        origin: [
            "http://localhost:8081",
            "http://127.0.0.1:8081"
        ],

        methods: [
            "GET",
            "POST",
            "PATCH",
            "OPTIONS"
        ],

        allowedHeaders: [
            "Content-Type",
            "Authorization"
        ]
    })
);

app.use(express.json());
// Ruta principal
app.get("/", (req, res) => {
    res.json({
        mensaje: "API de Los Carboneros funcionando"
    });
});

// Rutas
app.use("/api/productos", productosRoutes);
app.use("/api/mesas", mesasRoutes);
app.use("/api/cuentas", cuentasRoutes);
app.use("/api/ordenes", ordenesRoutes);
app.use("/api/reportes", reportesRoutes);
app.use("/api/auth", authRoutes);

app.listen(PORT, () => {
    console.log(
        `Servidor ejecutándose en http://localhost:${PORT}`
    );
});