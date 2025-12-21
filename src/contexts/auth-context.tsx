"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useCallback,
} from "react";
import { User } from "@supabase/supabase-js";
import {
  supabase,
  Contribuyente,
  Contador,
  ContadorContribuyenteConDetalle,
  UserType,
} from "@/lib/supabase";

interface AuthContextType {
  // Usuario de Supabase Auth
  user: User | null;
  loading: boolean;

  // Tipo de usuario
  userType: UserType | null;

  // Para contribuyentes
  contribuyente: Contribuyente | null;

  // Para contadores
  contador: Contador | null;
  contribuyentesAsignados: ContadorContribuyenteConDetalle[];
  contribuyenteActivo: Contribuyente | null;

  // Contribuyente efectivo: el que se debe usar para consultas de datos
  // - Para contribuyentes: es su propio perfil (contribuyente)
  // - Para contadores: es el cliente seleccionado (contribuyenteActivo)
  contribuyenteEfectivo: Contribuyente | null;

  // Acciones
  signOut: () => Promise<void>;
  refreshUserData: () => Promise<void>;
  setContribuyenteActivo: (contribuyente: Contribuyente | null) => void;
  refreshContribuyentesAsignados: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Key para localStorage
const CONTRIBUYENTE_ACTIVO_KEY = "contribuyente_activo_ruc";

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth debe ser usado dentro de AuthProvider");
  }
  return context;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [userType, setUserType] = useState<UserType | null>(null);

  // Estado para contribuyentes
  const [contribuyente, setContribuyente] = useState<Contribuyente | null>(
    null
  );

  // Estado para contadores
  const [contador, setContador] = useState<Contador | null>(null);
  const [contribuyentesAsignados, setContribuyentesAsignados] = useState<
    ContadorContribuyenteConDetalle[]
  >([]);
  const [contribuyenteActivo, setContribuyenteActivoState] =
    useState<Contribuyente | null>(null);

  // Cargar datos del contribuyente (para usuarios tipo contribuyente)
  const loadContribuyente = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("contribuyentes")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (error) {
        // No es un contribuyente
        return null;
      }

      return data as Contribuyente;
    } catch (error) {
      console.error("Error cargando contribuyente:", error);
      return null;
    }
  }, []);

  // Cargar datos del contador (para usuarios tipo contador)
  const loadContador = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("contadores")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (error) {
        // No es un contador
        return null;
      }

      return data as Contador;
    } catch (error) {
      console.error("Error cargando contador:", error);
      return null;
    }
  }, []);

  // Cargar contribuyentes asignados al contador (usando RPC para bypasear RLS)
  const refreshContribuyentesAsignados = useCallback(async () => {
    if (!contador) {
      setContribuyentesAsignados([]);
      return;
    }

    try {
      // Usar función RPC que bypasea RLS
      const { data, error } = await supabase.rpc("obtener_contribuyentes_asignados");

      if (error) {
        console.error("Error cargando contribuyentes asignados:", error);
        return;
      }

      // Transformar datos para que coincidan con el tipo esperado
      const asignados: ContadorContribuyenteConDetalle[] = (data || []).map(
        (item: {
          relacion_id: string;
          contador_id: string;
          contribuyente_ruc: string;
          relacion_estado: string;
          fecha_asignacion: string;
          fecha_desactivacion: string | null;
          first_name: string;
          last_name: string;
          telefono: string | null;
          email: string;
          direccion: string | null;
          cargas_familiares: number;
          obligado_contab: boolean;
          agente_retencion: boolean;
          tipo_obligacion: string;
          contribuyente_estado: string;
          contribuyente_user_id: string;
          contribuyente_created_at: string;
        }) => ({
          id: item.relacion_id,
          contador_id: item.contador_id,
          contribuyente_ruc: item.contribuyente_ruc,
          estado: item.relacion_estado as "activo" | "inactivo" | "pendiente",
          fecha_asignacion: item.fecha_asignacion,
          fecha_desactivacion: item.fecha_desactivacion,
          created_at: item.fecha_asignacion, // Usamos fecha_asignacion como created_at
          updated_at: item.fecha_asignacion,
          contribuyente: {
            ruc: item.contribuyente_ruc,
            first_name: item.first_name,
            last_name: item.last_name,
            telefono: item.telefono,
            email: item.email,
            direccion: item.direccion,
            cargas_familiares: item.cargas_familiares,
            obligado_contab: item.obligado_contab,
            agente_retencion: item.agente_retencion,
            tipo_obligacion: item.tipo_obligacion as "mensual" | "semestral",
            estado: item.contribuyente_estado as "activo" | "inactivo" | "suspendido",
            user_id: item.contribuyente_user_id,
            created_at: item.contribuyente_created_at,
          } as Contribuyente,
        })
      );

      setContribuyentesAsignados(asignados);

      // Si hay un contribuyente activo guardado, intentar restaurarlo
      const savedRuc = localStorage.getItem(CONTRIBUYENTE_ACTIVO_KEY);
      if (savedRuc && !contribuyenteActivo) {
        const savedContribuyente = asignados.find(
          (a) => a.contribuyente_ruc === savedRuc
        )?.contribuyente;
        if (savedContribuyente) {
          setContribuyenteActivoState(savedContribuyente);
        } else if (asignados.length > 0 && asignados[0].contribuyente) {
          // Si el guardado no existe, usar el primero
          setContribuyenteActivoState(asignados[0].contribuyente);
        }
      } else if (!contribuyenteActivo && asignados.length > 0) {
        // Si no hay ninguno activo, seleccionar el primero
        if (asignados[0].contribuyente) {
          setContribuyenteActivoState(asignados[0].contribuyente);
        }
      }
    } catch (error) {
      console.error("Error en refreshContribuyentesAsignados:", error);
    }
  }, [contador, contribuyenteActivo]);

  // Función para cambiar el contribuyente activo (solo para contadores)
  const setContribuyenteActivo = useCallback(
    (newContribuyente: Contribuyente | null) => {
      setContribuyenteActivoState(newContribuyente);
      if (newContribuyente) {
        localStorage.setItem(CONTRIBUYENTE_ACTIVO_KEY, newContribuyente.ruc);
      } else {
        localStorage.removeItem(CONTRIBUYENTE_ACTIVO_KEY);
      }
    },
    []
  );

  // Función principal para cargar todos los datos del usuario
  const refreshUserData = useCallback(async () => {
    if (!user) {
      setUserType(null);
      setContribuyente(null);
      setContador(null);
      setContribuyentesAsignados([]);
      setContribuyenteActivoState(null);
      return;
    }

    // Intentar cargar como contribuyente primero
    const contribuyenteData = await loadContribuyente(user.id);
    if (contribuyenteData) {
      setUserType("contribuyente");
      setContribuyente(contribuyenteData);
      setContador(null);
      setContribuyentesAsignados([]);
      setContribuyenteActivoState(null);
      return;
    }

    // Si no es contribuyente, intentar cargar como contador
    const contadorData = await loadContador(user.id);
    if (contadorData) {
      setUserType("contador");
      setContador(contadorData);
      setContribuyente(null);
      return;
    }

    // Si no es ni contribuyente ni contador, es un usuario nuevo
    setUserType(null);
    setContribuyente(null);
    setContador(null);
  }, [user, loadContribuyente, loadContador]);

  // Cerrar sesión
  const signOut = async () => {
    localStorage.removeItem(CONTRIBUYENTE_ACTIVO_KEY);
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Error al cerrar sesión:", error);
    }
  };

  // Efecto para obtener sesión inicial
  useEffect(() => {
    const getInitialSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      setLoading(false);
    };

    getInitialSession();

    // Escuchar cambios de autenticación
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Efecto para cargar datos del usuario cuando cambia
  useEffect(() => {
    if (user && !loading) {
      refreshUserData();
    }
  }, [user, loading, refreshUserData]);

  // Efecto para cargar contribuyentes asignados cuando el contador está disponible
  useEffect(() => {
    if (contador) {
      refreshContribuyentesAsignados();
    }
  }, [contador, refreshContribuyentesAsignados]);

  // Calcular el contribuyente efectivo según el tipo de usuario
  // - Contribuyentes: usan su propio perfil
  // - Contadores: usan el cliente seleccionado
  const contribuyenteEfectivo = userType === "contador" 
    ? contribuyenteActivo 
    : contribuyente;

  const value: AuthContextType = {
    user,
    loading,
    userType,
    contribuyente,
    contador,
    contribuyentesAsignados,
    contribuyenteActivo,
    contribuyenteEfectivo,
    signOut,
    refreshUserData,
    setContribuyenteActivo,
    refreshContribuyentesAsignados,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
