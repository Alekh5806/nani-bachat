/**
 * Turns a DRF error payload into one line a human can act on.
 *
 * Serializers raise either {"non_field_errors": [...]} or {"field": [...]},
 * and axios sometimes hands us a plain string or nothing at all. Rendering
 * JSON.stringify() of any of those puts braces and quotes in front of the
 * user, which is how "Insufficient pool cash — select the buying member"
 * ended up looking like a stack trace.
 */
const firstString = (value) => {
  if (value == null) return null;
  if (typeof value === 'string') return value.trim() || null;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = firstString(item);
      if (found) return found;
    }
    return null;
  }
  if (typeof value === 'object') {
    for (const key of Object.keys(value)) {
      const found = firstString(value[key]);
      if (found) return found;
    }
    return null;
  }
  return String(value);
};

const PRIORITY_KEYS = ['non_field_errors', 'error', 'detail', 'message'];

/**
 * @param {*} error - axios error, a DRF payload, or a plain string.
 * @param {string} fallback - shown when nothing readable can be found.
 */
export const getErrorMessage = (error, fallback = 'Something went wrong') => {
  if (!error) return fallback;

  // Unwrap an axios error into its response body.
  const payload = error?.response?.data ?? error;

  if (typeof payload === 'string') return payload.trim() || fallback;

  if (typeof payload === 'object') {
    for (const key of PRIORITY_KEYS) {
      const found = firstString(payload[key]);
      if (found) return found;
    }

    // Otherwise the first field error, prefixed with the field name.
    for (const key of Object.keys(payload)) {
      const found = firstString(payload[key]);
      if (found) {
        const label = key
          .replace(/_/g, ' ')
          .replace(/\b\w/g, (c) => c.toUpperCase());
        return `${label}: ${found}`;
      }
    }
  }

  return firstString(error?.message) || fallback;
};
