import { createClient } from "@supabase/supabase-js";

const normalizedEnvApiUrl = (import.meta.env.VITE_API_URL || "").trim().replace(/\/+$/, "");
const browserOrigin = typeof window !== "undefined" ? window.location.origin : "http://localhost:8000";
const resolvedApiUrl = normalizedEnvApiUrl || browserOrigin;

export const API_URL = resolvedApiUrl;
export const API_CONFIGURED = Boolean(import.meta.env.VITE_API_URL) || !API_URL.includes("localhost");

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
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

export async function apiFetch(path, options = {}) {
  const requestOptions = { ...options };

  let response;
  try {
    response = await fetch(`${API_URL}${path}`, requestOptions);
  } catch (err) {
    const canRetrySameOrigin = typeof window !== "undefined" && API_URL !== browserOrigin;
    if (!canRetrySameOrigin) throw err;
    response = await fetch(`${browserOrigin}${path}`, requestOptions);
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
