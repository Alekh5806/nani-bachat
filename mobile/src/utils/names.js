/**
 * Short company name for lists, like "Indian Energy Exchange" instead of
 * "Indian Energy Exchange Limited". The stored full name is never changed.
 */
const SUFFIX = /[\s,]+(limited|ltd\.?|inc\.?|corporation|corp\.?|company|co\.?|pvt\.?|private|plc)\s*$/i;

export const shortName = (name) => {
  let out = String(name || '').trim();
  for (let i = 0; i < 3 && SUFFIX.test(out); i += 1) out = out.replace(SUFFIX, '').trim();
  // ALL CAPS names (JIO FIN SERVICES LTD) become Title Case.
  if (out && out === out.toUpperCase() && /[A-Z]/.test(out) && out.length > 5) {
    out = out.toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase());
  }
  return out || String(name || '');
};
