const jwt = require("jsonwebtoken");


// Verificar que exista un JWT válido
function verificarToken(req, res, next) {
    const authorization = req.headers.authorization;

    if (
        !authorization ||
        !authorization.startsWith("Bearer ")
    ) {
        return res.status(401).json({
            mensaje: "Token de autenticación requerido"
        });
    }

    const token = authorization.split(" ")[1];

    try {
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        req.usuario = {
            id: Number(decoded.sub),
            nombre: decoded.nombre,
            rol: decoded.rol
        };

        next();

    } catch (error) {
        return res.status(401).json({
            mensaje: "Token inválido o expirado"
        });
    }
}


// Verificar roles
function permitirRoles(...rolesPermitidos) {
    return (req, res, next) => {
        if (!req.usuario) {
            return res.status(401).json({
                mensaje: "Usuario no autenticado"
            });
        }

        if (
            !rolesPermitidos.includes(
                req.usuario.rol
            )
        ) {
            return res.status(403).json({
                mensaje: "No tienes permiso para realizar esta acción"
            });
        }

        next();
    };
}


module.exports = {
    verificarToken,
    permitirRoles
};