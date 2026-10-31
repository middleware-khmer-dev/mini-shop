// Set API_BASE to your backend, e.g. "https://api.example.com".
// Expected endpoints:
//   POST {API_BASE}/auth/login     body {phone, password}            -> {token, user:{name,phone}}
//   POST {API_BASE}/auth/register  body {fullname, phone, password}  -> {token, user:{name,phone}}
// Leave API_BASE empty to use the built-in demo (mock) auth: any valid phone
// number + non-empty password logs in; data is kept only in this browser.
window.APP_CONFIG = { API_BASE: "" };
