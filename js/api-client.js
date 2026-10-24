import { API_URL } from './config.js?v=5';

const DEFAULT_REQUEST_TIMEOUT = 15 * 1000;
const RETRYABLE_PUBLIC_STATUSES = new Set([404, 408, 429, 500, 502, 503, 504]);
const inFlightJSON = new Map();

function waitForRetry(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Solicitud cancelada', 'AbortError'));
      return;
    }

    const cleanup = () => signal?.removeEventListener('abort', abortWait);
    const timer = setTimeout(() => {
      cleanup();
      resolve();
    }, ms);
    const abortWait = () => {
      clearTimeout(timer);
      cleanup();
      reject(new DOMException('Solicitud cancelada', 'AbortError'));
    };
    signal?.addEventListener('abort', abortWait, { once: true });
  });
}

function waitForRequest(promise, signal) {
  if (!signal) return promise;
  if (signal.aborted) return Promise.reject(new DOMException('Solicitud cancelada', 'AbortError'));

  return new Promise((resolve, reject) => {
    const cleanup = () => signal.removeEventListener('abort', abortRequest);
    const abortRequest = () => {
      cleanup();
      reject(new DOMException('Solicitud cancelada', 'AbortError'));
    };

    signal.addEventListener('abort', abortRequest, { once: true });
    promise.then(
      value => {
        cleanup();
        resolve(value);
      },
      error => {
        cleanup();
        reject(error);
      }
    );
  });
}

async function fetchWithTimeout(
  url,
  fetchOptions = {},
  timeoutMs = DEFAULT_REQUEST_TIMEOUT,
  signal,
  consumeResponse
) {
  const controller = new AbortController();
  const abortRequest = () => controller.abort();
  const timeout = setTimeout(abortRequest, Math.max(1, Number(timeoutMs) || DEFAULT_REQUEST_TIMEOUT));

  if (signal?.aborted) controller.abort();
  else signal?.addEventListener('abort', abortRequest, { once: true });
  console.log(url)
  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal
    });
    return consumeResponse ? await consumeResponse(response) : response;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', abortRequest);
  }
}

function buildUrl(accion, params = {}, baseUrl = API_URL) {
  const query = new URLSearchParams({ accion });
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.set(key, String(value));
    }
  });
  return `${baseUrl}?${query.toString()}`;
}

export async function fetchJSON(accion, options = {}) {
  const {
    params = {},
    signal,
    fetchOptions = {},
    retries = 1,
    timeoutMs = DEFAULT_REQUEST_TIMEOUT,
    baseUrl = API_URL,
    abortUnderlying = false
  } = options;
  const url = buildUrl(accion, params, baseUrl);

  const createRequest = () => (async () => {
    let lastError;
    for (let attempt = 0; attempt <= retries; attempt += 1) {
      try {
        return await fetchWithTimeout(url, fetchOptions, timeoutMs, abortUnderlying ? signal : undefined, async (response) => {
          if (!response.ok) {
            const error = new Error(`HTTP ${response.status}`);
            error.status = response.status;
            throw error;
          }

          const raw = await response.text();
          try {
            return JSON.parse(raw);
          } catch (_) {
            throw new Error('Respuesta JSON invalida del servidor');
          }
        });
      } catch (error) {
        if (error?.name === 'AbortError' && signal?.aborted) throw error;
        lastError = error?.name === 'AbortError'
          ? new Error('El servidor demoro demasiado en responder')
          : error;
        const retryable = !error?.status || RETRYABLE_PUBLIC_STATUSES.has(error.status);
        if (attempt >= retries || !retryable) break;
        await waitForRetry(450 * (attempt + 1), abortUnderlying ? signal : undefined);
      }
    }
    throw lastError || new Error('No se pudo consultar el servidor');
  })();

  if (abortUnderlying) return createRequest();

  let request = inFlightJSON.get(url);

  if (!request) {
    request = createRequest();
    inFlightJSON.set(url, request);
    request.finally(() => {
      if (inFlightJSON.get(url) === request) inFlightJSON.delete(url);
    }).catch(() => {});
  }

  return waitForRequest(request, signal);
}

export async function fetchRoute(route, body = {}, options = {}) {
  const {
    baseUrl = API_URL,
    signal,
    fetchOptions = {},
    timeoutMs = DEFAULT_REQUEST_TIMEOUT,
    onTiming
  } = options;
  const startedAt = performance.now();
  const timing = (event, detail = {}) => {
    if (typeof onTiming !== 'function') return;
    onTiming(event, { elapsedMs: Math.round(performance.now() - startedAt), ...detail });
  };

  timing('request_start');
  return fetchWithTimeout(`${baseUrl}?route=${encodeURIComponent(route)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(body || {}),
    ...fetchOptions
  }, timeoutMs, signal, async (response) => {
    timing('response_received', { status: response.status });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const raw = await response.text();
    timing('response_body_received', { bytes: raw.length });
    try {
      const data = JSON.parse(raw);
      timing('json_parsed');
      return data;
    } catch (_) {
      throw new Error('Respuesta JSON invalida del servidor');
    }
  });
}
