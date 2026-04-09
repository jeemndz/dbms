import axios from 'axios';

const API_BASE_URL =
  'https://rapidrepair-gygpcbczgyg0czek.southeastasia-01.azurewebsites.net';

const API_ENDPOINT = `${API_BASE_URL}/appointmentcrud.php`;

const http = axios.create({
  timeout: 20000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

const normalizeId = (value, fallback = null) => {
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? num : fallback;
};

const normalizeMoney = (value, fallback = 0) => {
  const num = Number(value);
  return Number.isFinite(num) && num >= 0 ? num : fallback;
};

const getApiMessage = (responseData, fallbackMessage) => {
  if (typeof responseData === 'string' && responseData.trim()) {
    return responseData;
  }

  if (responseData?.message) {
    return String(responseData.message);
  }

  return fallbackMessage;
};

const isSuccessResponse = (response) =>
  (response?.status === 200 || response?.status === 201) &&
  String(response?.data?.status || '').trim().toLowerCase() === 'success';

const normalizeServiceIds = (service_ids) => {
  if (!Array.isArray(service_ids)) return [];

  return [...new Set(
    service_ids
      .map((id) => Number(id))
      .filter((id) => Number.isFinite(id) && id > 0)
  )];
};

export async function createAppointment({
  tenantID,
  user_id,
  vehicle_id,
  appointment_date,
  appointment_time,
  service_ids,
  total_amount,
  notes = '',
} = {}) {
  const normalizedTenantID = normalizeId(tenantID);
  const normalizedUserId = normalizeId(user_id);
  const normalizedVehicleId = normalizeId(vehicle_id);
  const normalizedServiceIds = normalizeServiceIds(service_ids);
  const normalizedTotalAmount = normalizeMoney(total_amount, 0);

  const payload = {
    action: 'create',
    tenantID: normalizedTenantID,
    user_id: normalizedUserId,
    vehicle_id: normalizedVehicleId,
    appointment_date: String(appointment_date || '').trim(),
    appointment_time: String(appointment_time || '').trim(),
    service_ids: normalizedServiceIds,
    total_amount: normalizedTotalAmount,
    notes: String(notes || '').trim(),
  };

  if (!payload.tenantID) {
    throw new Error('Invalid tenantID');
  }

  if (!payload.user_id) {
    throw new Error('Invalid user_id');
  }

  if (!payload.vehicle_id) {
    throw new Error('Invalid vehicle_id');
  }

  if (!payload.appointment_date) {
    throw new Error('Invalid appointment_date');
  }

  if (!payload.appointment_time) {
    throw new Error('Invalid appointment_time');
  }

  if (payload.service_ids.length === 0) {
    throw new Error('Select at least one service');
  }

  if (payload.total_amount <= 0) {
    throw new Error('Invalid total_amount');
  }

  console.log('CREATE APPOINTMENT URL:', API_ENDPOINT);
  console.log('CREATE APPOINTMENT PAYLOAD:', payload);

  try {
    const response = await http.post(API_ENDPOINT, payload, {
      validateStatus: () => true,
    });

    console.log('CREATE APPOINTMENT STATUS:', response.status);
    console.log('CREATE APPOINTMENT RESPONSE:', response.data);

    if (typeof response.data === 'string') {
      throw new Error('API did not return valid JSON response');
    }

    if (isSuccessResponse(response)) {
      const data = response.data?.data || {};

      return {
        success: true,
        appointment_id: normalizeId(data.appointment_id, null),
        referenceNumber: data.referenceNumber ? String(data.referenceNumber) : null,
        job_order_no: data.job_order_no ? String(data.job_order_no) : null,
        status: data.status ? String(data.status) : 'Pending',
        job_status: data.job_status ? String(data.job_status) : null,
        total_amount: normalizeMoney(data.total_amount, payload.total_amount),
      };
    }

    throw new Error(
      getApiMessage(response.data, `API returned status ${response.status}`)
    );
  } catch (error) {
    console.error('CREATE APPOINTMENT ERROR:', error?.response?.data || error.message);
    throw new Error(error?.message || 'Failed to create appointment');
  }
}