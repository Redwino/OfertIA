import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Tag, 
  MapPin, 
  CheckCircle2, 
  AlertCircle, 
  ChevronRight,
  Sparkles,
  ShoppingBag,
  Plus,
  Trash2,
  ExternalLink,
  RefreshCw,
  CalendarCheck
} from 'lucide-react';
import { Category, Promotion, UserAccount, UserLocation, UserPaymentMethod } from '../types/index.ts';
import { CATEGORY_LABELS } from '../data/promotions.ts';
import { checkPaymentCompatibility } from '../utils/discount-engine.ts';
import { 
  createCalendarEvent, 
  deleteCalendarEvent, 
  listUpcomingCalendarEvents, 
  GoogleCalendarEvent 
} from '../services/google-calendar.ts';
import { googleSignIn, isGoogleConnected, getAccessToken } from '../services/google-auth.ts';

interface CalendarViewProps {
  promotions: Promotion[];
  userLocation: UserLocation;
  userPaymentMethods: UserPaymentMethod[];
  onOpenPromoDetail: (promo: Promotion) => void;
  currentUser?: UserAccount;
  onOpenAuthModal?: () => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  promotions,
  userLocation,
  userPaymentMethods,
  onOpenPromoDetail,
  currentUser,
  onOpenAuthModal,
}) => {
  const [selectedDay, setSelectedDay] = useState<number>(new Date().getDay());
  const [selectedCategory, setSelectedCategory] = useState<string>('todas');
  const [onlyCompatible, setOnlyCompatible] = useState<boolean>(true);

  // Google Calendar Integration State
  const [calendarEvents, setCalendarEvents] = useState<GoogleCalendarEvent[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const [calendarError, setCalendarError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Modal de confirmación para Agendar Evento (MANDATORY User Confirmation)
  const [promoToSchedule, setPromoToSchedule] = useState<Promotion | null>(null);
  const [scheduleDate, setScheduleDate] = useState<string>('');
  const [scheduleTime, setScheduleTime] = useState<string>('10:00');
  const [isScheduling, setIsScheduling] = useState(false);
  const [scheduleSuccessMessage, setScheduleSuccessMessage] = useState<string | null>(null);

  // Modal de confirmación para Eliminar Evento (MANDATORY User Confirmation)
  const [eventToDelete, setEventToDelete] = useState<GoogleCalendarEvent | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const daysOfWeek = [
    { index: 1, label: 'Lunes', short: 'Lun' },
    { index: 2, label: 'Martes', short: 'Mar' },
    { index: 3, label: 'Miércoles', short: 'Mié' },
    { index: 4, label: 'Jueves', short: 'Jue' },
    { index: 5, label: 'Viernes', short: 'Vie' },
    { index: 6, label: 'Sábado', short: 'Sáb' },
    { index: 0, label: 'Domingo', short: 'Dom' },
  ];

  // Helper para calcular la próxima fecha correspondiente a un día de la semana
  const getNextDateForDay = (dayIndex: number): string => {
    const today = new Date();
    const currentDay = today.getDay();
    let diff = dayIndex - currentDay;
    if (diff < 0) diff += 7;
    const target = new Date();
    target.setDate(today.getDate() + diff);
    return target.toISOString().split('T')[0];
  };

  // Cargar eventos del calendario si el usuario está autenticado
  const fetchEvents = async () => {
    const token = await getAccessToken();
    if (!token) {
      setIsConnected(false);
      return;
    }
    setIsConnected(true);
    setIsLoadingEvents(true);
    setCalendarError(null);
    try {
      const items = await listUpcomingCalendarEvents(10);
      setCalendarEvents(items);
    } catch (err: any) {
      console.error(err);
      setCalendarError(err.message || 'Error al conectar con Google Calendar');
    } finally {
      setIsLoadingEvents(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [currentUser]);

  const handleConnectGoogle = async () => {
    try {
      const result = await googleSignIn();
      if (result) {
        setIsConnected(true);
        fetchEvents();
      }
    } catch (err: any) {
      setCalendarError(err.message || 'Error al autenticar con Google');
    }
  };

  // Preparar confirmación de creación de evento
  const handleInitiateSchedule = (promo: Promotion) => {
    const nextDate = getNextDateForDay(promo.applicableDays[0] ?? new Date().getDay());
    setPromoToSchedule(promo);
    setScheduleDate(nextDate);
    setScheduleTime(promo.applicableHours ? promo.applicableHours.start : '10:00');
  };

  // Confirmar y crear evento en Google Calendar
  const handleConfirmSchedule = async () => {
    if (!promoToSchedule || !scheduleDate) return;
    setIsScheduling(true);
    setCalendarError(null);

    try {
      const startDateTime = `${scheduleDate}T${scheduleTime}:00-03:00`;
      // 1 hora de duración estimada
      const endHour = (parseInt(scheduleTime.split(':')[0], 10) + 1).toString().padStart(2, '0');
      const endDateTime = `${scheduleDate}T${endHour}:${scheduleTime.split(':')[1]}:00-03:00`;

      await createCalendarEvent({
        summary: `🛒 Compra en ${promoToSchedule.storeName} (${promoToSchedule.discountPercentage}% OFF)`,
        description: `Promoción OfertIA:\n- Descuento: ${promoToSchedule.discountPercentage}%\n- Pagar con: ${promoToSchedule.paymentInstrument} (${promoToSchedule.issuer})\n- Tope de reintegro: $${promoToSchedule.maxCashback.toLocaleString('es-AR')}\n- Sucursal: ${promoToSchedule.branchName}`,
        location: `${promoToSchedule.coordinates.address}, ${promoToSchedule.coordinates.city || 'Buenos Aires'}`,
        startDateTime,
        endDateTime,
      });

      setScheduleSuccessMessage(
        `¡Agendado con éxito en tu Google Calendar para el ${scheduleDate} a las ${scheduleTime} hs!`
      );
      setPromoToSchedule(null);
      await fetchEvents();
    } catch (err: any) {
      setCalendarError(err.message || 'Error al agendar en Google Calendar');
    } finally {
      setIsScheduling(false);
    }
  };

  // Confirmar y eliminar evento de Google Calendar
  const handleConfirmDeleteEvent = async () => {
    if (!eventToDelete) return;
    setIsDeleting(true);
    try {
      await deleteCalendarEvent(eventToDelete.id);
      setEventToDelete(null);
      await fetchEvents();
    } catch (err: any) {
      setCalendarError(err.message || 'Error al eliminar el evento de Google Calendar');
    } finally {
      setIsDeleting(false);
    }
  };

  // Filtrar promociones por día seleccionado
  const dayPromotions = promotions.filter((promo) => {
    if (promo.verificationStatus === 'EXPIRED') return false;
    if (!promo.applicableDays.includes(selectedDay)) return false;
    if (selectedCategory !== 'todas' && promo.category !== selectedCategory) return false;

    if (onlyCompatible) {
      const compatibility = checkPaymentCompatibility(promo, userPaymentMethods);
      if (!compatibility.isCompatible) return false;
    }

    return true;
  });

  const currentDayInfo = daysOfWeek.find((d) => d.index === selectedDay) || daysOfWeek[0];
  const isToday = selectedDay === new Date().getDay();

  return (
    <div className="space-y-6">
      {/* Mensaje de éxito si se agendó */}
      {scheduleSuccessMessage && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center justify-between text-sm text-emerald-800 dark:text-emerald-300">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span>{scheduleSuccessMessage}</span>
          </div>
          <button
            onClick={() => setScheduleSuccessMessage(null)}
            className="text-xs font-semibold text-emerald-700 hover:underline"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* Header con Sincronización de Google Calendar */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider mb-1">
              <CalendarIcon className="w-4 h-4 text-emerald-600" />
              <span>Cronograma Semanal y Google Calendar</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Planificador de Ahorro y Compras
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Organiza tus compras por día y sincroniza recordatorios de descuentos directamente en tu Google Calendar.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto">
            {isConnected ? (
              <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-3 py-1.5 rounded-xl text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                <CalendarCheck className="w-4 h-4 text-emerald-600" />
                <span>Google Calendar Conectado</span>
                <button
                  onClick={fetchEvents}
                  disabled={isLoadingEvents}
                  className="p-1 hover:bg-emerald-100 dark:hover:bg-emerald-900 rounded-md transition-colors"
                  title="Actualizar eventos"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingEvents ? 'animate-spin' : ''}`} />
                </button>
              </div>
            ) : (
              <button
                onClick={handleConnectGoogle}
                className="flex items-center gap-2 px-3.5 py-2 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
              >
                <CalendarIcon className="w-4 h-4 text-emerald-400" />
                <span>Conectar Google Calendar</span>
              </button>
            )}

            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-xl cursor-pointer">
              <input
                type="checkbox"
                checked={onlyCompatible}
                onChange={(e) => setOnlyCompatible(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
              />
              <span className="hidden sm:inline">Solo con mis tarjetas</span>
            </label>
          </div>
        </div>

        {/* Selector de días de la semana (Lunes a Domingo) */}
        <div className="grid grid-cols-7 gap-2 mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
          {daysOfWeek.map((day) => {
            const isSelected = selectedDay === day.index;
            const isTodayDay = day.index === new Date().getDay();

            const countForDay = promotions.filter((p) => {
              if (!p.applicableDays.includes(day.index)) return false;
              if (onlyCompatible) {
                return checkPaymentCompatibility(p, userPaymentMethods).isCompatible;
              }
              return true;
            }).length;

            return (
              <button
                key={day.index}
                onClick={() => setSelectedDay(day.index)}
                className={`flex flex-col items-center justify-center py-3 px-2 rounded-2xl transition-all border text-center ${
                  isSelected
                    ? 'bg-slate-900 dark:bg-emerald-600 text-white border-slate-900 dark:border-emerald-600 shadow-sm'
                    : 'bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <div className="text-[11px] font-medium uppercase tracking-wider">
                  {day.short}
                </div>
                <div className="text-base font-bold mt-0.5">
                  {day.label}
                </div>
                {isTodayDay && (
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded mt-1 ${isSelected ? 'bg-emerald-400 text-slate-950' : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'}`}>
                    HOY
                  </span>
                )}
                <div className={`text-[10px] mt-1 font-mono ${isSelected ? 'text-slate-300' : 'text-slate-500 dark:text-slate-400'}`}>
                  {countForDay} ofertas
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Sección de Próximos Recordatorios de Google Calendar (si está conectado) */}
      {isConnected && (
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <CalendarCheck className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Próximos Eventos en tu Google Calendar
              </h3>
            </div>
            <a
              href="https://calendar.google.com"
              target="_blank"
              rel="noreferrer"
              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
            >
              <span>Abrir Google Calendar</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {calendarEvents.length === 0 ? (
            <div className="text-xs text-slate-400 p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl text-center">
              No tienes compras o recordatorios pendientes agendados. ¡Utiliza el botón &quot;Agendar en Google Calendar&quot; en cualquier promoción!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {calendarEvents.map((evt) => {
                const startTime = evt.start.dateTime
                  ? new Date(evt.start.dateTime).toLocaleString('es-AR', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })
                  : evt.start.date || 'Todo el día';

                return (
                  <div
                    key={evt.id}
                    className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col justify-between"
                  >
                    <div>
                      <div className="font-bold text-xs text-slate-900 dark:text-white truncate">
                        {evt.summary}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{startTime}</span>
                      </div>
                      {evt.location && (
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          <span className="truncate">{evt.location}</span>
                        </div>
                      )}
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
                      {evt.htmlLink && (
                        <a
                          href={evt.htmlLink}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                        >
                          Ver evento
                        </a>
                      )}
                      <button
                        onClick={() => setEventToDelete(evt)}
                        className="text-[10px] font-semibold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Eliminar</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Listado de Oportunidades para el Día Seleccionado */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Promociones recomendadas para el {currentDayInfo.label} {isToday && '(Hoy)'}
          </h2>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            {dayPromotions.length} oportunidades encontradas
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {dayPromotions.map((promo) => {
            const payment = checkPaymentCompatibility(promo, userPaymentMethods);

            return (
              <div
                key={promo.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-400 dark:hover:border-emerald-600 rounded-3xl p-5 shadow-xs transition-all flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700 dark:text-slate-300 capitalize">
                      {CATEGORY_LABELS[promo.category]?.label || promo.category}
                    </span>
                    <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                      {promo.discountPercentage}% OFF
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">{promo.title}</h3>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {promo.storeName} · {promo.branchName}
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl text-xs space-y-1.5 border border-slate-100 dark:border-slate-800">
                    <div className="flex justify-between text-slate-600 dark:text-slate-300">
                      <span className="text-slate-500 dark:text-slate-400">Medio a utilizar:</span>
                      <strong className="text-slate-900 dark:text-white">{promo.issuer} ({promo.paymentInstrument})</strong>
                    </div>
                    <div className="flex justify-between text-slate-600 dark:text-slate-300">
                      <span className="text-slate-500 dark:text-slate-400">Tope de reintegro:</span>
                      <strong className="font-mono text-slate-900 dark:text-white">
                        {promo.maxCashback > 0 ? `$${promo.maxCashback.toLocaleString('es-AR')}` : 'Sin tope'}
                      </strong>
                    </div>
                    {promo.applicableHours && (
                      <div className="flex justify-between text-slate-600 dark:text-slate-300">
                        <span className="text-slate-500 dark:text-slate-400">Horario habilitado:</span>
                        <span>{promo.applicableHours.start} a {promo.applicableHours.end} hs</span>
                      </div>
                    )}
                  </div>

                  {payment.isCompatible ? (
                    <div className="flex items-center gap-1.5 text-xs text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 p-2.5 rounded-xl border border-emerald-100 dark:border-emerald-900">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Tienes medio compatible: <strong>{payment.matchingMethod?.name}</strong></span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-xs text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 p-2.5 rounded-xl border border-amber-100 dark:border-amber-900">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>{payment.reasons[0]}</span>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <button
                    onClick={() => onOpenPromoDetail(promo)}
                    className="text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center gap-1"
                  >
                    <span>Ver detalles</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleInitiateSchedule(promo)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
                  >
                    <CalendarIcon className="w-3.5 h-3.5" />
                    <span>Agendar en Calendar</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal de Confirmación para Crear Evento en Google Calendar (MANDATORY User Confirmation) */}
      {promoToSchedule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center">
                <CalendarIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Confirmar Agendado en Google Calendar
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Se creará un nuevo evento con recordatorio en tu calendario principal con tu permiso.
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-700 space-y-2 text-xs">
              <div>
                <span className="text-slate-500 dark:text-slate-400">Comercio y Descuento:</span>
                <div className="font-bold text-slate-900 dark:text-white">
                  {promoToSchedule.storeName} — {promoToSchedule.discountPercentage}% OFF
                </div>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400">Medio de pago sugerido:</span>
                <div className="font-semibold text-emerald-700 dark:text-emerald-400">
                  {promoToSchedule.paymentInstrument} ({promoToSchedule.issuer})
                </div>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400">Dirección:</span>
                <div className="text-slate-700 dark:text-slate-300">
                  {promoToSchedule.coordinates.address}
                </div>
              </div>

              {/* Selector de fecha y hora */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Fecha:
                  </label>
                  <input
                    type="date"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Hora:
                  </label>
                  <input
                    type="time"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setPromoToSchedule(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmSchedule}
                disabled={isScheduling}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs"
              >
                {isScheduling ? 'Agendando...' : 'Confirmar y Agendar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmación para Eliminar Evento de Google Calendar (MANDATORY User Confirmation) */}
      {eventToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-950 text-rose-600 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  ¿Eliminar evento de Google Calendar?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Esta acción eliminará el evento de tu cuenta de Google Calendar con tu permiso.
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 font-medium">
              &quot;{eventToDelete.summary}&quot;
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setEventToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDeleteEvent}
                disabled={isDeleting}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-xs"
              >
                {isDeleting ? 'Eliminando...' : 'Sí, Eliminar Evento'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
