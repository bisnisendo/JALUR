/* ============ AKSES MASUK: ADMIN & STAFF + DATA DI SUPABASE ============
   Login : Supabase Auth. Username diubah jadi email internal (username@EMAIL_DOMAIN di config.js).
   Role  : tabel public.profiles (admin / staff).
   Data  : tabel public.app_state (1 baris; kolom "data" berisi seluruh data aplikasi).
   File  : Supabase Storage bucket "penawaran" (dipakai js/penawaran.js).
   Setup database: jalankan supabase/setup.sql satu kali di Supabase → SQL Editor. */
(function () {
  "use strict";
  var C = window.JALUR_CONFIG || {};
  var $ = function (id) { return document.getElementById(id); };
  // Menu yang boleh dibuka staff (id menu di sidebar). Admin boleh semuanya.
  // Staff HANYA MELIHAT (tidak bisa menambah/mengubah/menghapus) di semua menu ini.
  var STAFF_MENU = ["dashboard", "stok", "absensi", "timeline", "projects", "rapawal", "rap", "belanja",
                    "material", "jasa", "oper", "sop", "qc"];
  // Kunci data yang HARUS ada agar aplikasi tidak error (daftar = array, OBJ = objek)
  var ARR = ["projects", "rap", "material", "input", "output", "adj", "tim", "tlc", "tlp", "keg", "lem", "qc",
             "jasa", "oper", "investasi", "sop", "sj", "pengajuan", "rapa", "rapf", "spfl"];
  var OBJ = ["abs", "spt"];
  function lengkapi(d) {
    ARR.forEach(function (k) { if (!Array.isArray(d[k])) d[k] = []; });
    OBJ.forEach(function (k) { if (!d[k] || typeof d[k] !== "object" || Array.isArray(d[k])) d[k] = {}; });
    return d;
  }
  var sess = null, timer = null, dirty = false, busy = false, roleDone = false;

  window.JALUR = {
    onSave: function () {
      if (!sess || C.LOCAL_MODE || sess.role === "staff") return;   // staff tidak pernah mengirim data ke server
      dirty = true; stat("Menyimpan…");
      clearTimeout(timer); timer = setTimeout(push, C.AUTOSAVE_MS || 2500);
    },
    get session() { return sess; },
    // Token login Supabase (JWT) — dipakai js/penawaran.js untuk Storage. Diperbarui otomatis oleh supabase-js.
    token: function () {
      if (!window.db) return Promise.resolve(null);
      return window.db.auth.getSession().then(function (r) {
        var s = r && r.data && r.data.session;
        return s ? s.access_token : null;
      });
    }
  };

  function stat(t) { var e = $("wstat"); if (e) e.textContent = t; }
  function showLogin(msg) { $("login").style.display = "flex"; $("who").hidden = true; $("lerr").textContent = msg || ""; setTimeout(function () { $("lu").focus(); }, 50); }
  function hideLogin() { $("login").style.display = "none"; }

  function toEmail(u) { return String(u).trim().toLowerCase() + "@" + (C.EMAIL_DOMAIN || "jalur.local"); }

  // Ambil nama & role dari tabel profiles
  function loadProfile(user) {
    return window.db.from("profiles").select("username,nama,role").eq("id", user.id).maybeSingle().then(function (r) {
      if (r.error) throw new Error(r.error.message || "Gagal membaca profil");
      if (!r.data) throw new Error("Akun ini belum terdaftar di tabel profiles. Hubungi admin.");
      return r.data;
    });
  }

  function applyRole() {
    if (roleDone) return; roleDone = true;
    if (sess.role !== "staff") return;
    applyReadOnly();
    MENU.forEach(function (g) { g[1] = g[1].filter(function (i) { return STAFF_MENU.indexOf(i[0]) >= 0; }); });
    for (var i = MENU.length - 1; i >= 0; i--) if (!MENU[i][1].length) MENU.splice(i, 1);
    var _go = window.go;
    window.go = function (id) { return _go(STAFF_MENU.indexOf(id) >= 0 ? id : STAFF_MENU[0]); };
  }


  // ===== MODE HANYA-LIHAT untuk staff =====
  // Menyembunyikan form & tombol tambah/ubah/hapus, mengunci isian, dan memblokir klik yang mengubah data.
  // Tombol "Cetak", tombol kembali (←), membuka folder, dan kolom pencarian tetap berfungsi.
  // (Pengamanan sebenarnya ada di database: staff tidak punya izin menulis — lihat supabase/setup.sql.)
  function applyReadOnly() {
    var st = document.createElement("style");
    st.textContent = "body.ro #mn .box:has(.form){display:none!important}body.ro #mn button.ic{display:none!important}";
    document.head.appendChild(st);
    document.body.classList.add("ro");
    var mn = $("mn"), KEEP = "[data-q],#qs,#mq,#spq,#mo,#pw,[data-tl=tls]";
    function lock() {
      mn.querySelectorAll("button").forEach(function (b) { if (!/Cetak|←/.test(b.textContent)) b.style.display = "none"; });
      mn.querySelectorAll('[data-a="b"],[data-tl="b"],[data-spn],#nt,#tlnp').forEach(function (e) { e.style.display = "none"; });
      mn.querySelectorAll("p").forEach(function (e) { if (/^Pilih warna/.test(e.textContent.trim())) e.style.display = "none"; });
      mn.querySelectorAll("input,select,textarea").forEach(function (i) {
        if (i.matches(KEEP)) return;
        if (i.tagName === "TEXTAREA") { i.readOnly = true; i.placeholder = "Belum ada tulisan"; }
        else if (i.tagName === "INPUT" && (i.type === "text" || i.type === "number")) i.readOnly = true;
        else i.disabled = true;
      });
    }
    new MutationObserver(lock).observe(mn, { childList: true, subtree: true });
    lock();
    var ACT = "[data-a],[data-tl],[data-qc],[data-sa],[data-ra],[data-fa],[data-ba],[data-sp],[data-spn],[data-spp],[data-mt],[data-sj],[data-pg],[data-e],[data-d]";
    function guard(e) {
      var t = e.target; if (!t || !t.closest) return;
      var bt = t.closest("button");
      if (bt && /Cetak|←/.test(bt.textContent)) return;
      if (t.closest('[data-ra="o"],[data-fa="o"],[data-ba="o"],[data-sp="o"],[data-tl="tg"]')) return;
      var stop = e.type === "click" ? !!(bt || t.closest(ACT)) : !!t.closest('[data-tl="c"],[data-tl="cx"],[data-a="c"]');
      if (stop) { e.stopImmediatePropagation(); e.preventDefault(); }
    }
    ["click", "mousedown", "mouseover", "dblclick"].forEach(function (n) { mn.addEventListener(n, guard, true); });
  }

  function startSession(s) {
    sess = s;
    applyRole();
    $("wtxt").textContent = s.nama + " · " + (s.role === "admin" ? "Admin" : "Staff");
    $("who").hidden = false;
  }

  function resetForms() {
    try { Object.keys(MD).forEach(function (k) { MS[k] = { f: newMF(k), ei: -1, q: "" }; }); } catch (e) {}
  }

  // Muat data dari Supabase
  function pull() {
    return window.db.from("app_state").select("data").eq("id", 1).maybeSingle().then(function (r) {
      if (r.error) {
        var er = new Error(r.error.message || "Gagal memuat data");
        er.auth = r.status === 401;   // token tidak valid / kedaluwarsa
        throw er;
      }
      var d = r.data && r.data.data;
      if (d && typeof d === "object" && Object.keys(d).length) {
        S = lengkapi(d);
        try { localStorage.setItem("crm1", JSON.stringify(S)); } catch (e) {}
        resetForms();
        stat("Data dimuat dari server");
      } else if (sess.role === "admin") {
        // Server masih kosong
        if (!confirm("Server masih kosong.\n\nOK = unggah data yang ada di browser ini ke server.\nBatal = mulai dengan data kosong.")) {
          S = lengkapi({}); resetForms();
        }
        dirty = true; return push();
      } else {
        stat("Server masih kosong");
      }
    });
  }

  // Kirim data ke Supabase (hanya admin yang diizinkan oleh database)
  function push() {
    if (!sess || busy || !dirty) return Promise.resolve();
    busy = true; dirty = false;
    return window.db.from("app_state").upsert({ id: 1, data: S }).then(function (r) {
      if (r.error) {
        if (r.status === 401) { dirty = true; expired(); return; }
        if (r.status === 403 || r.error.code === "42501") { dirty = true; stat("Tidak punya izin menyimpan"); return; }
        throw new Error(r.error.message);
      }
      stat("Tersimpan ✓ " + new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }));
    }).catch(function () {
      dirty = true; stat("Gagal sinkron, dicoba lagi…");
      clearTimeout(timer); timer = setTimeout(push, 15000);
    }).then(function () { busy = false; });
  }

  function expired() {
    sess = null;
    try { window.db.auth.signOut({ scope: "local" }); } catch (e) {}
    showLogin("Sesi habis, silakan masuk lagi.");
  }

  function enter() { hideLogin(); window.go("dashboard"); }

  $("lf").addEventListener("submit", function (ev) {
    ev.preventDefault();
    var b = $("lb"), u = $("lu").value.trim();
    b.disabled = true; $("lerr").textContent = "";
    Promise.resolve().then(function () {
      if (!window.db) throw new Error("Supabase belum siap. Periksa koneksi internet lalu muat ulang halaman.");
      return window.db.auth.signInWithPassword({ email: toEmail(u), password: $("lp").value });
    }).then(function (r) {
      if (r.error) {
        throw new Error(/invalid login|invalid_credentials/i.test(r.error.message + " " + (r.error.code || ""))
          ? "Username atau password salah" : r.error.message);
      }
      $("lp").value = "";
      return loadProfile(r.data.user).then(function (p) {
        startSession({ role: p.role, nama: p.nama || u, u: (p.username || u).toLowerCase() });
      });
    }).then(function () {
      return dirty ? push().then(pull) : pull();
    }).then(enter).catch(function (e) {
      sess = null;
      try { window.db.auth.signOut({ scope: "local" }); } catch (x) {}
      $("who").hidden = true; $("lerr").textContent = e.message || "Gagal masuk";
    }).then(function () { b.disabled = false; });
  });

  $("wout").addEventListener("click", function () {
    if (!sess) return;
    var done = function () {
      Promise.resolve(window.db && window.db.auth.signOut()).catch(function () {}).then(function () {
        try { localStorage.removeItem("crm1"); } catch (e) {}
        location.reload();
      });
    };
    if (dirty) {
      push().then(function () {
        if (dirty && !confirm("Ada perubahan yang belum tersinkron ke server. Tetap keluar?")) return;
        done();
      });
    } else done();
  });

  window.addEventListener("beforeunload", function (e) { if (dirty && sess) { e.preventDefault(); e.returnValue = ""; } });

  // ===== Mulai =====
  // Muat modul lampiran PDF (js/penawaran.js) bila index.html belum memuatnya
  function muatPenawaran() {
    if (document.querySelector('script[src*="penawaran.js"]')) return;
    var pj = document.createElement("script"); pj.src = "js/penawaran.js"; document.body.appendChild(pj);
  }
  if (document.readyState === "complete") muatPenawaran(); else window.addEventListener("load", muatPenawaran);
  if (C.LOCAL_MODE) {
    hideLogin(); sess = { role: "admin", nama: "Mode lokal", token: "" };
    $("wtxt").textContent = "Mode lokal (tanpa server)"; $("who").hidden = false; $("wout").hidden = true;
    return;
  }
  if (!window.db) {
    showLogin(C.SUPABASE_URL && C.SUPABASE_ANON_KEY
      ? "Supabase belum siap. Periksa koneksi internet lalu muat ulang halaman."
      : "Server belum disetel. Isi SUPABASE_URL dan SUPABASE_ANON_KEY di js/config.js.");
    return;
  }
  // Pulihkan sesi login yang masih aktif (selama tab belum ditutup)
  window.db.auth.getSession().then(function (r) {
    var s = r && r.data && r.data.session;
    if (!s) { showLogin(""); return; }
    return loadProfile(s.user).then(function (p) {
      startSession({ role: p.role, nama: p.nama || p.username, u: (p.username || "").toLowerCase() });
      return pull().then(enter).catch(function (e) {
        if (e.auth) expired();
        else { stat("Offline, memakai data di perangkat ini"); enter(); }
      });
    }, function () { showLogin("Sesi tidak valid, silakan masuk lagi."); });
  });
})();
