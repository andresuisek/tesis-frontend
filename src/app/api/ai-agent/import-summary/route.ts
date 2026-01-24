import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface ImportSummaryRequest {
  contribuyenteRuc: string;
  periodo: { mes: number; anio: number };
  ventasTotal: number;
  ventasCount: number;
  comprasTotal: number;
  comprasCount: number;
  ivaVentas: number;
  ivaCompras: number;
  retencionesTotal: number;
  facturasSinRetencion: number;
  proveedoresSinRubro: number;
}

interface Alert {
  type: "warning" | "info" | "success";
  icon: string;
  message: string;
}

interface ImportSummaryResponse {
  alerts: Alert[];
  recommendations: string[];
  insights: string[];
}

const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

export async function POST(request: NextRequest) {
  try {
    const body: ImportSummaryRequest = await request.json();

    const {
      periodo,
      ventasTotal,
      ventasCount,
      comprasTotal,
      comprasCount,
      ivaVentas,
      ivaCompras,
      retencionesTotal,
      facturasSinRetencion,
      proveedoresSinRubro,
    } = body;

    const ivaAPagar = Math.max(0, ivaVentas - ivaCompras);
    const mesNombre = MESES[periodo.mes - 1];

    // Construir prompt para OpenAI
    const prompt = `Eres un asistente tributario experto en normativa ecuatoriana. Analiza los siguientes datos de un contribuyente para ${mesNombre} ${periodo.anio} y proporciona alertas, recomendaciones e insights útiles.

DATOS DEL PERÍODO:
- Ventas: $${ventasTotal.toFixed(2)} (${ventasCount} documentos)
- Compras: $${comprasTotal.toFixed(2)} (${comprasCount} documentos)
- IVA en ventas: $${ivaVentas.toFixed(2)}
- Crédito tributario (IVA compras): $${ivaCompras.toFixed(2)}
- IVA a pagar estimado: $${ivaAPagar.toFixed(2)}
- Retenciones recibidas: $${retencionesTotal.toFixed(2)}
- Facturas sin retención asociada: ${facturasSinRetencion}
- Proveedores sin rubro asignado: ${proveedoresSinRubro}

INSTRUCCIONES:
1. Genera 1-2 alertas relevantes (warning/info/success) basadas en los datos
2. Genera 1-2 recomendaciones prácticas y específicas
3. Genera 1-2 insights interesantes sobre los datos

FORMATO DE RESPUESTA (JSON):
{
  "alerts": [
    { "type": "warning|info|success", "icon": "alert|info|check", "message": "texto corto" }
  ],
  "recommendations": ["recomendación 1", "recomendación 2"],
  "insights": ["insight 1", "insight 2"]
}

IMPORTANTE:
- Sé conciso, cada mensaje máximo 100 caracteres
- Usa fechas de vencimiento reales del SRI Ecuador (día 15-28 según noveno dígito del RUC)
- No repitas información obvia de los datos
- Enfócate en valor agregado y consejos prácticos`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "Eres un asistente tributario experto. Responde SOLO con JSON válido, sin markdown ni explicaciones adicionales.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    const responseText = completion.choices[0]?.message?.content || "{}";
    
    // Limpiar respuesta de posibles markdown
    const cleanedResponse = responseText
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    const parsedResponse: ImportSummaryResponse = JSON.parse(cleanedResponse);

    // Validar estructura
    const response: ImportSummaryResponse = {
      alerts: Array.isArray(parsedResponse.alerts) 
        ? parsedResponse.alerts.slice(0, 3) 
        : [],
      recommendations: Array.isArray(parsedResponse.recommendations) 
        ? parsedResponse.recommendations.slice(0, 3) 
        : [],
      insights: Array.isArray(parsedResponse.insights) 
        ? parsedResponse.insights.slice(0, 3) 
        : [],
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error generating import summary:", error);
    
    // Respuesta fallback si falla la IA
    return NextResponse.json({
      alerts: [],
      recommendations: [],
      insights: [],
    });
  }
}

