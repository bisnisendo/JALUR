/* ============ KONFIGURASI JALUR ============
   Backend: Supabase (login, data, dan file PDF penawaran).
   URL & key ada di Supabase → Project Settings → API Keys (pakai publishable / anon key SAJA,
   jangan pernah menaruh secret / service_role key di sini). */
window.JALUR_CONFIG = {
  APP_NAME: "JALUR",
  LOCAL_MODE: false,    // true = tanpa login & tanpa server (HANYA untuk uji coba di komputer sendiri)
  AUTOSAVE_MS: 2500,    // jeda sebelum perubahan dikirim ke server
  EMAIL_DOMAIN: "jalur.local",   // username "budi" masuk ke Supabase sebagai budi@jalur.local
  SUPABASE_URL: "https://tksllvclvbqsrayvbiij.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_Dn-6rlkCHiszK0KHZEpzDg_QHHV6DMi"
};
window.CONFIG = window.JALUR_CONFIG;   // nama lama, dipakai js/supabase.js
