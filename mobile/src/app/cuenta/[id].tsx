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


type Modificador = {
    id: number;
    nombre: string;
    precio_extra: string;
};


type Item = {
    id: number;
    producto_id: number;
    producto: string;
    cantidad: number;
    precio_unitario: string;
    nota_especial:
        string | null;
    modificadores:
        Modificador[];
    subtotal: string;
};


type Orden = {
    id: number;
    estado:
        | "PENDIENTE"
        | "PREPARANDO"
        | "LISTO"
        | "ENTREGADO"
        | "CANCELADO";

    tipo_entrega:
        "EN_MESA"
        | "PARA_LLEVAR";

    fecha_creacion:
        string;

    fecha_listo:
        string | null;

    items:
        Item[];
};


type DetalleCuenta = {
    id: number;

    tipo:
        "MESA"
        | "PARA_LLEVAR";

    estado:
        | "ABIERTA"
        | "PENDIENTE_PAGO"
        | "CERRADA"
        | "CANCELADA";

    mesa:
        number | null;

    nombre_cliente:
        string | null;

    mesero: {
        id: number;
        nombre: string;
    };

    fecha_apertura:
        string;

    fecha_cierre:
        string | null;

    ordenes:
        Orden[];

    total:
        string;
};


export default function CuentaScreen() {

    const router =
        useRouter();


    const {
        id
    } =
        useLocalSearchParams<{
            id: string;
        }>();


    const {
        usuario,
        token
    } =
        useAuth();


    const [
        cuenta,
        setCuenta
    ] =
        useState<DetalleCuenta | null>(
            null
        );


    const [
        cargando,
        setCargando
    ] =
        useState(true);


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

            return;
        }


        cargarCuenta();

    }, [
        usuario,
        token,
        id
    ]);


    // =========================================================
    // CARGAR CUENTA
    // =========================================================

    async function cargarCuenta() {

        if (
            !token ||
            !id
        ) {
            return;
        }


        try {

            setCargando(true);

            setMensaje("");


            const respuesta =
                await fetch(
                    `${API_URL}/api/cuentas/${id}/detalle`,
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
                    "No fue posible obtener la cuenta."
                );

                return;
            }


            setCuenta(
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
    // ESTILO DE ORDEN
    // =========================================================

    function obtenerEstiloOrden(
        estado: Orden["estado"]
    ) {

        switch (estado) {

            case "PENDIENTE":
                return {
                    fondo:
                        colors.warningBackground,

                    texto:
                        colors.warning,

                    icono:
                        "time-outline" as const
                };


            case "PREPARANDO":
                return {
                    fondo:
                        "#FFF0DD",

                    texto:
                        "#C56600",

                    icono:
                        "flame-outline" as const
                };


            case "LISTO":
                return {
                    fondo:
                        colors.successBackground,

                    texto:
                        colors.success,

                    icono:
                        "checkmark-circle-outline" as const
                };


            case "ENTREGADO":
                return {
                    fondo:
                        "#EEF2F6",

                    texto:
                        "#49515A",

                    icono:
                        "checkmark-done-outline" as const
                };


            default:
                return {
                    fondo:
                        colors.dangerBackground,

                    texto:
                        colors.danger,

                    icono:
                        "close-circle-outline" as const
                };
        }
    }


    // =========================================================
    // VALIDAR USUARIO
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

                    <Pressable
                        style={
                            styles.botonVolver
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
                            Detalle de cuenta
                        </Text>

                    </View>


                    <Pressable
                        style={
                            styles.botonActualizarHeader
                        }

                        onPress={
                            cargarCuenta
                        }
                    >

                        <Ionicons
                            name="refresh-outline"
                            size={22}
                            color={
                                colors.textLight
                            }
                        />

                    </Pressable>

                </View>


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
                            Cargando cuenta...
                        </Text>

                    </View>

                ) : cuenta ? (

                    <>

                        {/* =====================================
                            INFORMACIÓN PRINCIPAL
                        ====================================== */}

                        <View
                            style={
                                styles.encabezadoCuenta
                            }
                        >

                            <View>

                                <Text
                                    style={
                                        styles.tipoCuenta
                                    }
                                >
                                    {
                                        cuenta.tipo ===
                                        "MESA"
                                            ? `Mesa ${cuenta.mesa}`
                                            : cuenta.nombre_cliente
                                    }
                                </Text>


                                <Text
                                    style={
                                        styles.mesero
                                    }
                                >
                                    Atendido por {
                                        cuenta.mesero.nombre
                                    }
                                </Text>

                            </View>


                            <View
                                style={[
                                    styles.cuentaEstado,

                                    cuenta.estado ===
                                    "ABIERTA"
                                        ? styles.cuentaAbierta

                                        : cuenta.estado ===
                                        "PENDIENTE_PAGO"
                                        ? styles.cuentaPendiente

                                        : styles.cuentaCerrada
                                ]}
                            >

                                <Text
                                    style={[
                                        styles.cuentaEstadoTexto,

                                        cuenta.estado ===
                                        "ABIERTA"
                                            ? styles.textoCuentaAbierta

                                            : cuenta.estado ===
                                            "PENDIENTE_PAGO"
                                            ? styles.textoCuentaPendiente

                                            : styles.textoCuentaCerrada
                                    ]}
                                >
                                    {
                                        cuenta.estado ===
                                        "PENDIENTE_PAGO"
                                            ? "POR COBRAR"
                                            : cuenta.estado
                                    }
                                </Text>

                            </View>

                        </View>


                        {/* =====================================
                            TOTAL
                        ====================================== */}

                        <View
                            style={
                                styles.totalCard
                            }
                        >

                            <View
                                style={
                                    styles.totalIcono
                                }
                            >

                                <Ionicons
                                    name="receipt-outline"
                                    size={28}
                                    color={
                                        colors.primary
                                    }
                                />

                            </View>


                            <View
                                style={
                                    styles.totalContenido
                                }
                            >

                                <Text
                                    style={
                                        styles.totalEtiqueta
                                    }
                                >
                                    Total actual
                                </Text>


                                <Text
                                    style={
                                        styles.total
                                    }
                                >
                                    ${cuenta.total}
                                </Text>

                            </View>

                        </View>


                        {/* =====================================
                            TITULO PEDIDOS
                        ====================================== */}

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
                                    Pedidos
                                </Text>


                                <Text
                                    style={
                                        styles.seccionSubtitulo
                                    }
                                >
                                    {
                                        cuenta.ordenes.length
                                    } orden{
                                        cuenta.ordenes.length === 1
                                            ? ""
                                            : "es"
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
                                        cuenta.ordenes.length
                                    }
                                </Text>

                            </View>

                        </View>


                        {/* =====================================
                            SIN PEDIDOS
                        ====================================== */}

                        {cuenta.ordenes.length ===
                        0 ? (

                            <View
                                style={
                                    styles.vacio
                                }
                            >

                                <View
                                    style={
                                        styles.vacioIcono
                                    }
                                >

                                    <Ionicons
                                        name="restaurant-outline"
                                        size={35}
                                        color={
                                            colors.primary
                                        }
                                    />

                                </View>


                                <Text
                                    style={
                                        styles.vacioTitulo
                                    }
                                >
                                    Sin pedidos todavía
                                </Text>


                                <Text
                                    style={
                                        styles.vacioTexto
                                    }
                                >
                                    Agrega productos para comenzar la orden.
                                </Text>

                            </View>

                        ) : (

                            <View
                                style={
                                    styles.listaOrdenes
                                }
                            >

                                {cuenta.ordenes.map(
                                    (
                                        orden
                                    ) => {

                                        const estiloEstado =
                                            obtenerEstiloOrden(
                                                orden.estado
                                            );


                                        return (

                                            <View
                                                key={
                                                    orden.id
                                                }

                                                style={
                                                    styles.ordenCard
                                                }
                                            >

                                                {/* HEADER ORDEN */}

                                                <View
                                                    style={
                                                        styles.ordenHeader
                                                    }
                                                >

                                                    <View
                                                        style={
                                                            styles.ordenIdentificador
                                                        }
                                                    >

                                                        <View
                                                            style={
                                                                styles.ordenIcono
                                                            }
                                                        >

                                                            <Ionicons
                                                                name="receipt-outline"
                                                                size={20}
                                                                color={
                                                                    colors.primary
                                                                }
                                                            />

                                                        </View>


                                                        <View>

                                                            <Text
                                                                style={
                                                                    styles.ordenTitulo
                                                                }
                                                            >
                                                                Orden #{orden.id}
                                                            </Text>


                                                            <Text
                                                                style={
                                                                    styles.tipoEntrega
                                                                }
                                                            >
                                                                {
                                                                    orden.tipo_entrega ===
                                                                    "EN_MESA"
                                                                        ? "Consumo en mesa"
                                                                        : "Para llevar"
                                                                }
                                                            </Text>

                                                        </View>

                                                    </View>


                                                    <View
                                                        style={[
                                                            styles.estadoOrden,

                                                            {
                                                                backgroundColor:
                                                                    estiloEstado.fondo
                                                            }
                                                        ]}
                                                    >

                                                        <Ionicons
                                                            name={
                                                                estiloEstado.icono
                                                            }
                                                            size={15}
                                                            color={
                                                                estiloEstado.texto
                                                            }
                                                        />


                                                        <Text
                                                            style={[
                                                                styles.estadoOrdenTexto,

                                                                {
                                                                    color:
                                                                        estiloEstado.texto
                                                                }
                                                            ]}
                                                        >
                                                            {
                                                                orden.estado
                                                            }
                                                        </Text>

                                                    </View>

                                                </View>


                                                {/* ITEMS */}

                                                <View
                                                    style={
                                                        styles.items
                                                    }
                                                >

                                                    {orden.items.map(
                                                        (
                                                            item
                                                        ) => (

                                                            <View
                                                                key={
                                                                    item.id
                                                                }

                                                                style={
                                                                    styles.item
                                                                }
                                                            >

                                                                <View
                                                                    style={
                                                                        styles.itemCantidad
                                                                    }
                                                                >

                                                                    <Text
                                                                        style={
                                                                            styles.itemCantidadTexto
                                                                        }
                                                                    >
                                                                        {
                                                                            item.cantidad
                                                                        }×
                                                                    </Text>

                                                                </View>


                                                                <View
                                                                    style={
                                                                        styles.itemInfo
                                                                    }
                                                                >

                                                                    <Text
                                                                        style={
                                                                            styles.itemNombre
                                                                        }
                                                                    >
                                                                        {
                                                                            item.producto
                                                                        }
                                                                    </Text>


                                                                    {item.modificadores.map(
                                                                        (
                                                                            modificador
                                                                        ) => (

                                                                            <View
                                                                                key={
                                                                                    modificador.id
                                                                                }

                                                                                style={
                                                                                    styles.modificadorFila
                                                                                }
                                                                            >

                                                                                <Ionicons
                                                                                    name="remove-outline"
                                                                                    size={13}
                                                                                    color={
                                                                                        colors.primary
                                                                                    }
                                                                                />


                                                                                <Text
                                                                                    style={
                                                                                        styles.modificador
                                                                                    }
                                                                                >
                                                                                    {
                                                                                        modificador.nombre
                                                                                    }
                                                                                </Text>

                                                                            </View>

                                                                        )
                                                                    )}


                                                                    {item.nota_especial && (

                                                                        <Text
                                                                            style={
                                                                                styles.notaEspecial
                                                                            }
                                                                        >
                                                                            Nota: {
                                                                                item.nota_especial
                                                                            }
                                                                        </Text>

                                                                    )}

                                                                </View>


                                                                <Text
                                                                    style={
                                                                        styles.subtotal
                                                                    }
                                                                >
                                                                    ${item.subtotal}
                                                                </Text>

                                                            </View>

                                                        )
                                                    )}

                                                </View>

                                            </View>
                                        );
                                    }
                                )}

                            </View>
                        )}


                        {/* =====================================
                            AGREGAR PEDIDO
                        ====================================== */}

                        {cuenta.estado ===
                            "ABIERTA" && (

                            <Pressable
                                style={({
                                    pressed
                                }) => [

                                    styles.botonPrincipal,

                                    pressed &&
                                    styles.presionado
                                ]}

                                onPress={() => {

                                    router.push({

                                        pathname:
                                            "/pedido/[cuentaId]",

                                        params: {

                                            cuentaId:
                                                String(
                                                    cuenta.id
                                                ),

                                            tipoCuenta:
                                                cuenta.tipo
                                        }
                                    });
                                }}
                            >

                                <Ionicons
                                    name="add-circle-outline"
                                    size={23}
                                    color={
                                        colors.textLight
                                    }
                                />


                                <Text
                                    style={
                                        styles.botonPrincipalTexto
                                    }
                                >
                                    Agregar pedido
                                </Text>

                            </Pressable>

                        )}


                        {/* =====================================
                            COBRO - POR AHORA VISUAL
                        ====================================== */}

                        {cuenta.total !==
                            "0.00" && (

                            <Pressable
                                style={({
                                    pressed
                                }) => [

                                    styles.botonCobrar,

                                    pressed &&
                                    styles.presionado
                                ]}

                                onPress={() => {

                                    setMensaje(
                                        "El cobro desde la app será nuestro siguiente paso."
                                    );
                                }}
                            >

                                <Ionicons
                                    name="wallet-outline"
                                    size={22}
                                    color={
                                        colors.primary
                                    }
                                />


                                <Text
                                    style={
                                        styles.botonCobrarTexto
                                    }
                                >
                                    Cobrar cuenta
                                </Text>

                            </Pressable>

                        )}


                        {/* =====================================
                            MENSAJE
                        ====================================== */}

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

                    </>

                ) : null}

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
                18,

            paddingBottom:
                18,

            borderBottomWidth:
                4,

            borderBottomColor:
                colors.accent,

            flexDirection:
                "row",

            alignItems:
                "center"
        },


        botonVolver: {
            width:
                42,

            height:
                42,

            borderRadius:
                14,

            alignItems:
                "center",

            justifyContent:
                "center",

            backgroundColor:
                "rgba(255,255,255,0.16)"
        },


        headerCentro: {
            flex: 1,

            alignItems:
                "center"
        },


        headerTitulo: {
            color:
                colors.textLight,

            fontSize:
                18,

            fontWeight:
                "800"
        },


        headerSubtitulo: {
            color:
                "#FFE5E5",

            fontSize:
                12,

            marginTop:
                2
        },


        botonActualizarHeader: {
            width:
                42,

            height:
                42,

            borderRadius:
                14,

            alignItems:
                "center",

            justifyContent:
                "center",

            backgroundColor:
                "rgba(255,255,255,0.16)"
        },


        // =====================================================
        // CUENTA
        // =====================================================

        encabezadoCuenta: {
            flexDirection:
                "row",

            justifyContent:
                "space-between",

            alignItems:
                "center",

            marginTop:
                26,

            marginBottom:
                20
        },


        tipoCuenta: {
            color:
                colors.text,

            fontSize:
                34,

            fontWeight:
                "800"
        },


        mesero: {
            color:
                colors.textSecondary,

            marginTop:
                4
        },


        cuentaEstado: {
            borderRadius:
                30,

            paddingHorizontal:
                12,

            paddingVertical:
                7
        },


        cuentaAbierta: {
            backgroundColor:
                colors.successBackground
        },


        cuentaPendiente: {
            backgroundColor:
                colors.warningBackground
        },


        cuentaCerrada: {
            backgroundColor:
                "#ECECEC"
        },


        cuentaEstadoTexto: {
            fontSize:
                11,

            fontWeight:
                "800"
        },


        textoCuentaAbierta: {
            color:
                colors.success
        },


        textoCuentaPendiente: {
            color:
                colors.warning
        },


        textoCuentaCerrada: {
            color:
                "#555555"
        },


        // =====================================================
        // TOTAL
        // =====================================================

        totalCard: {
            backgroundColor:
                colors.surface,

            borderRadius:
                22,

            borderWidth:
                1,

            borderColor:
                colors.border,

            padding:
                20,

            flexDirection:
                "row",

            alignItems:
                "center",

            shadowColor:
                colors.shadow,

            shadowOffset: {
                width: 0,
                height: 4
            },

            shadowOpacity:
                0.07,

            shadowRadius:
                9,

            elevation:
                3
        },


        totalIcono: {
            width:
                54,

            height:
                54,

            borderRadius:
                18,

            backgroundColor:
                colors.primarySoft,

            alignItems:
                "center",

            justifyContent:
                "center",

            marginRight:
                15
        },


        totalContenido: {
            flex:
                1
        },


        totalEtiqueta: {
            color:
                colors.textSecondary,

            fontSize:
                14
        },


        total: {
            color:
                colors.text,

            fontSize:
                34,

            fontWeight:
                "800",

            marginTop:
                2
        },


        // =====================================================
        // SECCIÓN
        // =====================================================

        seccionHeader: {
            flexDirection:
                "row",

            alignItems:
                "center",

            justifyContent:
                "space-between",

            marginTop:
                30,

            marginBottom:
                14
        },


        seccionTitulo: {
            color:
                colors.text,

            fontSize:
                22,

            fontWeight:
                "800"
        },


        seccionSubtitulo: {
            color:
                colors.textSecondary,

            fontSize:
                13,

            marginTop:
                2
        },


        contador: {
            width:
                34,

            height:
                34,

            borderRadius:
                17,

            backgroundColor:
                colors.primarySoft,

            alignItems:
                "center",

            justifyContent:
                "center"
        },


        contadorTexto: {
            color:
                colors.primary,

            fontWeight:
                "800"
        },


        // =====================================================
        // VACÍO
        // =====================================================

        vacio: {
            backgroundColor:
                colors.surface,

            borderRadius:
                20,

            borderWidth:
                1,

            borderColor:
                colors.border,

            padding:
                28,

            alignItems:
                "center"
        },


        vacioIcono: {
            width:
                66,

            height:
                66,

            borderRadius:
                22,

            backgroundColor:
                colors.primarySoft,

            alignItems:
                "center",

            justifyContent:
                "center",

            marginBottom:
                14
        },


        vacioTitulo: {
            color:
                colors.text,

            fontSize:
                17,

            fontWeight:
                "800"
        },


        vacioTexto: {
            color:
                colors.textSecondary,

            textAlign:
                "center",

            marginTop:
                5
        },


        // =====================================================
        // ORDEN
        // =====================================================

        listaOrdenes: {
            gap:
                14
        },


        ordenCard: {
            backgroundColor:
                colors.surface,

            borderRadius:
                20,

            borderWidth:
                1,

            borderColor:
                colors.border,

            padding:
                17,

            shadowColor:
                colors.shadow,

            shadowOffset: {
                width: 0,
                height: 3
            },

            shadowOpacity:
                0.05,

            shadowRadius:
                7,

            elevation:
                2
        },


        ordenHeader: {
            flexDirection:
                "row",

            alignItems:
                "center",

            justifyContent:
                "space-between",

            borderBottomWidth:
                1,

            borderBottomColor:
                "#F0EBE5",

            paddingBottom:
                13,

            marginBottom:
                7
        },


        ordenIdentificador: {
            flexDirection:
                "row",

            alignItems:
                "center",

            flex:
                1
        },


        ordenIcono: {
            width:
                39,

            height:
                39,

            borderRadius:
                13,

            backgroundColor:
                colors.primarySoft,

            alignItems:
                "center",

            justifyContent:
                "center",

            marginRight:
                10
        },


        ordenTitulo: {
            color:
                colors.text,

            fontSize:
                16,

            fontWeight:
                "800"
        },


        tipoEntrega: {
            color:
                colors.textSecondary,

            fontSize:
                12,

            marginTop:
                2
        },


        estadoOrden: {
            borderRadius:
                20,

            paddingHorizontal:
                9,

            paddingVertical:
                6,

            flexDirection:
                "row",

            alignItems:
                "center",

            gap:
                4
        },


        estadoOrdenTexto: {
            fontSize:
                10,

            fontWeight:
                "800"
        },


        // =====================================================
        // ITEMS
        // =====================================================

        items: {
            gap:
                2
        },


        item: {
            minHeight:
                65,

            flexDirection:
                "row",

            alignItems:
                "flex-start",

            paddingVertical:
                10
        },


        itemCantidad: {
            minWidth:
                38,

            height:
                34,

            borderRadius:
                10,

            backgroundColor:
                colors.surfaceSecondary,

            alignItems:
                "center",

            justifyContent:
                "center",

            marginRight:
                10
        },


        itemCantidadTexto: {
            color:
                colors.primary,

            fontWeight:
                "800"
        },


        itemInfo: {
            flex:
                1,

            paddingRight:
                10
        },


        itemNombre: {
            color:
                colors.text,

            fontSize:
                15,

            fontWeight:
                "700"
        },


        modificadorFila: {
            flexDirection:
                "row",

            alignItems:
                "center",

            marginTop:
                3
        },


        modificador: {
            color:
                colors.textSecondary,

            fontSize:
                13
        },


        notaEspecial: {
            color:
                colors.warning,

            marginTop:
                5,

            fontSize:
                12,

            fontStyle:
                "italic"
        },


        subtotal: {
            color:
                colors.text,

            fontWeight:
                "800",

            fontSize:
                15
        },


        // =====================================================
        // BOTONES
        // =====================================================

        botonPrincipal: {
            minHeight:
                58,

            backgroundColor:
                colors.primary,

            borderRadius:
                17,

            borderWidth:
                2,

            borderColor:
                colors.accent,

            flexDirection:
                "row",

            alignItems:
                "center",

            justifyContent:
                "center",

            gap:
                9,

            marginTop:
                22,

            shadowColor:
                colors.primaryDark,

            shadowOffset: {
                width: 0,
                height: 5
            },

            shadowOpacity:
                0.18,

            shadowRadius:
                9,

            elevation:
                4
        },


        botonPrincipalTexto: {
            color:
                colors.textLight,

            fontSize:
                17,

            fontWeight:
                "800"
        },


        botonCobrar: {
            minHeight:
                56,

            backgroundColor:
                colors.surface,

            borderRadius:
                17,

            borderWidth:
                1.5,

            borderColor:
                colors.primary,

            flexDirection:
                "row",

            alignItems:
                "center",

            justifyContent:
                "center",

            gap:
                8,

            marginTop:
                12
        },


        botonCobrarTexto: {
            color:
                colors.primary,

            fontSize:
                16,

            fontWeight:
                "800"
        },


        presionado: {
            opacity:
                0.72
        },


        // =====================================================
        // MENSAJE
        // =====================================================

        mensajeCard: {
            marginTop:
                16,

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
            flex:
                1,

            color:
                colors.textSecondary,

            fontSize:
                14
        },


        // =====================================================
        // CARGANDO
        // =====================================================

        cargando: {
            paddingVertical:
                80,

            alignItems:
                "center"
        },


        cargandoTexto: {
            color:
                colors.textSecondary,

            marginTop:
                12
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