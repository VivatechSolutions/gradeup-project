const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1";

async function parseResponse(response) {
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data?.message || "Request failed");
  }

  return data;
}

export async function apiRequest(path, options = {}) {
  const token = localStorage.getItem("gradeup_admin_token");
  const headers = {
    ...(options.headers || {}),
  };

  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  return parseResponse(response);
}

export async function loginAdmin(payload) {
  return apiRequest("/admin/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function fetchCurrentAdmin() {
  return apiRequest("/admin/auth/me");
}

export async function requestAdminPasswordReset(payload) {
  return apiRequest("/admin/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function verifyAdminResetToken(token) {
  return apiRequest(`/admin/auth/reset-password/verify?token=${encodeURIComponent(token)}`);
}

export async function resetAdminPassword(payload) {
  return apiRequest("/admin/auth/reset-password", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function changeAdminPassword(payload) {
  return apiRequest("/admin/auth/change-password", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function fetchAdminUsers() {
  return apiRequest("/admin/users");
}

export async function createAdminUser(payload) {
  return apiRequest("/admin/users", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateAdminUser(id, payload) {
  return apiRequest(`/admin/users/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deleteAdminUser(id) {
  return apiRequest(`/admin/users/${id}`, {
    method: "DELETE",
  });
}

export async function fetchSubjects(searchParams = "") {
  return apiRequest(`/admin/subjects${searchParams ? `?${searchParams}` : ""}`);
}

export async function fetchSubjectDetail(id) {
  return apiRequest(`/admin/subjects/${id}`);
}

export async function fetchSubjectGroup(groupKey) {
  return apiRequest(`/admin/subjects/groups/${encodeURIComponent(groupKey)}`);
}

export async function updateSubjectGroup(groupKey, payload) {
  return apiRequest(`/admin/subjects/groups/${encodeURIComponent(groupKey)}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deleteSubjectGroup(groupKey) {
  return apiRequest(`/admin/subjects/groups/${encodeURIComponent(groupKey)}`, {
    method: "DELETE",
  });
}

export async function deleteSubjectUnit(unitId) {
  return apiRequest(`/admin/subjects/units/${unitId}`, {
    method: "DELETE",
  });
}

export async function uploadSubject(formData) {
  return apiRequest("/admin/subjects", {
    method: "POST",
    body: formData,
  });
}

export async function fetchUploadStatus(id) {
  return apiRequest(`/admin/subjects/uploads/${id}/status`);
}

export async function fetchUploadProcesses(searchParams = "") {
  return apiRequest(
    `/admin/subjects/uploads${searchParams ? `?${searchParams}` : ""}`,
  );
}
