import {
    createContext,
    useContext,
    useState,
    type ReactNode
} from "react";


export type Usuario = {
    id: number;
    nombre: string;
    rol: "chef" | "mesero";
};


type AuthContextType = {
    token: string | null;
    usuario: Usuario | null;

    guardarSesion: (
        token: string,
        usuario: Usuario
    ) => void;

    cerrarSesion: () => void;
};


const AuthContext =
    createContext<AuthContextType | undefined>(
        undefined
    );


export function AuthProvider({
    children
}: {
    children: ReactNode;
}) {

    const [token, setToken] =
        useState<string | null>(null);

    const [usuario, setUsuario] =
        useState<Usuario | null>(null);


    function guardarSesion(
        nuevoToken: string,
        nuevoUsuario: Usuario
    ) {
        setToken(nuevoToken);
        setUsuario(nuevoUsuario);
    }


    function cerrarSesion() {
        setToken(null);
        setUsuario(null);
    }


    return (
        <AuthContext.Provider
            value={{
                token,
                usuario,
                guardarSesion,
                cerrarSesion
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}


export function useAuth() {

    const contexto = useContext(AuthContext);

    if (!contexto) {
        throw new Error(
            "useAuth debe utilizarse dentro de AuthProvider"
        );
    }

    return contexto;
}