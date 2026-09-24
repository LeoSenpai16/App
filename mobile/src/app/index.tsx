import {
    ActivityIndicator,
    Pressable,
    SafeAreaView,
    StyleSheet,
    Text,
    TextInput,
    View
} from "react-native";

import { useRouter } from "expo-router";

import { useEffect, useState } from "react";


const API_URL = "http://localhost:3000";


type Usuario = {
    id: number;
    nombre: string;
    rol: "chef" | "mesero";
};


export default function HomeScreen() {
  const router = useRouter();

    const [usuarios, setUsuarios] = useState<Usuario[]>([]);

    const [usuarioSeleccionado, setUsuarioSeleccionado] =
        useState<Usuario | null>(null);

    const [pin, setPin] = useState("");

    const [cargando, setCargando] = useState(true);

    const [iniciandoSesion, setIniciandoSesion] =
        useState(false);

    const [mensaje, setMensaje] = useState("");


    // ==========================================
    // CARGAR USUARIOS
    // ==========================================

    useEffect(() => {

        async function cargarUsuarios() {

            try {

                setCargando(true);

                const respuesta = await fetch(
                    `${API_URL}/api/auth/usuarios`
                );

                if (!respuesta.ok) {
                    throw new Error(
                        "No fue posible cargar los usuarios"
                    );
                }

                const datos: Usuario[] =
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


    // ==========================================
    // LOGIN
    // ==========================================

    async function iniciarSesion() {

        if (!usuarioSeleccionado) {

            setMensaje(
                "Selecciona un usuario."
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


            const respuesta = await fetch(
                `${API_URL}/api/auth/login`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        usuario_id:
                            usuarioSeleccionado.id,

                        pin
                    })
                }
            );


            const datos = await respuesta.json();


            if (!respuesta.ok) {

                setMensaje(
                    datos.mensaje ||
                    "No fue posible iniciar sesión."
                );

                return;
            }

  if (datos.usuario.rol === "chef") {
      router.replace("/chef");
      return;
  }

  if (datos.usuario.rol === "mesero") {
      router.replace("/mesero");
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


    // ==========================================
    // INTERFAZ
    // ==========================================

    return (

        <SafeAreaView style={styles.container}>

            <View style={styles.card}>

                <Text style={styles.titulo}>
                    Los Carboneros
                </Text>

                <Text style={styles.subtitulo}>
                    Sistema de pedidos
                </Text>


                <Text style={styles.etiqueta}>
                    Selecciona tu usuario
                </Text>


                {cargando ? (

                    <ActivityIndicator size="large" />

                ) : (

                    <View style={styles.usuarios}>

                        {usuarios.map((usuario) => {

                            const seleccionado =
                                usuarioSeleccionado?.id
                                === usuario.id;

                            return (

                                <Pressable
                                    key={usuario.id}

                                    onPress={() => {
                                        setUsuarioSeleccionado(
                                            usuario
                                        );

                                        setPin("");

                                        setMensaje("");
                                    }}

                                    style={[
                                        styles.usuarioBoton,

                                        seleccionado &&
                                        styles.usuarioSeleccionado
                                    ]}
                                >

                                    <Text
                                        style={[
                                            styles.usuarioNombre,

                                            seleccionado &&
                                            styles.usuarioNombreSeleccionado
                                        ]}
                                    >
                                        {usuario.nombre}
                                    </Text>

                                    <Text
                                        style={styles.usuarioRol}
                                    >
                                        {usuario.rol}
                                    </Text>

                                </Pressable>
                            );
                        })}

                    </View>
                )}


                {usuarioSeleccionado && (

                    <>

                        <Text style={styles.etiqueta}>
                            PIN
                        </Text>

                        <TextInput
                            value={pin}

                            onChangeText={setPin}

                            placeholder="Ingresa tu PIN"

                            secureTextEntry

                            keyboardType="number-pad"

                            maxLength={8}

                            style={styles.input}
                        />


                        <Pressable
                            style={styles.botonEntrar}

                            onPress={iniciarSesion}

                            disabled={iniciandoSesion}
                        >

                            {iniciandoSesion ? (

                                <ActivityIndicator />

                            ) : (

                                <Text
                                    style={styles.botonEntrarTexto}
                                >
                                    Iniciar sesión
                                </Text>
                            )}

                        </Pressable>

                    </>
                )}


                {mensaje.length > 0 && (

                    <Text style={styles.mensaje}>
                        {mensaje}
                    </Text>

                )}

            </View>

        </SafeAreaView>
    );
}


const styles = StyleSheet.create({

    container: {
        flex: 1,
        backgroundColor: "#111111",
        alignItems: "center",
        justifyContent: "center",
        padding: 24
    },

    card: {
        width: "100%",
        maxWidth: 420,
        backgroundColor: "#1E1E1E",
        padding: 28,
        borderRadius: 20
    },

    titulo: {
        fontSize: 32,
        fontWeight: "700",
        color: "#FFFFFF",
        textAlign: "center"
    },

    subtitulo: {
        fontSize: 16,
        color: "#AAAAAA",
        textAlign: "center",
        marginTop: 6,
        marginBottom: 30
    },

    etiqueta: {
        color: "#FFFFFF",
        fontSize: 15,
        fontWeight: "600",
        marginBottom: 10,
        marginTop: 16
    },

    usuarios: {
        gap: 12
    },

    usuarioBoton: {
        backgroundColor: "#2A2A2A",
        borderRadius: 12,
        padding: 16,
        borderWidth: 2,
        borderColor: "transparent"
    },

    usuarioSeleccionado: {
        borderColor: "#FFFFFF"
    },

    usuarioNombre: {
        color: "#FFFFFF",
        fontSize: 18,
        fontWeight: "600"
    },

    usuarioNombreSeleccionado: {
        fontWeight: "700"
    },

    usuarioRol: {
        color: "#999999",
        marginTop: 3,
        textTransform: "capitalize"
    },

    input: {
        backgroundColor: "#FFFFFF",
        color: "#111111",
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 18
    },

    botonEntrar: {
        backgroundColor: "#FFFFFF",
        borderRadius: 12,
        padding: 16,
        alignItems: "center",
        marginTop: 18
    },

    botonEntrarTexto: {
        color: "#111111",
        fontSize: 16,
        fontWeight: "700"
    },

    mensaje: {
        color: "#FFFFFF",
        textAlign: "center",
        marginTop: 20
    }

});