// services/appointmentApi.js
// Change API_BASE_URL to your real XAMPP / server URL.
// Android emulator usually uses: http://10.0.2.2/RapidRepair
// Physical phone must use your PC LAN IP: http://192.168.x.x/RapidRepair

const API_BASE_URL = 'https://rapidrepair-gygpcbczgyg0czek.southeastasia-01.azurewebsites.net';

const buildQuery = (params = {}) => {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.append(key, String(value));
    }
  });

  return query.toString();
};

const parseJsonResponse = async (response) => {
  const text = await response.text();

  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch (error) {
    throw new Error(`Invalid server response: ${text}`);
  }

  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.message || 'Request failed');
  }

  return payload;
};

export const fetchAppointmentHistory = async ({ tenantID, user_id }) => {
  const queryString = buildQuery({ tenantID, user_id });

  const response = await fetch(`${API_BASE_URL}/appointment_history.php?${queryString}`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  });

  const payload = await parseJsonResponse(response);
  return payload.data || [];
};
