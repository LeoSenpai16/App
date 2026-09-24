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

import {
    useLocalSearchParams,
    useRouter
} from "expo-router";

import {
    useAuth
} from "../../context/AuthContext";


const API_URL = "http://localhost:3000";


type Item = {
    id: number;
    producto_id: number;
    producto: string;
    cantidad: number;
    precio_unitario: string;
    nota_especial: string | null;
    modificadores: {
        id: number;
        nombre: string;
        precio_extra: string;
    }[];
    subtotal: string;
};


type Orden = {
    id: number;
    estado: string;
    tipo_entrega: string;
    fecha_creacion: string;
    fecha_listo: string | null;
    items: Item[];
};


type DetalleCuenta = {
    id: number;
    tipo: string;
    estado: string;
    mesa: number | null;
    nombre_cliente: string | null;

    mesero: {
        id: number;
        nombre: string;
    };

    ordenes: Orden[];
    total: string;
};


export default function CuentaScreen() {

    const router = useRouter();

    const { id } =
        useLocalSearchParams<{ id: string }>();

    const {
        usuario,
        token
    } = useAuth();


    const [cuenta, setCuenta] =
        useState<DetalleCuenta | null>(null);

    const [cargando, setCargando] =
        useState(true);

    const [mensaje, setMensaje] =
        useState("");


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


    async function cargarCuenta() {

        if (!token || !id) {
            return;
        }

        try {

            setCargando(true);
            setMensaje("");

            const respuesta = await fetch(
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

            setCuenta(datos);

        } catch (error) {

            console.error(error);

            setMensaje(
                "No se pudo conectar con el servidor."
            );

        } finally {

            setCargando(false);
        }
    }


    if (
        !usuario ||
        !token ||
        usuario.rol !== "mesero"
    ) {
        return null;
    }


    return (

        <SafeAreaView style={styles.container}>

            <ScrollView
                contentContainerStyle={styles.contenido}
            >

                <Pressable
                    style={styles.volver}
                    onPress={() => router.back()}
                >
                    <Text style={styles.volverTexto}>
                        ← Volver
                    </Text>
                </Pressable>


                {cargando ? (

                    <ActivityIndicator
                        size="large"
                        style={styles.cargando}
                    />

                ) : cuenta ? (

                    <>

                        <Text style={styles.titulo}>
                            {cuenta.tipo === "MESA"
                                ? `Mesa ${cuenta.mesa}`
                                : cuenta.nombre_cliente}
                        </Text>

                        <Text style={styles.estado}>
                            {cuenta.estado}
                        </Text>

                        <Text style={styles.mesero}>
                            Mesero: {cuenta.mesero.nombre}
                        </Text>


                        <View style={styles.totalCard}>

                            <Text style={styles.totalEtiqueta}>
                                Total actual
                            </Text>

                            <Text style={styles.total}>
                                ${cuenta.total}
                            </Text>

                        </View>


                        <Text style={styles.seccionTitulo}>
                            Pedidos
                        </Text>


                        {cuenta.ordenes.length === 0 ? (

                            <View style={styles.vacio}>
                                <Text style={styles.vacioTexto}>
                                    Todavía no hay pedidos.
                                </Text>
                            </View>

                        ) : (

                            cuenta.ordenes.map((orden) => (

                                <View
                                    key={orden.id}
                                    style={styles.orden}
                                >

                                    <View style={styles.ordenHeader}>

                                        <Text style={styles.ordenTitulo}>
                                            Orden #{orden.id}
                                        </Text>

                                        <Text style={styles.ordenEstado}>
                                            {orden.estado}
                                        </Text>

                                    </View>


                                    {orden.items.map((item) => (

                                        <View
                                            key={item.id}
                                            style={styles.item}
                                        >

                                            <View style={styles.itemInfo}>

                                                <Text style={styles.itemNombre}>
                                                    {item.cantidad} × {item.producto}
                                                </Text>


                                                {item.modificadores.map(
                                                    (modificador) => (

                                                        <Text
                                                            key={modificador.id}
                                                            style={styles.modificador}
                                                        >
                                                            • {modificador.nombre}
                                                        </Text>

                                                    )
                                                )}

                                            </View>


                                            <Text style={styles.subtotal}>
                                                ${item.subtotal}
                                            </Text>

                                        </View>

                                    ))}

                                </View>

                            ))
                        )}


                        <Pressable
                            style={styles.botonPrincipal}

                            onPress={() => {
                                router.push({
                                    pathname: "/pedido/[cuentaId]",

                                    params: {
                                        cuentaId: String(cuenta.id),
                                        tipoCuenta: cuenta.tipo
                                    }
                                });
                            }}
                        >
                            <Text style={styles.botonPrincipalTexto}>
                                Agregar pedido
                            </Text>
                        </Pressable>

                    </>

                ) : null}


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

    volver: {
        marginBottom: 24
    },

    volverTexto: {
        color: "#FFFFFF",
        fontSize: 16,
        fontWeight: "600"
    },

    titulo: {
        color: "#FFFFFF",
        fontSize: 32,
        fontWeight: "700"
    },

    estado: {
        color: "#AAAAAA",
        marginTop: 5
    },

    mesero: {
        color: "#AAAAAA",
        marginTop: 5
    },

    totalCard: {
        backgroundColor: "#1E1E1E",
        borderRadius: 16,
        padding: 22,
        marginTop: 24
    },

    totalEtiqueta: {
        color: "#AAAAAA"
    },

    total: {
        color: "#FFFFFF",
        fontSize: 32,
        fontWeight: "700",
        marginTop: 6
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
        padding: 22,
        borderRadius: 16
    },

    vacioTexto: {
        color: "#AAAAAA",
        textAlign: "center"
    },

    orden: {
        backgroundColor: "#1E1E1E",
        padding: 18,
        borderRadius: 16,
        marginBottom: 14
    },

    ordenHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 14
    },

    ordenTitulo: {
        color: "#FFFFFF",
        fontWeight: "700"
    },

    ordenEstado: {
        color: "#AAAAAA",
        fontWeight: "600"
    },

    item: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingVertical: 10
    },

    itemInfo: {
        flex: 1
    },

    itemNombre: {
        color: "#FFFFFF",
        fontWeight: "600"
    },

    modificador: {
        color: "#AAAAAA",
        marginTop: 4
    },

    subtotal: {
        color: "#FFFFFF",
        fontWeight: "700",
        marginLeft: 12
    },

    botonPrincipal: {
        backgroundColor: "#FFFFFF",
        padding: 16,
        borderRadius: 12,
        alignItems: "center",
        marginTop: 22
    },

    botonPrincipalTexto: {
        color: "#111111",
        fontWeight: "700"
    },

    cargando: {
        marginTop: 60
    },

    mensaje: {
        color: "#FFFFFF",
        textAlign: "center",
        marginTop: 24
    }
});