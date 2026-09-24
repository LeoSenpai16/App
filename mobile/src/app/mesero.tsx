import { useEffect, useState } from "react";

import {
    ActivityIndicator,
    Pressable,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    View
} from "react-native";

import { useRouter } from "expo-router";

import {
    useAuth
} from "../context/AuthContext";


const API_URL = "http://localhost:3000";

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
    tipo: "MESA" | "PARA_LLEVAR";
    estado: string;
    mesa_id: number | null;
    mesa: number | null;
    mesero_id: number;
};


export default function MeseroScreen() {
    const [mesaAbriendo, setMesaAbriendo] =
        useState<number | null>(null);

    const router = useRouter();

    const [cuentas, setCuentas] =
    useState<CuentaAbierta[]>([]);

    const {
        usuario,
        token,
        cerrarSesion
    } = useAuth();


    const [mesas, setMesas] =
        useState<Mesa[]>([]);

    const [cargando, setCargando] =
        useState(true);

    const [mensaje, setMensaje] =
        useState("");


    // ==========================================
    // PROTEGER PANTALLA
    // ==========================================

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


    // ==========================================
    // CARGAR MESAS
    // ==========================================

    useEffect(() => {

        if (
            !token ||
            usuario?.rol !== "mesero"
        ) {
            return;
        }


        cargarMesas();
        cargarCuentas();

    }, [
        token,
        usuario
    ]);


    async function cargarMesas() {

        if (!token) {
            return;
        }

        try {

            setCargando(true);
            setMensaje("");


            const respuesta = await fetch(
                `${API_URL}/api/mesas`,
                {
                    headers: {
                        Authorization:
                            `Bearer ${token}`
                    }
                }
            );


            const datos = await respuesta.json();


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

        } finally {

            setCargando(false);
        }
    }

    //caragar cuentas
    async function cargarCuentas() {

    if (!token) {
        return;
    }

    try {

    const respuesta = await fetch(
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

    // abrir mesa
    async function abrirMesa(mesa: Mesa) {

    if (!token) {
        return;
    }

    if (mesa.estado !== "LIBRE") {
        return;
    }

    try {

        setMesaAbriendo(mesa.id);
        setMensaje("");

        const respuesta = await fetch(
            `${API_URL}/api/cuentas/mesa`,
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json",

                    Authorization:
                        `Bearer ${token}`
                },

                body: JSON.stringify({
                    mesa_id: mesa.id
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

        await cargarMesas();
        await cargarCuentas();

    } catch (error) {

        console.error(error);

        setMensaje(
            "No se pudo conectar con el servidor."
        );

    } finally {

        setMesaAbriendo(null);
    }
}

    //selecccionar mesa
    async function seleccionarMesa(mesa: Mesa) {

        if (mesa.estado === "LIBRE") {
            await abrirMesa(mesa);
            return;
        }


        const cuenta = cuentas.find(
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
            pathname: "/cuenta/[id]",
            params: {
                id: String(cuenta.id)
            }
        });
    }
        


    // ==========================================
    // CERRAR SESIÓN
    // ==========================================

    function salir() {

        cerrarSesion();

        router.replace("/");
    }


    // ==========================================
    // VALIDAR USUARIO
    // ==========================================

    if (
        !usuario ||
        !token ||
        usuario.rol !== "mesero"
    ) {
        return null;
    }


    // ==========================================
    // INTERFAZ
    // ==========================================

    return (

        <SafeAreaView style={styles.container}>

            <ScrollView
                contentContainerStyle={
                    styles.contenido
                }
            >

                <View style={styles.encabezado}>

                    <View>

                        <Text style={styles.titulo}>
                            Mesas
                        </Text>

                        <Text style={styles.mesero}>
                            {usuario.nombre}
                        </Text>

                    </View>


                    <Pressable
                        style={styles.botonSalir}
                        onPress={salir}
                    >
                        <Text
                            style={
                                styles.botonSalirTexto
                            }
                        >
                            Salir
                        </Text>
                    </Pressable>

                </View>


                <Pressable
                    style={styles.botonActualizar}
                    onPress={cargarMesas}
                >
                    <Text
                        style={
                            styles.botonActualizarTexto
                        }
                    >
                        Actualizar mesas
                    </Text>
                </Pressable>


                {cargando ? (

                    <ActivityIndicator
                        size="large"
                        style={styles.cargando}
                    />

                ) : (

                    <View style={styles.listaMesas}>

                        {mesas.map((mesa) => (

                        <Pressable
                            key={mesa.id}

                            disabled={
                                mesaAbriendo === mesa.id
                            }

                            onPress={() => seleccionarMesa(mesa)}
                            style={({ pressed }) => [
                                styles.mesa,
                                pressed &&
                                mesa.estado === "LIBRE" &&
                                styles.mesaPresionada
                            ]}
                        >

                                <Text
                                    style={
                                        styles.numeroMesa
                                    }
                                >
                                    Mesa {mesa.numero}
                                </Text>


                                {mesaAbriendo === mesa.id ? (

                                <ActivityIndicator />

                            ) : (

                                <Text
                                    style={[
                                        styles.estado,

                                        mesa.estado === "LIBRE"
                                            ? styles.estadoLibre

                                            : mesa.estado === "OCUPADA"
                                            ? styles.estadoOcupada

                                            : styles.estadoPendiente
                                    ]}
                                >
                                    {mesa.estado}
                                </Text>

                            )}

                            </Pressable>

                        ))}

                    </View>
                )}


                {mensaje.length > 0 && (

                    <Text style={styles.mensaje}>
                        {mensaje}
                    </Text>

                )}

            </ScrollView>

        </SafeAreaView>
    );
}


const styles = StyleSheet.create({

    mesaPresionada: {
        opacity: 0.7
    },

    mesaNoDisponible: {
        opacity: 0.85
    },
    container: {
        flex: 1,
        backgroundColor: "#111111"
    },

    contenido: {
        width: "100%",
        maxWidth: 500,
        alignSelf: "center",
        padding: 24
    },

    encabezado: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 24
    },

    titulo: {
        color: "#FFFFFF",
        fontSize: 32,
        fontWeight: "700"
    },

    mesero: {
        color: "#AAAAAA",
        marginTop: 4
    },

    botonSalir: {
        backgroundColor: "#2A2A2A",
        borderRadius: 10,
        paddingHorizontal: 18,
        paddingVertical: 10
    },

    botonSalirTexto: {
        color: "#FFFFFF",
        fontWeight: "600"
    },

    botonActualizar: {
        backgroundColor: "#FFFFFF",
        borderRadius: 12,
        padding: 14,
        alignItems: "center",
        marginBottom: 22
    },

    botonActualizarTexto: {
        color: "#111111",
        fontWeight: "700"
    },

    cargando: {
        marginTop: 50
    },

    listaMesas: {
        gap: 14
    },

    mesa: {
        backgroundColor: "#1E1E1E",
        borderRadius: 16,
        padding: 20,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center"
    },

    numeroMesa: {
        color: "#FFFFFF",
        fontSize: 20,
        fontWeight: "700"
    },

    estado: {
        fontSize: 13,
        fontWeight: "700",
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 20,
        overflow: "hidden"
    },

    estadoLibre: {
        color: "#7DFF9B",
        backgroundColor: "#173B21"
    },

    estadoOcupada: {
        color: "#FF8888",
        backgroundColor: "#451C1C"
    },

    estadoPendiente: {
        color: "#FFD27A",
        backgroundColor: "#453719"
    },

    mensaje: {
        color: "#FFFFFF",
        marginTop: 24,
        textAlign: "center"
    }

});