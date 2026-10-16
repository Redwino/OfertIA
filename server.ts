import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  app.use(express.json());

  // Inicializar cliente Gemini del lado del servidor de acuerdo a los estándares
  let ai: GoogleGenAI | null = null;
  if (process.env.GEMINI_API_KEY) {
    try {
      ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });
    } catch (e) {
      console.warn('Advertencia al inicializar GoogleGenAI:', e);
    }
  }

  // Rutas de API
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      hasGeminiApiKey: Boolean(process.env.GEMINI_API_KEY),
    });
  });

  // Endpoint para consulta coordinada del Agente Coordinador
  app.post('/api/agent-query', async (req, res) => {
    const { query, userContext, deterministicData } = req.body;

    if (!ai || !process.env.GEMINI_API_KEY) {
      // Si no hay API key disponible en este entorno, responder con síntesis determinista auditada
      return res.json({
        source: 'deterministic_engine',
        aiEnhanced: false,
        analysis: deterministicData,
      });
    }

    try {
      const prompt = `
Actúa como el Agente Coordinador de AhorroPro, un sistema multiagente de optimización de compras y descuentos bancarios.
Tienes los resultados deterministas calculados por los 6 agentes especializados:

CONSULTA DEL USUARIO: "${query}"
CONTEXTO:
- Ubicación: ${userContext?.locationLabel || 'No especificada'}
- Medios de pago activos: ${userContext?.activePaymentCount || 0}
- Monto estimado de compra: $${userContext?.amount || 0}

RESULTADOS MATEMÁTICOS Y REGLAS CALCULADAS (ESTOS DATOS SON DETERMINISTAS Y NO DEBES ALTERAR SUS VALORES NI INVENTAR TOPES):
${JSON.stringify(deterministicData?.primaryRecommendation || {}, null, 2)}

PASOS PREVIOS DE LOS AGENTES:
${JSON.stringify(deterministicData?.steps || [], null, 2)}

Tu tarea:
Redacta un veredicto final claro, empático y directo en español rioplatense o neutro profesional para el usuario.
Responde estrictamente a:
1. ¿Dónde le conviene comprar y a qué sucursal ir?
2. ¿Qué día y horario exacto?
3. ¿Con qué medio de pago específico (banco, tarjeta o billetera)?
4. ¿Cuánto dinero ahorra exactamente (bruto y neto tras costo de viaje si aplica)?
5. ¿Qué precauciones o exclusiones de letra chica debe tener en cuenta?

Mantén la respuesta en 2 o 3 párrafos concisos y un listado scannable. No inventes números diferentes a los proporcionados.
`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
      });

      const aiText = response.text || '';

      return res.json({
        source: 'gemini_multiagent_orchestrator',
        aiEnhanced: true,
        aiVerdict: aiText,
        analysis: deterministicData,
      });
    } catch (err: any) {
      console.error('Error al consultar Gemini:', err);
      // Fallback seguro a la versión determinista
      return res.json({
        source: 'deterministic_engine_fallback',
        aiEnhanced: false,
        error: err.message,
        analysis: deterministicData,
      });
    }
  });

  // Endpoint de OCR inteligente para extracción de tickets de compra
  app.post('/api/ocr-ticket', async (req, res) => {
    const { imageBase64, mimeType = 'image/jpeg', rawText } = req.body;

    if (!ai || !process.env.GEMINI_API_KEY) {
      return res.json({
        source: 'deterministic_ocr_fallback',
        aiEnhanced: false,
        data: null,
      });
    }

    try {
      const prompt = `
Actúa como el motor de OCR y extracción de comprobantes de OfertIA.
Analiza la imagen o texto del ticket de compra comercial provisto.
Extrae estrictamente un objeto JSON con esta estructura exacta:
{
  "storeName": "Nombre del comercio (ej: Coto, Carrefour, YPF, Farmacity, Día)",
  "branchAddress": "Dirección o sucursal si figura",
  "dateTime": "Fecha y hora en formato ISO o YYYY-MM-DDTHH:mm:ss",
  "lineItems": [
    {
      "name": "Nombre claro del producto",
      "quantity": 1,
      "unitPrice": 1200,
      "totalPrice": 1200,
      "category": "supermercados" // supermercados, combustible, farmacias, gastronomia, etc.
    }
  ],
  "subtotal": 12000,
  "discountsApplied": 2400,
  "taxAmount": 0,
  "totalPaid": 9600,
  "paymentMethodIdentified": "Tarjeta de Crédito Visa Santander / MODO / Efectivo",
  "confidenceScore": 95
}

Asegúrate de que la suma de lineItems menos discountsApplied concuerde con totalPaid.
Si algún dato no figura con certeza, estima el valor más probable con menor confianza.
`;

      const contents: any[] = [];
      if (imageBase64) {
        contents.push({
          inlineData: {
            mimeType,
            data: imageBase64,
          },
        });
      }
      if (rawText) {
        contents.push({ text: `Texto previo extraído: \n${rawText}` });
      }
      contents.push({ text: prompt });

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents,
        config: {
          responseMimeType: 'application/json',
        },
      });

      const parsed = JSON.parse(response.text || '{}');
      return res.json({
        source: 'gemini_multimodal_ocr',
        aiEnhanced: true,
        data: parsed,
      });
    } catch (err: any) {
      console.error('Error en OCR con Gemini:', err);
      return res.json({
        source: 'ocr_error_fallback',
        aiEnhanced: false,
        error: err.message,
        data: null,
      });
    }
  });

  // Configuración de Vite o servidor estático
  const isProduction = process.env.NODE_ENV === 'production';
  if (isProduction) {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  const PORT = 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AhorroPro server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
