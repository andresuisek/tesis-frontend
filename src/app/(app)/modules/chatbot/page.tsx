"use client";

import { useState, useRef, useEffect } from "react";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  MessageSquare,
  Send,
  Bot,
  User,
  Lightbulb,
  Calculator,
  FileText,
  HelpCircle,
  Trash2,
} from "lucide-react";
import posthog from "posthog-js";

// Tipo de datos para mensajes
type Mensaje = {
  id: string;
  contenido: string;
  tipo: "usuario" | "bot";
  timestamp: Date;
  categoria?: "consulta" | "calculo" | "informacion" | "ayuda";
};

// Respuestas predefinidas del bot
const respuestasPredefinidas = {
  saludo: [
    "¡Hola! Soy tu asistente tributario. ¿En qué puedo ayudarte hoy?",
    "¡Buen día! Estoy aquí para resolver tus dudas tributarias. ¿Qué necesitas saber?",
  ],
  iva: [
    "El IVA (Impuesto al Valor Agregado) en Ecuador es del 12% para la mayoría de bienes y servicios. Los bienes de primera necesidad tienen tarifa 0%.",
    "Para calcular el IVA: Valor con IVA = Valor sin IVA × 1.12. El IVA = Valor sin IVA × 0.12",
  ],
  retenciones: [
    "Las retenciones varían según el tipo de bien o servicio. Por ejemplo: Servicios profesionales 2%, Servicios técnicos 1%, IVA en servicios 10% o 30%.",
    "Debes emitir un comprobante de retención cuando retengas impuestos a tus proveedores.",
  ],
  formularios: [
    "Los principales formularios son: F104 (IVA mensual), F103 (Retenciones), F101 (Impuesto a la Renta anual).",
    "Las declaraciones mensuales vencen el día 12 del mes siguiente para contribuyentes especiales.",
  ],
  ayuda: [
    "Puedes preguntarme sobre: cálculos de impuestos, fechas de vencimiento, tipos de formularios, retenciones, o cualquier duda tributaria.",
    "También puedo ayudarte con cálculos específicos si me das los datos necesarios.",
  ],
};

// Preguntas frecuentes
const preguntasFrecuentes = [
  "¿Cómo calculo el IVA de una factura?",
  "¿Cuándo vencen las declaraciones mensuales?",
  "¿Qué porcentaje de retención debo aplicar?",
  "¿Cómo genero el formulario 104?",
  "¿Qué documentos necesito para declarar?",
  "¿Cuál es la diferencia entre contribuyente especial y ordinario?",
];

export default function ChatbotPage() {
  const [mensajes, setMensajes] = useState<Mensaje[]>([
    {
      id: "1",
      contenido:
        "¡Hola! Soy tu asistente tributario virtual. Puedo ayudarte con consultas sobre impuestos, cálculos, formularios y más. ¿En qué puedo asistirte?",
      tipo: "bot",
      timestamp: new Date(),
      categoria: "ayuda",
    },
  ]);
  const [mensajeActual, setMensajeActual] = useState("");
  const [escribiendo, setEscribiendo] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [mensajes]);

  const procesarMensaje = (mensaje: string): string => {
    const mensajeMinuscula = mensaje.toLowerCase();

    // Saludos
    if (
      mensajeMinuscula.includes("hola") ||
      mensajeMinuscula.includes("buenos") ||
      mensajeMinuscula.includes("buenas")
    ) {
      return respuestasPredefinidas.saludo[
        Math.floor(Math.random() * respuestasPredefinidas.saludo.length)
      ];
    }

    // IVA
    if (
      mensajeMinuscula.includes("iva") ||
      mensajeMinuscula.includes("impuesto al valor")
    ) {
      return respuestasPredefinidas.iva[
        Math.floor(Math.random() * respuestasPredefinidas.iva.length)
      ];
    }

    // Retenciones
    if (
      mensajeMinuscula.includes("retencion") ||
      mensajeMinuscula.includes("retener")
    ) {
      return respuestasPredefinidas.retenciones[
        Math.floor(Math.random() * respuestasPredefinidas.retenciones.length)
      ];
    }

    // Formularios
    if (
      mensajeMinuscula.includes("formulario") ||
      mensajeMinuscula.includes("f104") ||
      mensajeMinuscula.includes("f103")
    ) {
      return respuestasPredefinidas.formularios[
        Math.floor(Math.random() * respuestasPredefinidas.formularios.length)
      ];
    }

    // Cálculos específicos
    if (
      mensajeMinuscula.includes("calcular") &&
      mensajeMinuscula.includes("iva")
    ) {
      return "Para calcular el IVA de $100: IVA = $100 × 0.12 = $12. Total con IVA = $100 + $12 = $112. ¿Necesitas calcular algún valor específico?";
    }

    // Ayuda
    if (
      mensajeMinuscula.includes("ayuda") ||
      mensajeMinuscula.includes("help")
    ) {
      return respuestasPredefinidas.ayuda[
        Math.floor(Math.random() * respuestasPredefinidas.ayuda.length)
      ];
    }

    // Respuesta por defecto
    return "Entiendo tu consulta. Te recomiendo revisar la documentación del SRI o contactar directamente con un contador para casos específicos. ¿Hay algo más en lo que pueda ayudarte?";
  };

  const enviarMensaje = async () => {
    if (!mensajeActual.trim()) return;

    // Track chatbot message sent
    posthog.capture("chatbot_message_sent", {
      message_length: mensajeActual.length,
      session_message_count: mensajes.filter((m) => m.tipo === "usuario").length + 1,
    });

    const nuevoMensajeUsuario: Mensaje = {
      id: Date.now().toString(),
      contenido: mensajeActual,
      tipo: "usuario",
      timestamp: new Date(),
      categoria: "consulta",
    };

    setMensajes((prev) => [...prev, nuevoMensajeUsuario]);
    setMensajeActual("");
    setEscribiendo(true);

    // Simular tiempo de respuesta del bot
    setTimeout(() => {
      const respuesta = procesarMensaje(mensajeActual);
      const mensajeBot: Mensaje = {
        id: (Date.now() + 1).toString(),
        contenido: respuesta,
        tipo: "bot",
        timestamp: new Date(),
        categoria: "informacion",
      };

      setMensajes((prev) => [...prev, mensajeBot]);
      setEscribiendo(false);
    }, 1000 + Math.random() * 2000);
  };

  const usarPreguntaFrecuente = (pregunta: string) => {
    setMensajeActual(pregunta);
  };

  const limpiarChat = () => {
    setMensajes([
      {
        id: "1",
        contenido: "Chat reiniciado. ¿En qué puedo ayudarte?",
        tipo: "bot",
        timestamp: new Date(),
        categoria: "ayuda",
      },
    ]);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Asistente Tributario
          </h1>
          <p className="text-muted-foreground">
            Consulta tus dudas tributarias con nuestro chatbot inteligente
          </p>
        </div>
        <Button variant="outline" onClick={limpiarChat}>
          <Trash2 className="mr-2 h-4 w-4" />
          Limpiar Chat
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        {/* Chat principal */}
        <div className="md:col-span-3">
          <Card className="h-[600px] flex flex-col">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center">
                <MessageSquare className="mr-2 h-5 w-5" />
                Conversación
              </CardTitle>
              <CardDescription>
                Haz tus preguntas sobre temas tributarios
              </CardDescription>
            </CardHeader>

            <CardContent className="flex-1 flex flex-col p-0">
              {/* Área de mensajes */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {mensajes.map((mensaje) => (
                  <div
                    key={mensaje.id}
                    className={`flex items-start space-x-3 ${
                      mensaje.tipo === "usuario" ? "justify-end" : ""
                    }`}
                  >
                    {mensaje.tipo === "bot" && (
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          <Bot className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                    )}

                    <div
                      className={`max-w-[70%] rounded-lg p-3 ${
                        mensaje.tipo === "usuario"
                          ? "bg-primary text-primary-foreground ml-auto"
                          : "bg-muted"
                      }`}
                    >
                      <p className="text-sm">{mensaje.contenido}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs opacity-70">
                          {mensaje.timestamp.toLocaleTimeString("es-EC", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        {mensaje.categoria && (
                          <Badge variant="outline" className="text-xs">
                            {mensaje.categoria}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {mensaje.tipo === "usuario" && (
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-secondary">
                          <User className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                ))}

                {escribiendo && (
                  <div className="flex items-start space-x-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        <Bot className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="bg-muted rounded-lg p-3">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-current rounded-full animate-bounce" />
                        <div
                          className="w-2 h-2 bg-current rounded-full animate-bounce"
                          style={{ animationDelay: "0.1s" }}
                        />
                        <div
                          className="w-2 h-2 bg-current rounded-full animate-bounce"
                          style={{ animationDelay: "0.2s" }}
                        />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Área de entrada */}
              <div className="border-t p-4">
                <div className="flex space-x-2">
                  <Input
                    value={mensajeActual}
                    onChange={(e) => setMensajeActual(e.target.value)}
                    placeholder="Escribe tu pregunta aquí..."
                    onKeyPress={(e) => e.key === "Enter" && enviarMensaje()}
                    disabled={escribiendo}
                  />
                  <Button
                    onClick={enviarMensaje}
                    disabled={escribiendo || !mensajeActual.trim()}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Panel lateral */}
        <div className="space-y-6">
          {/* Preguntas frecuentes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-base">
                <HelpCircle className="mr-2 h-4 w-4" />
                Preguntas Frecuentes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {preguntasFrecuentes.map((pregunta, index) => (
                <Button
                  key={index}
                  variant="ghost"
                  className="w-full text-left h-auto p-2 text-xs justify-start"
                  onClick={() => usarPreguntaFrecuente(pregunta)}
                >
                  {pregunta}
                </Button>
              ))}
            </CardContent>
          </Card>

          {/* Herramientas rápidas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-base">
                <Calculator className="mr-2 h-4 w-4" />
                Herramientas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => usarPreguntaFrecuente("Calcular IVA de $100")}
              >
                <Calculator className="mr-2 h-4 w-4" />
                Calculadora IVA
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() =>
                  usarPreguntaFrecuente(
                    "¿Qué retención aplicar a servicios profesionales?"
                  )
                }
              >
                <FileText className="mr-2 h-4 w-4" />
                Retenciones
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() =>
                  usarPreguntaFrecuente("Fechas de vencimiento 2024")
                }
              >
                <Lightbulb className="mr-2 h-4 w-4" />
                Vencimientos
              </Button>
            </CardContent>
          </Card>

          {/* Estadísticas */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Estadísticas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Mensajes hoy:</span>
                <span className="font-medium">{mensajes.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  Consultas resueltas:
                </span>
                <span className="font-medium">
                  {mensajes.filter((m) => m.tipo === "bot").length}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tiempo promedio:</span>
                <span className="font-medium">2.3s</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
