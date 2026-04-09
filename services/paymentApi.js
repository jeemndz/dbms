import axios from 'axios';

const API_BASE_URL =
  'https://rapidrepair-gygpcbczgyg0czek.southeastasia-01.azurewebsites.net';

const API_ENDPOINT = `${API_BASE_URL}/paymentcrud.php`;

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

const normalizePaymentRecord = (item) => {
  if (!item || typeof item !== 'object') {
    return null;
  }

  return {
    payment_id: normalizeId(item.payment_id, null),
    tenantID: normalizeId(item.tenantID, 1),
    user_id: normalizeId(item.user_id, null),
    appointment_id: normalizeId(item.appointment_id, null),
    paymentAmount: normalizeMoney(item.paymentAmount, 0),
    amountPaid: normalizeMoney(item.amountPaid, 0),
    balance: normalizeMoney(item.balance, 0),
    paymentMethod: item.paymentMethod ? String(item.paymentMethod) : 'Cash',
    paymentDate: item.paymentDate ? String(item.paymentDate) : null,
    paymentStatus: item.paymentStatus ? String(item.paymentStatus) : 'Pending',
    referenceNumber: item.referenceNumber ? String(item.referenceNumber) : null,
    gcashReferenceNumber: item.gcashReferenceNumber ? String(item.gcashReferenceNumber) : null,
    remarks: item.remarks ? String(item.remarks) : null,
    created_at: item.created_at ? String(item.created_at) : '',
    updated_at: item.updated_at ? String(item.updated_at) : '',
    appointment_date: item.appointment_date ? String(item.appointment_date) : '',
    appointment_time: item.appointment_time ? String(item.appointment_time) : '',
  };
};

/**
 * Fetch payments with optional filtering
 * @param {number} tenantID - Tenant ID (defaults to 1)
 * @param {number} user_id - User ID for filtering (optional)
 * @param {string} paymentStatus - Payment status filter (optional)
 * @param {number} limit - Number of results (default 50, max 100)
 * @param {number} offset - Pagination offset (default 0)
 * @returns {Promise<Array>} Array of payment records
 */
export async function fetchPayments({
  tenantID,
  user_id,
  paymentStatus,
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

  if (paymentStatus && String(paymentStatus).trim()) {
    params.paymentStatus = String(paymentStatus).trim();
  }

  console.log('FETCH PAYMENTS URL:', API_ENDPOINT);
  console.log('FETCH PAYMENTS PARAMS:', params);

  try {
    const response = await http.get(API_ENDPOINT, {
      params,
      validateStatus: () => true,
    });

    console.log('FETCH PAYMENTS STATUS:', response.status);
    console.log('FETCH PAYMENTS RESPONSE TYPE:', typeof response.data);
    console.log('FETCH PAYMENTS RESPONSE:', response.data);

    if (typeof response.data === 'string') {
      console.error('ERROR: Response is string, not JSON:', response.data.substring(0, 500));
      throw new Error('API did not return valid JSON response. Got: ' + response.data.substring(0, 200));
    }

    if (isSuccessResponse(response)) {
      const rawList = Array.isArray(response.data?.data) ? response.data.data : [];
      return rawList.map(normalizePaymentRecord).filter(Boolean);
    }

    throw new Error(getApiMessage(response.data, `API returned status ${response.status}`));
  } catch (error) {
    console.error('FETCH PAYMENTS ERROR:', error?.response?.data || error.message);
    throw new Error(error?.message || 'Failed to fetch payments');
  }
}

/**
 * Fetch pending and overdue payments for a user
 * @param {number} tenantID - Tenant ID
 * @param {number} user_id - User ID
 * @returns {Promise<{pending: Array, overdue: Array, total: number}>}
 */
export async function fetchPendingPayments({ tenantID, user_id } = {}) {
  const payments = await fetchPayments({
    tenantID: normalizeId(tenantID, 1),
    user_id,
    paymentStatus: 'Pending',
    limit: 100,
  });

  // Separate pending and overdue based on appointment_date
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const pending = [];
  const overdue = [];

  payments.forEach((payment) => {
    if (payment.appointment_date) {
      const appointmentDate = new Date(payment.appointment_date);
      appointmentDate.setHours(0, 0, 0, 0);

      if (appointmentDate < today) {
        overdue.push(payment);
      } else {
        pending.push(payment);
      }
    } else {
      pending.push(payment);
    }
  });

  return {
    pending,
    overdue,
    total: pending.length + overdue.length,
  };
}

/**
 * Fetch paid/history payments for a user
 * @param {number} tenantID - Tenant ID
 * @param {number} user_id - User ID
 * @param {number} limit - Number of results
 * @param {number} offset - Pagination offset
 * @returns {Promise<Array>}
 */
export async function fetchPaymentHistory({
  tenantID,
  user_id,
  limit = 50,
  offset = 0,
} = {}) {
  return fetchPayments({
    tenantID: normalizeId(tenantID, 1),
    user_id,
    paymentStatus: 'Paid',
    limit,
    offset,
  });
}

/**
 * Create a new payment record
 * @param {Object} paymentData - Payment data
 * @returns {Promise<Object>} Created payment data
 */
export async function createPayment({
  tenantID,
  user_id,
  appointment_id,
  paymentAmount,
  amountPaid = 0,
  paymentMethod = 'Cash',
  paymentStatus = 'Pending',
  referenceNumber,
  gcashReferenceNumber,
  remarks,
} = {}) {
  const payload = {
    action: 'create',
    tenantID: normalizeId(tenantID, 1),
    user_id: normalizeId(user_id),
    appointment_id: normalizeId(appointment_id),
    paymentAmount: Number(paymentAmount) || 0,
    amountPaid: Number(amountPaid) || 0,
    paymentMethod: String(paymentMethod || 'Cash').trim(),
    paymentStatus: String(paymentStatus || 'Pending').trim(),
  };

  if (referenceNumber) payload.referenceNumber = String(referenceNumber).trim();
  if (gcashReferenceNumber) payload.gcashReferenceNumber = String(gcashReferenceNumber).trim();
  if (remarks) payload.remarks = String(remarks).trim();

  if (!payload.user_id) throw new Error('Invalid user_id');
  if (!payload.appointment_id) throw new Error('Invalid appointment_id');
  if (payload.paymentAmount <= 0) throw new Error('Invalid paymentAmount');

  console.log('CREATE PAYMENT URL:', API_ENDPOINT);
  console.log('CREATE PAYMENT PAYLOAD:', payload);

  try {
    const response = await http.post(API_ENDPOINT, payload, {
      validateStatus: () => true,
    });

    console.log('CREATE PAYMENT STATUS:', response.status);
    console.log('CREATE PAYMENT RESPONSE:', response.data);

    if (typeof response.data === 'string') {
      throw new Error('API did not return valid JSON response');
    }

    if (isSuccessResponse(response)) {
      const data = response.data?.data || {};

      return {
        success: true,
        payment_id: normalizeId(data.payment_id, null),
        referenceNumber: data.referenceNumber ? String(data.referenceNumber) : null,
        paymentStatus: data.paymentStatus || 'Pending',
      };
    }

    throw new Error(getApiMessage(response.data, `API returned status ${response.status}`));
  } catch (error) {
    console.error('CREATE PAYMENT ERROR:', error?.response?.data || error.message);
    throw new Error(error?.message || 'Failed to create payment');
  }
}

/**
 * Update an existing payment record
 * @param {number} payment_id - Payment ID
 * @param {Object} updateData - Fields to update
 * @returns {Promise<Object>} Update confirmation
 */
export async function updatePayment(payment_id, updateData = {}) {
  const payload = {
    action: 'update',
    payment_id: normalizeId(payment_id),
    ...updateData,
  };

  if (!payload.payment_id) throw new Error('Invalid payment_id');

  console.log('UPDATE PAYMENT URL:', API_ENDPOINT);
  console.log('UPDATE PAYMENT PAYLOAD:', payload);

  const response = await http.post(API_ENDPOINT, payload, {
    validateStatus: () => true,
  });

  console.log('UPDATE PAYMENT STATUS:', response.status);
  console.log('UPDATE PAYMENT RESPONSE:', response.data);

  if (typeof response.data === 'string') {
    throw new Error('API did not return valid JSON response');
  }

  if (isSuccessResponse(response)) {
    return response.data?.data || { success: true };
  }

  throw new Error(getApiMessage(response.data, `API returned status ${response.status}`));
}

/**
 * Update payment amount and auto-calculate status
 * @param {number} payment_id - Payment ID
 * @param {number} amountPaid - Amount paid
 * @returns {Promise<Object>}
 */
export async function recordPayment(payment_id, amountPaid) {
  return updatePayment(payment_id, {
    amountPaid: Number(amountPaid) || 0,
  });
}

/**
 * Delete a payment record
 * @param {number} payment_id - Payment ID
 * @returns {Promise<Object>}
 */
export async function deletePayment(payment_id) {
  const params = {
    action: 'delete',
    payment_id: normalizeId(payment_id),
  };

  if (!params.payment_id) throw new Error('Invalid payment_id');

  console.log('DELETE PAYMENT URL:', API_ENDPOINT);
  console.log('DELETE PAYMENT PARAMS:', params);

  const response = await http.get(API_ENDPOINT, {
    params,
    validateStatus: () => true,
  });

  console.log('DELETE PAYMENT STATUS:', response.status);
  console.log('DELETE PAYMENT RESPONSE:', response.data);

  if (typeof response.data === 'string') {
    throw new Error('API did not return valid JSON response');
  }

  if (isSuccessResponse(response)) {
    return response.data?.data || { success: true };
  }

  throw new Error(getApiMessage(response.data, `API returned status ${response.status}`));
}
