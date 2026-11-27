/* ============ FOTO MATERIAL — menu "Material" ============
   Tiap item material boleh punya satu foto / model. Foto TIDAK tampil di tabel: hanya ikon 📷 yang,
   bila diklik, membuka foto dalam jendela besar.
   Penyimpanan : Supabase Storage, bucket privat "material" (jalankan supabase/foto-material.sql).
   Foto dikecilkan otomatis (maks. 1280 px, JPEG) sebelum diunggah agar hemat kuota penyimpanan.
   Data material hanya menyimpan info singkat: item.foto = { path, nama, size, tgl }.
   Admin: unggah / ganti / hapus.  Staff: hanya melihat.
   Dipakai oleh js/app.js lewat window.FOTO.field(...) dan window.FOTO.cell(...). */
(function () {
  "use strict";
  if (window.FOTO) return;
  var BUCKET = "material", MAXPX = 1280, QUAL = 0.82, MAXRAW = 25 * 1024 * 1024;
  var mn = document.getElementById("mn");
  if (!mn) return;
  var pending = null;   // { blob, nama, size } foto yang dipilih; diunggah saat tombol Simpan/Update ditekan
  var komp = null;      // proses pengecilan foto yang sedang berjalan
  var rmOld = false;    // true = hapus foto lama saat Simpan

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function ON() { return !!window.db && !(window.JALUR_CONFIG && window.JALUR_CONFIG.LOCAL_MODE); }
  function today() { return new Date().toISOString().slice(0, 10); }
  function uid() { return (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : Date.now() + "-" + Math.random().toString(36).slice(2); }
  function sz(n) { return n >= 1048576 ? (n / 1048576).toFixed(1).replace(".", ",") + " MB" : Math.max(1, Math.round(n / 1024)) + " KB"; }
  function curNow() { try { return cur; } catch (e) { return ""; } }
  function matState() { try { return MS.material; } catch (e) { return null; } }
  function rows() { try { return S.material || []; } catch (e) { return []; } }

  // ---------- Penyimpanan ----------
  function errMsg(e) {
    var m = (e && e.message) || "";
    if (/bucket not found/i.test(m)) return "Bucket 'material' belum dibuat. Jalankan supabase/foto-material.sql di Supabase.";
    if (/row-level security|unauthorized|not allowed|forbidden|403/i.test(m)) return "Tidak punya izin (hanya admin yang boleh mengunggah foto).";
    return m || "Gagal";
  }
  function upload(blob) {
    var path = uid() + ".jpg";
    return Promise.resolve(window.db.storage.from(BUCKET).upload(path, blob, { contentType: "image/jpeg", upsert: false }))
      .then(function (r) { if (r.error) throw new Error(errMsg(r.error)); return path; });
  }
  function removeFile(path) {
    if (!path || !window.db) return Promise.resolve();
    return Promise.resolve(window.db.storage.from(BUCKET).remove([path])).catch(function () {});
  }
  function dipakai(path) { return rows().some(function (r) { return r && r.foto && r.foto.path === path; }); }

  // ---------- Kecilkan foto ----------
  function kompres(file) {
    return new Promise(function (res, rej) {
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () {
        URL.revokeObjectURL(url);
        var sc = Math.min(1, MAXPX / Math.max(img.width, img.height)), w = Math.max(1, Math.round(img.width * sc)), h = Math.max(1, Math.round(img.height * sc));
        var c = document.createElement("canvas"); c.width = w; c.height = h;
        var x = c.getContext("2d"); x.fillStyle = "#fff"; x.fillRect(0, 0, w, h); x.drawImage(img, 0, 0, w, h);
        c.toBlob(function (b) { b ? res(b) : rej(new Error("Foto tidak bisa diproses")); }, "image/jpeg", QUAL);
      };
      img.onerror = function () { URL.revokeObjectURL(url); rej(new Error("File ini tidak bisa dibaca sebagai foto. Coba foto berformat JPG atau PNG.")); };
      img.src = url;
    });
  }

  // ---------- Tampilan di form & tabel (dipanggil app.js) ----------
  function infoHtml(f) {
    if (!ON()) return "Server belum disetel";
    if (komp) return "Memproses foto…";
    if (pending) return "Dipilih: " + esc(pending.nama) + " (" + sz(pending.blob.size) + ") · diunggah saat disimpan";
    if (rmOld) return "Foto akan dihapus saat disimpan · <a href='#' data-fu>batalkan</a>";
    var p = f && f.foto;
    if (p && p.path) return "Foto tersimpan: " + esc(p.nama || "foto") + " · pilih file baru untuk mengganti · <a href='#' data-fx style='color:#dc2626'>hapus foto</a>";
    return "Opsional · foto/model material, otomatis dikecilkan";
  }
  function info() { var e = mn.querySelector(".foto-info"), s = matState(); if (e) e.innerHTML = infoHtml(s && s.f); }

  window.FOTO = {
    field: function (f) {
      return '<label class="foto-fld">Foto material<input type="file" accept="image/*" data-fotoin' + (ON() ? "" : " disabled") + '>' +
        '<small class="foto-info" style="color:var(--mu);font-size:11px">' + infoHtml(f) + '</small></label>';
    },
    cell: function (r) {
      var p = r && r.foto;
      if (!p || !p.path) return '<span style="color:var(--mu)">—</span>';
      return '<a href="#" data-fv="' + esc(p.path) + '" data-fn="' + esc(p.nama || "") + '" title="Lihat foto" style="font-size:20px;line-height:1;text-decoration:none">📷</a>';
    }
  };

  // ---------- Foto untuk hasil cetak (dipakai cetak Belanja) ----------
  // names = daftar nama material. Hasil: { "nama material huruf kecil": alamat foto }, hanya untuk yang punya foto di menu Material.
  // Semua foto dimuat penuh lebih dulu supaya jendela cetak tidak terbuka dengan foto yang masih kosong.
  function nk(s) { return String(s == null ? "" : s).trim().toLowerCase(); }
  window.FOTO.urlsFor = function (names) {
    var map = {}, need = [], seen = {};
    (names || []).forEach(function (n) {
      var k = nk(n); if (!k || seen[k]) return; seen[k] = 1;
      var m = rows().filter(function (r) { return r && nk(r.nama) === k && r.foto && r.foto.path; })[0];
      if (m) need.push({ k: k, path: m.foto.path });
    });
    if (!need.length || !window.db) return Promise.resolve(map);
    return Promise.all(need.map(function (o) {
      return Promise.resolve(window.db.storage.from(BUCKET).createSignedUrl(o.path, 600)).then(function (r) {
        if (r.error || !r.data || !r.data.signedUrl) return;
        return new Promise(function (res) {
          var im = new Image(), done = false;
          function fin(ok) { if (done) return; done = true; if (ok) map[o.k] = r.data.signedUrl; res(); }
          im.onload = function () { fin(true); }; im.onerror = function () { fin(false); };
          setTimeout(function () { fin(false); }, 10000);
          im.src = r.data.signedUrl;
        });
      }).catch(function () {});
    })).then(function () { return map; });
  };

  // ---------- Jendela lihat foto ----------
  var ov = null;
  function tutup() { if (ov) { ov.remove(); ov = null; } document.removeEventListener("keydown", onKey); }
  function onKey(e) { if (e.key === "Escape") tutup(); }
  function lihat(path, nama) {
    tutup();
    ov = document.createElement("div"); ov.id = "foto-ov";
    ov.setAttribute("style", "position:fixed;inset:0;z-index:99999;background:rgba(5,10,25,.82);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:16px");
    ov.innerHTML = '<button type="button" data-fc aria-label="Tutup" style="position:absolute;top:12px;right:14px;width:40px;height:40px;border-radius:50%;border:0;background:#fff;color:#0f1e3d;font-size:22px;line-height:1;cursor:pointer">×</button>' +
      '<div data-fb style="max-width:94vw;max-height:84vh;display:flex;align-items:center;justify-content:center;color:#fff;font:15px system-ui,sans-serif">Memuat foto…</div>' +
      '<div style="color:#dbe5fa;font:13px system-ui,sans-serif;max-width:94vw;text-align:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(nama || "") + '</div>';
    ov.addEventListener("click", function (e) { if (e.target === ov || e.target.closest("[data-fc]")) tutup(); });
    document.body.appendChild(ov); document.addEventListener("keydown", onKey);
    var box = ov.querySelector("[data-fb]");
    if (!window.db) { box.textContent = "Server belum disetel"; return; }
    Promise.resolve(window.db.storage.from(BUCKET).createSignedUrl(path, 300)).then(function (r) {
      if (r.error || !r.data || !r.data.signedUrl) throw new Error(errMsg(r.error) || "Foto tidak ditemukan");
      if (!ov) return;
      var im = new Image(); im.alt = nama || "Foto material";
      im.setAttribute("style", "max-width:94vw;max-height:84vh;border-radius:10px;background:#fff;box-shadow:0 8px 40px rgba(0,0,0,.5)");
      im.onload = function () { box.textContent = ""; box.appendChild(im); };
      im.onerror = function () { box.textContent = "Foto tidak bisa dibuka."; };
      im.src = r.data.signedUrl;
    }).catch(function (e) { if (ov) box.textContent = "Foto tidak bisa dibuka: " + ((e && e.message) || "gagal"); });
  }

  // ---------- Aksi ----------
  mn.addEventListener("change", function (e) {
    var t = e.target; if (!t || !t.matches || !t.matches("[data-fotoin]")) return;
    var f = t.files && t.files[0]; pending = null;
    if (!f) { info(); return; }
    if (!/^image\//.test(f.type) && !/\.(jpe?g|png|webp|gif|bmp)$/i.test(f.name)) { alert("File harus berupa foto (JPG atau PNG)."); t.value = ""; info(); return; }
    if (f.size > MAXRAW) { alert("Foto terlalu besar (maks. 25 MB, file ini " + sz(f.size) + ")."); t.value = ""; info(); return; }
    rmOld = false;
    var p = komp = kompres(f).then(function (b) {
      if (komp === p) pending = { blob: b, nama: f.name, size: f.size };
    }).catch(function (err) { if (komp === p) { pending = null; t.value = ""; alert(err.message); } })
      .then(function () { if (komp === p) komp = null; info(); });
    info();
  });

  mn.addEventListener("click", function (e) {
    var t = e.target; if (!t || !t.closest) return;
    var v = t.closest("[data-fv]");
    if (v) { e.preventDefault(); lihat(v.dataset.fv, v.dataset.fn); return; }
    if (curNow() !== "material") return;
    if (t.closest("[data-fx]")) { e.preventDefault(); pending = null; rmOld = true; info(); return; }
    if (t.closest("[data-fu]")) { e.preventDefault(); rmOld = false; info(); return; }

    var b = t.closest("[data-mt]"); if (!b) return;
    var a = b.dataset.mt, st = matState(); if (!st) return;

    if (a === "cancel" || a === "e") { pending = null; komp = null; rmOld = false; return; }   // batal / pindah ke data lain → buang pilihan foto

    if (a === "d") {   // hapus item → hapus juga fotonya bila item benar-benar terhapus
      var row = rows()[+b.dataset.i];
      if (row && row.foto && row.foto.path) setTimeout(function () { if (rows().indexOf(row) < 0 && !dipakai(row.foto.path)) removeFile(row.foto.path); }, 0);
      return;
    }

    if (a === "save") {
      if (b.dataset.fotook) { delete b.dataset.fotook; return; }   // lanjutkan penyimpanan normal
      if (!pending && !komp && !rmOld) return;                     // tidak ada perubahan foto
      e.stopImmediatePropagation(); e.preventDefault();
      var f = st.f, nm = (f.nama || "").trim(), id = (f.id || "").trim();
      if (!nm) { alert("Nama material wajib diisi"); return; }
      if (id && rows().some(function (r, i) { return i !== st.ei && r.id === id; })) { alert("ID material sudah dipakai"); return; }
      if (!ON()) { alert("Server belum disetel, foto tidak bisa diunggah."); return; }
      var old = (st.ei >= 0 && rows()[st.ei] && rows()[st.ei].foto) || null, hapusSaja = rmOld;
      b.disabled = true;
      var inf = mn.querySelector(".foto-info"); if (inf) inf.textContent = "Mengunggah foto…";
      Promise.resolve(komp).then(function () {
        if (!pending) return null;
        return upload(pending.blob).then(function (path) { return { path: path, nama: pending.nama, size: pending.blob.size, tgl: today() }; });
      }).then(function (meta) {
        if (meta) f.foto = meta; else if (hapusSaja) f.foto = "";
        pending = null; komp = null; rmOld = false;
        var nb = mn.querySelector('[data-mt="save"]') || b; nb.disabled = false; nb.dataset.fotook = "1";
        nb.click();   // lanjutkan penyimpanan normal oleh app.js
        if (old && old.path && (meta || hapusSaja) && !dipakai(old.path)) removeFile(old.path);
      }).catch(function (err) {
        b.disabled = false; info();
        alert("Gagal mengunggah foto: " + ((err && err.message) || "gagal") + "\n\nData material belum disimpan.");
      });
    }
  }, true);
})();
