import {
    useEffect,
    useState
} from "react";

import {
    ActivityIndicator,
    Pressable,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    View
} from "react-native";

import {
    useRouter
} from "expo-router";

import {
    Ionicons
} from "@expo/vector-icons";

import {
    useAuth
} from "../context/AuthContext";

import {
    colors
} from "../theme/colors";


const API_URL =
    "http://localhost:3000";


type Mesa = {
    id: number;
    numero: number;

    estado:
        | "LIBRE"
        | "OCUPADA"
        | "PENDIENTE_PAGO";
};


type CuentaAbierta = {
    id: number;

    tipo:
        | "MESA"
        | "PARA_LLEVAR";

    estado: string;

    mesa_id:
        number | null;

    mesa:
        number | null;

    mesero_id:
        number;
};


export default function MeseroScreen() {

    const router =
        useRouter();


    const {
        usuario,
        token,
        cerrarSesion
    } = useAuth();


    const [mesas, setMesas] =
        useState<Mesa[]>([]);

    const [cuentas, setCuentas] =
        useState<CuentaAbierta[]>([]);

    const [cargando, setCargando] =
        useState(true);

    const [mensaje, setMensaje] =
        useState("");

    const [
        mesaAbriendo,
        setMesaAbriendo
    ] = useState<number | null>(
        null
    );


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
    // CARGAR DATOS
    // =========================================================

    useEffect(() => {

        if (
            !token ||
            usuario?.rol !== "mesero"
        ) {
            return;
        }

        cargarTodo();

    }, [
        token,
        usuario
    ]);


    async function cargarTodo() {

        setCargando(true);

        await Promise.all([
            cargarMesas(),
            cargarCuentas()
        ]);

        setCargando(false);
    }


    // =========================================================
    // MESAS
    // =========================================================

    async function cargarMesas() {

        if (!token) {
            return;
        }

        try {

            const respuesta =
                await fetch(
                    `${API_URL}/api/mesas`,
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
                    "No fue posible obtener las mesas."
                );

                return;
            }


            setMesas(datos);


        } catch (error) {

            console.error(error);

            setMensaje(
                "No se pudo conectar con el servidor."
            );
        }
    }


    // =========================================================
    // CUENTAS ABIERTAS
    // =========================================================

    async function cargarCuentas() {

        if (!token) {
            return;
        }

        try {

            const respuesta =
                await fetch(
                    `${API_URL}/api/cuentas/abiertas`,
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
                return;
            }


            setCuentas(datos);


        } catch (error) {

            console.error(error);
        }
    }


    // =========================================================
    // ABRIR MESA
    // =========================================================

    async function abrirMesa(
        mesa: Mesa
    ) {

        if (!token) {
            return;
        }

        if (
            mesa.estado !== "LIBRE"
        ) {
            return;
        }


        try {

            setMesaAbriendo(
                mesa.id
            );

            setMensaje("");


            const respuesta =
                await fetch(
                    `${API_URL}/api/cuentas/mesa`,
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
                                mesa_id:
                                    mesa.id
                            })
                    }
                );


            const datos =
                await respuesta.json();


            if (!respuesta.ok) {

                setMensaje(
                    datos.mensaje ||
                    "No fue posible abrir la mesa."
                );

                return;
            }


            setMensaje(
                `Mesa ${mesa.numero} abierta correctamente`
            );


            await cargarTodo();


        } catch (error) {

            console.error(error);

            setMensaje(
                "No se pudo conectar con el servidor."
            );


        } finally {

            setMesaAbriendo(
                null
            );
        }
    }


    // =========================================================
    // SELECCIONAR MESA
    // =========================================================

    async function seleccionarMesa(
        mesa: Mesa
    ) {

        if (
            mesa.estado === "LIBRE"
        ) {

            await abrirMesa(
                mesa
            );

            return;
        }


        const cuenta =
            cuentas.find(
                (cuenta) =>
                    cuenta.tipo === "MESA" &&
                    cuenta.mesa_id === mesa.id
            );


        if (!cuenta) {

            setMensaje(
                `No se encontró una cuenta activa para la Mesa ${mesa.numero}`
            );

            return;
        }


        router.push({
            pathname:
                "/cuenta/[id]",

            params: {
                id:
                    String(
                        cuenta.id
                    )
            }
        });
    }


    // =========================================================
    // CERRAR SESIÓN
    // =========================================================

    function salir() {

        cerrarSesion();

        router.replace("/");
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

                {/* =====================================
                    HEADER
                ====================================== */}

                <View
                    style={
                        styles.header
                    }
                >

                    <View>

                        <Text
                            style={
                                styles.appNombre
                            }
                        >
                            Los Carboneros
                        </Text>

                        <Text
                            style={
                                styles.saludo
                            }
                        >
                            Hola, {usuario.nombre}
                        </Text>

                    </View>


                    <Pressable
                        style={
                            styles.botonSalir
                        }

                        onPress={
                            salir
                        }
                    >

                        <Ionicons
                            name="log-out-outline"
                            size={21}
                            color={
                                colors.textLight
                            }
                        />

                    </Pressable>

                </View>


                {/* =====================================
                    TITULO
                ====================================== */}

                <View
                    style={
                        styles.tituloContenedor
                    }
                >

                    <View>

                        <Text
                            style={
                                styles.titulo
                            }
                        >
                            Mesas
                        </Text>

                        <Text
                            style={
                                styles.subtitulo
                            }
                        >
                            Selecciona una mesa para comenzar
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


                {/* =====================================
                    ACTUALIZAR
                ====================================== */}

                <Pressable
                    style={({
                        pressed
                    }) => [

                        styles.botonActualizar,

                        pressed &&
                        styles.presionado
                    ]}

                    onPress={
                        cargarTodo
                    }
                >

                    <Ionicons
                        name="refresh-outline"
                        size={20}
                        color={
                            colors.primary
                        }
                    />

                    <Text
                        style={
                            styles.botonActualizarTexto
                        }
                    >
                        Actualizar mesas
                    </Text>

                </Pressable>


                {/* =====================================
                    LEYENDA
                ====================================== */}

                <View
                    style={
                        styles.leyenda
                    }
                >

                    <View
                        style={
                            styles.leyendaItem
                        }
                    >

                        <View
                            style={[
                                styles.punto,

                                {
                                    backgroundColor:
                                        colors.success
                                }
                            ]}
                        />

                        <Text
                            style={
                                styles.leyendaTexto
                            }
                        >
                            Libre
                        </Text>

                    </View>


                    <View
                        style={
                            styles.leyendaItem
                        }
                    >

                        <View
                            style={[
                                styles.punto,

                                {
                                    backgroundColor:
                                        colors.primary
                                }
                            ]}
                        />

                        <Text
                            style={
                                styles.leyendaTexto
                            }
                        >
                            Ocupada
                        </Text>

                    </View>


                    <View
                        style={
                            styles.leyendaItem
                        }
                    >

                        <View
                            style={[
                                styles.punto,

                                {
                                    backgroundColor:
                                        colors.warning
                                }
                            ]}
                        />

                        <Text
                            style={
                                styles.leyendaTexto
                            }
                        >
                            Por cobrar
                        </Text>

                    </View>

                </View>


                {/* =====================================
                    MESAS
                ====================================== */}

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
                            Cargando mesas...
                        </Text>

                    </View>

                ) : (

                    <View
                        style={
                            styles.gridMesas
                        }
                    >

                        {mesas.map(
                            (mesa) => {

                                const abriendo =
                                    mesaAbriendo ===
                                    mesa.id;


                                return (

                                    <Pressable
                                        key={
                                            mesa.id
                                        }

                                        disabled={
                                            abriendo
                                        }

                                        onPress={() =>
                                            seleccionarMesa(
                                                mesa
                                            )
                                        }

                                        style={({
                                            pressed
                                        }) => [

                                            styles.mesaCard,

                                            mesa.estado ===
                                                "LIBRE" &&
                                            styles.mesaLibre,

                                            mesa.estado ===
                                                "OCUPADA" &&
                                            styles.mesaOcupada,

                                            mesa.estado ===
                                                "PENDIENTE_PAGO" &&
                                            styles.mesaPendiente,

                                            pressed &&
                                            styles.presionado
                                        ]}
                                    >

                                        {abriendo ? (

                                            <ActivityIndicator
                                                color={
                                                    colors.primary
                                                }
                                            />

                                        ) : (

                                            <>

                                                <View
                                                    style={
                                                        styles.numeroContenedor
                                                    }
                                                >

                                                    <Text
                                                        style={
                                                            styles.numeroEtiqueta
                                                        }
                                                    >
                                                        MESA
                                                    </Text>

                                                    <Text
                                                        style={
                                                            styles.numeroMesa
                                                        }
                                                    >
                                                        {
                                                            mesa.numero
                                                        }
                                                    </Text>

                                                </View>


                                                <View
                                                    style={[
                                                        styles.estadoBadge,

                                                        mesa.estado ===
                                                            "LIBRE"
                                                            ? styles.badgeLibre

                                                            : mesa.estado ===
                                                            "OCUPADA"
                                                            ? styles.badgeOcupada

                                                            : styles.badgePendiente
                                                    ]}
                                                >

                                                    <Text
                                                        style={[
                                                            styles.estadoTexto,

                                                            mesa.estado ===
                                                                "LIBRE"
                                                                ? styles.textoLibre

                                                                : mesa.estado ===
                                                                "OCUPADA"
                                                                ? styles.textoOcupada

                                                                : styles.textoPendiente
                                                        ]}
                                                    >
                                                        {
                                                            mesa.estado ===
                                                            "PENDIENTE_PAGO"
                                                                ? "POR COBRAR"

                                                                : mesa.estado
                                                        }
                                                    </Text>

                                                </View>


                                                <Ionicons
                                                    name={
                                                        mesa.estado ===
                                                        "LIBRE"
                                                            ? "add-circle-outline"

                                                            : "chevron-forward-outline"
                                                    }

                                                    size={24}

                                                    color={
                                                        mesa.estado ===
                                                        "LIBRE"
                                                            ? colors.success

                                                            : colors.primary
                                                    }
                                                />

                                            </>

                                        )}

                                    </Pressable>
                                );
                            }
                        )}

                    </View>
                )}


                {/* =====================================
                    MENSAJE
                ====================================== */}

                {mensaje.length > 0 && (

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


                {/* =====================================
                    FOOTER
                ====================================== */}

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
            width:
                "100%",

            maxWidth:
                520,

            alignSelf:
                "center",

            paddingHorizontal:
                20,

            paddingBottom:
                40
        },


        // =====================================================
        // HEADER
        // =====================================================

        header: {
            backgroundColor:
                colors.primary,

            marginHorizontal:
                -20,

            paddingHorizontal:
                20,

            paddingTop:
                20,

            paddingBottom:
                20,

            borderBottomWidth:
                4,

            borderBottomColor:
                colors.accent,

            flexDirection:
                "row",

            alignItems:
                "center",

            justifyContent:
                "space-between"
        },


        appNombre: {
            color:
                colors.textLight,

            fontSize:
                21,

            fontWeight:
                "800"
        },


        saludo: {
            color:
                "#FFE8E8",

            marginTop:
                4,

            fontSize:
                14
        },


        botonSalir: {
            width:
                43,

            height:
                43,

            borderRadius:
                14,

            backgroundColor:
                "rgba(255,255,255,0.16)",

            alignItems:
                "center",

            justifyContent:
                "center"
        },


        // =====================================================
        // TITULO
        // =====================================================

        tituloContenedor: {
            flexDirection:
                "row",

            alignItems:
                "center",

            justifyContent:
                "space-between",

            marginTop:
                26,

            marginBottom:
                20
        },


        titulo: {
            color:
                colors.text,

            fontSize:
                34,

            fontWeight:
                "800"
        },


        subtitulo: {
            color:
                colors.textSecondary,

            marginTop:
                4,

            fontSize:
                14
        },


        iconoTitulo: {
            width:
                52,

            height:
                52,

            borderRadius:
                18,

            backgroundColor:
                colors.primarySoft,

            alignItems:
                "center",

            justifyContent:
                "center"
        },


        // =====================================================
        // ACTUALIZAR
        // =====================================================

        botonActualizar: {
            minHeight:
                50,

            borderWidth:
                1.5,

            borderColor:
                colors.primary,

            borderRadius:
                15,

            flexDirection:
                "row",

            alignItems:
                "center",

            justifyContent:
                "center",

            gap:
                8,

            backgroundColor:
                colors.surface
        },


        botonActualizarTexto: {
            color:
                colors.primary,

            fontWeight:
                "700"
        },


        presionado: {
            opacity:
                0.72
        },


        // =====================================================
        // LEYENDA
        // =====================================================

        leyenda: {
            flexDirection:
                "row",

            flexWrap:
                "wrap",

            gap:
                14,

            marginTop:
                18,

            marginBottom:
                18
        },


        leyendaItem: {
            flexDirection:
                "row",

            alignItems:
                "center",

            gap:
                6
        },


        punto: {
            width:
                9,

            height:
                9,

            borderRadius:
                10
        },


        leyendaTexto: {
            color:
                colors.textSecondary,

            fontSize:
                13
        },


        // =====================================================
        // MESAS
        // =====================================================

        gridMesas: {
            gap:
                14
        },


        mesaCard: {
            minHeight:
                92,

            backgroundColor:
                colors.surface,

            borderRadius:
                20,

            borderWidth:
                1.5,

            paddingHorizontal:
                18,

            paddingVertical:
                16,

            flexDirection:
                "row",

            alignItems:
                "center",

            shadowColor:
                colors.shadow,

            shadowOffset: {
                width:
                    0,

                height:
                    3
            },

            shadowOpacity:
                0.06,

            shadowRadius:
                8,

            elevation:
                2
        },


        mesaLibre: {
            borderColor:
                "#CDE8D3"
        },


        mesaOcupada: {
            borderColor:
                "#F0B8B8"
        },


        mesaPendiente: {
            borderColor:
                "#EBD59D"
        },


        numeroContenedor: {
            width:
                78
        },


        numeroEtiqueta: {
            color:
                colors.textSecondary,

            fontSize:
                11,

            fontWeight:
                "700",

            letterSpacing:
                1.2
        },


        numeroMesa: {
            color:
                colors.text,

            fontSize:
                30,

            fontWeight:
                "800",

            marginTop:
                1
        },


        estadoBadge: {
            borderRadius:
                50,

            paddingHorizontal:
                11,

            paddingVertical:
                7,

            marginLeft:
                "auto",

            marginRight:
                12
        },


        badgeLibre: {
            backgroundColor:
                colors.successBackground
        },


        badgeOcupada: {
            backgroundColor:
                colors.dangerBackground
        },


        badgePendiente: {
            backgroundColor:
                colors.warningBackground
        },


        estadoTexto: {
            fontSize:
                12,

            fontWeight:
                "800"
        },


        textoLibre: {
            color:
                colors.success
        },


        textoOcupada: {
            color:
                colors.danger
        },


        textoPendiente: {
            color:
                colors.warning
        },


        // =====================================================
        // CARGANDO
        // =====================================================

        cargando: {
            alignItems:
                "center",

            justifyContent:
                "center",

            paddingVertical:
                60
        },


        cargandoTexto: {
            color:
                colors.textSecondary,

            marginTop:
                12
        },


        // =====================================================
        // MENSAJES
        // =====================================================

        mensajeCard: {
            marginTop:
                20,

            backgroundColor:
                colors.surface,

            borderRadius:
                15,

            borderWidth:
                1,

            borderColor:
                colors.border,

            padding:
                13,

            flexDirection:
                "row",

            alignItems:
                "center",

            gap:
                8
        },


        mensaje: {
            color:
                colors.textSecondary,

            flex:
                1,

            fontSize:
                14
        },


        // =====================================================
        // FOOTER
        // =====================================================

        footer: {
            flexDirection:
                "row",

            alignItems:
                "center",

            gap:
                12,

            marginTop:
                32
        },


        footerLinea: {
            flex:
                1,

            height:
                2,

            backgroundColor:
                colors.accent
        },


        footerTexto: {
            color:
                colors.accentDark,

            fontWeight:
                "700",

            fontSize:
                13
        }

    });