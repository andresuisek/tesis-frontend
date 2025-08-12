"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { FormFieldWrapper } from "@/components/forms/form-field-wrapper";
import {
  Building2,
  Search,
  UserCheck,
  FileText,
  Phone,
  Mail,
  MapPin,
} from "lucide-react";

// Tipo de datos para RUC
type DatosRUC = {
  ruc: string;
  razonSocial: string;
  nombreComercial?: string;
  estado: "Activo" | "Suspendido" | "Cancelado";
  claseContribuyente: string;
  tipoContribuyente: string;
  fechaInicioActividades: string;
  fechaActualizacion: string;
  actividadEconomica: {
    codigo: string;
    descripcion: string;
  }[];
  direccion: {
    provincia: string;
    canton: string;
    parroquia: string;
    direccionCompleta: string;
  };
  contacto: {
    telefono?: string;
    email?: string;
  };
  obligaciones: string[];
  representanteLegal?: {
    cedula: string;
    nombres: string;
    apellidos: string;
  };
};

// Datos de ejemplo
const ejemploRUC: DatosRUC = {
  ruc: "1790123456001",
  razonSocial: "EMPRESA DE EJEMPLO S.A.",
  nombreComercial: "EJEMPLO",
  estado: "Activo",
  claseContribuyente: "Contribuyente Especial",
  tipoContribuyente: "Sociedad",
  fechaInicioActividades: "2020-01-15",
  fechaActualizacion: "2024-01-10",
  actividadEconomica: [
    {
      codigo: "4711.00",
      descripcion:
        "Venta al por menor en comercios no especializados con predominio de la venta de alimentos, bebidas o tabaco.",
    },
    {
      codigo: "4690.09",
      descripcion: "Otras actividades de venta al por mayor.",
    },
  ],
  direccion: {
    provincia: "Pichincha",
    canton: "Quito",
    parroquia: "La Magdalena",
    direccionCompleta: "AV. AMAZONAS N24-03 Y WILSON",
  },
  contacto: {
    telefono: "02-2234567",
    email: "info@ejemplo.com",
  },
  obligaciones: [
    "Llevar Contabilidad",
    "Declaración de IVA",
    "Declaración del Impuesto a la Renta",
    "Presentar Anexo Transaccional Simplificado",
  ],
  representanteLegal: {
    cedula: "1712345678",
    nombres: "JUAN CARLOS",
    apellidos: "PEREZ LOPEZ",
  },
};

export default function RegistroRUCPage() {
  const [rucBusqueda, setRucBusqueda] = useState("");
  const [datosRUC, setDatosRUC] = useState<DatosRUC | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  const buscarRUC = async () => {
    if (!rucBusqueda || rucBusqueda.length !== 13) {
      setError("El RUC debe tener 13 dígitos");
      return;
    }

    setCargando(true);
    setError("");

    // Simulación de búsqueda
    setTimeout(() => {
      if (rucBusqueda === "1790123456001") {
        setDatosRUC(ejemploRUC);
      } else {
        setDatosRUC(null);
        setError("RUC no encontrado en la base de datos del SRI");
      }
      setCargando(false);
    }, 1500);
  };

  const validarRUC = (ruc: string) => {
    if (ruc.length !== 13) return false;

    const digitos = ruc.split("").map(Number);
    const provincia = parseInt(ruc.substring(0, 2));

    if (provincia < 1 || provincia > 24) return false;

    const tercerDigito = digitos[2];
    if (tercerDigito < 0 || tercerDigito > 9) return false;

    // Algoritmo de validación simplificado
    return true;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Consulta de Registro RUC
          </h1>
          <p className="text-muted-foreground">
            Consulta y valida información tributaria de contribuyentes
          </p>
        </div>
      </div>

      {/* Buscador de RUC */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Search className="mr-2 h-5 w-5" />
            Búsqueda de RUC
          </CardTitle>
          <CardDescription>
            Ingresa el número de RUC para consultar la información tributaria
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex space-x-2">
            <div className="flex-1">
              <FormFieldWrapper
                label="Número de RUC"
                required
                error={error}
                description="Ingresa los 13 dígitos del RUC (ej: 1790123456001)"
              >
                <Input
                  value={rucBusqueda}
                  onChange={(e) => {
                    const valor = e.target.value
                      .replace(/\D/g, "")
                      .slice(0, 13);
                    setRucBusqueda(valor);
                    setError("");
                  }}
                  placeholder="1790123456001"
                  maxLength={13}
                />
              </FormFieldWrapper>
            </div>
            <div className="flex items-end">
              <Button
                onClick={buscarRUC}
                disabled={cargando || rucBusqueda.length !== 13}
                className="h-10"
              >
                {cargando ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Buscando...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    Consultar
                  </>
                )}
              </Button>
            </div>
          </div>

          {rucBusqueda && (
            <div className="flex items-center space-x-2 text-sm">
              {validarRUC(rucBusqueda) ? (
                <>
                  <UserCheck className="h-4 w-4 text-green-600" />
                  <span className="text-green-600">RUC con formato válido</span>
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 text-red-600" />
                  <span className="text-red-600">Formato de RUC inválido</span>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resultados de la búsqueda */}
      {datosRUC && (
        <div className="space-y-6">
          {/* Información básica */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Building2 className="mr-2 h-5 w-5" />
                Información General
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      RUC
                    </label>
                    <p className="text-lg font-mono">{datosRUC.ruc}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Razón Social
                    </label>
                    <p className="font-medium">{datosRUC.razonSocial}</p>
                  </div>
                  {datosRUC.nombreComercial && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Nombre Comercial
                      </label>
                      <p className="font-medium">{datosRUC.nombreComercial}</p>
                    </div>
                  )}
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Estado
                    </label>
                    <div className="mt-1">
                      <Badge
                        variant={
                          datosRUC.estado === "Activo"
                            ? "default"
                            : datosRUC.estado === "Suspendido"
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {datosRUC.estado}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Clase de Contribuyente
                    </label>
                    <p className="font-medium">{datosRUC.claseContribuyente}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Tipo de Contribuyente
                    </label>
                    <p className="font-medium">{datosRUC.tipoContribuyente}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Inicio de Actividades
                    </label>
                    <p className="font-medium">
                      {new Date(
                        datosRUC.fechaInicioActividades
                      ).toLocaleDateString("es-EC")}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Última Actualización
                    </label>
                    <p className="font-medium">
                      {new Date(datosRUC.fechaActualizacion).toLocaleDateString(
                        "es-EC"
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actividades económicas */}
          <Card>
            <CardHeader>
              <CardTitle>Actividades Económicas</CardTitle>
              <CardDescription>
                Actividades registradas en el RUC
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {datosRUC.actividadEconomica.map((actividad, index) => (
                  <div
                    key={index}
                    className="flex items-start space-x-3 p-3 border rounded-lg"
                  >
                    <Badge variant="outline">{actividad.codigo}</Badge>
                    <div className="flex-1">
                      <p className="text-sm">{actividad.descripcion}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Dirección y contacto */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MapPin className="mr-2 h-4 w-4" />
                  Dirección
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Provincia
                  </label>
                  <p>{datosRUC.direccion.provincia}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Cantón
                  </label>
                  <p>{datosRUC.direccion.canton}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Parroquia
                  </label>
                  <p>{datosRUC.direccion.parroquia}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Dirección Completa
                  </label>
                  <p>{datosRUC.direccion.direccionCompleta}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Phone className="mr-2 h-4 w-4" />
                  Información de Contacto
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {datosRUC.contacto.telefono && (
                  <div className="flex items-center space-x-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{datosRUC.contacto.telefono}</span>
                  </div>
                )}
                {datosRUC.contacto.email && (
                  <div className="flex items-center space-x-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{datosRUC.contacto.email}</span>
                  </div>
                )}

                {datosRUC.representanteLegal && (
                  <div className="mt-4 pt-4 border-t">
                    <label className="text-sm font-medium text-muted-foreground">
                      Representante Legal
                    </label>
                    <p className="font-medium">
                      {datosRUC.representanteLegal.nombres}{" "}
                      {datosRUC.representanteLegal.apellidos}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      CI: {datosRUC.representanteLegal.cedula}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Obligaciones tributarias */}
          <Card>
            <CardHeader>
              <CardTitle>Obligaciones Tributarias</CardTitle>
              <CardDescription>
                Obligaciones registradas para este contribuyente
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 md:grid-cols-2">
                {datosRUC.obligaciones.map((obligacion, index) => (
                  <div
                    key={index}
                    className="flex items-center space-x-2 p-2 border rounded"
                  >
                    <UserCheck className="h-4 w-4 text-green-600" />
                    <span className="text-sm">{obligacion}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Acciones */}
          <Card>
            <CardHeader>
              <CardTitle>Acciones</CardTitle>
              <CardDescription>
                Herramientas adicionales para este RUC
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex space-x-2">
                <Button>
                  <FileText className="mr-2 h-4 w-4" />
                  Exportar PDF
                </Button>
                <Button variant="outline">
                  <Building2 className="mr-2 h-4 w-4" />
                  Agregar a Contactos
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
