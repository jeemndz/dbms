import axios from 'axios';

const API_BASE_URL =
  'https://rapidrepair-gygpcbczgyg0czek.southeastasia-01.azurewebsites.net';

const API_ENDPOINT = `${API_BASE_URL}/mobileapis/paymentcrud.php`;

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

const normalizeStatus = (value, fallback = '') => {
  if (!value) return fallback;
  return String(value).trim();
};

const isPendingStatus = (value) =>
  String(value || '').trim().toLowerCase() === 'pending';

const isPaidStatus = (value) =>
  String(value || '').trim().toLowerCase() === 'paid';

const normalizePaymentRecord = (item) => {
  if (!item || typeof item !== 'object') return null;

  return {
    payment_id: normalizeId(item.payment_id, null),
    tenantID: normalizeId(item.tenantID, null),
    user_id: normalizeId(item.user_id, null),
    appointment_id: normalizeId(item.appointment_id, null),
    paymentAmount: normalizeMoney(item.paymentAmount, 0),
    amountPaid: normalizeMoney(item.amountPaid, 0),
    balance: normalizeMoney(item.balance, 0),
    paymentMethod: item.paymentMethod ? String(item.paymentMethod).trim() : 'Cash',
    paymentDate: item.paymentDate ? String(item.paymentDate) : null,
    paymentStatus: normalizeStatus(item.paymentStatus, 'Pending'),
    referenceNumber: item.referenceNumber ? String(item.referenceNumber).trim() : null,
    gcashReferenceNumber: item.gcashReferenceNumber
      ? String(item.gcashReferenceNumber).trim()
      : null,
    remarks: item.remarks ? String(item.remarks) : null,
    created_at: item.created_at ? String(item.created_at) : '',
    updated_at: item.updated_at ? String(item.updated_at) : '',
    appointment_date: item.appointment_date ? String(item.appointment_date) : '',
    appointment_time: item.appointment_time ? String(item.appointment_time) : '',
    appointment_status: item.appointment_status
      ? String(item.appointment_status).trim()
      : '',
  };
};

export async function fetchPayments({
  tenantID,
  user_id,
  paymentStatus,
  limit = 50,
  offset = 0,
} = {}) {
  const normalizedTenantId = normalizeId(tenantID);
  const normalizedUserId = normalizeId(user_id, null);

  if (!normalizedTenantId) {
    throw new Error('Invalid tenantID');
  }

  const params = {
    action: 'list',
    tenantID: normalizedTenantId,
    limit: Math.min(Math.max(Number(limit) || 50, 1), 100),
    offset: Math.max(Number(offset) || 0, 0),
  };

  if (normalizedUserId) {
    params.user_id = normalizedUserId;
  }

  if (paymentStatus && String(paymentStatus).trim()) {
    params.paymentStatus = String(paymentStatus).trim();
  }

  console.log('FETCH PAYMENTS URL:', API_ENDPOINT);
  console.log('FETCH PAYMENTS PARAMS:', params);

  const response = await http.get(API_ENDPOINT, {
    params,
    validateStatus: () => true,
  });

  console.log('FETCH PAYMENTS STATUS:', response.status);
  console.log('FETCH PAYMENTS RESPONSE:', response.data);

  if (typeof response.data === 'string') {
    throw new Error('API did not return valid JSON. Check PHP path/deployment.');
  }

  if (isSuccessResponse(response)) {
    const rawList = Array.isArray(response.data?.payments)
      ? response.data.payments
      : Array.isArray(response.data?.data)
      ? response.data.data
      : [];

    let normalizedList = rawList.map(normalizePaymentRecord).filter(Boolean);

    if (paymentStatus && String(paymentStatus).trim()) {
      const wantedStatus = String(paymentStatus).trim().toLowerCase();
      normalizedList = normalizedList.filter(
        (item) => String(item.paymentStatus || '').trim().toLowerCase() === wantedStatus
      );
    }

    return normalizedList;
  }

  throw new Error(getApiMessage(response.data, `API returned status ${response.status}`));
}

export async function fetchPendingPayments({
  tenantID,
  user_id,
  limit = 50,
  offset = 0,
} = {}) {
  const payments = await fetchPayments({
    tenantID,
    user_id,
    paymentStatus: 'Pending',
    limit,
    offset,
  });

  return payments.filter((item) => isPendingStatus(item.paymentStatus));
}

export async function fetchPaymentHistory({
  tenantID,
  user_id,
  limit = 50,
  offset = 0,
} = {}) {
  const payments = await fetchPayments({
    tenantID,
    user_id,
    paymentStatus: 'Paid',
    limit,
    offset,
  });

  return payments.filter((item) => isPaidStatus(item.paymentStatus));
}

export async function payPayment({
  payment_id,
  tenantID,
  user_id,
  amountPaid,
  gcashReferenceNumber = '',
  remarks = '',
} = {}) {
  const normalizedPaymentId = normalizeId(payment_id);
  const normalizedTenantId = normalizeId(tenantID);
  const normalizedUserId = normalizeId(user_id);
  const normalizedAmountPaid = Number(amountPaid) || 0;

  if (!normalizedPaymentId) {
    throw new Error('Invalid payment_id');
  }

  if (!normalizedTenantId) {
    throw new Error('Invalid tenantID');
  }

  if (!normalizedUserId) {
    throw new Error('Invalid user_id');
  }

  if (normalizedAmountPaid <= 0) {
    throw new Error('Amount paid must be greater than 0');
  }

  const payload = {
    action: 'pay',
    payment_id: normalizedPaymentId,
    tenantID: normalizedTenantId,
    user_id: normalizedUserId,
    amountPaid: normalizedAmountPaid,
    paymentMethod: 'GCash',
    gcashReferenceNumber: gcashReferenceNumber
      ? String(gcashReferenceNumber).trim()
      : '',
    remarks: remarks ? String(remarks).trim() : '',
  };

  console.log('PAY PAYMENT URL:', API_ENDPOINT);
  console.log('PAY PAYMENT PAYLOAD:', payload);

  const response = await http.post(API_ENDPOINT, payload, {
    validateStatus: () => true,
  });

  console.log('PAY PAYMENT STATUS:', response.status);
  console.log('PAY PAYMENT RESPONSE:', response.data);

  if (typeof response.data === 'string') {
    throw new Error('API did not return valid JSON');
  }

  if (isSuccessResponse(response)) {
    return response.data?.data || { success: true };
  }

  throw new Error(getApiMessage(response.data, `API returned status ${response.status}`));
}