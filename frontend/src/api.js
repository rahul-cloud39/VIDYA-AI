import { createClient } from "@supabase/supabase-js";

const normalizedEnvApiUrl = (import.meta.env.VITE_API_URL || "").trim().replace(/\/+$/, "");
const browserOrigin = typeof window !== "undefined" ? window.location.origin : "http://localhost:8000";
const resolvedApiUrl = normalizedEnvApiUrl || browserOrigin;
const isLocalhostOrigin =
  browserOrigin.includes("localhost") || browserOrigin.includes("127.0.0.1");
const defaultBackendUrl = "https://vidya-ai-konw.onrender.com";

export const API_URL = resolvedApiUrl;
export const API_CONFIGURED = Boolean(normalizedEnvApiUrl) || isLocalhostOrigin;

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

export const supabase =
  supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

export async function authHeaders() {
  if (!supabase) return {};
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function apiJson(path, options = {}) {
  const headers = await authHeaders();
  const requestOptions = {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...headers,
      ...(options.headers || {}),
    },
  };

  const response = await apiFetch(path, requestOptions);
  if (!response.ok) {
    const raw = await response.text();
    let parsedMessage = "";
    try {
      const parsed = JSON.parse(raw);
      parsedMessage = parsed?.detail || parsed?.message || "";
    } catch {}
    const message = parsedMessage || raw || `Request failed (${response.status})`;
    throw new Error(message);
  }
  return response.json();
}

export async function apiFetch(path, options = {}) {
  const requestOptions = { ...options };
  if (!normalizedEnvApiUrl && !isLocalhostOrigin) {
    throw new Error(
      "VITE_API_URL is missing. Set it in your frontend deployment env to backend URL, then redeploy frontend."
    );
  }

  let response;
  try {
    response = await fetch(`${API_URL}${path}`, requestOptions);
  } catch (err) {
    const canRetrySameOrigin = typeof window !== "undefined" && API_URL !== browserOrigin;
    if (!canRetrySameOrigin) throw err;
    response = await fetch(`${browserOrigin}${path}`, requestOptions);
  }

  const canRetryOnHostedBackend =
    API_URL === browserOrigin &&
    !normalizedEnvApiUrl &&
    (response.status === 404 || response.status === 405);
  if (canRetryOnHostedBackend) {
    response = await fetch(`${defaultBackendUrl}${path}`, requestOptions);
  }
  return response;
}

export function loadRazorpayScript() {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) {
      resolve(window.Razorpay);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(window.Razorpay);
    script.onerror = () => reject(new Error("Failed to load Razorpay Checkout"));
    document.body.appendChild(script);
  });
}
