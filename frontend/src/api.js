import { createClient } from "@supabase/supabase-js";

export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || "",
  import.meta.env.VITE_SUPABASE_ANON_KEY || ""
);

export async function authHeaders() {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function apiJson(path, options = {}) {
  const headers = await authHeaders();
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...headers,
      ...(options.headers || {}),
    },
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
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
