import {
    ActivityIndicator,
    Image,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View
} from "react-native";

import {
    useEffect,
    useState
} from "react";

import {
    useRouter
} from "expo-router";

import {
    Ionicons
} from "@expo/vector-icons";

import {
    useAuth,
    type Usuario
} from "../context/AuthContext";


const API_URL =
    "http://localhost:3000";


export default function HomeScreen() {

    const router = useRouter();

    const {
        guardarSesion
    } = useAuth();


    // =========================================================
    // ESTADOS
    // =========================================================

    const [usuarios, setUsuarios] =
        useState<Usuario[]>([]);

    const [
        usuarioSeleccionado,
        setUsuarioSeleccionado
    ] = useState<Usuario | null>(
        null
    );

    const [pin, setPin] =
        useState("");

    const [cargando, setCargando] =
        useState(true);

    const [
        iniciandoSesion,
        setIniciandoSesion
    ] = useState(false);

    const [mensaje, setMensaje] =
        useState("");


    // =========================================================
    // CARGAR USUARIOS
    // =========================================================

    useEffect(() => {

        async function cargarUsuarios() {

            try {

                setCargando(true);

                setMensaje("");


                const respuesta =
                    await fetch(
                        `${API_URL}/api/auth/usuarios`
                    );


                if (!respuesta.ok) {

                    throw new Error(
                        "No fue posible cargar los usuarios"
                    );
                }


                const datos:
                    Usuario[] =
                    await respuesta.json();


                setUsuarios(datos);


            } catch (error) {

                console.error(error);

                setMensaje(
                    "No se pudo conectar con el servidor."
                );


            } finally {

                setCargando(false);
            }
        }


        cargarUsuarios();

    }, []);


    // =========================================================
    // SELECCIONAR USUARIO
    // =========================================================

    function seleccionarUsuario(
        usuario: Usuario
    ) {

        setUsuarioSeleccionado(
            usuario
        );

        setPin("");

        setMensaje("");
    }


    // =========================================================
    // LOGIN
    // =========================================================

    async function iniciarSesion() {

        if (!usuarioSeleccionado) {

            setMensaje(
                "Selecciona tu usuario."
            );

            return;
        }


        if (pin.trim().length === 0) {

            setMensaje(
                "Ingresa tu PIN."
            );

            return;
        }


        try {

            setIniciandoSesion(true);

            setMensaje("");


            const respuesta =
                await fetch(
                    `${API_URL}/api/auth/login`,
                    {
                        method:
                            "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body:
                            JSON.stringify({
                                usuario_id:
                                    usuarioSeleccionado.id,

                                pin
                            })
                    }
                );


            const datos =
                await respuesta.json();


            if (!respuesta.ok) {

                setMensaje(
                    datos.mensaje ||
                    "No fue posible iniciar sesión."
                );

                return;
            }


            // Guardamos JWT + usuario
            guardarSesion(
                datos.token,
                datos.usuario
            );


            // Navegación según rol
            if (
                datos.usuario.rol ===
                "chef"
            ) {

                router.replace(
                    "/chef"
                );

                return;
            }


            if (
                datos.usuario.rol ===
                "mesero"
            ) {

                router.replace(
                    "/mesero"
                );

                return;
            }


            setMensaje(
                "El usuario no tiene un rol válido."
            );


        } catch (error) {

            console.error(error);

            setMensaje(
                "No se pudo conectar con el servidor."
            );


        } finally {

            setIniciandoSesion(false);
        }
    }


    // =========================================================
    // INTERFAZ
    // =========================================================

    return (

        <SafeAreaView
            style={styles.safeArea}
        >

            <KeyboardAvoidingView
                style={styles.flex}
                behavior={
                    Platform.OS === "ios"
                        ? "padding"
                        : undefined
                }
            >

                <ScrollView
                    contentContainerStyle={
                        styles.scrollContenido
                    }
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={
                        false
                    }
                >

                    {/* =====================================
                        ENCABEZADO
                    ====================================== */}

                    <View
                        style={
                            styles.encabezado
                        }
                    >

                        <Text
                            style={
                                styles.encabezadoTexto
                            }
                        >
                            Los Carboneros App
                        </Text>

                    </View>


                    {/* =====================================
                        CONTENIDO
                    ====================================== */}

                    <View
                        style={
                            styles.contenido
                        }
                    >

                        <Image
                            source={require("../../assets/images/logocarboneros.png")}
                            resizeMode="contain"
                            style={styles.logo}
                        />


                        {/* Bienvenida */}

                        <Text
                            style={
                                styles.titulo
                            }
                        >
                            Bienvenido
                        </Text>


                        <View
                            style={
                                styles.lineaTitulo
                            }
                        />


                        <Text
                            style={
                                styles.subtitulo
                            }
                        >
                            Sistema de gestión
                            {" "}
                            Los Carboneros
                        </Text>


                        <Text
                            style={
                                styles.frase
                            }
                        >
                            🔥 Control y pedido
                            de ventas 🔥
                        </Text>


                        {/* =====================================
                            SELECCIÓN DE USUARIO
                        ====================================== */}

                        <Text
                            style={
                                styles.etiqueta
                            }
                        >
                            Selecciona tu usuario
                        </Text>


                        {cargando ? (

                            <View
                                style={
                                    styles.cargandoContenedor
                                }
                            >

                                <ActivityIndicator
                                    size="large"
                                    color="#D62828"
                                />

                                <Text
                                    style={
                                        styles.cargandoTexto
                                    }
                                >
                                    Cargando usuarios...
                                </Text>

                            </View>

                        ) : (

                            <View
                                style={
                                    styles.usuarios
                                }
                            >

                                {usuarios.map(
                                    (usuario) => {

                                        const seleccionado =
                                            usuarioSeleccionado
                                                ?.id ===
                                            usuario.id;


                                        return (

                                            <Pressable
                                                key={
                                                    usuario.id
                                                }

                                                onPress={() =>
                                                    seleccionarUsuario(
                                                        usuario
                                                    )
                                                }

                                                style={({
                                                    pressed
                                                }) => [

                                                    styles.usuarioCard,

                                                    seleccionado &&
                                                    styles.usuarioCardSeleccionado,

                                                    pressed &&
                                                    styles.presionado
                                                ]}
                                            >

                                                <View
                                                    style={
                                                        styles.usuarioIcono
                                                    }
                                                >

                                                    <Ionicons
                                                        name="person-outline"
                                                        size={24}
                                                        color={
                                                            seleccionado
                                                                ? "#D62828"
                                                                : "#444444"
                                                        }
                                                    />

                                                </View>


                                                <View
                                                    style={
                                                        styles.usuarioInformacion
                                                    }
                                                >

                                                    <Text
                                                        style={
                                                            styles.usuarioNombre
                                                        }
                                                    >
                                                        {
                                                            usuario.nombre
                                                        }
                                                    </Text>


                                                    <Text
                                                        style={
                                                            styles.usuarioRol
                                                        }
                                                    >
                                                        {
                                                            usuario.rol ===
                                                            "chef"
                                                                ? "Chef"
                                                                : "Mesero"
                                                        }
                                                    </Text>

                                                </View>


                                                {seleccionado && (

                                                    <Ionicons
                                                        name="checkmark-circle"
                                                        size={26}
                                                        color="#D62828"
                                                    />

                                                )}

                                            </Pressable>

                                        );
                                    }
                                )}

                            </View>
                        )}


                        {/* =====================================
                            PIN
                        ====================================== */}

                        {usuarioSeleccionado && (

                            <>

                                <Text
                                    style={
                                        styles.etiquetaPin
                                    }
                                >
                                    PIN
                                </Text>


                                <View
                                    style={
                                        styles.inputContenedor
                                    }
                                >

                                    <Ionicons
                                        name="lock-closed-outline"
                                        size={24}
                                        color="#444444"
                                        style={
                                            styles.inputIcono
                                        }
                                    />


                                    <TextInput
                                        value={
                                            pin
                                        }

                                        onChangeText={
                                            setPin
                                        }

                                        placeholder="Ingresa tu PIN"

                                        placeholderTextColor="#8A8A8A"

                                        secureTextEntry

                                        keyboardType="number-pad"

                                        maxLength={8}

                                        style={
                                            styles.input
                                        }

                                        onSubmitEditing={
                                            iniciarSesion
                                        }
                                    />

                                </View>


                                {/* =====================================
                                    BOTÓN LOGIN
                                ====================================== */}

                                <Pressable
                                    onPress={
                                        iniciarSesion
                                    }

                                    disabled={
                                        iniciandoSesion
                                    }

                                    style={({
                                        pressed
                                    }) => [

                                        styles.botonPrincipal,

                                        iniciandoSesion &&
                                        styles.botonDeshabilitado,

                                        pressed &&
                                        styles.presionado
                                    ]}
                                >

                                    {iniciandoSesion ? (

                                        <ActivityIndicator
                                            color="#FFFFFF"
                                        />

                                    ) : (

                                        <>

                                            <Text
                                                style={
                                                    styles.botonPrincipalTexto
                                                }
                                            >
                                                Iniciar sesión
                                            </Text>


                                            <Ionicons
                                                name="arrow-forward"
                                                size={23}
                                                color="#FFFFFF"
                                            />

                                        </>

                                    )}

                                </Pressable>

                            </>

                        )}


                        {/* =====================================
                            MENSAJES
                        ====================================== */}

                        {mensaje.length > 0 && (

                            <View
                                style={
                                    styles.mensajeContenedor
                                }
                            >

                                <Ionicons
                                    name="alert-circle-outline"
                                    size={20}
                                    color="#D62828"
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
                            DIVISOR
                        ====================================== */}

                        <View
                            style={
                                styles.divisor
                            }
                        >

                            <View
                                style={
                                    styles.divisorLinea
                                }
                            />


                            <Text
                                style={
                                    styles.divisorTexto
                                }
                            >
                                Acceso para personal
                            </Text>


                            <View
                                style={
                                    styles.divisorLinea
                                }
                            />

                        </View>


                        {/* =====================================
                            INFORMACIÓN
                        ====================================== */}

                        <View
                            style={
                                styles.infoCard
                            }
                        >

                            <Ionicons
                                name="information-circle-outline"
                                size={22}
                                color="#D62828"
                            />


                            <Text
                                style={
                                    styles.infoTexto
                                }
                            >
                                Utiliza el usuario
                                asignado por el
                                administrador del
                                restaurante.
                            </Text>

                        </View>


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


                            <View
                                style={
                                    styles.footerCentro
                                }
                            >

                                <Text
                                    style={
                                        styles.footerFuego
                                    }
                                >
                                    🔥
                                </Text>

                                <Text
                                    style={
                                        styles.footerTexto
                                    }
                                >
                                    Los Carboneros
                                </Text>

                            </View>


                            <View
                                style={
                                    styles.footerLinea
                                }
                            />

                        </View>

                    </View>

                </ScrollView>

            </KeyboardAvoidingView>

        </SafeAreaView>
    );
}


// =============================================================
// ESTILOS
// =============================================================

const styles =
    StyleSheet.create({

        flex: {
            flex: 1
        },


        // =====================================================
        // FONDO
        // =====================================================

        safeArea: {
            flex: 1,
            backgroundColor:
                "#B91C1C"
        },


        scrollContenido: {
            flexGrow: 1,
            backgroundColor:
                "#FFF9F0"
        },


        // =====================================================
        // ENCABEZADO
        // =====================================================

        encabezado: {
            backgroundColor:
                "#C81E1E",

            borderBottomWidth:
                4,

            borderBottomColor:
                "#F5B82E",

            paddingTop:
                18,

            paddingBottom:
                18,

            alignItems:
                "center"
        },


        encabezadoTexto: {
            color:
                "#FFFFFF",

            fontSize:
                24,

            fontWeight:
                "700",

            letterSpacing:
                0.3
        },


        // =====================================================
        // CONTENIDO
        // =====================================================

        contenido: {
            width:
                "100%",

            maxWidth:
                500,

            alignSelf:
                "center",

            paddingHorizontal:
                24,

            paddingTop:
                20,

            paddingBottom:
                40
        },


        // =====================================================
        // LOGO
        // =====================================================

        logo: {
          width: 350,
          height: 220,
          alignSelf: "center",
          marginBottom: 0,
        },


        // =====================================================
        // TITULOS
        // =====================================================

        titulo: {
            color:
                "#1A1A1A",

            fontSize:
                46,

            lineHeight:
                52,

            textAlign:
                "center",

            fontWeight:
                "800",

            marginTop:
                2
        },


        lineaTitulo: {
            width:
                54,

            height:
                4,

            borderRadius:
                50,

            backgroundColor:
                "#F5B82E",

            alignSelf:
                "center",

            marginTop:
                10,

            marginBottom:
                12
        },


        subtitulo: {
            color:
                "#626262",

            fontSize:
                18,

            textAlign:
                "center",

            lineHeight:
                25
        },


        frase: {
            color:
                "#D62828",

            fontSize:
                17,

            textAlign:
                "center",

            fontWeight:
                "700",

            marginTop:
                16,

            marginBottom:
                28
        },


        // =====================================================
        // ETIQUETAS
        // =====================================================

        etiqueta: {
            color:
                "#292929",

            fontSize:
                15,

            fontWeight:
                "700",

            marginBottom:
                10
        },


        etiquetaPin: {
            color:
                "#292929",

            fontSize:
                15,

            fontWeight:
                "700",

            marginTop:
                22,

            marginBottom:
                10
        },


        // =====================================================
        // USUARIOS
        // =====================================================

        usuarios: {
            gap:
                12
        },


        usuarioCard: {
            minHeight:
                72,

            backgroundColor:
                "#FFFFFF",

            borderRadius:
                18,

            borderWidth:
                1.5,

            borderColor:
                "#E5DDD3",

            paddingHorizontal:
                16,

            paddingVertical:
                13,

            flexDirection:
                "row",

            alignItems:
                "center",

            shadowColor:
                "#000000",

            shadowOffset: {
                width:
                    0,

                height:
                    3
            },

            shadowOpacity:
                0.05,

            shadowRadius:
                7,

            elevation:
                2
        },


        usuarioCardSeleccionado: {
            borderColor:
                "#D62828",

            backgroundColor:
                "#FFF4F1"
        },


        usuarioIcono: {
            width:
                44,

            height:
                44,

            borderRadius:
                22,

            backgroundColor:
                "#F5F1EC",

            alignItems:
                "center",

            justifyContent:
                "center",

            marginRight:
                13
        },


        usuarioInformacion: {
            flex:
                1
        },


        usuarioNombre: {
            color:
                "#222222",

            fontSize:
                18,

            fontWeight:
                "700"
        },


        usuarioRol: {
            color:
                "#777777",

            fontSize:
                14,

            marginTop:
                3
        },


        // =====================================================
        // INPUT
        // =====================================================

        inputContenedor: {
            minHeight:
                62,

            backgroundColor:
                "#FFFFFF",

            borderWidth:
                1.5,

            borderColor:
                "#DDD5CB",

            borderRadius:
                18,

            flexDirection:
                "row",

            alignItems:
                "center",

            paddingHorizontal:
                16,

            shadowColor:
                "#000000",

            shadowOffset: {
                width:
                    0,

                height:
                    3
            },

            shadowOpacity:
                0.04,

            shadowRadius:
                6,

            elevation:
                1
        },


        inputIcono: {
            marginRight:
                12
        },


        input: {
            flex:
                1,

            color:
                "#222222",

            fontSize:
                19,

            paddingVertical:
                16
        },


        // =====================================================
        // BOTÓN PRINCIPAL
        // =====================================================

        botonPrincipal: {
            minHeight:
                62,

            backgroundColor:
                "#CF2027",

            borderRadius:
                18,

            borderWidth:
                2,

            borderColor:
                "#F5B82E",

            flexDirection:
                "row",

            alignItems:
                "center",

            justifyContent:
                "center",

            gap:
                10,

            marginTop:
                20,

            shadowColor:
                "#A50D14",

            shadowOffset: {
                width:
                    0,

                height:
                    6
            },

            shadowOpacity:
                0.20,

            shadowRadius:
                10,

            elevation:
                5
        },


        botonPrincipalTexto: {
            color:
                "#FFFFFF",

            fontSize:
                19,

            fontWeight:
                "800"
        },


        botonDeshabilitado: {
            opacity:
                0.65
        },


        presionado: {
            opacity:
                0.78
        },


        // =====================================================
        // CARGANDO
        // =====================================================

        cargandoContenedor: {
            minHeight:
                100,

            justifyContent:
                "center",

            alignItems:
                "center"
        },


        cargandoTexto: {
            color:
                "#777777",

            marginTop:
                12
        },


        // =====================================================
        // MENSAJE
        // =====================================================

        mensajeContenedor: {
            backgroundColor:
                "#FFF0EE",

            borderWidth:
                1,

            borderColor:
                "#F0C0BC",

            borderRadius:
                14,

            padding:
                13,

            marginTop:
                16,

            flexDirection:
                "row",

            alignItems:
                "center",

            justifyContent:
                "center",

            gap:
                8
        },


        mensaje: {
            flex:
                1,

            color:
                "#B3261E",

            fontSize:
                14,

            fontWeight:
                "600"
        },


        // =====================================================
        // DIVISOR
        // =====================================================

        divisor: {
            flexDirection:
                "row",

            alignItems:
                "center",

            gap:
                12,

            marginTop:
                30,

            marginBottom:
                18
        },


        divisorLinea: {
            flex:
                1,

            height:
                1,

            backgroundColor:
                "#A9A29A"
        },


        divisorTexto: {
            color:
                "#555555",

            fontSize:
                14,

            fontWeight:
                "600"
        },


        // =====================================================
        // INFO
        // =====================================================

        infoCard: {
            backgroundColor:
                "#FFFFFF",

            borderRadius:
                16,

            borderWidth:
                1,

            borderColor:
                "#E7DED4",

            padding:
                15,

            flexDirection:
                "row",

            alignItems:
                "center",

            gap:
                10
        },


        infoTexto: {
            flex:
                1,

            color:
                "#666666",

            fontSize:
                14,

            lineHeight:
                20
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
                14,

            marginTop:
                30
        },


        footerLinea: {
            flex:
                1,

            height:
                2,

            backgroundColor:
                "#F5B82E"
        },


        footerCentro: {
            alignItems:
                "center"
        },


        footerFuego: {
            fontSize:
                22
        },


        footerTexto: {
            color:
                "#D89A00",

            fontSize:
                14,

            fontWeight:
                "700",

            marginTop:
                2
        }

    });