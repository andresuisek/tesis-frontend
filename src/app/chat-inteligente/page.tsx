'use client';

import { useState, useRef, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';

interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  isTyping?: boolean;
}

const predefinedQueries = [
  "¿Cuáles son mis ventas del último mes?",
  "Muéstrame un resumen de mis retenciones",
  "¿Cuánto debo pagar de IVA este mes?",
  "¿Cuáles son mis gastos por rubro?",
  "¿Tengo obligaciones pendientes?",
  "Ayúdame a calcular mi declaración",
];

const intelligentResponses: Record<string, string> = {
  'ventas': `📊 **Resumen de Ventas - Marzo 2025**

**Total de Ventas:** $24,532.00
- Subtotal 0%: $2,450.00
- Subtotal 15%: $22,082.00
- IVA Generado: $3,312.30

**Facturas Emitidas:** 8 facturas
**Cliente Principal:** ONTIVEROS TERAN ANDRES ALEJANDRO

**Tendencia:** ↗️ +12% vs mes anterior

¿Te gustaría ver el detalle por cliente o período específico?`,

  'retenciones': `🧾 **Resumen de Retenciones Recibidas**

**Total Retenciones:** $1,594.58
- Retenciones IVA: $1,103.94
- Retenciones Renta: $490.64

**Por Emisor:**
- EMPRESA ABC S.A.: $1,103.94
- SERVICIOS TECH LTDA.: $290.32
- CONSULTORA XYZ: $200.32

**Crédito Tributario Disponible:** $1,103.94
Estas retenciones puedes aplicarlas como crédito en tu declaración de IVA.

¿Necesitas el detalle de alguna retención específica?`,

  'iva': `💰 **Cálculo de IVA - Marzo 2025**

**IVA en Ventas (Débito Fiscal):** $3,312.30
**IVA en Compras (Crédito Fiscal):** $2,768.40
**Retenciones IVA Recibidas:** $1,103.94

**Cálculo:**
$3,312.30 - $2,768.40 - $1,103.94 = **-$560.04**

🎉 **¡Tienes saldo a favor de $560.04!**

Opciones:
1. Solicitar devolución al SRI
2. Compensar con períodos futuros
3. Usar como crédito tributario

¿Te ayudo con el formulario de devolución?`,

  'gastos': `📋 **Análisis de Gastos por Rubro**

**Total Gastos:** $18,456.00

**Distribución:**
🔵 Servicios Profesionales: $8,500.00 (46.1%)
🟢 Gastos Administrativos: $4,200.00 (22.8%)
🟡 Suministros de Oficina: $2,800.00 (15.2%)
🔴 Servicios Básicos: $1,900.00 (10.3%)
🟣 Otros: $1,056.00 (5.7%)

**Gastos Deducibles:** 98.5% de tus gastos son deducibles
**Potencial Ahorro Fiscal:** ~$369.12

**Recomendación:** Tus gastos están bien distribuidos. Los servicios profesionales representan tu mayor inversión.

¿Quieres analizar algún rubro específico?`,

  'obligaciones': `📅 **Obligaciones Tributarias Pendientes**

**🔴 URGENTE - Vence en 3 días:**
- Declaración IVA Mensual - Marzo 2025
- Fecha límite: 28 de Abril, 2025
- Valor a pagar: $0.00 (Saldo a favor)

**🟡 PRÓXIMAMENTE:**
- Anexo RDEP - Fecha límite: 31 de Marzo, 2026
- Declaración Semestral - Fecha límite: 28 de Julio, 2025

**✅ COMPLETADAS:**
- Declaración Febrero 2025 ✓
- Retenciones Marzo ✓

**Recordatorio:** Tu declaración tiene saldo a favor. No olvides presentarla para mantener el crédito tributario.

¿Necesito ayuda para preparar alguna declaración?`,

  'declaracion': `📝 **Asistente para Declaración**

Te ayudo paso a paso con tu declaración de IVA:

**1. Datos Preparados:**
✅ Ventas registradas: $24,532.00
✅ Compras registradas: $18,456.00  
✅ Retenciones recibidas: $1,594.58

**2. Formularios Sugeridos:**
- Formulario 104A (IVA Mensual)
- Anexo de Retenciones en la Fuente

**3. Documentos Necesarios:**
✅ Comprobantes de venta
✅ Facturas de compra
✅ Comprobantes de retención
❌ Certificados bancarios (si aplica)

**Estado:** 🟢 Listo para declarar

¿Quieres que genere el archivo XML para subir al SRI o prefieres el formulario PDF?`,
};

export default function ChatInteligentePage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      content: '¡Hola! Soy tu asistente inteligente de gestión tributaria. Puedo ayudarte a consultar toda tu información fiscal, hacer cálculos, preparar declaraciones y responder cualquier pregunta sobre tus datos.\n\n¿En qué puedo ayudarte hoy?',
      role: 'assistant',
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const getIntelligentResponse = (userMessage: string): string => {
    const lowerMessage = userMessage.toLowerCase();

    if (lowerMessage.includes('venta') || lowerMessage.includes('factura') || lowerMessage.includes('ingreso')) {
      return intelligentResponses['ventas'];
    }

    if (lowerMessage.includes('retención') || lowerMessage.includes('retencion')) {
      return intelligentResponses['retenciones'];
    }

    if (lowerMessage.includes('iva') || lowerMessage.includes('pagar') || lowerMessage.includes('debe')) {
      return intelligentResponses['iva'];
    }

    if (lowerMessage.includes('gasto') || lowerMessage.includes('rubro') || lowerMessage.includes('compra')) {
      return intelligentResponses['gastos'];
    }

    if (lowerMessage.includes('obligacion') || lowerMessage.includes('pendiente') || lowerMessage.includes('vencimiento')) {
      return intelligentResponses['obligaciones'];
    }

    if (lowerMessage.includes('declaracion') || lowerMessage.includes('declaración') || lowerMessage.includes('calcular')) {
      return intelligentResponses['declaracion'];
    }

    // Respuestas adicionales específicas
    if (lowerMessage.includes('cliente') || lowerMessage.includes('quien')) {
      return `👥 **Análisis de Clientes**

**Cliente Principal:** ONTIVEROS TERAN ANDRES ALEJANDRO
- RUC: 0962428348001
- Total Ventas: $24,532.00 (100% de tus ingresos)
- Facturas: 8 documentos
- Promedio por factura: $3,066.50

**Frecuencia:** Cliente recurrente mensual
**Tipo de Servicio:** Servicios profesionales

¿Te gustaría ver el historial detallado de este cliente?`;
    }

    if (lowerMessage.includes('mes anterior') || lowerMessage.includes('comparar') || lowerMessage.includes('tendencia')) {
      return `📈 **Análisis de Tendencias**

**Comparación Marzo vs Febrero 2025:**

**Ventas:**
- Marzo: $24,532.00
- Febrero: $21,900.00
- Variación: +$2,632.00 (+12.0%) ↗️

**Gastos:**
- Marzo: $18,456.00
- Febrero: $16,800.00
- Variación: +$1,656.00 (+9.9%) ↗️

**Utilidad Bruta:**
- Marzo: $6,076.00
- Febrero: $5,100.00
- Variación: +$976.00 (+19.1%) ↗️

**Tendencia:** 🟢 Crecimiento sostenido
**Proyección Abril:** $26,500.00 (estimado)

¿Quieres analizar algún período específico?`;
    }

    if (lowerMessage.includes('sri') || lowerMessage.includes('formulario') || lowerMessage.includes('como')) {
      return `🏛️ **Información del SRI**

**Portal SRI:** www.sri.gob.ec
**Tu Situación Tributaria:**
- RUC: Activo ✅
- Obligaciones al día ✅
- Categoría: Persona Natural no obligada a llevar contabilidad

**Formularios Frecuentes:**
- 104A: Declaración IVA Mensual
- 102A: Declaración Impuesto Renta
- RDEP: Relación de Dependencia

**Próximas Fechas:**
- IVA Marzo: 28 de Abril
- Anexos: 31 de Marzo 2026

**¿Necesitas ayuda con algún trámite específico?**`;
    }

    // Respuesta por defecto más inteligente
    return `🤔 **Entiendo que preguntas sobre:** "${userMessage}"

Puedo ayudarte con información sobre:

📊 **Consultas de Datos:**
- Ventas, compras y retenciones
- Análisis por períodos y rubros
- Estado de obligaciones

🧮 **Cálculos Tributarios:**
- IVA a pagar o a favor
- Impuesto a la renta
- Proyecciones fiscales

📋 **Gestión Documental:**
- Preparación de declaraciones
- Generación de reportes
- Análisis de tendencias

💡 **¿Podrías ser más específico?** Por ejemplo:
- "¿Cuánto vendí en marzo?"
- "¿Cuál es mi mayor gasto?"
- "¿Cómo está mi situación fiscal?"

¿En qué área específica necesitas ayuda?`;
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content: inputValue,
      role: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    // Simular typing delay
    setTimeout(() => {
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: getIntelligentResponse(inputValue),
        role: 'assistant',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
      setIsTyping(false);
    }, 1500);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handlePredefinedQuery = (query: string) => {
    setInputValue(query);
    setTimeout(() => handleSendMessage(), 100);
  };

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [inputValue]);

  return (
    <MainLayout 
      title="Chat Inteligente" 
      subtitle="Consulta toda tu información tributaria con IA"
    >
      <div className="h-[calc(100vh-140px)] flex flex-col bg-white rounded-lg shadow-sm border border-gray-200">
        {/* Chat Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-4 rounded-t-lg">
          <div className="flex items-center">
            <div className="bg-white rounded-lg p-2 flex items-center justify-center">
              <img
                src="https://cdn.builder.io/api/v1/image/assets%2Ff0451246846a40baae39ad411a7b4867%2Fc5e2557623b347548bfbe225119d3175?format=webp&width=800"
                alt="UISEK"
                className="h-6 w-auto object-contain"
              />
            </div>
            <div className="ml-3">
              <h2 className="text-white font-semibold">Asistente Tributario IA</h2>
              <p className="text-blue-100 text-sm">Consulta inteligente de datos fiscales</p>
            </div>
          </div>
        </div>

        {/* Banner informativo y consultas predefinidas */}
        {messages.length === 1 && (
          <>
            {/* Banner de capacidades */}
            <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 border-b border-gray-200">
              <div className="flex items-center mb-3">
                <div className="p-2 bg-blue-100 rounded-full mr-3">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">🚀 Potenciado con IA Avanzada</h3>
                  <p className="text-sm text-gray-600">Conectado a todos tus datos fiscales en tiempo real</p>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                  <span className="text-gray-700">Análisis de ventas</span>
                </div>
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-blue-400 rounded-full mr-2"></div>
                  <span className="text-gray-700">Cálculos tributarios</span>
                </div>
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-purple-400 rounded-full mr-2"></div>
                  <span className="text-gray-700">Predicciones fiscales</span>
                </div>
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-orange-400 rounded-full mr-2"></div>
                  <span className="text-gray-700">Reportes automáticos</span>
                </div>
              </div>
            </div>

            {/* Consultas predefinidas */}
            <div className="p-4 border-b border-gray-200">
              <p className="text-sm text-gray-600 mb-3">💡 Prueba estas consultas:</p>
              <div className="flex flex-wrap gap-2">
                {predefinedQueries.map((query, index) => (
                  <button
                    key={index}
                    onClick={() => handlePredefinedQuery(query)}
                    className="px-3 py-2 text-xs bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-all duration-200 shadow-sm"
                  >
                    {query}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex items-start space-x-3 max-w-4xl ${message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                {/* Avatar */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium ${
                  message.role === 'user' ? 'bg-blue-600' : 'bg-gray-700'
                }`}>
                  {message.role === 'user' ? 'TÚ' : 'IA'}
                </div>

                {/* Message Content */}
                <div className={`px-4 py-3 rounded-lg ${
                  message.role === 'user' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-900'
                }`}>
                  <div className="whitespace-pre-line">
                    {message.content}
                  </div>
                  <div className={`text-xs mt-2 ${
                    message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                  }`}>
                    {message.timestamp.toLocaleTimeString('es-ES', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex justify-start">
              <div className="flex items-start space-x-3 max-w-4xl">
                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-700 text-white text-sm font-medium">
                  IA
                </div>
                <div className="px-4 py-3 rounded-lg bg-gray-100">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-200 p-4">
          <div className="flex items-end space-x-3">
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Pregúntame sobre tus ventas, gastos, retenciones, obligaciones..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none min-h-[50px] max-h-[120px]"
                disabled={isTyping}
                rows={1}
              />
            </div>
            <button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isTyping}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white p-3 rounded-lg transition-colors duration-200 flex items-center justify-center"
            >
              {isTyping ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              )}
            </button>
          </div>
          <div className="mt-2 text-xs text-gray-500 flex items-center justify-between">
            <span>Presiona Enter para enviar • Shift+Enter para nueva línea</span>
            <span className="flex items-center">
              <div className="w-2 h-2 bg-green-400 rounded-full mr-1"></div>
              Conectado a tus datos
            </span>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
