/**
 * Form helpers for "required field" errors.
 * missingFields(values, keys) -> { key: 'Required' } for each empty field,
 * which the inputs show as a red border with a short message.
 */
export const REQUIRED = 'Required';

export const missingFields = (values, keys) =>
  keys.reduce(
    (acc, key) => (String(values[key] ?? '').trim() === '' ? { ...acc, [key]: REQUIRED } : acc),
    {}
  );
