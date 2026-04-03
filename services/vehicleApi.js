import axios from 'axios';

const API_BASE_URL = 'https://rapidrepair-gygpcbczgyg0czek.southeastasia-01.azurewebsites.net';
const VEHICLE_CRUD_ENDPOINTS = [
  `${API_BASE_URL}/mobileapis/vehicleinformation_crud.php`,
  `${API_BASE_URL}/vehicleinformation_crud.php`,
  `${API_BASE_URL}/mobileapis/vehicles_create.php`,
  `${API_BASE_URL}/vehicles_create.php`,
  `${API_BASE_URL}/vehicles_list.php`,
];

const VEHICLE_LIST_ENDPOINTS = [
  `${API_BASE_URL}/vehicle_list.php`,
  `${API_BASE_URL}/mobileapis/vehicle_list.php`,
  `${API_BASE_URL}/vehicles_list.php`,
  `${API_BASE_URL}/mobileapis/vehicles_list.php`,
];

const toNumberOrNull = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const toYearOrNull = (value) => {
  const normalized = String(value || '').replace(/[^0-9]/g, '').slice(0, 4);
  return normalized.length === 4 ? normalized : null;
};

const pad2 = (value) => String(value).padStart(2, '0');

const toMysqlTimestampOrNull = (value) => {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return `${parsed.getFullYear()}-${pad2(parsed.getMonth() + 1)}-${pad2(parsed.getDate())} ${pad2(parsed.getHours())}:${pad2(parsed.getMinutes())}:${pad2(parsed.getSeconds())}`;
};

const toPhpFormData = (payload) => {
  const form = new URLSearchParams();

  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return;
    }

    form.append(key, String(value));
  });

  return form;
};

const postPhp = async (url, payload) => {
  const response = await axios.post(url, toPhpFormData(payload), {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });

  const status = String(response?.data?.status || '').trim().toLowerCase();
  if (status && status !== 'success') {
    const message = response?.data?.message || 'Request failed.';
    throw new Error(String(message));
  }

  return response;
};

const isMissingEndpointError = (error) => {
  const status = Number(error?.response?.status || 0);
  const bodyText = String(error?.response?.data || '').toLowerCase();
  const message = String(error?.message || '').toLowerCase();

  if (status === 404) {
    return true;
  }

  return bodyText.includes('not found') || message.includes('not found');
};

const getVehicleCrud = async (params) => {
  let lastError = null;

  for (const endpoint of VEHICLE_CRUD_ENDPOINTS) {
    try {
      return await axios.get(endpoint, { params });
    } catch (error) {
      lastError = error;
      if (!isMissingEndpointError(error)) {
        throw error;
      }
    }
  }

  throw lastError || new Error('Vehicle API endpoint not found.');
};

const postVehicleCrud = async (payload) => {
  let lastError = null;

  for (const endpoint of VEHICLE_CRUD_ENDPOINTS) {
    try {
      return await postPhp(endpoint, payload);
    } catch (error) {
      lastError = error;
      if (!isMissingEndpointError(error)) {
        throw error;
      }
    }
  }

  throw lastError || new Error('Vehicle API endpoint not found.');
};

const normalizeVehicle = (row) => ({
  vehicle_id: String(row?.vehicle_id || row?.id || ''),
  tenantID: row?.tenantID,
  user_id: row?.user_id,
  brand: row?.brand || row?.make || '',
  model: row?.model || '',
  year_model: String(row?.year_model || row?.year || ''),
  fuel_type: row?.fuel_type || 'Gasoline',
  transmission_type: row?.transmission_type || 'Manual',
  engine_number: row?.engine_number || '',
  mileage_km: row?.mileage_km,
  vin_number: row?.vin_number || row?.vin || '',
  plate_number: row?.plate_number || row?.licensePlate || '',
  color: row?.color || '',
  status: row?.status || 'Active',
  date_added: row?.date_added || row?.created_at || row?.updated_at || new Date().toISOString(),
});

const mapFormToPayload = ({ vehicleForm, tenantID, user_id }) => ({
  tenantID,
  user_id,
  brand: vehicleForm.make?.trim() || '',
  model: vehicleForm.model?.trim() || '',
  year_model: toYearOrNull(vehicleForm.year),
  fuel_type: vehicleForm.fuelType,
  transmission_type: vehicleForm.transmissionType,
  engine_number: vehicleForm.engineNumber?.trim() || null,
  mileage_km: toNumberOrNull(vehicleForm.mileage),
  vin_number: vehicleForm.vin?.trim().toUpperCase() || null,
  plate_number: vehicleForm.licensePlate?.trim().toUpperCase() || '',
  color: vehicleForm.color?.trim() || null,
  status: vehicleForm.status,
  date_added: toMysqlTimestampOrNull(vehicleForm.dateAdded),
});

export async function fetchVehiclesByUser({ tenantID, user_id }) {
  const normalizedUserId = Number(user_id);

  try {
    const response = await postVehicleCrud({
      action: 'list',
      tenantID,
      user_id: normalizedUserId,
    });

    const raw = response?.data?.vehicles || response?.data?.data || [];
    if (Array.isArray(raw)) {
      return raw.map(normalizeVehicle);
    }
  } catch (_error) {
    // Fallback to GET-based tenant list endpoint for older deployments.
  }

  const tenantVehicles = await fetchVehicles(tenantID);
  if (!Number.isFinite(normalizedUserId) || normalizedUserId <= 0) {
    return tenantVehicles;
  }

  return tenantVehicles.filter((vehicle) => Number(vehicle?.user_id) === normalizedUserId);
}

export async function createVehicle({ vehicleForm, tenantID, user_id }) {
  const payload = {
    action: 'create',
    ...mapFormToPayload({ vehicleForm, tenantID, user_id }),
  };
  const response = await postVehicleCrud(payload);

  return normalizeVehicle(response?.data?.vehicle || payload);
}

export async function updateVehicle({ vehicle_id, updates, tenantID, user_id }) {
  const response = await postVehicleCrud({
    action: 'update',
    vehicle_id,
    tenantID,
    user_id,
    ...updates,
  });

  return normalizeVehicle(response?.data?.vehicle || { vehicle_id, ...updates });
}

export async function deleteVehicle({ vehicle_id, tenantID, user_id }) {
  await postVehicleCrud({
    action: 'delete',
    vehicle_id,
    tenantID,
    user_id,
  });

  return true;
}

export async function fetchVehicles(tenantID = 1) {
  try {
    const normalizedTenantID = Number(tenantID);
    if (!Number.isFinite(normalizedTenantID) || normalizedTenantID <= 0) {
      throw new Error('Invalid tenantID provided');
    }

    let lastError = null;

    for (const endpoint of VEHICLE_LIST_ENDPOINTS) {
      try {
        console.log(`[fetchVehicles] Attempting endpoint: ${endpoint}`);

        const response = await axios.get(endpoint, {
          params: { tenantID: normalizedTenantID },
        });

        const parsed = response?.data?.vehicles || [];
        if (parsed.length > 0) {
          return parsed.map(normalizeVehicle);
        }

        const fallbackResponse = await axios.get(endpoint, {
          params: { tenantID: normalizedTenantID, includeAllOnEmpty: 1 },
        });

        return (fallbackResponse?.data?.vehicles || []).map(normalizeVehicle);
      } catch (error) {
        lastError = error;

        // Some Azure deployments return 404 when any query string is present.
        // Retry the endpoint without query params and use it if it returns vehicles.
        if (isMissingEndpointError(error)) {
          try {
            const noQueryResponse = await axios.get(endpoint);
            const noQueryVehicles = noQueryResponse?.data?.vehicles;
            if (Array.isArray(noQueryVehicles)) {
              const normalized = noQueryVehicles.map(normalizeVehicle);
              return normalized.filter(
                (vehicle) => Number(vehicle?.tenantID || 0) === normalizedTenantID
              );
            }
          } catch (_noQueryError) {
            // Ignore no-query fallback errors and continue trying known endpoints.
          }
        }

        if (!isMissingEndpointError(error) && Number(error?.response?.status || 0) !== 405) {
          throw error;
        }
      }
    }

    console.warn('[fetchVehicles] vehicle list endpoint unavailable on all known paths or blocked by query-string routing, returning empty array');
    if (lastError) {
      console.log('[fetchVehicles] Last endpoint error:', {
        status: lastError?.response?.status,
        statusText: lastError?.response?.statusText,
        data: lastError?.response?.data,
        message: lastError?.message,
      });
    }

    return [];
  } catch (error) {
    console.error('[fetchVehicles] Unexpected error:', error.message);
    throw error;
  }
}
