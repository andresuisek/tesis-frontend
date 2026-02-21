import { QueryClient } from "@tanstack/react-query";

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Los datos fiscales no cambian frecuentemente, 5 minutos de staleTime
        staleTime: 5 * 60 * 1000,
        // Mantener datos en cache por 10 minutos
        gcTime: 10 * 60 * 1000,
        // Reintentar una vez en caso de error
        retry: 1,
        // Revalidar al volver a la pestaña
        refetchOnWindowFocus: true,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined = undefined;

export function getQueryClient() {
  if (typeof window === "undefined") {
    // Servidor: siempre crear un nuevo query client
    return makeQueryClient();
  } else {
    // Navegador: reutilizar el mismo query client (singleton)
    if (!browserQueryClient) browserQueryClient = makeQueryClient();
    return browserQueryClient;
  }
}



