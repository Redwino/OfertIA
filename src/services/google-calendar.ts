import { getAccessToken } from './google-auth.ts';

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  htmlLink?: string;
  start: {
    dateTime?: string;
    date?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
  };
}

export interface CreateEventParams {
  summary: string;
  description: string;
  location?: string;
  startDateTime: string; // ISO string e.g. 2026-10-20T10:00:00-03:00
  endDateTime: string;   // ISO string e.g. 2026-10-20T11:00:00-03:00
}

/**
 * List upcoming events from primary Google Calendar
 */
export const listUpcomingCalendarEvents = async (maxResults = 10): Promise<GoogleCalendarEvent[]> => {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Debes iniciar sesión con Google para ver tus eventos de calendario.');
  }

  const now = new Date().toISOString();
  const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(
    now
  )}&maxResults=${maxResults}&orderBy=startTime&singleEvents=true`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(
      errorData.error?.message || `Error al consultar Google Calendar (HTTP ${res.status})`
    );
  }

  const data = await res.json();
  return (data.items || []) as GoogleCalendarEvent[];
};

/**
 * Create a new event in the primary Google Calendar
 * Note: Caller must provide explicit user confirmation before calling this function!
 */
export const createCalendarEvent = async (params: CreateEventParams): Promise<GoogleCalendarEvent> => {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Debes iniciar sesión con Google para agendar en Google Calendar.');
  }

  const payload = {
    summary: params.summary,
    description: params.description,
    location: params.location || '',
    start: {
      dateTime: params.startDateTime,
    },
    end: {
      dateTime: params.endDateTime,
    },
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: 30 },
        { method: 'popup', minutes: 120 },
      ],
    },
  };

  const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(
      errorData.error?.message || `Error al crear evento en Google Calendar (HTTP ${res.status})`
    );
  }

  return (await res.json()) as GoogleCalendarEvent;
};

/**
 * Delete an event from Google Calendar
 * Note: Caller must provide explicit user confirmation before calling this function!
 */
export const deleteCalendarEvent = async (eventId: string): Promise<boolean> => {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Debes iniciar sesión con Google para eliminar el evento.');
  }

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(eventId)}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!res.ok && res.status !== 204) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(
      errorData.error?.message || `Error al eliminar evento en Google Calendar (HTTP ${res.status})`
    );
  }

  return true;
};

/**
 * Helper alias for creating savings itinerary calendar events
 */
export const createSavingsCalendarEvent = async (params: {
  summary: string;
  description: string;
  location?: string;
  startTime: string;
  endTime: string;
}): Promise<GoogleCalendarEvent> => {
  return createCalendarEvent({
    summary: params.summary,
    description: params.description,
    location: params.location,
    startDateTime: params.startTime,
    endDateTime: params.endTime,
  });
};
