/*
TAKTIKSAHAM — MEMBER AUTH
Production frontend for Supabase Auth + membership status.

Requires:
1. https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2
2. supabase-config.js
*/
(function(){
  "use strict";

  const PLANS = {
    "4m": {label:"VIP 4 Bulan", price:"Rp499.000", payment:"lynk"},
    "6m": {label:"VIP 6 Bulan", price:"Rp699.000", payment:"lynk"},
    "12m": {label:"VIP 1 Tahun", price:"Rp1.200.000", payment:"lynk"},
    "lifetime": {label:"VIP Lifetime • Mirae Asset", price:"Jalur Mirae Asset", payment:"mirae"}
  };

  const LINKS = {
    lynk:"https://lynk.id/taktiksaham/vk3zklnjk1jl",
    mirae:"https://login.miraeasset.co.id/registration/oe?referralcode=3103248",
    whatsapp:"https://wa.me/6285697486266"
  };

  const cfg = window.TS_SUPABASE_CONFIG || {};
  const configured = Boolean(
    cfg.url && cfg.anonKey &&
    !String(cfg.url).includes("PASTE_") &&
    !String(cfg.anonKey).includes("PASTE_")
  );

  const sb = (configured && window.supabase)
    ? window.supabase.createClient(cfg.url, cfg.anonKey, {
        auth:{
          persistSession:true,
          autoRefreshToken:true,
          detectSessionInUrl:true
        }
      })
    : null;

  window.TS_MEMBER_AUTH = { configured, client: sb, plans: PLANS };

  const $ = id => document.getElementById(id);

  function esc(s){
    return String(s ?? "").replace(/[&<>"']/g, m => ({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
    }[m]));
  }

  function formatDate(v){
    if(!v) return "—";
    try{
      return new Intl.DateTimeFormat("id-ID", {
        day:"2-digit", month:"short", year:"numeric"
      }).format(new Date(v));
    }catch(e){
      return String(v);
    }
  }

  function initials(name,email){
    const src=(name || email || "VIP").trim();
    const parts=src.split(/\s+/).filter(Boolean);
    if(parts.length>1) return (parts[0][0]+parts[1][0]).toUpperCase();
    return src.slice(0,2).toUpperCase();
  }

  function baseFile(file){
    return new URL(file, window.location.href).href;
  }

  function headButtons(){
    return `
      <div class="ts-auth-head-actions">
        <button class="ts-auth-btn register" type="button" data-ts-auth="register">DAFTAR VIP</button>
        <button class="ts-auth-btn login" type="button" data-ts-auth="login">
          <span class="ts-auth-dot"></span><span class="ts-auth-label">LOGIN VIP</span>
        </button>
      </div>`;
  }

  const modal = `
  <div class="ts-auth-overlay" id="tsAuthOverlay" aria-hidden="true">
    <div class="ts-auth-modal" role="dialog" aria-modal="true" aria-labelledby="tsAuthTitle">
      <button class="ts-auth-close" id="tsAuthClose" type="button" aria-label="Tutup">×</button>

      <aside class="ts-auth-brand">
        <div>
          <div class="ts-auth-brand-logo">↗</div>
          <small>TAKTIKSAHAM • VIP MEMBER</small>
          <h2>Daftar sekali.<br>Akses sesuai membership.</h2>
          <p>Member membuat akun sendiri. Setelah email terverifikasi dan membership diaktifkan, status akses tersimpan pada akun masing-masing.</p>

          <div class="ts-auth-brand-list">
            <div class="ts-auth-brand-item"><i>✓</i><span>Paket 4 bulan, 6 bulan, 1 tahun, atau VIP Lifetime melalui Mirae Asset.</span></div>
            <div class="ts-auth-brand-item"><i>✓</i><span>Status PENDING, ACTIVE, EXPIRED, atau SUSPENDED dikontrol dari database.</span></div>
            <div class="ts-auth-brand-item"><i>✓</i><span>Password ditangani Supabase Auth, bukan disimpan di HTML.</span></div>
          </div>
        </div>
        <div class="ts-auth-brand-foot">🔒 Frontend hanya menggunakan Supabase Publishable Key. Secret/service-role key tidak boleh dipasang di website.</div>
      </aside>

      <section class="ts-auth-panel">
        <div id="tsAuthGuest">
          <div class="ts-auth-tabs">
            <button class="ts-auth-tab active" type="button" data-auth-tab="login">LOGIN</button>
            <button class="ts-auth-tab" type="button" data-auth-tab="register">DAFTAR</button>
          </div>

          <div class="ts-auth-message" id="tsAuthMessage"></div>

          <form class="ts-auth-form active" id="tsLoginForm" data-auth-form="login">
            <span class="ts-auth-kicker">● Member Access</span>
            <h3 id="tsAuthTitle">Login VIP</h3>
            <p class="ts-auth-sub">Masuk menggunakan email dan password yang sudah didaftarkan.</p>

            <div class="ts-auth-field">
              <label>Email</label>
              <input id="tsLoginEmail" type="email" autocomplete="email" placeholder="nama@email.com" required>
            </div>

            <div class="ts-auth-field">
              <label>Password</label>
              <div class="ts-auth-password">
                <input id="tsLoginPassword" type="password" autocomplete="current-password" placeholder="Password" required>
                <button class="ts-auth-eye" data-eye="tsLoginPassword" type="button">◉</button>
              </div>
            </div>

            <div class="ts-auth-linkrow">
              <span>Secure member login</span>
              <button class="ts-auth-text-btn" id="tsForgotPassword" type="button">Lupa password?</button>
            </div>

            <button class="ts-auth-submit" id="tsLoginSubmit" type="submit">MASUK KE VIP →</button>
          </form>

          <form class="ts-auth-form" id="tsRegisterForm" data-auth-form="register">
            <span class="ts-auth-kicker">● Buat Akun</span>
            <h3>Daftar Member</h3>
            <p class="ts-auth-sub">Buat akun, lalu selesaikan pembayaran atau proses Mirae sesuai paket yang dipilih.</p>

            <div class="ts-auth-grid">
              <div class="ts-auth-field">
                <label>Nama Lengkap</label>
                <input id="tsRegName" type="text" autocomplete="name" placeholder="Nama lengkap" required>
              </div>
              <div class="ts-auth-field">
                <label>WhatsApp</label>
                <input id="tsRegWhatsapp" type="tel" autocomplete="tel" placeholder="08xxxxxxxxxx" required>
              </div>
            </div>

            <div class="ts-auth-field">
              <label>Email</label>
              <input id="tsRegEmail" type="email" autocomplete="email" placeholder="nama@email.com" required>
            </div>

            <div class="ts-auth-field">
              <label>Pilih Membership</label>
              <select id="tsRegPlan" required>
                <option value="4m">VIP 4 Bulan — Rp499.000</option>
                <option value="6m">VIP 6 Bulan — Rp699.000</option>
                <option value="12m">VIP 1 Tahun — Rp1.200.000</option>
                <option value="lifetime">VIP Lifetime — Daftar Mirae Asset</option>
              </select>
            </div>

            <div class="ts-auth-plan-note" id="tsPlanNote"></div>

            <div class="ts-auth-grid">
              <div class="ts-auth-field">
                <label>Password</label>
                <div class="ts-auth-password">
                  <input id="tsRegPassword" type="password" autocomplete="new-password" minlength="8" placeholder="Minimal 8 karakter" required>
                  <button class="ts-auth-eye" data-eye="tsRegPassword" type="button">◉</button>
                </div>
              </div>
              <div class="ts-auth-field">
                <label>Ulangi Password</label>
                <input id="tsRegPassword2" type="password" autocomplete="new-password" minlength="8" placeholder="Ulangi password" required>
              </div>
            </div>

            <button class="ts-auth-submit" id="tsRegisterSubmit" type="submit">BUAT AKUN →</button>
          </form>

          <div class="ts-auth-config-warning" id="tsConfigWarning">
            <b>Supabase belum dikonfigurasi.</b><br>
            Isi Project URL dan Publishable Key pada <code>supabase-config.js</code>.
          </div>
        </div>

        <div class="ts-auth-member-view" id="tsAuthMember">
          <span class="ts-auth-kicker">● Member Area</span>

          <div class="ts-auth-identity">
            <div class="ts-auth-avatar" id="tsMemberAvatar">VIP</div>
            <div>
              <small>Selamat datang</small>
              <strong id="tsMemberName">Member</strong>
              <span class="ts-auth-status-pill pending" id="tsMemberStatus">PENDING</span>
            </div>
          </div>

          <div class="ts-auth-member-card">
            <div class="ts-auth-member-top">
              <small>Membership</small>
              <strong id="tsMemberPlan">—</strong>
            </div>

            <div class="ts-auth-member-grid">
              <div class="ts-auth-member-stat"><span>Status</span><b id="tsMemberStatusText">—</b></div>
              <div class="ts-auth-member-stat"><span>Berlaku Sampai</span><b id="tsMemberExpiry">—</b></div>
              <div class="ts-auth-member-stat"><span>Email</span><b id="tsMemberEmail">—</b></div>
              <div class="ts-auth-member-stat"><span>Mulai</span><b id="tsMemberStart">—</b></div>
            </div>
          </div>

          <div class="ts-auth-pending-actions" id="tsPendingActions"></div>

          <div class="ts-auth-member-actions">
            <a class="primary" href="member.html">BUKA MEMBER AREA →</a>
            <a class="secondary" href="screening.html?tab=technical">TECHNICAL →</a>
            <button class="logout" id="tsLogoutBtn" type="button">LOGOUT</button>
          </div>
        </div>
      </section>
    </div>
  </div>`;

  function injectUI(){
    if($("tsAuthOverlay")) return;

    document.body.insertAdjacentHTML("beforeend", modal);

    document.querySelectorAll(".ts-header-wa").forEach(wa=>{
      if(!wa.parentElement.querySelector(".ts-auth-head-actions")){
        wa.insertAdjacentHTML("afterend", headButtons());
      }
    });

    document.querySelectorAll(".ts-mobile-nav").forEach(nav=>{
      if(nav.querySelector("[data-ts-auth-mobile]")) return;

      const wa = Array.from(nav.querySelectorAll("a"))
        .find(a => /whatsapp/i.test(a.textContent || ""));

      const links = `
        <a href="#" class="ts-auth-mobile-link" data-ts-auth-mobile="register">DAFTAR VIP</a>
        <a href="#" class="ts-auth-mobile-link" data-ts-auth-mobile="login">LOGIN VIP</a>`;

      if(wa) wa.insertAdjacentHTML("beforebegin", links);
      else nav.insertAdjacentHTML("beforeend", links);
    });
  }

  function showMessage(text,type="info"){
    const box=$("tsAuthMessage");
    if(!box) return;
    box.className=`ts-auth-message ${type} show`;
    box.textContent=text;
  }

  function clearMessage(){
    const box=$("tsAuthMessage");
    if(!box) return;
    box.className="ts-auth-message";
    box.textContent="";
  }

  function setBusy(id,busy,busyText,normalText){
    const btn=$(id);
    if(!btn) return;
    btn.disabled=busy;
    btn.textContent=busy ? busyText : normalText;
  }

  function setTab(tab){
    clearMessage();
    document.querySelectorAll("[data-auth-tab]").forEach(b=>{
      b.classList.toggle("active", b.dataset.authTab===tab);
    });
    document.querySelectorAll("[data-auth-form]").forEach(f=>{
      f.classList.toggle("active", f.dataset.authForm===tab);
    });
  }

  function openAuth(tab="login"){
    const overlay=$("tsAuthOverlay");
    if(!overlay) return;
    setTab(tab);
    overlay.classList.add("open");
    overlay.setAttribute("aria-hidden","false");
    document.body.classList.add("ts-auth-open");
    if(!configured) $("tsConfigWarning")?.classList.add("show");
  }

  function closeAuth(){
    const overlay=$("tsAuthOverlay");
    if(!overlay) return;
    overlay.classList.remove("open");
    overlay.setAttribute("aria-hidden","true");
    document.body.classList.remove("ts-auth-open");
  }

  window.tsOpenMemberAuth=openAuth;

  function updatePlanNote(){
    const plan=$("tsRegPlan")?.value || "4m";
    const p=PLANS[plan];
    const el=$("tsPlanNote");
    if(!el) return;

    el.innerHTML = plan==="lifetime"
      ? `<b>${p.label}</b> — setelah akun dibuat, lanjut daftar Mirae Asset menggunakan referral 3103248. Status awal tetap PENDING sampai aktivasi diverifikasi.`
      : `<b>${p.label} • ${p.price}</b> — setelah akun dibuat, lanjutkan pembayaran membership. Status awal PENDING sampai pembayaran diverifikasi.`;
  }

  function updateHeader(session,membership){
    const logged=Boolean(session?.user);

    document.querySelectorAll("[data-ts-auth='login']").forEach(btn=>{
      btn.classList.toggle("member",logged);
      const label=btn.querySelector(".ts-auth-label");
      if(label){
        label.textContent=logged
          ? (membership?.status==="active" ? "VIP ACTIVE" : "MEMBER")
          : "LOGIN VIP";
      }
    });

    document.querySelectorAll("[data-ts-auth='register']").forEach(btn=>{
      btn.style.display=logged ? "none" : "";
    });

    document.querySelectorAll("[data-ts-auth-mobile='register']").forEach(a=>{
      a.style.display=logged ? "none" : "";
    });

    document.querySelectorAll("[data-ts-auth-mobile='login']").forEach(a=>{
      a.textContent=logged
        ? (membership?.status==="active" ? "● VIP ACTIVE" : "MEMBER AREA")
        : "LOGIN VIP";
    });
  }

  function pendingHtml(membership){
    if(!membership || membership.status!=="pending") return "";

    const plan=membership.plan || "4m";

    if(plan==="lifetime"){
      return `<b>Aktivasi VIP Lifetime belum selesai</b>
        <p>Daftar Mirae Asset melalui referral 3103248, lalu konfirmasi setelah syarat aktivasi terpenuhi.</p>
        <a href="${LINKS.mirae}" target="_blank" rel="noopener">DAFTAR MIRAE →</a>
        <a href="${LINKS.whatsapp}?text=${encodeURIComponent("Halo Kak Rifqi, saya sudah membuat akun TaktikSaham dan ingin konfirmasi aktivasi VIP Lifetime melalui Mirae Asset.")}" target="_blank" rel="noopener">KONFIRMASI WA</a>`;
    }

    const p=PLANS[plan] || PLANS["4m"];
    return `<b>Membership masih menunggu aktivasi</b>
      <p>Lanjutkan pembayaran ${esc(p.label)} (${esc(p.price)}), kemudian konfirmasi agar status dapat diaktifkan.</p>
      <a href="${LINKS.lynk}" target="_blank" rel="noopener">LANJUT BAYAR →</a>
      <a href="${LINKS.whatsapp}?text=${encodeURIComponent("Halo Kak Rifqi, saya sudah mendaftar TaktikSaham paket "+p.label+" dan ingin konfirmasi pembayaran/aktivasi.")}" target="_blank" rel="noopener">KONFIRMASI WA</a>`;
  }

  function renderMember(session,membership,profile){
    const guest=$("tsAuthGuest");
    const member=$("tsAuthMember");
    if(!guest || !member) return;

    if(!session?.user){
      guest.style.display="";
      member.classList.remove("active");
      updateHeader(null,null);
      return;
    }

    guest.style.display="none";
    member.classList.add("active");

    const meta=session.user.user_metadata || {};
    const name=profile?.full_name || meta.full_name || session.user.email?.split("@")[0] || "Member";
    const plan=membership?.plan || meta.plan || "—";
    const planLabel=PLANS[plan]?.label || plan;
    const status=(membership?.status || "pending").toLowerCase();

    $("tsMemberAvatar").textContent=initials(name,session.user.email);
    $("tsMemberName").textContent=name;
    $("tsMemberPlan").textContent=planLabel;
    $("tsMemberEmail").textContent=session.user.email || "—";
    $("tsMemberStatusText").textContent=status.toUpperCase();
    $("tsMemberStart").textContent=formatDate(membership?.start_at);
    $("tsMemberExpiry").textContent=membership?.lifetime ? "Lifetime" : formatDate(membership?.expires_at);

    const pill=$("tsMemberStatus");
    pill.textContent=status.toUpperCase();
    pill.className=`ts-auth-status-pill ${["active","pending","expired","suspended"].includes(status) ? status : "pending"}`;

    const pending=$("tsPendingActions");
    const html=pendingHtml(membership || {status:"pending",plan});
    pending.innerHTML=html;
    pending.classList.toggle("show",Boolean(html));

    updateHeader(session,membership);
  }

  async function fetchMemberState(session){
    if(!session?.user || !sb){
      renderMember(session,null,null);
      return;
    }

    let profile=null;
    let membership=null;

    try{
      const [pr,mr]=await Promise.all([
        sb.from("profiles")
          .select("full_name,whatsapp")
          .eq("id",session.user.id)
          .maybeSingle(),

        sb.from("memberships")
          .select("plan,status,start_at,expires_at,lifetime")
          .eq("user_id",session.user.id)
          .maybeSingle()
      ]);

      if(pr.data) profile=pr.data;
      if(mr.data) membership=mr.data;
    }catch(e){
      console.error("TaktikSaham member fetch error",e);
    }

    renderMember(session,membership,profile);

    window.dispatchEvent(new CustomEvent("ts:membership",{
      detail:{session,membership,profile}
    }));
  }

  async function initSession(){
    if(!configured || !sb){
      renderMember(null,null,null);
      return;
    }

    const {data}=await sb.auth.getSession();
    await fetchMemberState(data?.session || null);

    sb.auth.onAuthStateChange(async(_event,session)=>{
      await fetchMemberState(session);
    });
  }

  function bindUI(){
    document.addEventListener("click",e=>{
      const auth=e.target.closest("[data-ts-auth]");
      if(auth){
        e.preventDefault();
        openAuth(auth.dataset.tsAuth || "login");
      }

      const mobile=e.target.closest("[data-ts-auth-mobile]");
      if(mobile){
        e.preventDefault();
        openAuth(mobile.dataset.tsAuthMobile || "login");
      }

      const tab=e.target.closest("[data-auth-tab]");
      if(tab){
        e.preventDefault();
        setTab(tab.dataset.authTab);
      }

      const eye=e.target.closest("[data-eye]");
      if(eye){
        const input=$(eye.dataset.eye);
        if(input) input.type=input.type==="password" ? "text" : "password";
      }
    });

    $("tsAuthClose")?.addEventListener("click",closeAuth);

    $("tsAuthOverlay")?.addEventListener("click",e=>{
      if(e.target.id==="tsAuthOverlay") closeAuth();
    });

    document.addEventListener("keydown",e=>{
      if(e.key==="Escape") closeAuth();
    });

    $("tsRegPlan")?.addEventListener("change",updatePlanNote);
    updatePlanNote();

    $("tsLoginForm")?.addEventListener("submit",async e=>{
      e.preventDefault();
      clearMessage();

      if(!sb){
        showMessage("Supabase belum dikonfigurasi.","error");
        return;
      }

      const email=$("tsLoginEmail").value.trim();
      const password=$("tsLoginPassword").value;

      setBusy("tsLoginSubmit",true,"MEMPROSES...","MASUK KE VIP →");

      const {error}=await sb.auth.signInWithPassword({email,password});

      setBusy("tsLoginSubmit",false,"MEMPROSES...","MASUK KE VIP →");

      if(error){
        showMessage(error.message,"error");
        return;
      }

      showMessage("Login berhasil.","success");
    });

    $("tsRegisterForm")?.addEventListener("submit",async e=>{
      e.preventDefault();
      clearMessage();

      if(!sb){
        showMessage("Supabase belum dikonfigurasi.","error");
        return;
      }

      const full_name=$("tsRegName").value.trim();
      const whatsapp=$("tsRegWhatsapp").value.trim();
      const email=$("tsRegEmail").value.trim();
      const plan=$("tsRegPlan").value;
      const password=$("tsRegPassword").value;
      const password2=$("tsRegPassword2").value;

      if(password!==password2){
        showMessage("Password dan ulangi password belum sama.","error");
        return;
      }

      if(password.length<8){
        showMessage("Password minimal 8 karakter.","error");
        return;
      }

      setBusy("tsRegisterSubmit",true,"MEMBUAT AKUN...","BUAT AKUN →");

      const {data,error}=await sb.auth.signUp({
        email,
        password,
        options:{
          emailRedirectTo:baseFile("member.html"),
          data:{full_name,whatsapp,plan}
        }
      });

      setBusy("tsRegisterSubmit",false,"MEMBUAT AKUN...","BUAT AKUN →");

      if(error){
        showMessage(error.message,"error");
        return;
      }

      if(data?.session){
        showMessage("Akun berhasil dibuat. Status membership masih PENDING sampai aktivasi diverifikasi.","success");
        await fetchMemberState(data.session);
      }else{
        showMessage("Akun berhasil dibuat. Silakan cek email untuk verifikasi, lalu login kembali. Membership tetap PENDING sampai aktivasi diverifikasi.","success");
      }
    });

    $("tsForgotPassword")?.addEventListener("click",async()=>{
      clearMessage();

      if(!sb){
        showMessage("Supabase belum dikonfigurasi.","error");
        return;
      }

      const email=$("tsLoginEmail").value.trim();

      if(!email){
        showMessage("Masukkan email terlebih dahulu.","info");
        return;
      }

      const {error}=await sb.auth.resetPasswordForEmail(email,{
        redirectTo:baseFile("reset-password.html")
      });

      if(error) showMessage(error.message,"error");
      else showMessage("Link reset password sudah dikirim ke email.","success");
    });

    $("tsLogoutBtn")?.addEventListener("click",async()=>{
      if(sb) await sb.auth.signOut();
      closeAuth();
    });
  }

  document.addEventListener("DOMContentLoaded",()=>{
    injectUI();
    bindUI();
    initSession();

    if(!configured){
      $("tsConfigWarning")?.classList.add("show");
    }
  });
})();
