import axios from 'axios';

const API_BASE_URL = 'https://rapidrepair-gygpcbczgyg0czek.southeastasia-01.azurewebsites.net';

const API_ENDPOINT = `${API_BASE_URL}/api_appointments.php`;

const http = axios.create({
  timeout: 20000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

/**
 * Helper to normalize and validate numbers
 */
const normalizeId = (value, fallback = 0) => {
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? num : fallback;
};

/**
 * Helper to normalize money values
 */
const normalizeMoney = (value, fallback = 0) => {
  const num = Number(value);
  return Number.isFinite(num) && num >= 0 ? num : fallback;
};

/**
 * Check if response is successful
 */
const isSuccessResponse = (response) =>
  (response?.status === 200 || response?.status === 201) &&
  response?.data?.status === 'success';

/**
 * Get error message from response
 */
const getErrorMessage = (response, defaultMessage = 'Operation failed') => {
  if (typeof response === 'string') {
    return response;
  }
  return response?.message || defaultMessage;
};

/**
 * Create appointment
 * @param {Object} appointmentData
 * @returns {Promise<Object>}
 */
export async function createAppointment(appointmentData) {
  if (!appointmentData) {
    throw new Error('Appointment data is required');
  }

  const payload = {
    action: 'create',
    tenantID: normalizeId(appointmentData.tenantID, 1),
    user_id: normalizeId(appointmentData.user_id),
    vehicle_id: normalizeId(appointmentData.vehicle_id),
    appointment_date: String(appointmentData.appointment_date || '').trim(),
    appointment_time: String(appointmentData.appointment_time || '').trim(),
    status: String(appointmentData.status || 'Pending').trim(),
    notes: String(appointmentData.notes || '').trim(),
    total_amount: normalizeMoney(appointmentData.total_amount, 0),
  };

  // Validate required fields
  if (!payload.user_id) throw new Error('Invalid user_id');
  if (!payload.vehicle_id) throw new Error('Invalid vehicle_id');
  if (!payload.appointment_date) throw new Error('Invalid appointment_date');
  if (!payload.appointment_time) throw new Error('Invalid appointment_time');
  if (!payload.total_amount || payload.total_amount <= 0) throw new Error('Invalid total_amount');

  console.log('CREATE APPOINTMENT PAYLOAD:', payload);

  try {
    const response = await http.post(API_ENDPOINT, payload, {
      validateStatus: () => true,
    });

    console.log('CREATE APPOINTMENT RESPONSE:', response.status, response.data);

    if (isSuccessResponse(response)) {
      const data = response.data?.data || {};
      return {
        success: true,
        appointment_id: normalizeId(data.appointment_id),
        status: data.status || 'Pending',
      };
    }

    throw new Error(getErrorMessage(response.data, 'Failed to create appointment'));
  } catch (error) {
    console.error('CREATE APPOINTMENT ERROR:', error.message);
    throw new Error(error?.message || 'Failed to create appointment');
  }
}

/**
 * Get appointments list
 * REMOVED - Function no longer available
 */

/**
 * Update appointment status
 * REMOVED - Function no longer available
 */

/**
 * Delete appointment
 * REMOVED - Function no longer available
 */
