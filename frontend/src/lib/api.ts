// API base URL — point this to your backend server
export const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const getToken = () => localStorage.getItem("abelup_token");

interface RequestOptions {
  method?: string;
  body?: any;
  headers?: Record<string, string>;
}

export const api = async <T = any>(endpoint: string, options: RequestOptions = {}): Promise<T> => {
  const { method = "GET", body, headers = {} } = options;
  const token = getToken();

  const config: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  };

  if (body) config.body = JSON.stringify(body);

  const res = await fetch(`${API_BASE_URL}${endpoint}`, config);
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || `Request failed (${res.status})`);
  }

  return data;
};

export const apiUpload = async <T = any>(endpoint: string, formData: FormData): Promise<T> => {
  const token = getToken();

  const res = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: "POST",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || `Upload failed (${res.status})`);
  return data;
};
