import axios from 'axios';

const API_BASE_URL =
  'https://rapidrepair-gygpcbczgyg0czek.southeastasia-01.azurewebsites.net';

const APPOINTMENT_ENDPOINT = `${API_BASE_URL}/mobileapis/appointmentcrud.php`;
const APPOINTMENT_ENDPOINT_FALLBACK = `${API_BASE_URL}/appointmentcrud.php`;

const REQUEST_TIMEOUT = 20000;

const getApiMessage = (error, fallback = 'Request failed') => {
  const rawData = error?.response?.data;

  if (typeof rawData === 'string' && rawData.trim()) {
    return rawData;
  }

  if (rawData?.message) {
    return rawData.message;
  }

  if (error?.message) {
    return error.message;
  }

  return fallback;
};

const normalizePositiveNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const normalizeOptionalPositiveNumber = (value) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const normalizeServiceIds = (service_ids) => {
  if (!Array.isArray(service_ids)) {
    return [];
  }

  return [...new Set(service_ids.map(Number).filter((id) => Number.isFinite(id) && id > 0))];
};

const normalizeAppointmentDate = (value) => {
  if (typeof value !== 'string') return '';
  return value.trim();
};

const normalizeAppointmentTime = (value) => {
  if (typeof value !== 'string') return '';
  return value.trim();
};

const createHttpClient = () =>
  axios.create({
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    timeout: REQUEST_TIMEOUT,
  });

const http = createHttpClient();

export async function createAppointment(appointmentData) {
  const {
    tenantID,
    user_id,
    vehicle_id,
    appointment_date,
    appointment_time,
    service_ids,
    total_amount,
    notes = '',
  } = appointmentData || {};

  const payload = {
    tenantID: normalizePositiveNumber(tenantID, 1),
    user_id: normalizePositiveNumber(user_id),
    vehicle_id: normalizePositiveNumber(vehicle_id),
    appointment_date: normalizeAppointmentDate(appointment_date),
    appointment_time: normalizeAppointmentTime(appointment_time),
    service_ids: normalizeServiceIds(service_ids),
    total_amount: Number(total_amount || 0),
    notes: String(notes || '').trim(),
  };

  if (!payload.user_id) {
    throw new Error('Invalid or missing user_id');
  }

  if (!payload.vehicle_id) {
    throw new Error('Invalid or missing vehicle_id');
  }

  if (!payload.appointment_date) {
    throw new Error('Invalid or missing appointment_date');
  }

  if (!payload.appointment_time) {
    throw new Error('Invalid or missing appointment_time');
  }

  if (payload.service_ids.length === 0) {
    throw new Error('At least one valid service must be selected');
  }

  if (!Number.isFinite(payload.total_amount) || payload.total_amount <= 0) {
    throw new Error('Invalid total_amount');
  }

  console.log('CREATE APPOINTMENT URL', APPOINTMENT_ENDPOINT);
  console.log('CREATE APPOINTMENT PAYLOAD', payload);

  try {
    let response;
    let lastError;

    // Try primary endpoint first
    try {
      response = await http.post(APPOINTMENT_ENDPOINT, payload);
    } catch (primaryError) {
      // If primary endpoint returns 404, try fallback
      if (primaryError?.response?.status === 404) {
        console.log('CREATE APPOINTMENT: Primary endpoint 404, trying fallback:', APPOINTMENT_ENDPOINT_FALLBACK);
        response = await http.post(APPOINTMENT_ENDPOINT_FALLBACK, payload);
      } else {
        throw primaryError;
      }
    }

    console.log('CREATE APPOINTMENT RESPONSE STATUS', response?.status);
    console.log('CREATE APPOINTMENT RESPONSE DATA', response?.data);

    const status = String(response?.data?.status || '').trim().toLowerCase();

    if (status !== 'success') {
      throw new Error(response?.data?.message || 'Failed to create appointment');
    }

    return {
      success: true,
      appointment_id: response?.data?.data?.appointment_id ?? null,
      reference_number: response?.data?.data?.reference_number ?? null,
      status: response?.data?.data?.status ?? 'Pending',
      total_amount: response?.data?.data?.total_amount ?? payload.total_amount,
      raw: response?.data ?? null,
    };
  } catch (error) {
    console.log('CREATE APPOINTMENT ERROR URL', APPOINTMENT_ENDPOINT);
    console.log('CREATE APPOINTMENT ERROR STATUS', error?.response?.status || null);
    console.log('CREATE APPOINTMENT ERROR DATA', error?.response?.data || null);
    console.log('CREATE APPOINTMENT ERROR MESSAGE', error?.message || null);

    throw new Error(getApiMessage(error, 'Failed to create appointment'));
  }
}

export async function fetchAppointments({
  tenantID,
  user_id,
  limit = 50,
  offset = 0,
} = {}) {
  const normalizedTenantID = normalizePositiveNumber(tenantID, 1);
  const normalizedUserId = normalizeOptionalPositiveNumber(user_id);

  const params = {
    action: 'list',
    tenantID: normalizedTenantID,
    limit: Math.min(Math.max(Number(limit) || 50, 1), 100),
    offset: Math.max(Number(offset) || 0, 0),
  };

  if (normalizedUserId !== null) {
    params.user_id = normalizedUserId;
  }

  console.log('FETCH APPOINTMENTS URL', APPOINTMENT_ENDPOINT);
  console.log('FETCH APPOINTMENTS PARAMS', params);

  try {
    let response;

    // Try primary endpoint first
    try {
      response = await http.get(APPOINTMENT_ENDPOINT, { params });
    } catch (primaryError) {
      // If primary endpoint returns 404, try fallback
      if (primaryError?.response?.status === 404) {
        console.log('FETCH APPOINTMENTS: Primary endpoint 404, trying fallback:', APPOINTMENT_ENDPOINT_FALLBACK);
        response = await http.get(APPOINTMENT_ENDPOINT_FALLBACK, { params });
      } else {
        throw primaryError;
      }
    }

    console.log('FETCH APPOINTMENTS RESPONSE STATUS', response?.status);
    console.log('FETCH APPOINTMENTS RESPONSE DATA', response?.data);

    const status = String(response?.data?.status || '').trim().toLowerCase();

    if (status !== 'success') {
      throw new Error(response?.data?.message || 'Failed to fetch appointments');
    }

    return Array.isArray(response?.data?.data) ? response.data.data : [];
  } catch (error) {
    console.log('FETCH APPOINTMENTS ERROR URL', APPOINTMENT_ENDPOINT);
    console.log('FETCH APPOINTMENTS ERROR STATUS', error?.response?.status || null);
    console.log('FETCH APPOINTMENTS ERROR DATA', error?.response?.data || null);
    console.log('FETCH APPOINTMENTS ERROR MESSAGE', error?.message || null);

    throw new Error(getApiMessage(error, 'Failed to fetch appointments'));
  }
}

export async function updateAppointmentStatus({
  appointment_id,
  tenantID,
  status,
}) {
  const normalizedAppointmentId = normalizePositiveNumber(appointment_id);
  const normalizedTenantID = normalizePositiveNumber(tenantID, 1);
  const normalizedStatus = String(status || '').trim();

  if (!normalizedAppointmentId) {
    throw new Error('Invalid or missing appointment_id');
  }

  if (!normalizedStatus) {
    throw new Error('Invalid or missing status');
  }

  const payload = {
    action: 'update',
    appointment_id: normalizedAppointmentId,
    tenantID: normalizedTenantID,
    status: normalizedStatus,
  };

  console.log('UPDATE APPOINTMENT URL', APPOINTMENT_ENDPOINT);
  console.log('UPDATE APPOINTMENT PAYLOAD', payload);

  try {
    let response;

    // Try primary endpoint first
    try {
      response = await http.post(APPOINTMENT_ENDPOINT, payload);
    } catch (primaryError) {
      // If primary endpoint returns 404, try fallback
      if (primaryError?.response?.status === 404) {
        console.log('UPDATE APPOINTMENT: Primary endpoint 404, trying fallback:', APPOINTMENT_ENDPOINT_FALLBACK);
        response = await http.post(APPOINTMENT_ENDPOINT_FALLBACK, payload);
      } else {
        throw primaryError;
      }
    }

    console.log('UPDATE APPOINTMENT RESPONSE STATUS', response?.status);
    console.log('UPDATE APPOINTMENT RESPONSE DATA', response?.data);

    const responseStatus = String(response?.data?.status || '').trim().toLowerCase();

    if (responseStatus !== 'success') {
      throw new Error(response?.data?.message || 'Failed to update appointment');
    }

    return response?.data?.data || null;
  } catch (error) {
    console.log('UPDATE APPOINTMENT ERROR URL', APPOINTMENT_ENDPOINT);
    console.log('UPDATE APPOINTMENT ERROR STATUS', error?.response?.status || null);
    console.log('UPDATE APPOINTMENT ERROR DATA', error?.response?.data || null);
    console.log('UPDATE APPOINTMENT ERROR MESSAGE', error?.message || null);

    throw new Error(getApiMessage(error, 'Failed to update appointment'));
  }
}

export async function deleteAppointment({ appointment_id, tenantID }) {
  const normalizedAppointmentId = normalizePositiveNumber(appointment_id);
  const normalizedTenantID = normalizePositiveNumber(tenantID, 1);

  if (!normalizedAppointmentId) {
    throw new Error('Invalid or missing appointment_id');
  }

  const params = {
    action: 'delete',
    appointment_id: normalizedAppointmentId,
    tenantID: normalizedTenantID,
  };

  console.log('DELETE APPOINTMENT URL', APPOINTMENT_ENDPOINT);
  console.log('DELETE APPOINTMENT PARAMS', params);

  try {
    let response;

    // Try primary endpoint first
    try {
      response = await http.get(APPOINTMENT_ENDPOINT, { params });
    } catch (primaryError) {
      // If primary endpoint returns 404, try fallback
      if (primaryError?.response?.status === 404) {
        console.log('DELETE APPOINTMENT: Primary endpoint 404, trying fallback:', APPOINTMENT_ENDPOINT_FALLBACK);
        response = await http.get(APPOINTMENT_ENDPOINT_FALLBACK, { params });
      } else {
        throw primaryError;
      }
    }

    console.log('DELETE APPOINTMENT RESPONSE STATUS', response?.status);
    console.log('DELETE APPOINTMENT RESPONSE DATA', response?.data);

    const status = String(response?.data?.status || '').trim().toLowerCase();

    if (status !== 'success') {
      throw new Error(response?.data?.message || 'Failed to delete appointment');
    }

    return response?.data?.data || null;
  } catch (error) {
    console.log('DELETE APPOINTMENT ERROR URL', APPOINTMENT_ENDPOINT);
    console.log('DELETE APPOINTMENT ERROR STATUS', error?.response?.status || null);
    console.log('DELETE APPOINTMENT ERROR DATA', error?.response?.data || null);
    console.log('DELETE APPOINTMENT ERROR MESSAGE', error?.message || null);

    throw new Error(getApiMessage(error, 'Failed to delete appointment'));
  }
}