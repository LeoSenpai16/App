import { useEffect, useMemo, useState } from "react";

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


type Producto = {
    id: number;
    nombre: string;
    precio: string;
    activo: boolean;
};


type SeleccionProducto = {
    producto: Producto;
    cantidad: number;
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

    const [seleccion, setSeleccion] =
        useState<Record<number, number>>({});

    const [cargando, setCargando] =
        useState(true);

    const [enviando, setEnviando] =
        useState(false);

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
    // CARGAR PRODUCTOS
    // ==========================================

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


    // ==========================================
    // CANTIDADES
    // ==========================================

    function aumentar(productoId: number) {

        setSeleccion((actual) => ({
            ...actual,

            [productoId]:
                (actual[productoId] || 0) + 1
        }));
    }


    function disminuir(productoId: number) {

        setSeleccion((actual) => {

            const cantidadActual =
                actual[productoId] || 0;

            const nuevaCantidad =
                Math.max(
                    cantidadActual - 1,
                    0
                );

            return {
                ...actual,
                [productoId]:
                    nuevaCantidad
            };
        });
    }


    // ==========================================
    // TOTAL LOCAL DE REFERENCIA
    // ==========================================

    const total = useMemo(() => {

        return productos.reduce(
            (acumulado, producto) => {

                const cantidad =
                    seleccion[producto.id] || 0;

                return (
                    acumulado +
                    cantidad *
                    Number(producto.precio)
                );
            },
            0
        );

    }, [
        productos,
        seleccion
    ]);


    // ==========================================
    // ENVIAR ORDEN
    // ==========================================

    async function enviarPedido() {

        if (!token || !cuentaId) {
            return;
        }


        const items: SeleccionProducto[] =
            productos
                .filter(
                    (producto) =>
                        (seleccion[producto.id] || 0) > 0
                )
                .map((producto) => ({
                    producto,
                    cantidad:
                        seleccion[producto.id]
                }));


        if (items.length === 0) {

            setMensaje(
                "Selecciona al menos un producto."
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
                            tipoCuenta === "PARA_LLEVAR"
                                ? "PARA_LLEVAR"
                                : "EN_MESA",

                        items:
                            items.map((item) => ({
                                producto_id:
                                    item.producto.id,

                                cantidad:
                                    item.cantidad,

                                modificadores: []
                            }))
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
                pathname: "/cuenta/[id]",

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
                contentContainerStyle={
                    styles.contenido
                }
            >

                <Pressable
                    onPress={() => router.back()}
                    style={styles.volver}
                >
                    <Text style={styles.volverTexto}>
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
                        style={styles.cargando}
                    />

                ) : (

                    <View style={styles.lista}>

                        {productos.map((producto) => {

                            const cantidad =
                                seleccion[
                                    producto.id
                                ] || 0;

                            return (

                                <View
                                    key={producto.id}
                                    style={styles.producto}
                                >

                                    <View style={styles.productoInfo}>

                                        <Text style={styles.productoNombre}>
                                            {producto.nombre}
                                        </Text>

                                        <Text style={styles.productoPrecio}>
                                            ${producto.precio}
                                        </Text>

                                    </View>


                                    <View style={styles.controles}>

                                        <Pressable
                                            style={styles.botonCantidad}
                                            onPress={() =>
                                                disminuir(
                                                    producto.id
                                                )
                                            }
                                        >
                                            <Text style={styles.botonCantidadTexto}>
                                                −
                                            </Text>
                                        </Pressable>


                                        <Text style={styles.cantidad}>
                                            {cantidad}
                                        </Text>


                                        <Pressable
                                            style={styles.botonCantidad}
                                            onPress={() =>
                                                aumentar(
                                                    producto.id
                                                )
                                            }
                                        >
                                            <Text style={styles.botonCantidadTexto}>
                                                +
                                            </Text>
                                        </Pressable>

                                    </View>

                                </View>
                            );
                        })}

                    </View>
                )}


                <View style={styles.resumen}>

                    <Text style={styles.totalEtiqueta}>
                        Total estimado
                    </Text>

                    <Text style={styles.total}>
                        ${total.toFixed(2)}
                    </Text>

                </View>


                <Pressable
                    style={[
                        styles.botonEnviar,

                        enviando &&
                        styles.botonDeshabilitado
                    ]}
                    disabled={enviando}
                    onPress={enviarPedido}
                >

                    {enviando ? (

                        <ActivityIndicator />

                    ) : (

                        <Text style={styles.botonEnviarTexto}>
                            Enviar a cocina
                        </Text>

                    )}

                </Pressable>


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

    productoInfo: {
        flex: 1,
        marginRight: 12
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

    controles: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12
    },

    botonCantidad: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: "#333333",
        alignItems: "center",
        justifyContent: "center"
    },

    botonCantidadTexto: {
        color: "#FFFFFF",
        fontSize: 22,
        fontWeight: "700"
    },

    cantidad: {
        color: "#FFFFFF",
        fontSize: 18,
        minWidth: 20,
        textAlign: "center"
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
    }
});