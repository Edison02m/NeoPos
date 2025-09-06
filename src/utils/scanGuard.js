// Global ScanGuard: blocks keyboard-wedge barcode input outside allowed modules
// Allowed modules: productos, producto, ventas

// Agregamos 'compra', 'compras' para permitir escaneo manual en Compras
const ALLOWED_PATHS = ['producto', 'productos', 'venta', 'ventas', 'compra', 'compras'];

function getRouteInfo() {
  const loc = (window.location && (window.location.hash || window.location.pathname)) || '';
  const low = loc.toLowerCase();
  return { loc, low };
}

function isAllowedRoute() {
  const { low } = getRouteInfo();
  return ALLOWED_PATHS.some((p) => low.includes(p));
}

function isAllowedTargetInRoute(elem) {
  if (!elem || !(elem instanceof HTMLElement)) return false;
  const tag = (elem.tagName || '').toLowerCase();
  if (tag !== 'input' && tag !== 'textarea') return false;

  const { low } = getRouteInfo();
  const id = (elem.id || '').toLowerCase();
  const name = (elem.name || '').toLowerCase();
  const placeholder = (elem.placeholder || '').toLowerCase();

  const inVentas = low.includes('venta');
  const inProductos = low.includes('producto');
  const inCompras = low.includes('compra');

  if (inVentas) {
    if (id === 'codigobarras' || name === 'codigobarras') return true;
    if (placeholder.includes('buscar producto') || placeholder.includes('código') || placeholder.includes('codigo')) return true;
  }

  if (inProductos) {
    if (id === 'codbarra' || name === 'codbarra') return true;
    if (placeholder.includes('código de barras') || placeholder.includes('codigo de barras')) return true;
  }

  // Permitir input de código en Compras (campo codigoBarrasCompras) cuando AUTO está apagado
  if (inCompras) {
    if (id === 'codigobarrascompras' || name === 'codigobarrascompras') return true;
    if (placeholder.includes('escanee') || placeholder.includes('código') || placeholder.includes('codigo')) return true;
  }

  return false;
}

export function startScanGuard(options = {}) {
  if (window.__scanGuardActive) return () => {};

  const cfg = {
    minSpeedMs: options.minSpeedMs ?? 35, // if < this between keys => likely scanner
    maxGapMs: options.maxGapMs ?? 120, // gap to consider end of scan
    minLen: options.minLen ?? 6,
    confirmDelayMs: options.confirmDelayMs ?? 60, // delay to decide if first char is from scanner or manual typing
  };

  let buffer = '';
  let last = 0;
  let scanning = false;
  let maybeTimer = null;
  let maybeBuffer = '';
  let savedEl = null;
  let savedSelStart = null;
  let savedSelEnd = null;
  let handledCharDown = false;

  function commitMaybeBuffer() {
    if (!savedEl || !maybeBuffer) return;
    try {
      const el = savedEl;
      // Re-insert the buffered text at the saved caret position
      const supportsRange = typeof el.setRangeText === 'function' && typeof el.selectionStart === 'number';
      if (supportsRange) {
        const start = savedSelStart ?? el.selectionStart ?? el.value.length;
        const end = savedSelEnd ?? el.selectionEnd ?? el.value.length;
        el.setRangeText(maybeBuffer, start, end, 'end');
      } else {
        const val = el.value ?? '';
        const start = (typeof el.selectionStart === 'number' ? el.selectionStart : val.length);
        el.value = val.slice(0, start) + maybeBuffer + val.slice(start);
      }
      // Dispatch input event so React updates state
      const evt = new Event('input', { bubbles: true });
      el.dispatchEvent(evt);
    } catch (_) {
      // noop
    } finally {
      maybeBuffer = '';
      savedEl = null;
      savedSelStart = null;
      savedSelEnd = null;
      if (maybeTimer) {
        clearTimeout(maybeTimer);
        maybeTimer = null;
      }
    }
  }

  const onKeyPress = (e) => {
  // Allow pausing guard (e.g., while a modal is open)
  const paused = !!window.__barcodeAutoScanPaused;
  if (paused) return;
  const autoActive = !!window.__barcodeAutoScanActive; // cuando está activo bloqueamos escritura directa
    const allowRoute = isAllowedRoute();
    const active = document.activeElement;
    // Never block sensitive input types for normal typing
    if (active && active.tagName && (active.tagName.toLowerCase() === 'input' || active.tagName.toLowerCase() === 'textarea')) {
      const type = (active.type || 'text').toLowerCase();
      if (type === 'password' || type === 'email' || type === 'number') {
        return;
      }
    }
    // On allowed routes, only allow typing freely in the target barcode field; otherwise protect
  if (allowRoute && isAllowedTargetInRoute(active)) {
      return;
    }

  // If auto-scan is active on allowed routes, swallow printable keys to avoid leaking into inputs
  // Solo bloquear caracteres cuando AUTO está activo; si AUTO off en Compras permitimos escritura en su input
  if (autoActive && allowRoute) {
      if (e.key && e.key.length === 1) {
        e.preventDefault();
        return;
      }
    }

    const now = Date.now();
    const key = e.key;

    // Reset if long pause
    if (now - last > cfg.maxGapMs) {
      buffer = '';
      scanning = false;
    }

    if (key && key.length === 1) {
      if (handledCharDown) {
        // Already processed at keydown stage
        handledCharDown = false;
        return;
      }
      const delta = now - last;
      // Heuristic: fast stream of characters => scanner
      if (delta < cfg.minSpeedMs || scanning) {
        scanning = true;
        // Once we know it's scanning, cancel any tentative commit and drop the first char too
        if (maybeTimer) { clearTimeout(maybeTimer); maybeTimer = null; }
        maybeBuffer = '';
        savedEl = null;
        savedSelStart = null;
        savedSelEnd = null;
        // Block the character from hitting the focused input, but do not stop propagation
        e.preventDefault();
        buffer += key;
      } else {
        // Tentative first char: hold briefly; if no fast follow-up, commit as manual typing
        // Only do this when we are in protected context (not allowed target)
        e.preventDefault();
        maybeBuffer += key;
        if (!savedEl && active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) {
          savedEl = active;
          try {
            savedSelStart = active.selectionStart;
            savedSelEnd = active.selectionEnd;
          } catch (_) { /* ignore */ }
        }
        if (maybeTimer) clearTimeout(maybeTimer);
        maybeTimer = setTimeout(() => {
          if (!scanning) {
            commitMaybeBuffer();
          }
        }, cfg.confirmDelayMs);
      }
      last = now;
    }
  };

  const onKeyDown = (e) => {
  const paused = !!window.__barcodeAutoScanPaused;
  if (paused) return;
  const autoActive = !!window.__barcodeAutoScanActive;
    const allowRoute = isAllowedRoute();
    const active = document.activeElement;
    if (active && active.tagName && (active.tagName.toLowerCase() === 'input' || active.tagName.toLowerCase() === 'textarea')) {
      const type = (active.type || 'text').toLowerCase();
      if (type === 'password' || type === 'email' || type === 'number') {
        return;
      }
    }
  if (allowRoute && isAllowedTargetInRoute(active)) return; // permitir escritura normal en campos autorizados (incluye compras)

    const now = Date.now();
    const key = e.key;

    // Pre-handle printable characters to avoid first-char leaks
    if (key && key.length === 1) {
      // When AUTO is active, always block printable characters on allowed routes so the detector can handle them globally
      if (autoActive && allowRoute) {
        e.preventDefault();
        handledCharDown = true;
        last = now;
        return;
      }
      const delta = now - last;
      if (delta > cfg.maxGapMs) {
        buffer = '';
        scanning = false;
      }
      if (delta < cfg.minSpeedMs || scanning) {
        scanning = true;
        if (maybeTimer) { clearTimeout(maybeTimer); maybeTimer = null; }
        maybeBuffer = '';
        savedEl = null; savedSelStart = null; savedSelEnd = null;
        e.preventDefault();
        handledCharDown = true;
        buffer += key;
      } else {
        // Tentative manual typing: hold and commit after a short delay if not a scan
        e.preventDefault();
        handledCharDown = true;
        maybeBuffer += key;
        if (!savedEl && active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) {
          savedEl = active;
          try {
            savedSelStart = active.selectionStart;
            savedSelEnd = active.selectionEnd;
          } catch (_) { /* ignore */ }
        }
        if (maybeTimer) clearTimeout(maybeTimer);
        maybeTimer = setTimeout(() => {
          if (!scanning) {
            commitMaybeBuffer();
          }
        }, cfg.confirmDelayMs);
      }
      last = now;
      return;
    }

  if ((scanning && (e.key === 'Enter' || e.key === 'Tab')) || (autoActive && allowRoute && (e.key === 'Enter' || e.key === 'Tab'))) {
      // Finish scan; block commit of the buffer into inputs
  e.preventDefault();
      buffer = '';
      scanning = false;
      last = now;
    }

    // Timeout-based end
    if (scanning && now - last > cfg.maxGapMs) {
      buffer = '';
      scanning = false;
    }
  };

  // Capture phase to stop at the top
  document.addEventListener('keypress', onKeyPress, true);
  document.addEventListener('keydown', onKeyDown, true);
  window.__scanGuardActive = true;

  return () => {
    document.removeEventListener('keypress', onKeyPress, true);
    document.removeEventListener('keydown', onKeyDown, true);
    if (maybeTimer) clearTimeout(maybeTimer);
    delete window.__scanGuardActive;
  };
}

export default startScanGuard;