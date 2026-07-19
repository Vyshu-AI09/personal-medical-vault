import client, { API_BASE_URL } from "./client";

export async function uploadRecord({ title, category, record_date, notes, file }) {
  const form = new FormData();
  form.append("title", title);
  form.append("category", category);
  form.append("record_date", record_date);
  if (notes) form.append("notes", notes);
  form.append("file", file);

  const { data } = await client.post("/records", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function listRecords({ category, date_from, date_to } = {}) {
  const params = {};
  if (category) params.category = category;
  if (date_from) params.date_from = date_from;
  if (date_to) params.date_to = date_to;

  const { data } = await client.get("/records", { params });
  return data;
}

export async function getRecord(id) {
  const { data } = await client.get(`/records/${id}`);
  return data;
}

export async function updateRecord(id, updates) {
  const { data } = await client.patch(`/records/${id}`, updates);
  return data;
}

export async function deleteRecord(id) {
  await client.delete(`/records/${id}`);
}

export async function getTimeline() {
  const { data } = await client.get("/timeline");
  return data;
}

export function recordFileUrl(id) {
  // Note: this endpoint requires auth, so direct <img src=...> won't work
  // for private access. Included here for reference / future signed-URL use.
  return `${API_BASE_URL}/records/${id}/file`;
}

export async function downloadRecordFile(id) {
  const response = await client.get(`/records/${id}/file`, { responseType: "blob" });
  return response.data; // Blob - caller can create an object URL from this
}

export const CATEGORIES = [
  { value: "lab_report", label: "Lab Report" },
  { value: "prescription", label: "Prescription" },
  { value: "scan", label: "Scan" },
  { value: "vaccination", label: "Vaccination" },
  { value: "appointment", label: "Appointment" },
  { value: "other", label: "Other" },
];
