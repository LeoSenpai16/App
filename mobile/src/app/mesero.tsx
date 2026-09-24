import {
    SafeAreaView,
    StyleSheet,
    Text,
    View
} from "react-native";

export default function MeseroScreen() {
    return (
        <SafeAreaView style={styles.container}>
            <View>
                <Text style={styles.titulo}>
                    Mesas
                </Text>

                <Text style={styles.texto}>
                    Panel del mesero
                </Text>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#111111",
        justifyContent: "center",
        alignItems: "center"
    },

    titulo: {
        color: "#FFFFFF",
        fontSize: 32,
        fontWeight: "700"
    },

    texto: {
        color: "#AAAAAA",
        fontSize: 16,
        textAlign: "center",
        marginTop: 8
    }
});