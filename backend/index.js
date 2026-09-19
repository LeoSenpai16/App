const express = require("express");

const productosRoutes = require("./routes/productos.routes");
const mesasRoutes = require("./routes/mesas.routes");
const cuentasRoutes = require("./routes/cuentas.routes");
const ordenesRoutes = require("./routes/ordenes.routes");
const reportesRoutes = require("./routes/reportes.routes");

const app = express();
const PORT = 3000;

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

app.listen(PORT, () => {
    console.log(
        `Servidor ejecutándose en http://localhost:${PORT}`
    );
});