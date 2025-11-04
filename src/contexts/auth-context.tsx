"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { User } from "@supabase/supabase-js";
import { supabase, Contribuyente } from "@/lib/supabase";

interface AuthContextType {
  user: User | null;
  contribuyente: Contribuyente | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshContribuyente: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth debe ser usado dentro de AuthProvider");
  }
  return context;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [contribuyente, setContribuyente] = useState<Contribuyente | null>(
    null
  );
  const [loading, setLoading] = useState(true);

  const refreshContribuyente = async () => {
    if (!user) {
      setContribuyente(null);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("contribuyentes")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error) {
        console.error("Error cargando contribuyente:", error);
        return;
      }

      setContribuyente(data);
    } catch (error: unknown) {
      console.error("Error obteniendo contribuyente:", error);
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Error al cerrar sesión:", error);
    }
  };

  useEffect(() => {
    // Obtener sesión inicial
    const getInitialSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      if (session?.user) {
        await refreshContribuyente();
      }
      setLoading(false);
    };

    getInitialSession();

    // Escuchar cambios de autenticación
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null);

      if (session?.user) {
        await refreshContribuyente();
      } else {
        setContribuyente(null);
      }

      setLoading(false);
    });

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Actualizar contribuyente cuando cambie el usuario
  useEffect(() => {
    if (user) {
      refreshContribuyente();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const value = {
    user,
    contribuyente,
    loading,
    signOut,
    refreshContribuyente,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
