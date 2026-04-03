import axios from 'axios';

const API_BASE_URL = 'https://rapidrepair-gygpcbczgyg0czek.southeastasia-01.azurewebsites.net';
const SERVICE_LIST_ENDPOINTS = [
  `${API_BASE_URL}/services_list.php`,
  `${API_BASE_URL}/mobileapis/services_list.php`,
  `${API_BASE_URL}/mobileapis/serviceAPI.php`,
  `${API_BASE_URL}/serviceAPI.php`,
];

const isMissingEndpointError = (error) => {
  const status = Number(error?.response?.status || 0);
  const bodyText = String(error?.response?.data || '').toLowerCase();
  const message = String(error?.message || '').toLowerCase();

  if (status === 404) {
    return true;
  }

  return bodyText.includes('not found') || message.includes('not found');
};

export async function fetchServices({ tenantID }) {
  const normalizedTenantID = Number(tenantID);
  if (!Number.isFinite(normalizedTenantID) || normalizedTenantID <= 0) {
    throw new Error('Invalid tenantID for service fetch.');
  }

  let lastError = null;

  for (const endpoint of SERVICE_LIST_ENDPOINTS) {
    try {
      const response = await axios.get(endpoint, { params: { tenantID: normalizedTenantID } });
      const status = String(response?.data?.status || '').trim().toLowerCase();
      if (status && status !== 'success') {
        const message = response?.data?.message || 'Request failed.';
        throw new Error(String(message));
      }

      const raw = response?.data?.services || response?.data?.data || [];
      const parsed = Array.isArray(raw) ? raw : [];
      if (parsed.length > 0) {
        return parsed;
      }

      // Fallback: ask API to return active services across tenants when tenant list is empty.
      const fallbackResponse = await axios.get(endpoint, {
        params: { tenantID: normalizedTenantID, includeAllOnEmpty: 1 },
      });
      const fallbackStatus = String(fallbackResponse?.data?.status || '').trim().toLowerCase();
      if (fallbackStatus && fallbackStatus !== 'success') {
        const fallbackMessage = fallbackResponse?.data?.message || 'Fallback request failed.';
        throw new Error(String(fallbackMessage));
      }

      const fallbackRaw = fallbackResponse?.data?.services || fallbackResponse?.data?.data || [];
      return Array.isArray(fallbackRaw) ? fallbackRaw : [];
    } catch (error) {
      lastError = error;
      if (!isMissingEndpointError(error)) {
        throw error;
      }
    }
  }

  throw lastError || new Error('Service API endpoint not found.');
}
