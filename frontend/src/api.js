const API_URL = import.meta.env.VITE_API_URL;

async function request(path, options = {}) {
  const { headers, ...rest } = options;
  const res = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...(headers || {}) },
    ...rest,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

export const api = {
  syncUser: (payload) => request("/users/sync", { method: "POST", body: JSON.stringify(payload) }),
  setRole: (uid, role, hospitalId) =>
    request(`/users/${uid}/role`, { method: "POST", body: JSON.stringify({ role, hospitalId }) }),
  getUser: (uid) => request(`/users/${uid}`),
  updateProfile: (uid, payload) =>
    request(`/users/${uid}/profile`, { method: "PUT", body: JSON.stringify(payload) }),

  // Hospital register + login both run on license ID + registered email —
  // no password. /claim creates the account (one step); /login signs back
  // into an already-registered one.
  claimHospital: (payload) => request("/hospitals/claim", { method: "POST", body: JSON.stringify(payload) }),
  loginHospital: (licenseNumber, email) =>
    request("/hospitals/login", { method: "POST", body: JSON.stringify({ licenseNumber, email }) }),

  searchHospitals: (department, lat, lng, sort) =>
    request(
      `/hospitals?department=${encodeURIComponent(department)}&lat=${lat}&lng=${lng}&sort=${sort || "best"}`
    ),

  // uid = the logged-in hospital admin's firebaseUid, sent so the backend can
  // confirm they actually own this hospital before returning its data.
  getHospital: (id, uid) => request(`/hospitals/${id}`, { headers: { "x-firebase-uid": uid } }),
  updateHospitalProfile: (id, payload, uid) =>
    request(`/hospitals/${id}/profile`, {
      method: "PUT",
      body: JSON.stringify(payload),
      headers: { "x-firebase-uid": uid },
    }),
  adjustDepartment: (hospitalId, deptName, delta, uid) =>
    request(`/hospitals/${hospitalId}/departments/${encodeURIComponent(deptName)}`, {
      method: "PATCH",
      body: JSON.stringify({ delta }),
      headers: { "x-firebase-uid": uid },
    }),
  updateDepartment: (hospitalId, deptName, payload, uid) =>
    request(`/hospitals/${hospitalId}/departments/${encodeURIComponent(deptName)}`, {
      method: "PUT",
      body: JSON.stringify(payload),
      headers: { "x-firebase-uid": uid },
    }),
  addDepartment: (hospitalId, payload, uid) =>
    request(`/hospitals/${hospitalId}/departments`, {
      method: "POST",
      body: JSON.stringify(payload),
      headers: { "x-firebase-uid": uid },
    }),

  createBooking: (payload) => request("/bookings", { method: "POST", body: JSON.stringify(payload) }),
  getPatientBookings: (uid) => request(`/bookings/patient/${uid}`),
  getHospitalBookings: (hospitalId) => request(`/bookings/hospital/${hospitalId}`),
  updateBookingStatus: (id, status) =>
    request(`/bookings/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
};
