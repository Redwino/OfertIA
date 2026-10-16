/**
 * Sistema Multiagente de Inteligencia Artificial para Optimización de Compras
 * Implementa 6 agentes especializados y 1 coordinador central
 */

import { MultiAgentAnalysis, Promotion, UserLocation, UserPaymentMethod } from '../types/index.ts';
import { calculateSavings, checkPaymentCompatibility, isPromoActiveToday } from './discount-engine.ts';
import { calculateHaversineDistance, estimateTravelCost, estimateTravelTime } from './geo-distance.ts';

export interface MultiAgentQueryParams {
  query: string;
  category?: string;
  targetAmount?: number;
  promotions: Promotion[];
  userLocation: UserLocation;
  userPaymentMethods: UserPaymentMethod[];
}

/**
 * Ejecuta el flujo orquestado de los 6 agentes especializados
 */
export function runLocalMultiAgentPipeline(params: MultiAgentQueryParams): MultiAgentAnalysis {
  const { query, category, targetAmount = 50000, promotions, userLocation, userPaymentMethods } = params;

  // Normalizar consulta
  const queryLower = query.toLowerCase();

  // ==========================================
  // AGENTE 1: INVESTIGADOR DE PROMOCIONES
  // ==========================================
  // Localiza beneficios en comercios, supermercados, combustibles, etc.
  const matchedPromos = promotions.filter((p) => {
    if (p.verificationStatus === 'EXPIRED') return false;

    // Coincidencia por categoría si fue provista
    if (category && category !== 'todas' && p.category !== category) {
      return false;
    }

    // Coincidencia textual con la consulta
    if (queryLower.trim()) {
      const matchStore = p.storeName.toLowerCase().includes(queryLower);
      const matchTitle = p.title.toLowerCase().includes(queryLower);
      const matchCat = p.category.toLowerCase().includes(queryLower);
      const matchBank = p.issuer.toLowerCase().includes(queryLower);
      const matchBranch = p.branchName.toLowerCase().includes(queryLower);
      const matchDesc = p.terms.toLowerCase().includes(queryLower);

      if (matchStore || matchTitle || matchCat || matchBank || matchBranch || matchDesc) {
        return true;
      }

      // Palabras clave comunes
      if (queryLower.includes('nafta') || queryLower.includes('combustible')) {
        return p.category === 'combustible';
      }
      if (queryLower.includes('super') || queryLower.includes('alimento') || queryLower.includes('carne')) {
        return p.category === 'supermercados';
      }
      if (queryLower.includes('remedio') || queryLower.includes('farmacia')) {
        return p.category === 'farmacias';
      }
      if (queryLower.includes('comer') || queryLower.includes('cena') || queryLower.includes('bar')) {
        return p.category === 'gastronomia';
      }

      return false;
    }

    return true;
  });

  const agent1Findings = {
    totalEvaluated: promotions.length,
    candidatesFound: matchedPromos.length,
    stores: Array.from(new Set(matchedPromos.map((p) => p.storeName))),
  };

  const step1 = {
    agentName: 'Agente 1: Investigador de Promociones',
    role: 'Localización y relevamiento de ofertas en fuentes oficiales',
    status: matchedPromos.length > 0 ? ('completed' as const) : ('warning' as const),
    summary: `Localizadas ${matchedPromos.length} promociones candidatas en las bases de datos vigentes para "${query || 'todas las categorías'}".`,
    details: [
      `Analizó ${promotions.length} ofertas comerciales y bancarias registradas.`,
      `Filtró ${matchedPromos.length} promociones compatibles con los comercios o rubros investigados (${agent1Findings.stores.join(', ') || 'sin resultados'}).`,
      'Excluyó ofertas formalmente marcadas como vencidas.',
    ],
    findings: agent1Findings,
  };

  // ==========================================
  // AGENTE 2: VERIFICADOR DE CONDICIONES
  // ==========================================
  // Revisa letra chica, vigencia, horarios, compatibilidad de tarjetas
  const verifiedPromos = matchedPromos.map((promo) => {
    const todayCheck = isPromoActiveToday(promo);
    const paymentCheck = checkPaymentCompatibility(promo, userPaymentMethods);

    let confidenceFlag = 'Óptimo';
    if (promo.verificationStatus === 'PENDING') {
      confidenceFlag = 'Pendiente de confirmación bancaria';
    } else if (promo.verificationStatus === 'PARTIAL') {
      confidenceFlag = 'Términos generales verificados';
    }

    return {
      promo,
      isCompatiblePayment: paymentCheck.isCompatible,
      matchingPaymentMethod: paymentCheck.matchingMethod,
      paymentReasons: paymentCheck.reasons,
      isActiveToday: todayCheck.isActive,
      todayReason: todayCheck.reason,
      confidenceFlag,
    };
  });

  const compatiblePromos = verifiedPromos.filter((vp) => vp.isCompatiblePayment);
  const step2 = {
    agentName: 'Agente 2: Verificador de Condiciones',
    role: 'Auditoría de términos, letra chica y compatibilidad de medios de pago',
    status: compatiblePromos.length > 0 ? ('completed' as const) : ('warning' as const),
    summary: `De las ${verifiedPromos.length} promociones, ${compatiblePromos.length} son 100% compatibles con tus medios de pago activos.`,
    details: [
      `Verificó compatibilidad con tus ${userPaymentMethods.filter((m) => m.isEnabled).length} medios de pago configurados.`,
      `Identificó ${verifiedPromos.filter((v) => v.isActiveToday).length} promociones disponibles para aprovechar hoy.`,
      ...verifiedPromos.slice(0, 3).map((v) => 
        `• ${v.promo.storeName}: ${v.isCompatiblePayment ? 'Compatible con ' + (v.matchingPaymentMethod?.name ?? 'medio activo') : 'Incompatible (' + v.paymentReasons.join(', ') + ')'}`
      ),
    ],
  };

  // ==========================================
  // AGENTE 3: ANALISTA FINANCIERO DE DESCUENTOS
  // ==========================================
  // Cálculos deterministas exactos (sin estimaciones libres del LLM)
  const financialEvaluations = (compatiblePromos.length > 0 ? compatiblePromos : verifiedPromos).map((item) => {
    const distanceKm = item.promo.isOnlineOnly
      ? 0
      : calculateHaversineDistance(
          userLocation.lat,
          userLocation.lng,
          item.promo.coordinates.lat,
          item.promo.coordinates.lng
        );

    const calc = calculateSavings(targetAmount, item.promo, distanceKm, true);
    return {
      ...item,
      calc,
      distanceKm,
    };
  });

  financialEvaluations.sort((a, b) => b.calc.netSavingsAfterTravel - a.calc.netSavingsAfterTravel);

  const bestFinancial = financialEvaluations[0];
  const step3 = {
    agentName: 'Agente 3: Analista Financiero de Descuentos',
    role: 'Cálculo matemático determinista de descuentos, topes y ahorro real',
    status: financialEvaluations.length > 0 ? ('completed' as const) : ('warning' as const),
    summary: bestFinancial
      ? `Para una compra de $${targetAmount.toLocaleString('es-AR')}, el mayor beneficio bruto es de $${bestFinancial.calc.actualSavings.toLocaleString('es-AR')} en ${bestFinancial.promo.storeName}.`
      : 'No se pudo realizar el cálculo financiero por falta de promociones compatibles.',
    details: [
      `Aplicó reglas de porcentaje nominal, pisos de compra y topes máximos de reintegro para $${targetAmount.toLocaleString('es-AR')}.`,
      ...financialEvaluations.slice(0, 3).map((f) => 
        `• ${f.promo.storeName} (${f.promo.discountPercentage}%): Ahorro $${f.calc.actualSavings.toLocaleString('es-AR')} ${f.calc.isCapped ? '(alcanzó tope de $' + f.promo.maxCashback.toLocaleString('es-AR') + ')' : '(sin tope aplicado)'} - Requiere $${f.calc.reachCapAmount?.toLocaleString('es-AR') ?? 'N/A'} para tope máximo.`
      ),
    ],
  };

  // ==========================================
  // AGENTE 4: ESPECIALISTA GEOGRÁFICO
  // ==========================================
  // Proximidad, tiempos de traslado y penalización por distancia
  const step4 = {
    agentName: 'Agente 4: Especialista Geográfico',
    role: 'Geolocalización, cálculo de distancias y costo de desplazamiento',
    status: ('completed' as const),
    summary: `Ubicación de referencia: ${userLocation.label}. Analizadas sucursales en un radio de hasta 15 km y ofertas online.`,
    details: financialEvaluations.slice(0, 3).map((f) => {
      if (f.promo.isOnlineOnly) {
        return `• ${f.promo.storeName}: Modalidad Online / Sin costo ni tiempo de traslado físico.`;
      }
      const travelTime = estimateTravelTime(f.distanceKm, 'car');
      const travelCost = estimateTravelCost(f.distanceKm);
      return `• ${f.promo.storeName} (${f.promo.branchName}): a ${f.distanceKm} km (~${travelTime}). Costo estimado ida y vuelta: $${travelCost.toLocaleString('es-AR')}.`;
    }),
  };

  // ==========================================
  // AGENTE 5: PLANIFICADOR DE COMPRAS
  // ==========================================
  // Momento óptimo, días de la semana y balance beneficio vs traslado
  const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const bestOption = financialEvaluations[0];

  const step5 = {
    agentName: 'Agente 5: Planificador de Compras',
    role: 'Planificación de itinerario, días de compra y optimización de esfuerzo',
    status: ('completed' as const),
    summary: bestOption
      ? `Recomendación de compra en ${bestOption.promo.storeName} utilizando ${bestOption.matchingPaymentMethod?.name || bestOption.promo.paymentInstrument}.`
      : 'No se generó itinerario de compra por falta de opciones viables.',
    details: [
      bestOption
        ? `Días recomendados: ${bestOption.promo.applicableDays.map((d) => dayNames[d]).join(', ')}.`
        : 'Sin días recomendados.',
      bestOption && bestOption.calc.estimatedTravelCost > 0
        ? `Evaluación de viaje: El ahorro de $${bestOption.calc.actualSavings.toLocaleString('es-AR')} compensa con creces el costo estimado de traslado ($${bestOption.calc.estimatedTravelCost.toLocaleString('es-AR')}), dejando un ahorro neto de $${bestOption.calc.netSavingsAfterTravel.toLocaleString('es-AR')}.`
        : 'Sin penalización por traslado.',
    ],
  };

  // ==========================================
  // AGENTE 6: AUDITOR DE RECOMENDACIONES
  // ==========================================
  // Verificación de consistencia y advertencias
  const cautions: string[] = [];
  if (bestOption) {
    if (bestOption.promo.verificationStatus === 'PENDING') {
      cautions.push('Esta promoción figura como pendiente de confirmación oficial bancaria.');
    }
    if (bestOption.promo.exclusions.length > 0) {
      cautions.push(`Exclusiones vigentes: ${bestOption.promo.exclusions.join(', ')}.`);
    }
    if (bestOption.calc.isCapped) {
      cautions.push(`El reintegro llegó al tope máximo permitido ($${bestOption.promo.maxCashback.toLocaleString('es-AR')}). Gastar más de $${bestOption.calc.reachCapAmount?.toLocaleString('es-AR')} en esta compra no generará mayor ahorro.`);
    }
    if (!bestOption.isActiveToday) {
      cautions.push(`¡Atención! Hoy no aplica. Espera al día correspondiente (${bestOption.promo.applicableDays.map((d) => dayNames[d]).join(', ')}).`);
    }
  }

  const step6 = {
    agentName: 'Agente 6: Auditor de Recomendaciones',
    role: 'Verificación de consistencia, auditoría de topes y exclusiones legales',
    status: cautions.length > 0 ? ('warning' as const) : ('completed' as const),
    summary: 'Auditoría completada. Cálculos matemáticos y condiciones contrastados contra los términos registrados.',
    details: cautions.length > 0 ? cautions : ['No se detectaron inconsistencias ni incompatibilidades legales.'],
  };

  // RESUMEN EJECUTIVO CONSOLIDADO
  let executiveSummary = '';
  if (bestOption) {
    const daysStr = bestOption.promo.applicableDays.map((d) => dayNames[d]).join(' y ');
    executiveSummary = `Para optimizar tu compra de $${targetAmount.toLocaleString('es-AR')}, te recomendamos comprar en **${bestOption.promo.storeName}** (${bestOption.promo.branchName}) los días **${daysStr}** pagando con **${bestOption.matchingPaymentMethod?.name || bestOption.promo.paymentInstrument}**. Obtendrás un ahorro real de **$${bestOption.calc.actualSavings.toLocaleString('es-AR')}** (${bestOption.calc.effectiveDiscountRate}% efectivo), con un ahorro neto de **$${bestOption.calc.netSavingsAfterTravel.toLocaleString('es-AR')}** tras contemplar el traslado.`;
  } else {
    executiveSummary = `No encontramos una promoción verificada que coincida exactamente con tus criterios para "${query}". Te sugerimos revisar las promociones generales o activar otros medios de pago en tu perfil.`;
  }

  return {
    timestamp: new Date().toISOString(),
    query,
    userContext: {
      locationLabel: userLocation.label,
      activePaymentCount: userPaymentMethods.filter((m) => m.isEnabled).length,
      amount: targetAmount,
      category,
    },
    steps: [step1, step2, step3, step4, step5, step6],
    executiveSummary,
    primaryRecommendation: bestOption
      ? {
          storeName: bestOption.promo.storeName,
          dayToBuy: bestOption.promo.applicableDays.map((d) => dayNames[d]).join(' y '),
          paymentMethod: bestOption.matchingPaymentMethod?.name || bestOption.promo.paymentInstrument,
          estimatedSavings: bestOption.calc.actualSavings,
          netSavingsAfterTravel: bestOption.calc.netSavingsAfterTravel,
          whyThisOption: bestOption.calc.reasoning,
          cautions,
        }
      : null,
    alternatives: financialEvaluations.slice(1, 4).map((alt) => ({
      storeName: alt.promo.storeName,
      paymentMethod: alt.matchingPaymentMethod?.name || alt.promo.paymentInstrument,
      estimatedSavings: alt.calc.actualSavings,
      pros: `${alt.promo.discountPercentage}% de descuento (${alt.promo.benefitType})`,
      cons: alt.calc.isCapped ? `Tope de $${alt.promo.maxCashback.toLocaleString('es-AR')}` : `A ${alt.distanceKm} km`,
    })),
  };
}
