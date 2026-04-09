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

const normalizeId = (value, fallback = 0) => {
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

const normalizeAppointmentRecord = (item) => {
  if (!item || typeof item !== 'object') {
    return null;
  }

  return {
    appointment_id: normalizeId(item.appointment_id, null),
    tenantID: normalizeId(item.tenantID, 1),
    user_id: normalizeId(item.user_id, null),
    vehicle_id: normalizeId(item.vehicle_id, null),
    appointment_date: item.appointment_date ? String(item.appointment_date) : '',
    appointment_time: item.appointment_time ? String(item.appointment_time) : '',
    status: item.status ? String(item.status) : 'Pending',
    notes: item.notes ? String(item.notes) : '',
    total_amount: normalizeMoney(item.total_amount, 0),
    referenceNumber: item.referenceNumber ? String(item.referenceNumber) : null,
    job_order_no: item.job_order_no ? String(item.job_order_no) : null,
    job_status: item.job_status ? String(item.job_status) : null,
    created_at: item.created_at ? String(item.created_at) : '',
    updated_at: item.updated_at ? String(item.updated_at) : '',
  };
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
  const payload = {
    action: 'create',
    tenantID: normalizeId(tenantID, 1),
    user_id: normalizeId(user_id),
    vehicle_id: normalizeId(vehicle_id),
    appointment_date: String(appointment_date || '').trim(),
    appointment_time: String(appointment_time || '').trim(),
    service_ids: Array.isArray(service_ids)
      ? [...new Set(service_ids.map(Number).filter((id) => Number.isFinite(id) && id > 0))]
      : [],
    total_amount: Number(total_amount) || 0,
    notes: String(notes || '').trim(),
  };

  if (!payload.user_id) throw new Error('Invalid user_id');
  if (!payload.vehicle_id) throw new Error('Invalid vehicle_id');
  if (!payload.appointment_date) throw new Error('Invalid appointment_date');
  if (!payload.appointment_time) throw new Error('Invalid appointment_time');
  if (payload.service_ids.length === 0) throw new Error('Select at least one service');
  if (payload.total_amount <= 0) throw new Error('Invalid total_amount');

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

    throw new Error(getApiMessage(response.data, `API returned status ${response.status}`));
  } catch (error) {
    console.error('CREATE APPOINTMENT ERROR:', error?.response?.data || error.message);
    throw new Error(error?.message || 'Failed to create appointment');
  }
}

export async function fetchAppointments({
  tenantID,
  user_id,
  limit = 50,
  offset = 0,
} = {}) {
  const params = {
    action: 'list',
    tenantID: normalizeId(tenantID, 1),
    limit: Math.min(Math.max(Number(limit) || 50, 1), 100),
    offset: Math.max(Number(offset) || 0, 0),
  };

  if (user_id && Number(user_id) > 0) {
    params.user_id = normalizeId(user_id);
  }

  const response = await http.get(API_ENDPOINT, {
    params,
    validateStatus: () => true,
  });

  if (typeof response.data === 'string') {
    throw new Error('API did not return valid JSON response');
  }

  if (isSuccessResponse(response)) {
    const rawList = Array.isArray(response.data?.data) ? response.data.data : [];
    return rawList.map(normalizeAppointmentRecord).filter(Boolean);
  }

  throw new Error(getApiMessage(response.data, `API returned status ${response.status}`));
}

export async function updateAppointmentStatus({
  appointment_id,
  tenantID,
  status,
} = {}) {
  const payload = {
    action: 'update',
    appointment_id: normalizeId(appointment_id),
    tenantID: normalizeId(tenantID, 1),
    status: String(status || '').trim(),
  };

  if (!payload.appointment_id) throw new Error('Invalid appointment_id');
  if (!payload.status) throw new Error('Invalid status');

  const response = await http.post(API_ENDPOINT, payload, {
    validateStatus: () => true,
  });

  if (typeof response.data === 'string') {
    throw new Error('API did not return valid JSON response');
  }

  if (isSuccessResponse(response)) {
    return response.data?.data || null;
  }

  throw new Error(getApiMessage(response.data, `API returned status ${response.status}`));
}

export async function deleteAppointment({
  appointment_id,
  tenantID,
} = {}) {
  const params = {
    action: 'delete',
    appointment_id: normalizeId(appointment_id),
    tenantID: normalizeId(tenantID, 1),
  };

  if (!params.appointment_id) throw new Error('Invalid appointment_id');

  const response = await http.get(API_ENDPOINT, {
    params,
    validateStatus: () => true,
  });

  if (typeof response.data === 'string') {
    throw new Error('API did not return valid JSON response');
  }

  if (isSuccessResponse(response)) {
    return response.data?.data || null;
  }

  throw new Error(getApiMessage(response.data, `API returned status ${response.status}`));
}