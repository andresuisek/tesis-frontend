"use client";

import { createContext, useContext, useReducer, ReactNode } from "react";

// Tipos para el estado global
interface Usuario {
  id: string;
  nombre: string;
  email: string;
  rol: string;
}

interface AppState {
  usuario: Usuario | null;
  empresa: {
    ruc: string;
    razonSocial: string;
  } | null;
  configuracion: {
    tema: "light" | "dark" | "system";
    idioma: "es" | "en";
  };
  loading: boolean;
}

// Estado inicial
const initialState: AppState = {
  usuario: null,
  empresa: null,
  configuracion: {
    tema: "light",
    idioma: "es",
  },
  loading: false,
};

// Tipos de acciones
type AppAction =
  | { type: "SET_USUARIO"; payload: Usuario }
  | { type: "SET_EMPRESA"; payload: { ruc: string; razonSocial: string } }
  | { type: "SET_TEMA"; payload: "light" | "dark" | "system" }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "LOGOUT" };

// Reducer
function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "SET_USUARIO":
      return { ...state, usuario: action.payload };
    case "SET_EMPRESA":
      return { ...state, empresa: action.payload };
    case "SET_TEMA":
      return {
        ...state,
        configuracion: { ...state.configuracion, tema: action.payload },
      };
    case "SET_LOADING":
      return { ...state, loading: action.payload };
    case "LOGOUT":
      return {
        ...initialState,
        configuracion: state.configuracion, // Mantener configuración
      };
    default:
      return state;
  }
}

// Contexto
const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
} | null>(null);

// Provider
export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

// Hook personalizado
export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp debe ser usado dentro de AppProvider");
  }
  return context;
}

// Hooks de conveniencia
export function useUsuario() {
  const { state } = useApp();
  return state.usuario;
}

export function useEmpresa() {
  const { state } = useApp();
  return state.empresa;
}

export function useConfiguracion() {
  const { state } = useApp();
  return state.configuracion;
}
