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
    Ionicons
} from "@expo/vector-icons";

import {
    useAuth
} from "../../context/AuthContext";

import {
    colors
} from "../../theme/colors";


const API_URL =
    "http://localhost:3000";


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

    const router =
        useRouter();


    const params =
        useLocalSearchParams();


    const cuentaId =
        Array.isArray(params.cuentaId)
            ? params.cuentaId[0]
            : params.cuentaId;


    const tipoCuenta =
        Array.isArray(params.tipoCuenta)
            ? params.tipoCuenta[0]
            : params.tipoCuenta;


    const {
        usuario,
        token
    } =
        useAuth();


    const [
        productos,
        setProductos
    ] =
        useState<Producto[]>([]);


    const [
        lineas,
        setLineas
    ] =
        useState<LineaPedido[]>([]);


    const [
        productoConfigurando,
        setProductoConfigurando
    ] =
        useState<Producto | null>(
            null
        );


    const [
        modificadoresDisponibles,
        setModificadoresDisponibles
    ] =
        useState<Modificador[]>([]);


    const [
        modificadoresSeleccionados,
        setModificadoresSeleccionados
    ] =
        useState<number[]>([]);


    const [
        cantidadConfigurando,
        setCantidadConfigurando
    ] =
        useState(1);


    const [
        cargando,
        setCargando
    ] =
        useState(true);


    const [
        cargandoModificadores,
        setCargandoModificadores
    ] =
        useState(false);


    const [
        enviando,
        setEnviando
    ] =
        useState(false);


    const [
        mensaje,
        setMensaje
    ] =
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


            const respuesta =
                await fetch(
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


            setProductos(
                datos
            );


        } catch (error) {

            console.error(
                error
            );


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

            setProductoConfigurando(
                producto
            );


            setCantidadConfigurando(
                1
            );


            setModificadoresSeleccionados(
                []
            );


            setModificadoresDisponibles(
                []
            );


            setCargandoModificadores(
                true
            );


            setMensaje("");


            const respuesta =
                await fetch(
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

                setProductoConfigurando(
                    null
                );


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

            console.error(
                error
            );


            setProductoConfigurando(
                null
            );


            setMensaje(
                "No se pudo conectar con el servidor."
            );


        } finally {

            setCargandoModificadores(
                false
            );
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
                            id !==
                            modificadorId
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
    // AGREGAR PRODUCTO AL PEDIDO
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


        const nuevaLinea:
            LineaPedido = {

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


        cerrarModal();
    }


    function cerrarModal() {

        setProductoConfigurando(
            null
        );

        setModificadoresDisponibles(
            []
        );

        setModificadoresSeleccionados(
            []
        );

        setCantidadConfigurando(
            1
        );
    }


    // =========================================================
    // ELIMINAR PRODUCTO
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

    const total =
        useMemo(() => {

            return lineas.reduce(
                (
                    acumulado,
                    linea
                ) => {

                    const precioProducto =
                        Number(
                            linea.producto
                                .precio
                        );


                    const precioModificadores =
                        linea.modificadores.reduce(
                            (
                                acumuladoMod,
                                modificador
                            ) =>

                                acumuladoMod +
                                Number(
                                    modificador
                                        .precio_extra
                                ),

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

        }, [
            lineas
        ]);


    // =========================================================
    // ENVIAR PEDIDO
    // =========================================================

    async function enviarPedido() {

        if (
            !token ||
            !cuentaId
        ) {
            return;
        }


        if (
            lineas.length ===
            0
        ) {

            setMensaje(
                "Agrega al menos un producto."
            );

            return;
        }


        try {

            setEnviando(
                true
            );


            setMensaje("");


            const respuesta =
                await fetch(
                    `${API_URL}/api/ordenes`,
                    {
                        method:
                            "POST",

                        headers: {

                            "Content-Type":
                                "application/json",

                            Authorization:
                                `Bearer ${token}`
                        },


                        body:
                            JSON.stringify({

                                cuenta_id:
                                    Number(
                                        cuentaId
                                    ),


                                tipo_entrega:
                                    tipoCuenta ===
                                    "PARA_LLEVAR"
                                        ? "PARA_LLEVAR"
                                        : "EN_MESA",


                                items:
                                    lineas.map(
                                        (linea) => ({

                                            producto_id:
                                                linea
                                                    .producto
                                                    .id,

                                            cantidad:
                                                linea
                                                    .cantidad,

                                            modificadores:
                                                linea
                                                    .modificadores
                                                    .map(
                                                        (
                                                            modificador
                                                        ) =>
                                                            modificador
                                                                .id
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
                    id:
                        String(
                            cuentaId
                        )
                }
            });


        } catch (error) {

            console.error(
                error
            );


            setMensaje(
                "No se pudo conectar con el servidor."
            );


        } finally {

            setEnviando(
                false
            );
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

        <SafeAreaView
            style={
                styles.container
            }
        >

            <ScrollView
                contentContainerStyle={
                    styles.contenido
                }

                showsVerticalScrollIndicator={
                    false
                }
            >

                {/* HEADER */}

                <View
                    style={
                        styles.header
                    }
                >

                    <Pressable
                        style={
                            styles.botonHeader
                        }

                        onPress={() =>
                            router.back()
                        }
                    >

                        <Ionicons
                            name="arrow-back"
                            size={23}
                            color={
                                colors.textLight
                            }
                        />

                    </Pressable>


                    <View
                        style={
                            styles.headerCentro
                        }
                    >

                        <Text
                            style={
                                styles.headerTitulo
                            }
                        >
                            Los Carboneros
                        </Text>


                        <Text
                            style={
                                styles.headerSubtitulo
                            }
                        >
                            Nuevo pedido
                        </Text>

                    </View>


                    <View
                        style={
                            styles.headerEspacio
                        }
                    />

                </View>


                {/* TITULO */}

                <View
                    style={
                        styles.tituloArea
                    }
                >

                    <View>

                        <Text
                            style={
                                styles.titulo
                            }
                        >
                            Menú
                        </Text>


                        <Text
                            style={
                                styles.subtitulo
                            }
                        >
                            Selecciona los productos
                        </Text>

                    </View>


                    <View
                        style={
                            styles.iconoTitulo
                        }
                    >

                        <Ionicons
                            name="restaurant-outline"
                            size={27}
                            color={
                                colors.primary
                            }
                        />

                    </View>

                </View>


                {/* PRODUCTOS */}

                {cargando ? (

                    <View
                        style={
                            styles.cargando
                        }
                    >

                        <ActivityIndicator
                            size="large"
                            color={
                                colors.primary
                            }
                        />


                        <Text
                            style={
                                styles.cargandoTexto
                            }
                        >
                            Cargando menú...
                        </Text>

                    </View>

                ) : (

                    <View
                        style={
                            styles.listaProductos
                        }
                    >

                        {productos.map(
                            (
                                producto
                            ) => (

                                <Pressable
                                    key={
                                        producto.id
                                    }

                                    onPress={() =>
                                        seleccionarProducto(
                                            producto
                                        )
                                    }

                                    style={({
                                        pressed
                                    }) => [

                                        styles.productoCard,

                                        pressed &&
                                        styles.presionado
                                    ]}
                                >

                                    <View
                                        style={
                                            styles.productoIcono
                                        }
                                    >

                                        <Ionicons
                                            name="fast-food-outline"
                                            size={22}
                                            color={
                                                colors.primary
                                            }
                                        />

                                    </View>


                                    <View
                                        style={
                                            styles.productoInfo
                                        }
                                    >

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
                                            ${producto.precio}
                                        </Text>

                                    </View>


                                    <View
                                        style={
                                            styles.agregarProducto
                                        }
                                    >

                                        <Ionicons
                                            name="add"
                                            size={21}
                                            color={
                                                colors.primary
                                            }
                                        />

                                    </View>

                                </Pressable>

                            )
                        )}

                    </View>
                )}


                {/* PEDIDO ACTUAL */}

                <View
                    style={
                        styles.seccionHeader
                    }
                >

                    <View>

                        <Text
                            style={
                                styles.seccionTitulo
                            }
                        >
                            Pedido actual
                        </Text>


                        <Text
                            style={
                                styles.seccionSubtitulo
                            }
                        >
                            {
                                lineas.length
                            } producto{
                                lineas.length ===
                                1
                                    ? ""
                                    : "s"
                            }
                        </Text>

                    </View>


                    <View
                        style={
                            styles.contador
                        }
                    >

                        <Text
                            style={
                                styles.contadorTexto
                            }
                        >
                            {
                                lineas.length
                            }
                        </Text>

                    </View>

                </View>


                {lineas.length ===
                0 ? (

                    <View
                        style={
                            styles.vacio
                        }
                    >

                        <Ionicons
                            name="basket-outline"
                            size={35}
                            color={
                                colors.primary
                            }
                        />


                        <Text
                            style={
                                styles.vacioTitulo
                            }
                        >
                            Pedido vacío
                        </Text>


                        <Text
                            style={
                                styles.vacioTexto
                            }
                        >
                            Selecciona productos del menú.
                        </Text>

                    </View>

                ) : (

                    <View
                        style={
                            styles.lineas
                        }
                    >

                        {lineas.map(
                            (
                                linea
                            ) => (

                                <View
                                    key={
                                        linea.idTemporal
                                    }

                                    style={
                                        styles.lineaCard
                                    }
                                >

                                    <View
                                        style={
                                            styles.cantidadBadge
                                        }
                                    >

                                        <Text
                                            style={
                                                styles.cantidadBadgeTexto
                                            }
                                        >
                                            {
                                                linea.cantidad
                                            }×
                                        </Text>

                                    </View>


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
                                                linea.producto
                                                    .nombre
                                            }
                                        </Text>


                                        {linea
                                            .modificadores
                                            .map(
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

                                        <Ionicons
                                            name="trash-outline"
                                            size={19}
                                            color={
                                                colors.danger
                                            }
                                        />

                                    </Pressable>

                                </View>

                            )
                        )}

                    </View>
                )}


                {/* TOTAL */}

                <View
                    style={
                        styles.totalCard
                    }
                >

                    <View>

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


                    <View
                        style={
                            styles.totalIcono
                        }
                    >

                        <Ionicons
                            name="receipt-outline"
                            size={27}
                            color={
                                colors.primary
                            }
                        />

                    </View>

                </View>


                {/* ENVIAR */}

                <Pressable
                    disabled={
                        enviando
                    }

                    onPress={
                        enviarPedido
                    }

                    style={({
                        pressed
                    }) => [

                        styles.botonEnviar,

                        enviando &&
                        styles.botonDeshabilitado,

                        pressed &&
                        styles.presionado
                    ]}
                >

                    {enviando ? (

                        <ActivityIndicator
                            color={
                                colors.textLight
                            }
                        />

                    ) : (

                        <>

                            <Ionicons
                                name="flame-outline"
                                size={23}
                                color={
                                    colors.textLight
                                }
                            />


                            <Text
                                style={
                                    styles.botonEnviarTexto
                                }
                            >
                                Enviar a cocina
                            </Text>

                        </>

                    )}

                </Pressable>


                {/* MENSAJE */}

                {mensaje.length >
                    0 && (

                    <View
                        style={
                            styles.mensajeCard
                        }
                    >

                        <Ionicons
                            name="information-circle-outline"
                            size={20}
                            color={
                                colors.primary
                            }
                        />


                        <Text
                            style={
                                styles.mensaje
                            }
                        >
                            {mensaje}
                        </Text>

                    </View>

                )}


                {/* FOOTER */}

                <View
                    style={
                        styles.footer
                    }
                >

                    <View
                        style={
                            styles.footerLinea
                        }
                    />


                    <Text
                        style={
                            styles.footerTexto
                        }
                    >
                        🔥 Los Carboneros
                    </Text>


                    <View
                        style={
                            styles.footerLinea
                        }
                    />

                </View>

            </ScrollView>


            {/* MODAL PRODUCTO */}

            <Modal
                visible={
                    productoConfigurando !==
                    null
                }

                transparent

                animationType="fade"

                onRequestClose={
                    cerrarModal
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

                                <View
                                    style={
                                        styles.modalHeader
                                    }
                                >

                                    <View>

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

                                    </View>


                                    <Pressable
                                        style={
                                            styles.modalCerrar
                                        }

                                        onPress={
                                            cerrarModal
                                        }
                                    >

                                        <Ionicons
                                            name="close"
                                            size={22}
                                            color={
                                                colors.text
                                            }
                                        />

                                    </Pressable>

                                </View>


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

                                        <Ionicons
                                            name="remove"
                                            size={23}
                                            color={
                                                colors.text
                                            }
                                        />

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

                                        <Ionicons
                                            name="add"
                                            size={23}
                                            color={
                                                colors.text
                                            }
                                        />

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

                                    <ActivityIndicator
                                        color={
                                            colors.primary
                                        }
                                    />

                                ) : modificadoresDisponibles
                                    .length ===
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

                                                        onPress={() =>
                                                            alternarModificador(
                                                                modificador.id
                                                            )
                                                        }

                                                        style={[
                                                            styles.modificadorBoton,

                                                            seleccionado &&
                                                            styles.modificadorSeleccionado
                                                        ]}
                                                    >

                                                        <Ionicons
                                                            name={
                                                                seleccionado
                                                                    ? "checkmark-circle"
                                                                    : "ellipse-outline"
                                                            }

                                                            size={21}

                                                            color={
                                                                seleccionado
                                                                    ? colors.primary
                                                                    : colors.textSecondary
                                                            }
                                                        />


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

                                    <Ionicons
                                        name="add-circle-outline"
                                        size={22}
                                        color={
                                            colors.textLight
                                        }
                                    />


                                    <Text
                                        style={
                                            styles.botonAgregarTexto
                                        }
                                    >
                                        Agregar al pedido
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


// =============================================================
// ESTILOS
// =============================================================

const styles =
    StyleSheet.create({

        container: {
            flex: 1,
            backgroundColor:
                colors.background
        },


        contenido: {
            width: "100%",
            maxWidth: 520,
            alignSelf: "center",
            paddingHorizontal: 20,
            paddingBottom: 45
        },


        header: {
            backgroundColor:
                colors.primary,

            marginHorizontal:
                -20,

            paddingHorizontal: 20,
            paddingTop: 18,
            paddingBottom: 18,

            borderBottomWidth: 4,

            borderBottomColor:
                colors.accent,

            flexDirection: "row",

            alignItems: "center"
        },


        botonHeader: {
            width: 42,
            height: 42,

            borderRadius: 14,

            backgroundColor:
                "rgba(255,255,255,0.16)",

            alignItems: "center",
            justifyContent: "center"
        },


        headerCentro: {
            flex: 1,
            alignItems: "center"
        },


        headerTitulo: {
            color:
                colors.textLight,

            fontSize: 18,
            fontWeight: "800"
        },


        headerSubtitulo: {
            color: "#FFE5E5",

            fontSize: 12,
            marginTop: 2
        },


        headerEspacio: {
            width: 42
        },


        tituloArea: {
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",

            marginTop: 26,
            marginBottom: 20
        },


        titulo: {
            color:
                colors.text,

            fontSize: 34,
            fontWeight: "800"
        },


        subtitulo: {
            color:
                colors.textSecondary,

            marginTop: 4
        },


        iconoTitulo: {
            width: 52,
            height: 52,

            borderRadius: 18,

            backgroundColor:
                colors.primarySoft,

            alignItems: "center",
            justifyContent: "center"
        },


        listaProductos: {
            gap: 11
        },


        productoCard: {
            minHeight: 72,

            backgroundColor:
                colors.surface,

            borderRadius: 18,

            borderWidth: 1,
            borderColor:
                colors.border,

            paddingHorizontal: 15,
            paddingVertical: 12,

            flexDirection: "row",

            alignItems: "center"
        },


        productoIcono: {
            width: 43,
            height: 43,

            borderRadius: 14,

            backgroundColor:
                colors.primarySoft,

            alignItems: "center",
            justifyContent: "center",

            marginRight: 12
        },


        productoInfo: {
            flex: 1
        },


        productoNombre: {
            color:
                colors.text,

            fontSize: 15,
            fontWeight: "700"
        },


        productoPrecio: {
            color:
                colors.textSecondary,

            marginTop: 4,

            fontWeight: "600"
        },


        agregarProducto: {
            width: 36,
            height: 36,

            borderRadius: 12,

            backgroundColor:
                colors.primarySoft,

            alignItems: "center",
            justifyContent: "center"
        },


        seccionHeader: {
            flexDirection: "row",

            justifyContent:
                "space-between",

            alignItems: "center",

            marginTop: 30,
            marginBottom: 14
        },


        seccionTitulo: {
            color:
                colors.text,

            fontSize: 22,
            fontWeight: "800"
        },


        seccionSubtitulo: {
            color:
                colors.textSecondary,

            marginTop: 3,
            fontSize: 13
        },


        contador: {
            width: 34,
            height: 34,

            borderRadius: 17,

            backgroundColor:
                colors.primarySoft,

            alignItems: "center",
            justifyContent: "center"
        },


        contadorTexto: {
            color:
                colors.primary,

            fontWeight: "800"
        },


        vacio: {
            backgroundColor:
                colors.surface,

            borderRadius: 20,

            borderWidth: 1,
            borderColor:
                colors.border,

            padding: 25,

            alignItems: "center"
        },


        vacioTitulo: {
            color:
                colors.text,

            fontWeight: "800",

            marginTop: 10
        },


        vacioTexto: {
            color:
                colors.textSecondary,

            marginTop: 4,

            textAlign: "center"
        },


        lineas: {
            gap: 10
        },


        lineaCard: {
            backgroundColor:
                colors.surface,

            borderRadius: 18,

            borderWidth: 1,
            borderColor:
                colors.border,

            padding: 14,

            flexDirection: "row",

            alignItems: "flex-start"
        },


        cantidadBadge: {
            minWidth: 38,
            height: 34,

            borderRadius: 10,

            backgroundColor:
                colors.surfaceSecondary,

            alignItems: "center",
            justifyContent: "center",

            marginRight: 10
        },


        cantidadBadgeTexto: {
            color:
                colors.primary,

            fontWeight: "800"
        },


        lineaInfo: {
            flex: 1
        },


        lineaNombre: {
            color:
                colors.text,

            fontWeight: "800"
        },


        modificadorResumen: {
            color:
                colors.textSecondary,

            marginTop: 4,

            fontSize: 13
        },


        botonEliminar: {
            width: 36,
            height: 36,

            borderRadius: 11,

            backgroundColor:
                colors.dangerBackground,

            alignItems: "center",
            justifyContent: "center"
        },


        totalCard: {
            backgroundColor:
                colors.surface,

            borderRadius: 20,

            borderWidth: 1,
            borderColor:
                colors.border,

            padding: 19,

            marginTop: 22,

            flexDirection: "row",

            justifyContent:
                "space-between",

            alignItems: "center"
        },


        totalEtiqueta: {
            color:
                colors.textSecondary
        },


        total: {
            color:
                colors.text,

            fontSize: 30,

            fontWeight: "800",

            marginTop: 2
        },


        totalIcono: {
            width: 52,
            height: 52,

            borderRadius: 17,

            backgroundColor:
                colors.primarySoft,

            alignItems: "center",
            justifyContent: "center"
        },


        botonEnviar: {
            minHeight: 58,

            backgroundColor:
                colors.primary,

            borderRadius: 17,

            borderWidth: 2,

            borderColor:
                colors.accent,

            marginTop: 18,

            flexDirection: "row",

            alignItems: "center",
            justifyContent: "center",

            gap: 9
        },


        botonEnviarTexto: {
            color:
                colors.textLight,

            fontSize: 17,

            fontWeight: "800"
        },


        botonDeshabilitado: {
            opacity: 0.6
        },


        mensajeCard: {
            backgroundColor:
                colors.surface,

            borderRadius: 15,

            borderWidth: 1,

            borderColor:
                colors.border,

            padding: 13,

            marginTop: 16,

            flexDirection: "row",

            alignItems: "center",

            gap: 8
        },


        mensaje: {
            flex: 1,

            color:
                colors.textSecondary
        },


        cargando: {
            paddingVertical: 60,
            alignItems: "center"
        },


        cargandoTexto: {
            color:
                colors.textSecondary,

            marginTop: 10
        },


        footer: {
            flexDirection: "row",

            alignItems: "center",

            gap: 12,

            marginTop: 32
        },


        footerLinea: {
            flex: 1,

            height: 2,

            backgroundColor:
                colors.accent
        },


        footerTexto: {
            color:
                colors.accentDark,

            fontWeight: "700",

            fontSize: 13
        },


        presionado: {
            opacity: 0.72
        },


        // =====================================================
        // MODAL
        // =====================================================

        modalFondo: {
            flex: 1,

            backgroundColor:
                "rgba(0,0,0,0.68)",

            justifyContent: "center",

            padding: 22
        },


        modalCard: {
            width: "100%",
            maxWidth: 440,

            alignSelf: "center",

            backgroundColor:
                colors.background,

            borderRadius: 24,

            padding: 22
        },


        modalHeader: {
            flexDirection: "row",

            alignItems: "center",

            justifyContent:
                "space-between"
        },


        modalTitulo: {
            color:
                colors.text,

            fontSize: 24,

            fontWeight: "800",

            maxWidth: 280
        },


        modalPrecio: {
            color:
                colors.primary,

            fontSize: 17,

            fontWeight: "700",

            marginTop: 4
        },


        modalCerrar: {
            width: 40,
            height: 40,

            borderRadius: 13,

            backgroundColor:
                colors.surfaceSecondary,

            alignItems: "center",
            justifyContent: "center"
        },


        modalEtiqueta: {
            color:
                colors.text,

            fontSize: 15,

            fontWeight: "800",

            marginTop: 23,

            marginBottom: 11
        },


        controlesCantidad: {
            flexDirection: "row",

            alignItems: "center",

            justifyContent:
                "center",

            gap: 25
        },


        botonCantidad: {
            width: 45,
            height: 45,

            borderRadius: 14,

            backgroundColor:
                colors.surface,

            borderWidth: 1,

            borderColor:
                colors.border,

            alignItems: "center",
            justifyContent: "center"
        },


        cantidad: {
            color:
                colors.text,

            fontSize: 24,

            fontWeight: "800",

            minWidth: 40,

            textAlign: "center"
        },


        modificadores: {
            gap: 9
        },


        modificadorBoton: {
            minHeight: 48,

            backgroundColor:
                colors.surface,

            borderRadius: 14,

            borderWidth: 1.5,

            borderColor:
                colors.border,

            paddingHorizontal: 13,

            flexDirection: "row",

            alignItems: "center",

            gap: 9
        },


        modificadorSeleccionado: {
            borderColor:
                colors.primary,

            backgroundColor:
                colors.primarySoft
        },


        modificadorTexto: {
            color:
                colors.textSecondary,

            fontWeight: "600"
        },


        modificadorTextoSeleccionado: {
            color:
                colors.primary,

            fontWeight: "800"
        },


        sinModificadores: {
            color:
                colors.textSecondary
        },


        botonAgregar: {
            minHeight: 56,

            backgroundColor:
                colors.primary,

            borderRadius: 16,

            borderWidth: 2,

            borderColor:
                colors.accent,

            flexDirection: "row",

            alignItems: "center",
            justifyContent: "center",

            gap: 8,

            marginTop: 25
        },


        botonAgregarTexto: {
            color:
                colors.textLight,

            fontWeight: "800",

            fontSize: 16
        }

    });