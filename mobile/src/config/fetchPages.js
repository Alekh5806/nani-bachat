import api from './api';

// Keep page requests on the configured API origin, including in local development.
export async function fetchPages(path, { params, signal, stopAfter } = {}) {
  const rows = [];
  for (let page = 1; ; page += 1) {
    const { data } = await api.get(path, { params: { ...params, page }, signal });
    const batch = data.results ?? data;
    rows.push(...batch);
    if (!data.next || !batch.length || stopAfter?.(batch)) return rows;
  }
}
