// Silence console in production builds so F12 is empty
// This module is intentionally side-effectful and should be imported
// as the very first module in the app entrypoint.
// TEMPORARILY DISABLED FOR BUG REPORT DEBUGGING
try {
  if (false && import.meta.env && import.meta.env.PROD) {
    try { window.__originalConsole = window.console; } catch (e) { /* ignore */ }
    const noop = () => {};
    const methods = ['log','info','warn','error','debug','assert','clear','count','countReset','group','groupCollapsed','groupEnd','table','time','timeEnd','trace'];
    methods.forEach(m => {
      try { console[m] = noop; } catch (e) { /* ignore */ }
    });
  }
} catch (e) {
  // If import.meta.env isn't available for any reason, do nothing
}
