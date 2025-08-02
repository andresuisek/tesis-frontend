'use client';

import { useState } from 'react';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

const predefinedResponses: Record<string, string> = {
  'hola': '¡Hola! Soy el asistente virtual del sistema SRI Digital. ¿En qué puedo ayudarte hoy?',
  'ayuda': 'Puedo ayudarte con consultas sobre:\n• Registro de ventas y facturas\n• Cálculo de retenciones\n• Liquidación de impuestos\n• Fechas de vencimiento\n• Rubros contables\n\n¿Sobre qué tema específico necesitas información?',
  'iva': 'Información sobre IVA:\n• Tarifa 0%: Productos de canasta básica, medicinas\n• Tarifa 15%: Servicios y productos gravados\n• Retenciones: 30%, 70%, 100% según el tipo de bien/servicio\n\n¿Necesitas información específica sobre algún aspecto del IVA?',
  'retenciones': 'Las retenciones más comunes son:\n• IVA: 30% (servicios profesionales), 70% (construcción), 100% (bienes 0%)\n• Renta: 1% (intereses), 2% (servicios profesionales), 8% (construcción), 10% (transporte)\n\n¿Sobre qué tipo de retención necesitas información?',
  'fechas': 'Fechas de vencimiento principales:\n• IVA Mensual: 28 del mes siguiente\n• Retenciones: 28 del mes siguiente\n• Impuesto a la Renta: Según 9no dígito del RUC\n• Anexos: Marzo del año siguiente\n\n¿Necesitas fecha específica para algún impuesto?',
  'ruc': 'El RUC (Registro Único de Contribuyentes) es obligatorio para:\n• Personas naturales con ingresos > $20,000 anuales\n• Todas las sociedades\n• Profesionales independientes\n\nPuedes obtenerlo en oficinas del SRI o en línea con cédula y certificado de votación.',
  'rubros': 'Los rubros principales para clasificar gastos son:\n• Gastos Administrativos\n• Gastos de Ventas\n• Costo de Ventas\n• Activos Fijos\n• Servicios Profesionales\n\nEsta clasificación es importante para la declaración de Impuesto a la Renta.',
};

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: '¡Hola! Soy tu asistente virtual del SRI Digital. Puedo ayudarte con consultas sobre impuestos, retenciones y obligaciones tributarias. Escribe "ayuda" para ver los temas disponibles.',
      isUser: false,
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState('');

  const getResponse = (userMessage: string): string => {
    const lowerMessage = userMessage.toLowerCase().trim();
    
    // Buscar respuestas exactas
    if (predefinedResponses[lowerMessage]) {
      return predefinedResponses[lowerMessage];
    }

    // Buscar palabras clave
    if (lowerMessage.includes('factura') || lowerMessage.includes('venta')) {
      return 'Para registrar facturas:\n1. Ve a "Registro de Ventas"\n2. Completa los datos del cliente\n3. Ingresa subtotales por tarifa de IVA\n4. El sistema calculará automáticamente el IVA y total\n\n¿Necesitas ayuda con algún campo específico?';
    }

    if (lowerMessage.includes('compra') || lowerMessage.includes('proveedor')) {
      return 'Para registrar compras:\n1. Ve a "Registro de Compras"\n2. Ingresa datos del proveedor\n3. Selecciona el rubro contable\n4. Marca si es deducible para Impuesto a la Renta\n\n¿Tienes dudas sobre algún rubro específico?';
    }

    if (lowerMessage.includes('liquidación') || lowerMessage.includes('declaración')) {
      return 'Para la liquidación de impuestos:\n1. Ve a "Liquidación de Impuestos"\n2. Selecciona el período\n3. El sistema calculará automáticamente:\n   • IVA a pagar/favor\n   • Impuesto a la Renta\n   • Créditos tributarios\n\n¿Necesitas ayuda con algún cálculo específico?';
    }

    if (lowerMessage.includes('usuario') || lowerMessage.includes('registro')) {
      return 'Para registrar un usuario:\n1. Ve a "Registro de Usuario"\n2. Puedes cargar datos desde PDF del RUC o manual\n3. Completa obligaciones tributarias\n4. Verifica que el RUC esté activo\n\n¿Tienes el PDF del RUC actualizado?';
    }

    // Respuesta por defecto
    return 'No estoy seguro de cómo ayudarte con esa consulta específica. Puedes:\n\n• Escribir "ayuda" para ver temas disponibles\n• Preguntar sobre: IVA, retenciones, fechas, RUC, rubros\n• Consultar el manual del usuario\n• Contactar soporte técnico\n\n¿Hay algo más específico que pueda explicarte?';
  };

  const handleSendMessage = () => {
    if (!inputText.trim()) return;

    // Agregar mensaje del usuario
    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText,
      isUser: true,
      timestamp: new Date(),
    };

    // Obtener respuesta del bot
    const botResponse: Message = {
      id: (Date.now() + 1).toString(),
      text: getResponse(inputText),
      isUser: false,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage, botResponse]);
    setInputText('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const clearChat = () => {
    setMessages([
      {
        id: '1',
        text: '¡Hola! Soy tu asistente virtual del SRI Digital. ¿En qué puedo ayudarte hoy?',
        isUser: false,
        timestamp: new Date(),
      },
    ]);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-lg transition-all duration-300 z-50"
        aria-label="Abrir chat de ayuda"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-4 rounded-t-lg flex items-center justify-between">
        <div className="flex items-center">
          <div className="bg-white rounded p-1 flex items-center justify-center">
            <img
              src="https://cdn.builder.io/api/v1/image/assets%2Ff0451246846a40baae39ad411a7b4867%2Fc5e2557623b347548bfbe225119d3175?format=webp&width=800"
              alt="UISEK"
              className="h-4 w-auto object-contain"
            />
          </div>
          <span className="ml-2 text-white text-sm font-medium">Asistente Virtual</span>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={clearChat}
            className="text-white hover:text-gray-200 p-1"
            title="Limpiar chat"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="text-white hover:text-gray-200 p-1"
            title="Cerrar chat"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="h-80 overflow-y-auto p-4 space-y-3">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs px-3 py-2 rounded-lg text-sm ${
                message.isUser
                  ? 'bg-blue-600 text-white rounded-br-none'
                  : 'bg-gray-100 text-gray-900 rounded-bl-none'
              }`}
            >
              <div className="whitespace-pre-line">{message.text}</div>
              <div
                className={`text-xs mt-1 ${
                  message.isUser ? 'text-blue-100' : 'text-gray-500'
                }`}
              >
                {message.timestamp.toLocaleTimeString('es-ES', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 p-4">
        <div className="flex space-x-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Escribe tu consulta..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputText.trim()}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white p-2 rounded-md transition-colors duration-200"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
        <div className="mt-2 text-xs text-gray-500">
          Presiona Enter para enviar • Shift+Enter para nueva línea
        </div>
      </div>
    </div>
  );
}
