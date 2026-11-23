/* Koneksi Supabase (satu pintu untuk seluruh aplikasi: window.db).
   Wajib dimuat SETELAH js/config.js dan library supabase-js (lihat index.html). */
(function () {
  "use strict";
  var C = window.JALUR_CONFIG || {};
  if (!window.supabase || !window.supabase.createClient) {
    console.error("Library supabase-js belum termuat (cek koneksi internet / tag <script> di index.html).");
    return;
  }
  if (!C.SUPABASE_URL || !C.SUPABASE_ANON_KEY) {
    console.error("SUPABASE_URL / SUPABASE_ANON_KEY belum diisi di js/config.js");
    return;
  }
  window.db = window.supabase.createClient(C.SUPABASE_URL, C.SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      storage: window.sessionStorage,     // login hilang saat tab ditutup (sama seperti sebelumnya)
      storageKey: "jalur_sb_auth"
    }
  });
})();
