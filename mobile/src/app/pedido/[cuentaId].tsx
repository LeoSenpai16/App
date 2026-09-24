import {
    useEffect,
    useMemo,
    useState
} from "react";

import {
    ActivityIndicator,
    Modal,
    Pressable,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    View
} from "react-native";

import {
    useLocalSearchParams,
    useRouter
} from "expo-router";

import {
    useAuth
} from "../../context/AuthContext";


const API_URL = "http://localhost:3000";


type Producto = {
    id: number;
    nombre: string;
    precio: string;
    activo: boolean;
};


type Modificador = {
    id: number;
    nombre: string;
    precio_extra: string;
};


type LineaPedido = {
    idTemporal: string;

    producto: Producto;

    cantidad: number;

    modificadores: Modificador[];
};


export default function NuevoPedidoScreen() {

    const router = useRouter();

    const {
        cuentaId,
        tipoCuenta
    } = useLocalSearchParams<{
        cuentaId: string;
        tipoCuenta?: string;
    }>();


    const {
        usuario,
        token
    } = useAuth();


    const [productos, setProductos] =
        useState<Producto[]>([]);

    const [lineas, setLineas] =
        useState<LineaPedido[]>([]);

    const [productoConfigurando, setProductoConfigurando] =
        useState<Producto | null>(null);

    const [modificadoresDisponibles, setModificadoresDisponibles] =
        useState<Modificador[]>([]);

    const [modificadoresSeleccionados, setModificadoresSeleccionados] =
        useState<number[]>([]);

    const [cantidadConfigurando, setCantidadConfigurando] =
        useState(1);

    const [cargando, setCargando] =
        useState(true);

    const [cargandoModificadores, setCargandoModificadores] =
        useState(false);

    const [enviando, setEnviando] =
        useState(false);

    const [mensaje, setMensaje] =
        useState("");


    // =========================================================
    // PROTEGER PANTALLA
    // =========================================================

    useEffect(() => {

        if (
            !usuario ||
            !token ||
            usuario.rol !== "mesero"
        ) {
            router.replace("/");
        }

    }, [
        usuario,
        token,
        router
    ]);


    // =========================================================
    // CARGAR PRODUCTOS
    // =========================================================

    useEffect(() => {

        if (
            !token ||
            usuario?.rol !== "mesero"
        ) {
            return;
        }

        cargarProductos();

    }, [
        token,
        usuario
    ]);


    async function cargarProductos() {

        if (!token) {
            return;
        }

        try {

            setCargando(true);
            setMensaje("");

            const respuesta = await fetch(
                `${API_URL}/api/productos`,
                {
                    headers: {
                        Authorization:
                            `Bearer ${token}`
                    }
                }
            );

            const datos =
                await respuesta.json();

            if (!respuesta.ok) {

                setMensaje(
                    datos.mensaje ||
                    "No fue posible cargar el menú."
                );

                return;
            }

            setProductos(datos);

        } catch (error) {

            console.error(error);

            setMensaje(
                "No se pudo conectar con el servidor."
            );

        } finally {

            setCargando(false);
        }
    }


    // =========================================================
    // SELECCIONAR PRODUCTO
    // =========================================================

    async function seleccionarProducto(
        producto: Producto
    ) {

        if (!token) {
            return;
        }

        try {

            setProductoConfigurando(producto);

            setCantidadConfigurando(1);

            setModificadoresSeleccionados([]);

            setModificadoresDisponibles([]);

            setCargandoModificadores(true);

            setMensaje("");


            const respuesta = await fetch(
                `${API_URL}/api/productos/${producto.id}/modificadores`,
                {
                    headers: {
                        Authorization:
                            `Bearer ${token}`
                    }
                }
            );

            const datos =
                await respuesta.json();


            if (!respuesta.ok) {

                setProductoConfigurando(null);

                setMensaje(
                    datos.mensaje ||
                    "No fue posible obtener los modificadores."
                );

                return;
            }


            setModificadoresDisponibles(
                datos.modificadores
            );


        } catch (error) {

            console.error(error);

            setProductoConfigurando(null);

            setMensaje(
                "No se pudo conectar con el servidor."
            );

        } finally {

            setCargandoModificadores(false);
        }
    }


    // =========================================================
    // MODIFICADORES
    // =========================================================

    function alternarModificador(
        modificadorId: number
    ) {

        setModificadoresSeleccionados(
            (actuales) => {

                if (
                    actuales.includes(
                        modificadorId
                    )
                ) {
                    return actuales.filter(
                        (id) =>
                            id !== modificadorId
                    );
                }

                return [
                    ...actuales,
                    modificadorId
                ];
            }
        );
    }


    // =========================================================
    // AGREGAR LÍNEA AL PEDIDO
    // =========================================================

    function agregarLinea() {

        if (!productoConfigurando) {
            return;
        }


        const modificadores =
            modificadoresDisponibles.filter(
                (modificador) =>
                    modificadoresSeleccionados.includes(
                        modificador.id
                    )
            );


        const nuevaLinea: LineaPedido = {

            idTemporal:
                `${Date.now()}-${Math.random()}`,

            producto:
                productoConfigurando,

            cantidad:
                cantidadConfigurando,

            modificadores
        };


        setLineas(
            (actuales) => [
                ...actuales,
                nuevaLinea
            ]
        );


        setProductoConfigurando(null);

        setModificadoresDisponibles([]);

        setModificadoresSeleccionados([]);

        setCantidadConfigurando(1);
    }


    // =========================================================
    // MODIFICAR CARRITO
    // =========================================================

    function eliminarLinea(
        idTemporal: string
    ) {

        setLineas(
            (actuales) =>
                actuales.filter(
                    (linea) =>
                        linea.idTemporal !==
                        idTemporal
                )
        );
    }


    // =========================================================
    // TOTAL ESTIMADO
    // =========================================================

    const total = useMemo(() => {

        return lineas.reduce(
            (acumulado, linea) => {

                const precioProducto =
                    Number(
                        linea.producto.precio
                    );


                const precioModificadores =
                    linea.modificadores.reduce(
                        (
                            totalModificadores,
                            modificador
                        ) => {

                            return (
                                totalModificadores +
                                Number(
                                    modificador.precio_extra
                                )
                            );
                        },
                        0
                    );


                return (
                    acumulado +
                    linea.cantidad *
                    (
                        precioProducto +
                        precioModificadores
                    )
                );
            },
            0
        );

    }, [lineas]);


    // =========================================================
    // ENVIAR ORDEN
    // =========================================================

    async function enviarPedido() {

        if (
            !token ||
            !cuentaId
        ) {
            return;
        }


        if (lineas.length === 0) {

            setMensaje(
                "Agrega al menos un producto."
            );

            return;
        }


        try {

            setEnviando(true);

            setMensaje("");


            const respuesta = await fetch(
                `${API_URL}/api/ordenes`,
                {
                    method: "POST",

                    headers: {

                        "Content-Type":
                            "application/json",

                        Authorization:
                            `Bearer ${token}`
                    },

                    body: JSON.stringify({

                        cuenta_id:
                            Number(cuentaId),

                        tipo_entrega:
                            tipoCuenta ===
                            "PARA_LLEVAR"
                                ? "PARA_LLEVAR"
                                : "EN_MESA",

                        items:
                            lineas.map(
                                (linea) => ({

                                    producto_id:
                                        linea.producto.id,

                                    cantidad:
                                        linea.cantidad,

                                    modificadores:
                                        linea.modificadores.map(
                                            (
                                                modificador
                                            ) =>
                                                modificador.id
                                        )
                                })
                            )
                    })
                }
            );


            const datos =
                await respuesta.json();


            if (!respuesta.ok) {

                setMensaje(
                    datos.mensaje ||
                    "No fue posible crear la orden."
                );

                return;
            }


            router.replace({

                pathname:
                    "/cuenta/[id]",

                params: {
                    id: cuentaId
                }
            });


        } catch (error) {

            console.error(error);

            setMensaje(
                "No se pudo conectar con el servidor."
            );

        } finally {

            setEnviando(false);
        }
    }


    // =========================================================
    // VALIDACIÓN
    // =========================================================

    if (
        !usuario ||
        !token ||
        usuario.rol !== "mesero"
    ) {
        return null;
    }


    // =========================================================
    // INTERFAZ
    // =========================================================

    return (

        <SafeAreaView style={styles.container}>

            <ScrollView
                contentContainerStyle={
                    styles.contenido
                }
            >

                <Pressable
                    onPress={() =>
                        router.back()
                    }
                    style={styles.volver}
                >
                    <Text
                        style={
                            styles.volverTexto
                        }
                    >
                        ← Volver
                    </Text>
                </Pressable>


                <Text style={styles.titulo}>
                    Nuevo pedido
                </Text>

                <Text style={styles.subtitulo}>
                    Selecciona los productos
                </Text>


                {cargando ? (

                    <ActivityIndicator
                        size="large"
                        style={
                            styles.cargando
                        }
                    />

                ) : (

                    <View
                        style={
                            styles.lista
                        }
                    >

                        {productos.map(
                            (producto) => (

                                <Pressable
                                    key={
                                        producto.id
                                    }

                                    style={
                                        styles.producto
                                    }

                                    onPress={() =>
                                        seleccionarProducto(
                                            producto
                                        )
                                    }
                                >

                                    <View>

                                        <Text
                                            style={
                                                styles.productoNombre
                                            }
                                        >
                                            {
                                                producto.nombre
                                            }
                                        </Text>

                                        <Text
                                            style={
                                                styles.productoPrecio
                                            }
                                        >
                                            ${
                                                producto.precio
                                            }
                                        </Text>

                                    </View>


                                    <Text
                                        style={
                                            styles.agregarTexto
                                        }
                                    >
                                        Agregar
                                    </Text>

                                </Pressable>
                            )
                        )}

                    </View>
                )}


                <Text
                    style={
                        styles.seccionTitulo
                    }
                >
                    Pedido actual
                </Text>


                {lineas.length === 0 ? (

                    <View style={styles.vacio}>

                        <Text
                            style={
                                styles.vacioTexto
                            }
                        >
                            No has agregado productos.
                        </Text>

                    </View>

                ) : (

                    lineas.map(
                        (linea) => (

                            <View
                                key={
                                    linea.idTemporal
                                }

                                style={
                                    styles.linea
                                }
                            >

                                <View
                                    style={
                                        styles.lineaInfo
                                    }
                                >

                                    <Text
                                        style={
                                            styles.lineaNombre
                                        }
                                    >
                                        {
                                            linea.cantidad
                                        } × {
                                            linea.producto
                                                .nombre
                                        }
                                    </Text>


                                    {linea.modificadores.map(
                                        (
                                            modificador
                                        ) => (

                                            <Text
                                                key={
                                                    modificador.id
                                                }

                                                style={
                                                    styles.modificadorResumen
                                                }
                                            >
                                                • {
                                                    modificador.nombre
                                                }
                                            </Text>

                                        )
                                    )}

                                </View>


                                <Pressable
                                    style={
                                        styles.botonEliminar
                                    }

                                    onPress={() =>
                                        eliminarLinea(
                                            linea.idTemporal
                                        )
                                    }
                                >
                                    <Text
                                        style={
                                            styles.botonEliminarTexto
                                        }
                                    >
                                        ×
                                    </Text>
                                </Pressable>

                            </View>

                        ))
                )}


                <View
                    style={
                        styles.resumen
                    }
                >

                    <Text
                        style={
                            styles.totalEtiqueta
                        }
                    >
                        Total estimado
                    </Text>

                    <Text
                        style={
                            styles.total
                        }
                    >
                        ${total.toFixed(2)}
                    </Text>

                </View>


                <Pressable
                    style={[
                        styles.botonEnviar,

                        enviando &&
                        styles.botonDeshabilitado
                    ]}

                    disabled={
                        enviando
                    }

                    onPress={
                        enviarPedido
                    }
                >

                    {enviando ? (

                        <ActivityIndicator />

                    ) : (

                        <Text
                            style={
                                styles.botonEnviarTexto
                            }
                        >
                            Enviar a cocina
                        </Text>

                    )}

                </Pressable>


                {mensaje.length > 0 && (

                    <Text
                        style={
                            styles.mensaje
                        }
                    >
                        {mensaje}
                    </Text>

                )}

            </ScrollView>


            {/* =====================================
                MODAL DE CONFIGURACIÓN
            ====================================== */}

            <Modal
                visible={
                    productoConfigurando !== null
                }

                transparent

                animationType="fade"

                onRequestClose={() =>
                    setProductoConfigurando(
                        null
                    )
                }
            >

                <View
                    style={
                        styles.modalFondo
                    }
                >

                    <View
                        style={
                            styles.modalCard
                        }
                    >

                        {productoConfigurando && (

                            <>

                                <Text
                                    style={
                                        styles.modalTitulo
                                    }
                                >
                                    {
                                        productoConfigurando
                                            .nombre
                                    }
                                </Text>


                                <Text
                                    style={
                                        styles.modalPrecio
                                    }
                                >
                                    ${
                                        productoConfigurando
                                            .precio
                                    }
                                </Text>


                                <Text
                                    style={
                                        styles.modalEtiqueta
                                    }
                                >
                                    Cantidad
                                </Text>


                                <View
                                    style={
                                        styles.controlesCantidad
                                    }
                                >

                                    <Pressable
                                        style={
                                            styles.botonCantidad
                                        }

                                        onPress={() =>
                                            setCantidadConfigurando(
                                                (
                                                    cantidad
                                                ) =>
                                                    Math.max(
                                                        1,
                                                        cantidad -
                                                            1
                                                    )
                                            )
                                        }
                                    >
                                        <Text
                                            style={
                                                styles.botonCantidadTexto
                                            }
                                        >
                                            −
                                        </Text>
                                    </Pressable>


                                    <Text
                                        style={
                                            styles.cantidad
                                        }
                                    >
                                        {
                                            cantidadConfigurando
                                        }
                                    </Text>


                                    <Pressable
                                        style={
                                            styles.botonCantidad
                                        }

                                        onPress={() =>
                                            setCantidadConfigurando(
                                                (
                                                    cantidad
                                                ) =>
                                                    cantidad +
                                                    1
                                            )
                                        }
                                    >
                                        <Text
                                            style={
                                                styles.botonCantidadTexto
                                            }
                                        >
                                            +
                                        </Text>
                                    </Pressable>

                                </View>


                                <Text
                                    style={
                                        styles.modalEtiqueta
                                    }
                                >
                                    Modificadores
                                </Text>


                                {cargandoModificadores ? (

                                    <ActivityIndicator />

                                ) : modificadoresDisponibles.length ===
                                  0 ? (

                                    <Text
                                        style={
                                            styles.sinModificadores
                                        }
                                    >
                                        Este producto no tiene modificadores.
                                    </Text>

                                ) : (

                                    <View
                                        style={
                                            styles.modificadores
                                        }
                                    >

                                        {modificadoresDisponibles.map(
                                            (
                                                modificador
                                            ) => {

                                                const seleccionado =
                                                    modificadoresSeleccionados.includes(
                                                        modificador.id
                                                    );


                                                return (

                                                    <Pressable
                                                        key={
                                                            modificador.id
                                                        }

                                                        style={[
                                                            styles.modificadorBoton,

                                                            seleccionado &&
                                                            styles.modificadorSeleccionado
                                                        ]}

                                                        onPress={() =>
                                                            alternarModificador(
                                                                modificador.id
                                                            )
                                                        }
                                                    >

                                                        <Text
                                                            style={[
                                                                styles.modificadorTexto,

                                                                seleccionado &&
                                                                styles.modificadorTextoSeleccionado
                                                            ]}
                                                        >
                                                            {
                                                                modificador.nombre
                                                            }
                                                        </Text>

                                                    </Pressable>
                                                );
                                            }
                                        )}

                                    </View>
                                )}


                                <Pressable
                                    style={
                                        styles.botonAgregar
                                    }

                                    onPress={
                                        agregarLinea
                                    }
                                >
                                    <Text
                                        style={
                                            styles.botonAgregarTexto
                                        }
                                    >
                                        Agregar al pedido
                                    </Text>
                                </Pressable>


                                <Pressable
                                    style={
                                        styles.botonCancelar
                                    }

                                    onPress={() =>
                                        setProductoConfigurando(
                                            null
                                        )
                                    }
                                >
                                    <Text
                                        style={
                                            styles.botonCancelarTexto
                                        }
                                    >
                                        Cancelar
                                    </Text>
                                </Pressable>

                            </>

                        )}

                    </View>

                </View>

            </Modal>

        </SafeAreaView>
    );
}


const styles = StyleSheet.create({

    container: {
        flex: 1,
        backgroundColor: "#111111"
    },

    contenido: {
        width: "100%",
        maxWidth: 500,
        alignSelf: "center",
        padding: 24,
        paddingBottom: 50
    },

    volver: {
        marginBottom: 20
    },

    volverTexto: {
        color: "#FFFFFF",
        fontWeight: "600",
        fontSize: 16
    },

    titulo: {
        color: "#FFFFFF",
        fontSize: 30,
        fontWeight: "700"
    },

    subtitulo: {
        color: "#AAAAAA",
        marginTop: 5,
        marginBottom: 22
    },

    cargando: {
        marginTop: 50
    },

    lista: {
        gap: 12
    },

    producto: {
        backgroundColor: "#1E1E1E",
        borderRadius: 16,
        padding: 16,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between"
    },

    productoNombre: {
        color: "#FFFFFF",
        fontSize: 16,
        fontWeight: "600"
    },

    productoPrecio: {
        color: "#AAAAAA",
        marginTop: 4
    },

    agregarTexto: {
        color: "#FFFFFF",
        fontWeight: "700"
    },

    seccionTitulo: {
        color: "#FFFFFF",
        fontSize: 20,
        fontWeight: "700",
        marginTop: 28,
        marginBottom: 14
    },

    vacio: {
        backgroundColor: "#1E1E1E",
        borderRadius: 16,
        padding: 20
    },

    vacioTexto: {
        color: "#AAAAAA",
        textAlign: "center"
    },

    linea: {
        backgroundColor: "#1E1E1E",
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center"
    },

    lineaInfo: {
        flex: 1
    },

    lineaNombre: {
        color: "#FFFFFF",
        fontWeight: "700"
    },

    modificadorResumen: {
        color: "#AAAAAA",
        marginTop: 4
    },

    botonEliminar: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: "#3A1D1D",
        justifyContent: "center",
        alignItems: "center"
    },

    botonEliminarTexto: {
        color: "#FF8A8A",
        fontSize: 22,
        fontWeight: "700"
    },

    resumen: {
        backgroundColor: "#1E1E1E",
        borderRadius: 16,
        padding: 20,
        marginTop: 24
    },

    totalEtiqueta: {
        color: "#AAAAAA"
    },

    total: {
        color: "#FFFFFF",
        fontSize: 30,
        fontWeight: "700",
        marginTop: 5
    },

    botonEnviar: {
        backgroundColor: "#FFFFFF",
        borderRadius: 12,
        padding: 16,
        alignItems: "center",
        marginTop: 18
    },

    botonDeshabilitado: {
        opacity: 0.6
    },

    botonEnviarTexto: {
        color: "#111111",
        fontWeight: "700",
        fontSize: 16
    },

    mensaje: {
        color: "#FFFFFF",
        textAlign: "center",
        marginTop: 20
    },

    modalFondo: {
        flex: 1,
        backgroundColor:
            "rgba(0,0,0,0.75)",
        justifyContent: "center",
        padding: 24
    },

    modalCard: {
        width: "100%",
        maxWidth: 450,
        alignSelf: "center",
        backgroundColor: "#1E1E1E",
        borderRadius: 20,
        padding: 24
    },

    modalTitulo: {
        color: "#FFFFFF",
        fontSize: 24,
        fontWeight: "700"
    },

    modalPrecio: {
        color: "#AAAAAA",
        marginTop: 5
    },

    modalEtiqueta: {
        color: "#FFFFFF",
        fontWeight: "700",
        marginTop: 22,
        marginBottom: 10
    },

    controlesCantidad: {
        flexDirection: "row",
        alignItems: "center",
        gap: 16
    },

    botonCantidad: {
        width: 42,
        height: 42,
        borderRadius: 10,
        backgroundColor: "#333333",
        justifyContent: "center",
        alignItems: "center"
    },

    botonCantidadTexto: {
        color: "#FFFFFF",
        fontSize: 22,
        fontWeight: "700"
    },

    cantidad: {
        color: "#FFFFFF",
        fontSize: 20,
        fontWeight: "700"
    },

    modificadores: {
        gap: 10
    },

    modificadorBoton: {
        backgroundColor: "#2A2A2A",
        borderWidth: 2,
        borderColor: "transparent",
        borderRadius: 12,
        padding: 13
    },

    modificadorSeleccionado: {
        borderColor: "#FFFFFF"
    },

    modificadorTexto: {
        color: "#CCCCCC"
    },

    modificadorTextoSeleccionado: {
        color: "#FFFFFF",
        fontWeight: "700"
    },

    sinModificadores: {
        color: "#888888"
    },

    botonAgregar: {
        backgroundColor: "#FFFFFF",
        borderRadius: 12,
        padding: 15,
        alignItems: "center",
        marginTop: 24
    },

    botonAgregarTexto: {
        color: "#111111",
        fontWeight: "700"
    },

    botonCancelar: {
        padding: 14,
        alignItems: "center",
        marginTop: 8
    },

    botonCancelarTexto: {
        color: "#AAAAAA",
        fontWeight: "600"
    }
});