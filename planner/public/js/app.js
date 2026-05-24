/**
 * Monefyi Planner — Main Application
 * AI-Powered Project Management PWA
 */
(function () {
  "use strict";

  const CFG = window.PLANNER_CONFIG;
  const { createClient } = supabase;
  const sb = createClient(CFG.supabaseUrl, CFG.supabaseAnonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });

  /** Single-flight bootstrap (getSession + INITIAL_SESSION can both fire). */
  let bootstrapPromise = null;

  /* ============================================================
     STATE
     ============================================================ */
  const STATE = {
    user: null,
    profile: null,
    org: null,
    orgMembers: [],
    projects: [],
    currentProject: null,
    rapItems: [],
    workItems: [],
    costRealizations: [],
    dailyLogs: [],
    notifications: [],
    ui: {
      activeTab: "home",
      detailTab: "overview",
      darkMode: localStorage.getItem("planner_dark") === "1",
      lang: localStorage.getItem("planner_lang") || "id",
    },
    smartButton: {
      lastResult: null,
      listening: false,
      recognition: null,
    },
    charts: {},
    /** True when PostgREST reports Planner tables missing (migration not applied). */
    plannerSchemaMissing: false,
  };

  let plannerSchemaMissingToastShown = false;

  function isPlannerSchemaMissingError(err) {
    if (!err) return false;
    if (String(err.code || "") === "PGRST205") return true;
    const msg = String(err.message || "").toLowerCase();
    if (msg.includes("schema cache")) return true;
    if (msg.includes("planner_organizations") || msg.includes("planner_org_members")) return true;
    return false;
  }

  function notifyPlannerSchemaMissingOnce() {
    STATE.plannerSchemaMissing = true;
    STATE.org = null;
    STATE.orgMembers = [];
    STATE.orgRole = null;
    if (!plannerSchemaMissingToastShown) {
      plannerSchemaMissingToastShown = true;
      toast(
        "Tabel Planner belum ada di Supabase. Jalankan migrasi `20260523120000_planner_core_schema.sql` atau `supabase db push` pada project yang sama dengan `js/config.js`, lalu muat ulang halaman.",
        8000,
      );
    }
  }

  function syncPlannerSchemaBanner() {
    const b = document.getElementById("plannerSchemaBanner");
    if (!b) return;
    b.classList.toggle("hidden", !STATE.plannerSchemaMissing);
  }

  /* ============================================================
     INIT
     ============================================================ */
  async function init() {
    if (STATE.ui.darkMode) document.documentElement.classList.add("dark");
    const darkToggle = document.getElementById("darkModeToggle");
    if (darkToggle) darkToggle.checked = STATE.ui.darkMode;

    // Attach auth & form handlers before any awaited Supabase work so login/register
    // stay responsive even if getSession(), token refresh, or bootstrapAuth is slow.
    initForms();
    registerSW();

    sb.auth.onAuthStateChange(async (event, session) => {
      // Token refresh must NOT re-run bootstrap (showLoading loop / duplicate fetches).
      if (event === "TOKEN_REFRESHED") return;

      if (!session?.user) {
        STATE.user = null;
        showAuth();
        return;
      }
      STATE.user = session.user;
      if (event === "INITIAL_SESSION" || event === "SIGNED_IN" || event === "PASSWORD_RECOVERY") {
        await bootstrapAuth();
      }
    });

    try {
      const { data: { session } } = await sb.auth.getSession();
      if (session?.user) {
        STATE.user = session.user;
        await bootstrapAuth();
      } else {
        showAuth();
      }
    } catch (err) {
      console.error("Auth init error:", err);
      showAuth();
      toast("Tidak dapat menghubungi server. Periksa koneksi lalu coba lagi.");
    }
  }

  function registerSW() {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("sw.js").catch(() => {});
    }
  }

  /* ============================================================
     AUTH
     ============================================================ */
  function showAuth() {
    STATE.plannerSchemaMissing = false;
    plannerSchemaMissingToastShown = false;
    syncPlannerSchemaBanner();
    document.getElementById("authOverlay").classList.add("active");
    document.getElementById("appShell").classList.add("hidden");
  }

  /** Human-readable Supabase Auth errors (400 / invalid_grant / email not confirmed). */
  function authUserMessage(err) {
    if (!err) return "Autentikasi gagal.";
    const msg = String(err.message || "");
    const low = (msg + " " + String(err.code || "") + " " + String(err.status || "")).toLowerCase();
    if (low.includes("email_not_confirmed") || low.includes("email not confirmed")) {
      return "Email belum diverifikasi. Supabase → Authentication → Providers → Email: nonaktifkan \"Confirm email\", atau buka link verifikasi di inbox.";
    }
    if (low.includes("user_not_found") || low.includes("invalid login") || low.includes("invalid_credentials")) {
      return "Email/password tidak cocok atau akun belum siap. Jalankan migrasi `20260524120000_planner_seed_auth_email_users.sql` lalu `supabase db push`. " + (msg ? "(" + msg + ")" : "");
    }
    if (low.includes("invalid_grant")) return "Server menolak login: " + (msg || "invalid_grant");
    if (String(err.status) === "400") return "Login ditolak (400): " + (msg || "bad request");
    return msg || "Autentikasi gagal.";
  }

  async function bootstrapAuth() {
    if (bootstrapPromise) return await bootstrapPromise;
    bootstrapPromise = (async () => {
      document.getElementById("authOverlay").classList.remove("active");
      document.getElementById("appShell").classList.remove("hidden");
      showLoading(true);
      try {
        await loadProfile();
        await loadOrg();
        await loadProjects();
        await loadNotifications();
        renderHome();
        renderProjectList();
        updateFinanceProjectFilter();
        checkAdmin();
        updateGreeting();
      } catch (e) {
        console.error("Bootstrap error:", e);
        toast("Gagal memuat data: " + e.message);
      } finally {
        showLoading(false);
      }
    })();
    try {
      await bootstrapPromise;
    } finally {
      bootstrapPromise = null;
    }
  }

  function initForms() {
    document.getElementById("loginForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = document.getElementById("loginEmail").value.trim();
      const password = document.getElementById("loginPassword").value;
      showLoading(true);
      try {
        const { error } = await sb.auth.signInWithPassword({ email, password });
        if (error) {
          console.warn("[planner-auth] login", error);
          return toast(authUserMessage(error));
        }
      } catch (err) {
        console.error(err);
        toast("Login gagal: " + (err.message || "Terjadi kesalahan"));
      } finally {
        showLoading(false);
      }
    });

    document.getElementById("registerForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = document.getElementById("regName").value.trim();
      const email = document.getElementById("regEmail").value.trim();
      const password = document.getElementById("regPassword").value;
      const orgName = document.getElementById("regOrgName").value.trim();
      if (!name || !email || !password || !orgName) {
        toast("Lengkapi semua field");
        return;
      }
      showLoading(true);
      try {
        let { data, error } = await sb.auth.signUp({
          email, password,
          options: { data: { name, org_name: orgName } },
        });
        if (error) {
          const em = (error.message || "").toLowerCase();
          console.warn("[planner-auth] register signUp", error);
          if (em.includes("registered") || em.includes("already")) {
            const signIn = await sb.auth.signInWithPassword({ email, password });
            if (!signIn.error) {
              toast("Akun sudah ada — masuk…");
              return;
            }
            console.warn("[planner-auth] register signIn after exists", signIn.error);
            toast(authUserMessage(signIn.error) + " Gunakan Masuk atau reset password.");
            showAuthView("login");
            return;
          }
          toast("Registrasi gagal: " + authUserMessage(error));
          return;
        }
        if (data?.session) {
          toast("Berhasil, memuat…");
          return;
        }
        if (data?.user && !data.session) {
          const signIn = await sb.auth.signInWithPassword({ email, password });
          if (!signIn.error) {
            toast("Masuk…");
            return;
          }
          console.warn("[planner-auth] register post-signup signIn", signIn.error);
          toast(
            authUserMessage(signIn.error) +
              " Setelah migrasi seed auth, coba lagi. Atau matikan Confirm email di Supabase.",
          );
          showAuthView("login");
        }
      } catch (err) {
        console.error(err);
        toast("Registrasi gagal: " + (err.message || "Terjadi kesalahan"));
      } finally {
        showLoading(false);
      }
    });

    document.getElementById("forgotForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = document.getElementById("forgotEmail").value.trim();
      showLoading(true);
      try {
        const { error } = await sb.auth.resetPasswordForEmail(email, {
          redirectTo: location.origin + location.pathname,
        });
        if (error) return toast("Gagal: " + error.message);
        toast("Link reset password dikirim ke email");
        showAuthView("login");
      } catch (err) {
        console.error(err);
        toast("Gagal: " + (err.message || "Terjadi kesalahan"));
      } finally {
        showLoading(false);
      }
    });

    const riQty = document.getElementById("riQty");
    const riPrice = document.getElementById("riPrice");
    if (riQty && riPrice) {
      const updateRiTotal = () => {
        const q = parseFloat(riQty.value) || 0;
        const p = parseFloat(riPrice.value) || 0;
        const riTotal = document.getElementById("riTotal");
        if (riTotal) riTotal.textContent = formatCurrency(q * p);
      };
      riQty.addEventListener("input", updateRiTotal);
      riPrice.addEventListener("input", updateRiTotal);
    }

    const cfQty = document.getElementById("cfQty");
    const cfUnit = document.getElementById("cfUnitPrice");
    const cfTotal = document.getElementById("cfTotal");
    if (cfQty && cfUnit && cfTotal) {
      const autoFillCostTotal = () => {
        const q = parseFloat(cfQty.value) || 0;
        const p = parseFloat(cfUnit.value) || 0;
        if (q && p) cfTotal.value = q * p;
      };
      cfQty.addEventListener("input", autoFillCostTotal);
      cfUnit.addEventListener("input", autoFillCostTotal);
    }

    const projectForm = document.getElementById("projectForm");
    if (projectForm) {
      projectForm.addEventListener("submit", (e) => window.saveProject(e));
    }
  }

  /* ============================================================
     PROFILE
     ============================================================ */
  async function loadProfile() {
    const { data, error: selErr } = await sb.from("profiles").select("*").eq("id", STATE.user.id).maybeSingle();
    if (selErr) console.warn("profiles select:", selErr);
    if (data) {
      STATE.profile = data;
    } else {
      const meta = STATE.user.user_metadata || {};
      const { data: newProfile, error: upErr } = await sb.from("profiles").upsert({
        id: STATE.user.id,
        name: meta.name || STATE.user.email?.split("@")[0] || "User",
        settings: {},
      }).select().single();
      if (upErr) {
        console.error("profiles upsert:", upErr);
        throw new Error(
          "Tabel profil belum siap di database (" + upErr.message + "). Jalankan migrasi Supabase untuk Planner.",
        );
      }
      STATE.profile = newProfile || { name: meta.name || STATE.user.email?.split("@")[0] || "User" };
    }
    const name = STATE.profile?.name || "User";
    document.getElementById("userName").textContent = name;
    document.getElementById("avatarInitial").textContent = name.charAt(0).toUpperCase();
    document.getElementById("prfName").value = name;
    document.getElementById("prfEmail").value = STATE.user.email || "";
  }

  window.saveProfile = async function (e) {
    e.preventDefault();
    const name = document.getElementById("prfName").value.trim();
    if (!name) return toast("Nama tidak boleh kosong");
    showLoading(true);
    const { error } = await sb.from("profiles").update({ name }).eq("id", STATE.user.id);
    showLoading(false);
    if (error) return toast("Gagal: " + error.message);
    STATE.profile.name = name;
    document.getElementById("userName").textContent = name;
    document.getElementById("avatarInitial").textContent = name.charAt(0).toUpperCase();
    toast("Profil disimpan");
    closeSheet("profileSheet");
  };

  window.changePassword = async function (e) {
    e.preventDefault();
    const pwd = document.getElementById("newPwd").value;
    showLoading(true);
    const { error } = await sb.auth.updateUser({ password: pwd });
    showLoading(false);
    if (error) return toast("Gagal: " + error.message);
    toast("Password berhasil diubah");
    document.getElementById("newPwd").value = "";
  };

  window.signOut = async function () {
    await sb.auth.signOut();
    showAuth();
  };

  /* ============================================================
     ORGANIZATION
     ============================================================ */
  async function loadOrg() {
    const { data: membership, error: membershipErr } = await sb.from("planner_org_members")
      .select("org_id, role, planner_organizations(*)")
      .eq("user_id", STATE.user.id)
      .limit(1)
      .maybeSingle();
    if (membershipErr) {
      console.warn("planner_org_members:", membershipErr);
      if (isPlannerSchemaMissingError(membershipErr)) {
        notifyPlannerSchemaMissingOnce();
        return;
      }
    }

    if (membership) {
      STATE.org = membership.planner_organizations;
      STATE.orgRole = membership.role;
      STATE.plannerSchemaMissing = false;
      plannerSchemaMissingToastShown = false;
    } else {
      const meta = STATE.user.user_metadata || {};
      const orgName = meta.org_name || "Organisasi Saya";
      const slug = orgName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") + "-" + Date.now().toString(36);

      const { data: newOrg, error: orgInsErr } = await sb.from("planner_organizations").insert({
        name: orgName, slug, owner_id: STATE.user.id,
      }).select().single();

      if (orgInsErr) {
        console.error("planner_organizations insert:", orgInsErr);
        if (isPlannerSchemaMissingError(orgInsErr)) {
          notifyPlannerSchemaMissingOnce();
          return;
        }
        throw new Error(
          "Gagal membuat organisasi: " + orgInsErr.message + ". Pastikan migrasi SQL Planner sudah dijalankan di Supabase.",
        );
      }

      if (newOrg) {
        const { error: memInsErr } = await sb.from("planner_org_members").insert({
          org_id: newOrg.id, user_id: STATE.user.id, role: "owner", accepted_at: new Date().toISOString(),
        });
        if (memInsErr) {
          console.error("planner_org_members insert:", memInsErr);
          if (isPlannerSchemaMissingError(memInsErr)) {
            notifyPlannerSchemaMissingOnce();
            return;
          }
          throw new Error("Gagal menambahkan keanggotaan: " + memInsErr.message);
        }
        STATE.org = newOrg;
        STATE.orgRole = "owner";
        STATE.plannerSchemaMissing = false;
        plannerSchemaMissingToastShown = false;
      }
    }

    if (STATE.org) {
      document.getElementById("orgName").value = STATE.org.name || "";
      await loadOrgMembers();
    }
  }

  async function loadOrgMembers() {
    if (!STATE.org) return;
    const { data } = await sb.from("planner_org_members")
      .select("*, profiles(name)")
      .eq("org_id", STATE.org.id);
    STATE.orgMembers = data || [];
    renderMembers();
  }

  function renderMembers() {
    const el = document.getElementById("memberList");
    if (!STATE.orgMembers.length) {
      el.innerHTML = '<p class="text-secondary text-sm">Belum ada anggota</p>';
      return;
    }
    el.innerHTML = STATE.orgMembers.map((m) => `
      <div class="member-item">
        <div>
          <div style="font-weight:500;font-size:0.875rem">${esc(m.profiles?.name || "User")}</div>
          <div style="font-size:0.75rem;color:var(--text-secondary)">${m.role}</div>
        </div>
      </div>
    `).join("");
  }

  window.saveOrg = async function (e) {
    e.preventDefault();
    const name = document.getElementById("orgName").value.trim();
    if (!name) return toast("Nama organisasi tidak boleh kosong");

    if (!STATE.org) {
      if (STATE.plannerSchemaMissing) {
        toast(
          "Tabel Planner belum ada di Supabase. Pasang migrasi dulu (banner di atas / README), lalu muat ulang halaman.",
        );
        return;
      }
      showLoading(true);
      try {
        const slug = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") + "-" + Date.now().toString(36);
        const { data: newOrg, error: orgInsErr } = await sb.from("planner_organizations").insert({
          name, slug, owner_id: STATE.user.id,
        }).select().single();
        if (orgInsErr) {
          console.error("planner_organizations insert (saveOrg):", orgInsErr);
          if (isPlannerSchemaMissingError(orgInsErr)) {
            notifyPlannerSchemaMissingOnce();
            return;
          }
          toast("Gagal membuat organisasi: " + orgInsErr.message);
          return;
        }
        const { error: memInsErr } = await sb.from("planner_org_members").insert({
          org_id: newOrg.id, user_id: STATE.user.id, role: "owner", accepted_at: new Date().toISOString(),
        });
        if (memInsErr) {
          console.error("planner_org_members insert (saveOrg):", memInsErr);
          if (isPlannerSchemaMissingError(memInsErr)) {
            notifyPlannerSchemaMissingOnce();
            return;
          }
          toast("Gagal menambahkan keanggotaan: " + memInsErr.message);
          return;
        }
        STATE.org = newOrg;
        STATE.orgRole = "owner";
        STATE.plannerSchemaMissing = false;
        plannerSchemaMissingToastShown = false;
        await loadOrgMembers();
        syncPlannerSchemaBanner();
        toast("Organisasi dibuat");
        closeSheet("orgSheet");
        await loadProjects();
        renderProjectList();
        renderHome();
      } finally {
        showLoading(false);
      }
      return;
    }

    showLoading(true);
    try {
      const { error } = await sb.from("planner_organizations").update({ name }).eq("id", STATE.org.id);
      if (error) return toast("Gagal: " + error.message);
      STATE.org.name = name;
      toast("Organisasi disimpan");
      closeSheet("orgSheet");
    } finally {
      showLoading(false);
    }
  };

  window.inviteMember = async function () {
    const email = document.getElementById("inviteEmail").value.trim();
    if (!email) return toast("Masukkan email");
    if (!STATE.org) {
      if (STATE.plannerSchemaMissing) {
        toast("Organisasi belum bisa dibuat — pasang migrasi Planner di Supabase dulu.");
      } else {
        toast("Belum ada organisasi. Simpan nama organisasi di Pengaturan → Kelola Organisasi.");
      }
      return;
    }
    toast("Fitur undang anggota akan tersedia segera");
    document.getElementById("inviteEmail").value = "";
  };

  /* ============================================================
     PROJECTS
     ============================================================ */
  async function loadProjects() {
    if (!STATE.org) return;
    const { data, error } = await sb.from("planner_projects")
      .select("*")
      .eq("org_id", STATE.org.id)
      .order("created_at", { ascending: false });
    if (error) { console.error(error); return; }
    STATE.projects = data || [];
  }

  function renderProjectList() {
    const el = document.getElementById("projectList");
    const homeEl = document.getElementById("homeProjectList");
    const filtered = STATE.projects;

    if (!filtered.length) {
      el.innerHTML = '<div class="empty-state"><p>Belum ada proyek</p><button class="btn btn-primary btn-sm" onclick="openSheet(\'projectFormSheet\')">+ Buat Proyek</button></div>';
      if (homeEl) {
        homeEl.innerHTML = `
          <div class="empty-state" id="homeEmptyState">
            <svg width="48" height="48" fill="none" stroke="var(--text-secondary)" stroke-width="1.5"><rect x="6" y="6" width="36" height="36" rx="6"/><path d="M18 24h12M24 18v12"/></svg>
            <p>Belum ada proyek</p>
            <button class="btn btn-primary btn-sm" onclick="openSheet('projectFormSheet')">Buat Proyek Pertama</button>
          </div>`;
      }
      return;
    }
    const emptyEl = document.getElementById("homeEmptyState");
    if (emptyEl) emptyEl.style.display = "none";

    const cards = filtered.map((p) => projectCardHTML(p)).join("");
    el.innerHTML = cards;

    const active = filtered.filter((p) => p.status === "active" || p.status === "planning").slice(0, 5);
    homeEl.innerHTML = active.length ? active.map((p) => projectCardHTML(p)).join("") :
      '<p class="text-secondary text-sm">Tidak ada proyek aktif</p>';

    updateHomeStats();
  }

  function projectCardHTML(p) {
    const progress = p.progress_pct || 0;
    const budget = p.total_budget || 0;
    const spent = p.total_spent || 0;
    const statusClass = "status-" + (p.status || "planning");
    const statusLabel = { planning: "Planning", active: "Aktif", paused: "Pause", completed: "Selesai", cancelled: "Batal" }[p.status] || p.status;
    return `
      <div class="project-card" onclick="openProjectDetail('${p.id}')">
        <div class="project-card-header">
          <h4>${esc(p.name)}</h4>
          <span class="project-status ${statusClass}">${statusLabel}</span>
        </div>
        <div class="project-card-meta">
          <span>${p.client_name ? esc(p.client_name) : ""}</span>
          <span>${formatDate(p.planned_start)} - ${formatDate(p.planned_end)}</span>
        </div>
        <div class="project-card-progress">
          <div class="project-card-progress-bar" style="width:${progress}%;background:${progress >= 100 ? "var(--success)" : "var(--primary)"}"></div>
        </div>
        <div class="project-card-footer">
          <span>Progress: ${progress.toFixed(0)}%</span>
          <span>Budget: ${formatCurrencyShort(budget)}</span>
        </div>
      </div>`;
  }

  function updateHomeStats() {
    document.getElementById("statTotalProjects").textContent = STATE.projects.length;
    const active = STATE.projects.filter((p) => p.status === "active").length;
    document.getElementById("statActiveProjects").textContent = active;
    const totalBudget = STATE.projects.reduce((s, p) => s + (p.total_budget || 0), 0);
    document.getElementById("statTotalBudget").textContent = formatCurrencyShort(totalBudget);
    const progresses = STATE.projects.filter((p) => p.status === "active" || p.status === "planning");
    const avgProgress = progresses.length ? progresses.reduce((s, p) => s + (p.progress_pct || 0), 0) / progresses.length : 0;
    document.getElementById("statAvgProgress").textContent = avgProgress.toFixed(0) + "%";
  }

  window.saveProject = async function (e) {
    e.preventDefault();
    if (!STATE.org || !STATE.org.id) {
      if (STATE.plannerSchemaMissing) {
        toast("Skema Planner belum di Supabase — ikuti banner kuning di atas, lalu muat ulang.");
      } else {
        toast("Organisasi belum siap. Muat ulang halaman atau hubungi admin.");
      }
      console.error("[planner] saveProject: STATE.org missing", STATE.org);
      return;
    }
    const id = document.getElementById("pfId").value;
    const data = {
      name: document.getElementById("pfName").value.trim(),
      description: document.getElementById("pfDesc").value.trim(),
      client_name: document.getElementById("pfClient").value.trim(),
      location: document.getElementById("pfLocation").value.trim(),
      planned_start: document.getElementById("pfStartDate").value,
      planned_end: document.getElementById("pfEndDate").value,
      status: document.getElementById("pfStatus").value,
      org_id: STATE.org.id,
      created_by: STATE.user.id,
    };
    if (!data.name || !data.planned_start || !data.planned_end) {
      toast("Lengkapi field wajib");
      return;
    }

    showLoading(true);
    try {
      let res;
      if (id) {
        res = await sb.from("planner_projects").update(data).eq("id", id).select().single();
      } else {
        res = await sb.from("planner_projects").insert(data).select().single();
      }
      if (res.error) {
        console.error("[planner] saveProject", res.error);
        toast("Gagal simpan proyek: " + res.error.message);
        return;
      }
      await loadProjects();
      renderProjectList();
      closeSheet("projectFormSheet");
      toast(id ? "Proyek diperbarui" : "Proyek dibuat");
      document.getElementById("projectForm").reset();
      document.getElementById("pfId").value = "";
    } catch (err) {
      console.error("[planner] saveProject", err);
      toast("Gagal simpan proyek: " + (err.message || String(err)));
    } finally {
      showLoading(false);
    }
  };

  window.filterProjects = function () {
    const q = document.getElementById("projectSearch").value.toLowerCase();
    const cards = document.querySelectorAll("#projectList .project-card");
    cards.forEach((c) => {
      const name = c.querySelector("h4")?.textContent?.toLowerCase() || "";
      c.style.display = name.includes(q) ? "" : "none";
    });
  };

  window.filterProjectsByStatus = function (status, btn) {
    document.querySelectorAll(".filter-tab").forEach((t) => t.classList.remove("active"));
    btn.classList.add("active");
    const cards = document.querySelectorAll("#projectList .project-card");
    cards.forEach((c) => {
      if (status === "all") { c.style.display = ""; return; }
      const statusEl = c.querySelector(".project-status");
      const s = statusEl?.className?.match(/status-(\w+)/)?.[1];
      c.style.display = s === status ? "" : "none";
    });
  };

  /* ============================================================
     PROJECT DETAIL
     ============================================================ */
  window.openProjectDetail = async function (projectId) {
    const project = STATE.projects.find((p) => p.id === projectId);
    if (!project) return;
    STATE.currentProject = project;
    document.getElementById("detailProjectName").textContent = project.name;
    document.getElementById("projectDetailView").classList.remove("hidden");
    document.getElementById("bottomNav").style.display = "none";

    showLoading(true);
    await Promise.all([loadRapItems(), loadWorkItems(), loadCostRealizations(), loadDailyLogs()]);
    showLoading(false);

    renderOverview();
    renderRap();
    renderTimeline();
    renderRealization();
    switchDetailTab("overview", document.querySelector('.detail-tab[data-tab="overview"]'));
  };

  window.closeProjectDetail = function () {
    document.getElementById("projectDetailView").classList.add("hidden");
    document.getElementById("bottomNav").style.display = "";
    STATE.currentProject = null;
  };

  window.switchDetailTab = function (tab, btn) {
    STATE.ui.detailTab = tab;
    document.querySelectorAll(".detail-tab").forEach((t) => t.classList.remove("active"));
    document.querySelectorAll(".detail-tab-content").forEach((t) => t.classList.remove("active"));
    if (btn) btn.classList.add("active");
    const content = document.getElementById("tab" + tab.charAt(0).toUpperCase() + tab.slice(1));
    if (content) content.classList.add("active");
  };

  window.editCurrentProject = function () {
    if (!STATE.currentProject) return;
    closeSheet("projectMenuSheet");
    const p = STATE.currentProject;
    document.getElementById("pfId").value = p.id;
    document.getElementById("pfName").value = p.name || "";
    document.getElementById("pfDesc").value = p.description || "";
    document.getElementById("pfClient").value = p.client_name || "";
    document.getElementById("pfLocation").value = p.location || "";
    document.getElementById("pfStartDate").value = p.planned_start || "";
    document.getElementById("pfEndDate").value = p.planned_end || "";
    document.getElementById("pfStatus").value = p.status || "planning";
    document.getElementById("projectFormTitle").textContent = "Edit Proyek";
    openSheet("projectFormSheet");
  };

  window.duplicateProject = async function () {
    if (!STATE.currentProject) return;
    closeSheet("projectMenuSheet");
    const p = STATE.currentProject;
    showLoading(true);
    const { data: newProject, error } = await sb.from("planner_projects").insert({
      name: p.name + " (Copy)",
      description: p.description,
      client_name: p.client_name,
      location: p.location,
      planned_start: p.planned_start,
      planned_end: p.planned_end,
      status: "planning",
      org_id: STATE.org.id,
      created_by: STATE.user.id,
    }).select().single();

    if (!error && newProject) {
      for (const item of STATE.rapItems) {
        await sb.from("planner_rap_items").insert({
          project_id: newProject.id,
          type: item.type,
          name: item.name,
          unit: item.unit,
          quantity: item.quantity,
          unit_price: item.unit_price,
          supplier: item.supplier,
          notes: item.notes,
        });
      }
      for (const wi of STATE.workItems) {
        await sb.from("planner_work_items").insert({
          project_id: newProject.id,
          name: wi.name,
          description: wi.description,
          planned_start: wi.planned_start,
          planned_end: wi.planned_end,
          weight: wi.weight,
          planned_workers: wi.planned_workers,
          status: "pending",
        });
      }
    }
    showLoading(false);
    if (error) return toast("Gagal: " + error.message);
    await loadProjects();
    renderProjectList();
    closeProjectDetail();
    toast("Proyek diduplikat");
  };

  window.deleteCurrentProject = async function () {
    if (!STATE.currentProject) return;
    if (!confirm("Hapus proyek " + STATE.currentProject.name + "?")) return;
    closeSheet("projectMenuSheet");
    showLoading(true);
    const { error } = await sb.from("planner_projects").delete().eq("id", STATE.currentProject.id);
    showLoading(false);
    if (error) return toast("Gagal: " + error.message);
    await loadProjects();
    renderProjectList();
    closeProjectDetail();
    toast("Proyek dihapus");
  };

  /* ============================================================
     RAP (Rencana Anggaran Pelaksanaan)
     ============================================================ */
  async function loadRapItems() {
    if (!STATE.currentProject) return;
    const { data } = await sb.from("planner_rap_items")
      .select("*")
      .eq("project_id", STATE.currentProject.id)
      .order("sort_order");
    STATE.rapItems = data || [];
  }

  function renderRap() {
    const types = ["material", "labor", "equipment", "other"];
    let grandTotal = 0;

    types.forEach((type) => {
      const items = STATE.rapItems.filter((i) => i.type === type);
      const total = items.reduce((s, i) => s + (i.quantity * i.unit_price), 0);
      grandTotal += total;

      const suffix = { material: "Material", labor: "Labor", equipment: "Equipment", other: "Other" }[type];
      document.getElementById("rap" + suffix + "Total").textContent = formatCurrency(total);

      const container = document.getElementById("rap" + suffix + "Items");
      if (!items.length) {
        container.innerHTML = '<p class="text-secondary text-sm" style="padding:0.75rem 1rem">Belum ada item</p>';
        return;
      }
      container.innerHTML = items.map((item) => `
        <div class="rap-item" onclick="editRapItem('${item.id}')">
          <div class="rap-item-info">
            <div class="rap-item-name">${esc(item.name)}</div>
            <div class="rap-item-detail">${formatNum(item.quantity)} ${esc(item.unit)} × ${formatCurrency(item.unit_price)}</div>
          </div>
          <div class="rap-item-total">${formatCurrency(item.quantity * item.unit_price)}</div>
        </div>
      `).join("");
    });

    document.getElementById("rapTotal").textContent = formatCurrency(grandTotal);
    updateProjectBudget(grandTotal);
  }

  async function updateProjectBudget(total) {
    if (!STATE.currentProject) return;
    STATE.currentProject.total_budget = total;
    await sb.from("planner_projects").update({ total_budget: total }).eq("id", STATE.currentProject.id);
  }

  window.toggleRapCategory = function (type) {
    const suffix = { material: "Material", labor: "Labor", equipment: "Equipment", other: "Other" }[type];
    if (!suffix) return;
    const cat = document.querySelector(`.rap-category[data-type="${type}"]`);
    if (cat) cat.classList.toggle("open");
  };

  window.saveRapItem = async function (e) {
    e.preventDefault();
    const id = document.getElementById("riId").value;
    const data = {
      project_id: STATE.currentProject.id,
      type: document.getElementById("riType").value,
      name: document.getElementById("riName").value.trim(),
      quantity: parseFloat(document.getElementById("riQty").value) || 0,
      unit: document.getElementById("riUnit").value.trim(),
      unit_price: parseFloat(document.getElementById("riPrice").value) || 0,
      supplier: document.getElementById("riSupplier").value.trim(),
      notes: document.getElementById("riNotes").value.trim(),
    };
    if (!data.name || !data.unit) return toast("Lengkapi field wajib");

    showLoading(true);
    let res;
    if (id) {
      res = await sb.from("planner_rap_items").update(data).eq("id", id).select().single();
    } else {
      res = await sb.from("planner_rap_items").insert(data).select().single();
    }
    showLoading(false);
    if (res.error) return toast("Gagal: " + res.error.message);

    await loadRapItems();
    renderRap();
    closeSheet("rapItemFormSheet");
    document.getElementById("rapItemForm").reset();
    document.getElementById("riId").value = "";
    toast(id ? "Item diperbarui" : "Item ditambahkan");
  };

  window.editRapItem = function (itemId) {
    const item = STATE.rapItems.find((i) => i.id === itemId);
    if (!item) return;
    document.getElementById("riId").value = item.id;
    document.getElementById("riType").value = item.type;
    document.getElementById("riName").value = item.name;
    document.getElementById("riQty").value = item.quantity;
    document.getElementById("riUnit").value = item.unit;
    document.getElementById("riPrice").value = item.unit_price;
    document.getElementById("riSupplier").value = item.supplier || "";
    document.getElementById("riNotes").value = item.notes || "";
    document.getElementById("riTotal").textContent = formatCurrency(item.quantity * item.unit_price);
    document.getElementById("rapItemFormTitle").textContent = "Edit Item RAP";
    openSheet("rapItemFormSheet");
  };

  /* ============================================================
     WORK ITEMS / TIMELINE
     ============================================================ */
  async function loadWorkItems() {
    if (!STATE.currentProject) return;
    const { data } = await sb.from("planner_work_items")
      .select("*")
      .eq("project_id", STATE.currentProject.id)
      .order("sort_order")
      .order("planned_start");
    STATE.workItems = data || [];
  }

  function renderTimeline() {
    const p = STATE.currentProject;
    if (!p) return;
    document.getElementById("tlDateRange").textContent = formatDate(p.planned_start) + " - " + formatDate(p.planned_end);
    const days = daysBetween(p.planned_start, p.planned_end);
    document.getElementById("tlDuration").textContent = " (" + days + " hari)";

    const el = document.getElementById("workItemList");
    if (!STATE.workItems.length) {
      el.innerHTML = '<div class="empty-state"><p>Belum ada item pekerjaan</p></div>';
      return;
    }

    el.innerHTML = STATE.workItems.map((wi) => {
      const statusClass = "ws-" + (wi.status || "pending");
      const statusLabel = { pending: "Pending", in_progress: "Berjalan", completed: "Selesai", delayed: "Terlambat", blocked: "Blocked" }[wi.status] || wi.status;
      const progress = wi.progress_pct || 0;
      const wiDays = daysBetween(wi.planned_start, wi.planned_end);
      return `
        <div class="work-item" onclick="editWorkItem('${wi.id}')">
          <div class="work-item-header">
            <span class="work-item-name">${esc(wi.name)}</span>
            <span class="work-item-status ${statusClass}">${statusLabel}</span>
          </div>
          <div class="work-item-dates">${formatDate(wi.planned_start)} - ${formatDate(wi.planned_end)} (${wiDays} hr)</div>
          <div class="work-item-progress">
            <div class="work-item-progress-bar" style="width:${progress}%;background:${progress >= 100 ? "var(--success)" : "var(--primary)"}"></div>
          </div>
          <div class="work-item-meta">
            <span>Progress: ${progress.toFixed(0)}%</span>
            <span>Bobot: ${(wi.weight || 0).toFixed(1)}%</span>
            <span>Pekerja: ${wi.planned_workers || "-"}</span>
          </div>
        </div>`;
    }).join("");
  }

  window.saveWorkItem = async function (e) {
    e.preventDefault();
    const id = document.getElementById("wiId").value;
    const data = {
      project_id: STATE.currentProject.id,
      name: document.getElementById("wiName").value.trim(),
      description: document.getElementById("wiDesc").value.trim(),
      planned_start: document.getElementById("wiStart").value,
      planned_end: document.getElementById("wiEnd").value,
      weight: parseFloat(document.getElementById("wiWeight").value) || 0,
      planned_workers: parseInt(document.getElementById("wiWorkers").value) || 1,
      status: document.getElementById("wiStatus").value,
    };
    if (!data.name || !data.planned_start || !data.planned_end) return toast("Lengkapi field wajib");

    showLoading(true);
    let res;
    if (id) {
      res = await sb.from("planner_work_items").update(data).eq("id", id).select().single();
    } else {
      res = await sb.from("planner_work_items").insert(data).select().single();
    }
    showLoading(false);
    if (res.error) return toast("Gagal: " + res.error.message);

    await loadWorkItems();
    renderTimeline();
    await updateProjectProgress();
    closeSheet("workItemFormSheet");
    document.getElementById("workItemForm").reset();
    document.getElementById("wiId").value = "";
    toast(id ? "Pekerjaan diperbarui" : "Pekerjaan ditambahkan");
  };

  window.editWorkItem = function (itemId) {
    const wi = STATE.workItems.find((i) => i.id === itemId);
    if (!wi) return;
    document.getElementById("wiId").value = wi.id;
    document.getElementById("wiName").value = wi.name;
    document.getElementById("wiDesc").value = wi.description || "";
    document.getElementById("wiStart").value = wi.planned_start;
    document.getElementById("wiEnd").value = wi.planned_end;
    document.getElementById("wiWeight").value = wi.weight || "";
    document.getElementById("wiWorkers").value = wi.planned_workers || "";
    document.getElementById("wiStatus").value = wi.status || "pending";
    document.getElementById("workItemFormTitle").textContent = "Edit Pekerjaan";
    openSheet("workItemFormSheet");
  };

  async function updateProjectProgress() {
    if (!STATE.currentProject || !STATE.workItems.length) return;
    const totalWeight = STATE.workItems.reduce((s, wi) => s + (wi.weight || 0), 0);
    const weightedProgress = totalWeight > 0
      ? STATE.workItems.reduce((s, wi) => s + (wi.weight || 0) * (wi.progress_pct || 0), 0) / totalWeight
      : STATE.workItems.reduce((s, wi) => s + (wi.progress_pct || 0), 0) / STATE.workItems.length;
    STATE.currentProject.progress_pct = weightedProgress;
    await sb.from("planner_projects").update({ progress_pct: weightedProgress }).eq("id", STATE.currentProject.id);
  }

  /* ============================================================
     COST REALIZATION
     ============================================================ */
  async function loadCostRealizations() {
    if (!STATE.currentProject) return;
    const { data } = await sb.from("planner_cost_realizations")
      .select("*")
      .eq("project_id", STATE.currentProject.id)
      .order("date", { ascending: false });
    STATE.costRealizations = data || [];
  }

  async function loadDailyLogs() {
    if (!STATE.currentProject) return;
    const { data } = await sb.from("planner_daily_logs")
      .select("*")
      .eq("project_id", STATE.currentProject.id)
      .order("date", { ascending: false });
    STATE.dailyLogs = data || [];
  }

  function renderRealization() {
    renderCostRealization();
    renderDailyLogs();
    populateDailyLogWorkItems();
  }

  function renderCostRealization() {
    const rapTotal = STATE.rapItems.reduce((s, i) => s + (i.quantity * i.unit_price), 0);
    const spentTotal = STATE.costRealizations.reduce((s, c) => s + (c.total_amount || 0), 0);
    const diff = rapTotal - spentTotal;

    document.getElementById("realRapTotal").textContent = formatCurrency(rapTotal);
    document.getElementById("realSpentTotal").textContent = formatCurrency(spentTotal);
    const diffEl = document.getElementById("realDiffTotal");
    diffEl.textContent = (diff >= 0 ? "+" : "") + formatCurrency(diff);
    diffEl.style.color = diff >= 0 ? "var(--success)" : "var(--danger)";

    const el = document.getElementById("realCostList");
    if (!STATE.costRealizations.length) {
      el.innerHTML = '<p class="text-secondary text-sm">Belum ada catatan biaya</p>';
      return;
    }
    el.innerHTML = STATE.costRealizations.map((c) => `
      <div class="cost-item">
        <div class="cost-item-header">
          <span class="cost-item-desc">${esc(c.description)}</span>
          <span class="cost-item-amount">${formatCurrency(c.total_amount)}</span>
        </div>
        <div class="cost-item-meta">${formatDate(c.date)}${c.supplier ? " · " + esc(c.supplier) : ""}</div>
      </div>
    `).join("");

    updateProjectSpent(spentTotal);
  }

  async function updateProjectSpent(total) {
    if (!STATE.currentProject) return;
    STATE.currentProject.total_spent = total;
    await sb.from("planner_projects").update({ total_spent: total }).eq("id", STATE.currentProject.id);
  }

  function renderDailyLogs() {
    const el = document.getElementById("dailyLogList");
    if (!STATE.dailyLogs.length) {
      el.innerHTML = '<p class="text-secondary text-sm">Belum ada log harian</p>';
      return;
    }
    const weatherEmoji = { sunny: "\u2600\uFE0F", cloudy: "\u2601\uFE0F", rainy: "\uD83C\uDF27\uFE0F", stormy: "\u26C8\uFE0F" };
    el.innerHTML = STATE.dailyLogs.map((d) => `
      <div class="daily-log-item">
        <div class="daily-log-date">${formatDate(d.date)}</div>
        <div class="daily-log-desc">${esc(d.description)}</div>
        <div class="daily-log-meta">
          ${d.progress_increment ? "<span>+" + d.progress_increment + "% progress</span>" : ""}
          ${d.workers_present ? "<span>" + d.workers_present + " pekerja</span>" : ""}
          ${d.weather ? "<span>" + (weatherEmoji[d.weather] || d.weather) + "</span>" : ""}
        </div>
      </div>
    `).join("");
  }

  function populateDailyLogWorkItems() {
    const sel = document.getElementById("dlWorkItem");
    sel.innerHTML = '<option value="">Pilih pekerjaan</option>' +
      STATE.workItems.map((wi) => `<option value="${wi.id}">${esc(wi.name)}</option>`).join("");
  }

  window.saveCostRealization = async function (e) {
    e.preventDefault();
    const data = {
      project_id: document.getElementById("cfProject").value || STATE.currentProject?.id,
      rap_item_id: document.getElementById("cfRapItem").value || null,
      date: document.getElementById("cfDate").value,
      description: document.getElementById("cfDesc").value.trim(),
      quantity: parseFloat(document.getElementById("cfQty").value) || null,
      unit_price: parseFloat(document.getElementById("cfUnitPrice").value) || null,
      total_amount: parseFloat(document.getElementById("cfTotal").value) || 0,
      supplier: document.getElementById("cfSupplier").value.trim(),
      recorded_by: STATE.user.id,
    };
    if (!data.project_id || !data.description || !data.total_amount) return toast("Lengkapi field wajib");

    showLoading(true);
    const { error } = await sb.from("planner_cost_realizations").insert(data);
    showLoading(false);
    if (error) return toast("Gagal: " + error.message);

    if (STATE.currentProject && data.project_id === STATE.currentProject.id) {
      await loadCostRealizations();
      renderCostRealization();
      renderOverview();
    }
    closeSheet("costFormSheet");
    document.getElementById("costForm").reset();
    document.getElementById("cfDate").value = todayStr();
    toast("Biaya dicatat");
  };

  window.saveDailyLog = async function (e) {
    e.preventDefault();
    const workItemId = document.getElementById("dlWorkItem").value;
    const progressIncrement = parseFloat(document.getElementById("dlProgress").value) || 0;
    const data = {
      project_id: STATE.currentProject.id,
      work_item_id: workItemId || null,
      date: document.getElementById("dlDate").value,
      description: document.getElementById("dlDesc").value.trim(),
      progress_increment: progressIncrement,
      workers_present: parseInt(document.getElementById("dlWorkers").value) || null,
      weather: document.getElementById("dlWeather").value,
      recorded_by: STATE.user.id,
    };
    if (!data.description) return toast("Isi deskripsi pekerjaan");

    showLoading(true);
    const { error } = await sb.from("planner_daily_logs").insert(data);

    if (!error && workItemId && progressIncrement > 0) {
      const wi = STATE.workItems.find((w) => w.id === workItemId);
      if (wi) {
        const newProgress = Math.min((wi.progress_pct || 0) + progressIncrement, 100);
        await sb.from("planner_work_items").update({
          progress_pct: newProgress,
          status: newProgress >= 100 ? "completed" : "in_progress",
        }).eq("id", workItemId);
      }
    }
    showLoading(false);
    if (error) return toast("Gagal: " + error.message);

    await Promise.all([loadDailyLogs(), loadWorkItems()]);
    renderDailyLogs();
    renderTimeline();
    await updateProjectProgress();
    renderOverview();
    closeSheet("dailyLogFormSheet");
    document.getElementById("dailyLogForm").reset();
    document.getElementById("dlDate").value = todayStr();
    toast("Log harian disimpan");
  };

  window.switchRealSubTab = function (tab, btn) {
    document.querySelectorAll(".sub-tab").forEach((t) => t.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById("realCostSection").classList.toggle("hidden", tab !== "cost");
    document.getElementById("realProgressSection").classList.toggle("hidden", tab !== "progress");
  };

  window.loadCostRapItems = function () {
    const projId = document.getElementById("cfProject").value;
    if (!projId) return;
    sb.from("planner_rap_items").select("id,name,type,unit,unit_price").eq("project_id", projId).then(({ data }) => {
      const sel = document.getElementById("cfRapItem");
      sel.innerHTML = '<option value="">Pilih item (opsional)</option>' +
        (data || []).map((i) => `<option value="${i.id}">${esc(i.name)} (${esc(i.unit)})</option>`).join("");
    });
  };

  /* ============================================================
     OVERVIEW & ANALYSIS (EVM)
     ============================================================ */
  function renderOverview() {
    const p = STATE.currentProject;
    if (!p) return;

    const statusLabel = { planning: "Planning", active: "Aktif", paused: "Pause", completed: "Selesai" }[p.status] || p.status;
    document.getElementById("ovStatus").textContent = statusLabel;

    const progress = p.progress_pct || 0;
    document.getElementById("ovProgressText").textContent = progress.toFixed(0) + "%";
    drawProgressRing("ovProgressRing", progress);

    const days = daysBetween(p.planned_start, p.planned_end);
    document.getElementById("ovDuration").textContent = days + " hari";
    document.getElementById("ovDateRange").textContent = formatDate(p.planned_start) + " - " + formatDate(p.planned_end);

    const budget = p.total_budget || 0;
    const spent = p.total_spent || 0;
    document.getElementById("ovBudget").textContent = formatCurrencyShort(budget);
    document.getElementById("ovSpent").textContent = "Terpakai: " + formatCurrencyShort(spent);

    calculateAndRenderEVM();
    renderSCurve();
    generateRecommendations();
  }

  function calculateAndRenderEVM() {
    const p = STATE.currentProject;
    if (!p || !STATE.workItems.length) {
      document.getElementById("evmSPI").textContent = "-";
      document.getElementById("evmCPI").textContent = "-";
      document.getElementById("evmEAC").textContent = "-";
      return;
    }

    const totalBudget = p.total_budget || 0;
    const totalDays = daysBetween(p.planned_start, p.planned_end);
    const today = new Date();
    const start = new Date(p.planned_start);
    const elapsed = Math.max(0, Math.min(daysBetween(p.planned_start, todayStr()), totalDays));

    const totalWeight = STATE.workItems.reduce((s, wi) => s + (wi.weight || 0), 0) || 1;
    let plannedProgress = 0;
    STATE.workItems.forEach((wi) => {
      const wiStart = new Date(wi.planned_start);
      const wiEnd = new Date(wi.planned_end);
      const wiDur = daysBetween(wi.planned_start, wi.planned_end) || 1;
      const wiElapsed = Math.max(0, Math.min(Math.floor((today - wiStart) / 86400000) + 1, wiDur));
      plannedProgress += ((wi.weight || 0) / totalWeight) * (wiElapsed / wiDur) * 100;
    });

    const actualProgress = p.progress_pct || 0;
    const actualCost = p.total_spent || 0;

    const pv = totalBudget * plannedProgress / 100;
    const ev = totalBudget * actualProgress / 100;
    const ac = actualCost;

    const spi = pv > 0 ? ev / pv : 0;
    const cpi = ac > 0 ? ev / ac : 0;
    const eac = cpi > 0 ? totalBudget / cpi : totalBudget;

    const spiEl = document.getElementById("evmSPI");
    spiEl.textContent = spi.toFixed(2);
    spiEl.className = "evm-value " + (spi >= 1 ? "good" : spi >= 0.85 ? "warning" : "bad");

    const cpiEl = document.getElementById("evmCPI");
    cpiEl.textContent = cpi > 0 ? cpi.toFixed(2) : "-";
    cpiEl.className = "evm-value " + (cpi >= 1 ? "good" : cpi >= 0.85 ? "warning" : "bad");

    const eacEl = document.getElementById("evmEAC");
    eacEl.textContent = cpi > 0 ? formatCurrencyShort(eac) : "-";

    STATE.evm = { pv, ev, ac, spi, cpi, eac, plannedProgress, actualProgress };
  }

  function renderSCurve() {
    const p = STATE.currentProject;
    if (!p) return;

    const canvas = document.getElementById("chartSCurve");
    if (STATE.charts.sCurve) STATE.charts.sCurve.destroy();

    const startDate = new Date(p.planned_start);
    const endDate = new Date(p.planned_end);
    const totalDays = daysBetween(p.planned_start, p.planned_end);
    const weeks = Math.ceil(totalDays / 7);

    const labels = [];
    const plannedData = [];
    const actualData = [];
    const totalWeight = STATE.workItems.reduce((s, wi) => s + (wi.weight || 0), 0) || 1;

    for (let w = 0; w <= weeks; w++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + w * 7);
      labels.push("W" + (w + 1));

      let planned = 0;
      STATE.workItems.forEach((wi) => {
        const wiStart = new Date(wi.planned_start);
        const wiEnd = new Date(wi.planned_end);
        const wiDur = daysBetween(wi.planned_start, wi.planned_end) || 1;
        if (date >= wiStart) {
          const elapsed = Math.min(Math.floor((date - wiStart) / 86400000) + 1, wiDur);
          planned += ((wi.weight || 0) / totalWeight) * (elapsed / wiDur) * 100;
        }
      });
      plannedData.push(Math.min(planned, 100));

      if (date <= new Date()) {
        const dayOffset = Math.floor((date - startDate) / 86400000);
        const progressAtDate = estimateProgressAtDay(dayOffset);
        actualData.push(progressAtDate);
      }
    }

    const isDark = document.documentElement.classList.contains("dark");
    STATE.charts.sCurve = new Chart(canvas, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Rencana",
            data: plannedData,
            borderColor: "#94A3B8",
            borderDash: [5, 5],
            borderWidth: 2,
            fill: false,
            tension: 0.3,
            pointRadius: 2,
          },
          {
            label: "Aktual",
            data: actualData,
            borderColor: "#2563EB",
            borderWidth: 2.5,
            fill: false,
            tension: 0.3,
            pointRadius: 3,
            pointBackgroundColor: "#2563EB",
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: "top", labels: { boxWidth: 12, font: { size: 11 }, color: isDark ? "#94A3B8" : "#64748B" } },
        },
        scales: {
          y: {
            min: 0, max: 100,
            ticks: { callback: (v) => v + "%", color: isDark ? "#64748B" : "#94A3B8", font: { size: 10 } },
            grid: { color: isDark ? "#1E293B" : "#F1F5F9" },
          },
          x: {
            ticks: { color: isDark ? "#64748B" : "#94A3B8", font: { size: 10 } },
            grid: { display: false },
          },
        },
      },
    });
  }

  function estimateProgressAtDay(dayOffset) {
    const p = STATE.currentProject;
    if (!p) return 0;
    const totalProgress = p.progress_pct || 0;
    const totalDays = daysBetween(p.planned_start, todayStr()) || 1;
    const ratio = Math.min(dayOffset / totalDays, 1);
    return totalProgress * ratio;
  }

  /* ============================================================
     RECOMMENDATIONS ENGINE
     ============================================================ */
  function generateRecommendations() {
    const p = STATE.currentProject;
    if (!p || !STATE.workItems.length) {
      document.getElementById("projectRecommendations").innerHTML = '<p class="text-secondary text-sm">Tambahkan RAP dan timeline untuk mendapat rekomendasi</p>';
      return;
    }

    const recommendations = [];
    const evm = STATE.evm || {};

    if (evm.spi && evm.spi < 0.95 && evm.spi > 0) {
      const behindPct = ((evm.plannedProgress || 0) - (evm.actualProgress || 0)).toFixed(1);
      const totalDays = daysBetween(p.planned_start, p.planned_end);
      const behindDays = Math.ceil(behindPct / 100 * totalDays);

      const activeItems = STATE.workItems.filter((wi) => wi.status === "in_progress" || wi.status === "pending");
      const crashSuggestions = activeItems.slice(0, 2).map((wi) => {
        const workers = wi.planned_workers || 2;
        const addWorker = Math.ceil(workers * 0.5);
        const wiDays = daysBetween(wi.planned_start, wi.planned_end);
        const newDuration = Math.ceil(wiDays * workers / (workers + addWorker) * 1.1);
        const saved = wiDays - newDuration;
        return `Tambah ${addWorker} pekerja di "${wi.name}" (hemat ~${saved} hari)`;
      });

      recommendations.push({
        category: "schedule",
        priority: evm.spi < 0.85 ? "critical" : "warning",
        title: `Progress terlambat ${behindPct}% (~${behindDays} hari)`,
        description: `SPI ${evm.spi.toFixed(2)}. Progress aktual ${(evm.actualProgress || 0).toFixed(1)}% vs target ${(evm.plannedProgress || 0).toFixed(1)}%.`,
        actions: crashSuggestions,
      });
    }

    if (evm.cpi && evm.cpi < 0.95 && evm.cpi > 0) {
      const overrun = (evm.eac || 0) - (p.total_budget || 0);
      recommendations.push({
        category: "cost",
        priority: evm.cpi < 0.85 ? "critical" : "warning",
        title: `Budget berisiko over ${formatCurrencyShort(overrun)}`,
        description: `CPI ${evm.cpi.toFixed(2)}. Estimasi total: ${formatCurrencyShort(evm.eac)} vs budget ${formatCurrencyShort(p.total_budget)}.`,
        actions: ["Review harga item RAP yang belum dibeli", "Cari supplier alternatif untuk item besar"],
      });
    }

    if (evm.spi && evm.spi >= 1.05) {
      recommendations.push({
        category: "schedule",
        priority: "success",
        title: "Progress lebih cepat dari target!",
        description: `SPI ${evm.spi.toFixed(2)}. Pertahankan momentum ini.`,
        actions: [],
      });
    }

    if (evm.cpi && evm.cpi >= 1.05) {
      recommendations.push({
        category: "cost",
        priority: "success",
        title: "Pengeluaran efisien!",
        description: `CPI ${evm.cpi.toFixed(2)}. Budget terkelola dengan baik.`,
        actions: [],
      });
    }

    const budgetTotal = p.total_budget || 0;
    if (budgetTotal > 0) {
      const materialCost = STATE.rapItems.filter((i) => i.type === "material").reduce((s, i) => s + i.quantity * i.unit_price, 0);
      const laborCost = STATE.rapItems.filter((i) => i.type === "labor").reduce((s, i) => s + i.quantity * i.unit_price, 0);
      const matRatio = materialCost / budgetTotal;
      const labRatio = laborCost / budgetTotal;

      if (matRatio > 0.75) {
        recommendations.push({
          category: "budget",
          priority: "warning",
          title: "Rasio biaya bahan terlalu tinggi",
          description: `Bahan ${(matRatio * 100).toFixed(0)}% dari total. Normal 50-65%. Review apakah ada item yang bisa dioptimalkan.`,
          actions: [],
        });
      }
      if (labRatio > 0.50) {
        recommendations.push({
          category: "budget",
          priority: "warning",
          title: "Rasio biaya tenaga tinggi",
          description: `Tenaga ${(labRatio * 100).toFixed(0)}% dari total. Normal 25-40%.`,
          actions: [],
        });
      }
    }

    const totalWeight = STATE.workItems.reduce((s, wi) => s + (wi.weight || 0), 0);
    if (STATE.workItems.length >= 3 && totalWeight === 0) {
      recommendations.push({
        category: "planning",
        priority: "warning",
        title: "Bobot pekerjaan belum diisi",
        description: "Isi bobot (%) di setiap item pekerjaan agar progress lebih akurat.",
        actions: [],
      });
    }

    if (STATE.workItems.length > 0 && STATE.rapItems.length === 0) {
      recommendations.push({
        category: "planning",
        priority: "warning",
        title: "RAP belum diisi",
        description: "Tambahkan item RAP (bahan, tenaga, peralatan) untuk analisa biaya.",
        actions: [],
      });
    }

    const el = document.getElementById("projectRecommendations");
    if (!recommendations.length) {
      el.innerHTML = '<p class="text-secondary text-sm">Tidak ada rekomendasi saat ini. Proyek berjalan baik!</p>';
      return;
    }
    el.innerHTML = recommendations.map((r) => `
      <div class="reco-card ${r.priority}">
        <div class="reco-title">${esc(r.title)}</div>
        <div class="reco-desc">${esc(r.description)}</div>
        ${r.actions.length ? '<div class="reco-actions">' + r.actions.map((a) => '<span class="text-xs" style="background:var(--bg-2);padding:0.25rem 0.5rem;border-radius:var(--radius-sm)">&#8226; ' + esc(a) + '</span>').join("") + '</div>' : ""}
      </div>
    `).join("");
  }

  /* ============================================================
     REPORT GENERATION
     ============================================================ */
  window.generateReport = function () {
    const p = STATE.currentProject;
    if (!p) return;

    const evm = STATE.evm || {};
    const rapTotal = STATE.rapItems.reduce((s, i) => s + i.quantity * i.unit_price, 0);
    const spentTotal = STATE.costRealizations.reduce((s, c) => s + (c.total_amount || 0), 0);
    const progress = p.progress_pct || 0;

    const recentCosts = STATE.costRealizations.slice(0, 10);
    const recentLogs = STATE.dailyLogs.slice(0, 10);

    const html = `
      <div class="report-section">
        <h4>Ringkasan Proyek</h4>
        <table style="width:100%;font-size:0.8125rem;border-collapse:collapse">
          <tr><td style="padding:0.25rem 0;color:var(--text-secondary)">Proyek</td><td style="text-align:right;font-weight:600">${esc(p.name)}</td></tr>
          <tr><td style="padding:0.25rem 0;color:var(--text-secondary)">Klien</td><td style="text-align:right">${esc(p.client_name || "-")}</td></tr>
          <tr><td style="padding:0.25rem 0;color:var(--text-secondary)">Periode</td><td style="text-align:right">${formatDate(p.planned_start)} - ${formatDate(p.planned_end)}</td></tr>
          <tr><td style="padding:0.25rem 0;color:var(--text-secondary)">Progress</td><td style="text-align:right;font-weight:600">${progress.toFixed(1)}%</td></tr>
          <tr><td style="padding:0.25rem 0;color:var(--text-secondary)">SPI</td><td style="text-align:right">${evm.spi ? evm.spi.toFixed(2) : "-"}</td></tr>
          <tr><td style="padding:0.25rem 0;color:var(--text-secondary)">CPI</td><td style="text-align:right">${evm.cpi ? evm.cpi.toFixed(2) : "-"}</td></tr>
        </table>
      </div>
      <div class="report-section">
        <h4>Keuangan</h4>
        <table style="width:100%;font-size:0.8125rem;border-collapse:collapse">
          <tr><td style="padding:0.25rem 0;color:var(--text-secondary)">Total RAP</td><td style="text-align:right">${formatCurrency(rapTotal)}</td></tr>
          <tr><td style="padding:0.25rem 0;color:var(--text-secondary)">Realisasi</td><td style="text-align:right">${formatCurrency(spentTotal)}</td></tr>
          <tr style="font-weight:700"><td style="padding:0.25rem 0">Sisa</td><td style="text-align:right;color:${rapTotal - spentTotal >= 0 ? "var(--success)" : "var(--danger)"}">${formatCurrency(rapTotal - spentTotal)}</td></tr>
        </table>
      </div>
      <div class="report-section">
        <h4>Pengeluaran Terakhir</h4>
        ${recentCosts.length ? recentCosts.map((c) => `<div style="display:flex;justify-content:space-between;font-size:0.8125rem;padding:0.25rem 0;border-bottom:1px solid var(--border-light)"><span>${formatDate(c.date)} - ${esc(c.description)}</span><span style="font-weight:600">${formatCurrency(c.total_amount)}</span></div>`).join("") : '<p class="text-secondary text-sm">Belum ada</p>'}
      </div>
      <div class="report-section">
        <h4>Log Aktivitas Terakhir</h4>
        ${recentLogs.length ? recentLogs.map((d) => `<div style="font-size:0.8125rem;padding:0.25rem 0;border-bottom:1px solid var(--border-light)"><span style="color:var(--primary);font-weight:500">${formatDate(d.date)}</span> — ${esc(d.description)}${d.progress_increment ? " (+" + d.progress_increment + "%)" : ""}</div>`).join("") : '<p class="text-secondary text-sm">Belum ada</p>'}
      </div>`;

    document.getElementById("reportContent").innerHTML = html;
  };

  window.exportReportPDF = function () {
    window.print();
  };

  /* ============================================================
     FINANCE PAGE
     ============================================================ */
  function updateFinanceProjectFilter() {
    const sel = document.getElementById("financeProjectFilter");
    if (sel) {
      sel.innerHTML = '<option value="all">Semua Proyek</option>' +
        STATE.projects.map((p) => `<option value="${p.id}">${esc(p.name)}</option>`).join("");
    }
    const cfSel = document.getElementById("cfProject");
    if (cfSel) {
      cfSel.innerHTML = '<option value="">Pilih proyek</option>' +
        STATE.projects.map((p) => `<option value="${p.id}">${esc(p.name)}</option>`).join("");
    }
  }

  window.loadFinanceData = async function () {
    const finB = document.getElementById("finTotalBudget");
    if (!finB) return;

    const sel = document.getElementById("financeProjectFilter");
    const filter = sel ? sel.value : "all";
    let totalBudget = 0, totalSpent = 0;

    if (filter === "all") {
      totalBudget = STATE.projects.reduce((s, p) => s + (p.total_budget || 0), 0);
      totalSpent = STATE.projects.reduce((s, p) => s + (p.total_spent || 0), 0);
    } else {
      const p = STATE.projects.find((pr) => pr.id === filter);
      totalBudget = p?.total_budget || 0;
      totalSpent = p?.total_spent || 0;
    }

    document.getElementById("finTotalBudget").textContent = formatCurrency(totalBudget);
    document.getElementById("finTotalSpent").textContent = formatCurrency(totalSpent);
    const remaining = totalBudget - totalSpent;
    document.getElementById("finRemaining").textContent = formatCurrency(remaining);
    document.getElementById("finRemaining").style.color = remaining >= 0 ? "var(--success)" : "var(--danger)";
    const variance = totalBudget > 0 ? ((remaining / totalBudget) * 100).toFixed(1) : "0";
    document.getElementById("finVariance").textContent = variance + "%";

    renderBudgetVsActualChart(filter);
  };

  function renderBudgetVsActualChart(filter) {
    const canvas = document.getElementById("chartBudgetVsActual");
    if (!canvas) return;
    if (STATE.charts.budgetVsActual) STATE.charts.budgetVsActual.destroy();

    let projects = filter === "all" ? STATE.projects.slice(0, 8) : STATE.projects.filter((p) => p.id === filter);
    if (!projects.length) return;

    const isDark = document.documentElement.classList.contains("dark");
    STATE.charts.budgetVsActual = new Chart(canvas, {
      type: "bar",
      data: {
        labels: projects.map((p) => p.name.length > 15 ? p.name.substring(0, 15) + "..." : p.name),
        datasets: [
          { label: "Budget (RAP)", data: projects.map((p) => p.total_budget || 0), backgroundColor: "rgba(37,99,235,0.6)", borderRadius: 4 },
          { label: "Realisasi", data: projects.map((p) => p.total_spent || 0), backgroundColor: "rgba(245,158,11,0.6)", borderRadius: 4 },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: "top", labels: { boxWidth: 12, font: { size: 11 }, color: isDark ? "#94A3B8" : "#64748B" } } },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { callback: (v) => formatCurrencyShort(v), color: isDark ? "#64748B" : "#94A3B8", font: { size: 10 } },
            grid: { color: isDark ? "#1E293B" : "#F1F5F9" },
          },
          x: { ticks: { color: isDark ? "#64748B" : "#94A3B8", font: { size: 10 } }, grid: { display: false } },
        },
      },
    });
  }

  /* ============================================================
     SMART BUTTON — COMMAND CENTER
     ============================================================ */
  window.openSmartButton = function () {
    document.getElementById("smartOverlay").classList.remove("hidden");
    document.getElementById("smartOutput").classList.add("hidden");
    document.getElementById("smartInput").value = "";
    document.getElementById("smartInput").focus();
    document.getElementById("cfDate").value = todayStr();
    document.getElementById("dlDate").value = todayStr();
  };

  window.closeSmartButton = function () {
    document.getElementById("smartOverlay").classList.add("hidden");
    stopVoiceInput();
  };

  window.fillSmartInput = function (text) {
    const input = document.getElementById("smartInput");
    input.value = text;
    input.focus();
  };

  window.autoResizeSmartInput = function () {
    const el = document.getElementById("smartInput");
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  };

  window.executeSmartCommand = async function () {
    const input = document.getElementById("smartInput").value.trim();
    if (!input) return;

    showLoading(true);
    const result = parseCommand(input);

    if (result.confidence >= 0.75) {
      await executeIntent(result);
    } else {
      const aiResult = await aiParseCommand(input);
      if (aiResult && aiResult.confidence >= 0.6) {
        await executeIntent(aiResult);
        if (result.confidence < 0.5) {
          logParsingImprovement(input, result, aiResult);
        }
      } else {
        showSmartOutput({
          success: false,
          message: "Maaf, saya belum memahami perintah tersebut. Coba dengan format berbeda.",
          details: `Input: "${input}"`,
        });
      }
    }
    showLoading(false);
  };

  function showSmartOutput(result) {
    const el = document.getElementById("smartOutput");
    const content = document.getElementById("smartOutputContent");
    el.classList.remove("hidden");
    el.className = "smart-output" + (result.success ? "" : " error");

    content.innerHTML = `
      <div style="font-weight:600;margin-bottom:0.25rem">${result.success ? "\u2705" : "\u274C"} ${esc(result.message)}</div>
      ${result.details ? '<div style="font-size:0.8125rem;color:var(--text-secondary)">' + esc(result.details) + '</div>' : ""}
    `;

    STATE.smartButton.lastResult = result;
    document.getElementById("smartConfirmBtn").style.display = result.needsConfirm ? "" : "none";
  }

  /* ============================================================
     RULE-BASED PARSER (Layer 1)
     ============================================================ */
  function parseCommand(input) {
    const lower = input.toLowerCase().trim();
    const rules = getParsingRules();

    for (const rule of rules) {
      for (const pattern of rule.patterns) {
        const match = lower.match(pattern);
        if (match) {
          const params = rule.extract(match, input);
          return {
            intent: rule.intent,
            params,
            confidence: rule.confidence,
            raw: input,
          };
        }
      }
    }

    return { intent: "unknown", params: {}, confidence: 0, raw: input };
  }

  function getParsingRules() {
    return [
      {
        intent: "record_cost",
        patterns: [
          /(?:beli|bayar|byr|bl|catat\s+beli)\s+(.+?)\s+(\d+[\d.,]*)\s*(?:sak|kg|m3|m³|kubik|btg|batang|buah|unit|ls|lot|pcs|lembar|lbr|roll|meter|mtr)\s*(?:@|harga|hrg|x|×)?\s*(?:rp\.?\s*)?(\d[\d.,]*)\s*(?:ribu|rb|k)?/i,
          /(?:beli|bayar|byr|bl|catat\s+beli)\s+(.+?)\s+(?:rp\.?\s*)?(\d[\d.,]*)\s*(?:ribu|rb|k|juta|jt)?/i,
          /(?:beli|bayar|byr)\s+(.+?)\s+(\d[\d.,]*)\s*(?:sak|kg|m3|kubik|btg|buah|unit|ls|pcs)\s+(?:rp\.?\s*)?(\d[\d.,]*)/i,
        ],
        confidence: 0.85,
        extract: (match, input) => {
          let item = match[1]?.trim();
          let qty = null, unitPrice = null, total = 0;

          if (match[3]) {
            qty = parseNumberFromText(match[2]);
            unitPrice = parseNumberFromText(match[3]);
            if (input.toLowerCase().includes("ribu") || input.toLowerCase().includes("rb") || input.toLowerCase().includes("k")) {
              unitPrice *= 1000;
            }
            total = qty * unitPrice;
          } else {
            total = parseNumberFromText(match[2]);
            if (input.toLowerCase().includes("juta") || input.toLowerCase().includes("jt")) total *= 1000000;
            else if (input.toLowerCase().includes("ribu") || input.toLowerCase().includes("rb") || input.toLowerCase().includes("k")) total *= 1000;
          }

          const projectMatch = input.match(/(?:project|proyek|prj)\s+(.+?)(?:\s*$)/i);
          const projectName = projectMatch ? projectMatch[1].trim() : null;

          return { item, qty, unitPrice, total, projectName };
        },
      },
      {
        intent: "update_progress",
        patterns: [
          /(?:progress|proses|hari\s+ini)\s+(.+?)\s+(?:selesai\s+)?(\d+)\s*(?:%|persen|prosen)/i,
          /(.+?)\s+(?:sudah|sdh|udah|udh)\s+(\d+)\s*(?:%|persen|prosen)/i,
          /(?:update|upd)\s+(?:progress|proses)\s+(.+?)\s+(\d+)\s*(?:%|persen)?/i,
        ],
        confidence: 0.85,
        extract: (match) => ({
          workItem: match[1]?.trim(),
          progress: parseInt(match[2]) || 0,
        }),
      },
      {
        intent: "check_budget",
        patterns: [
          /(?:cek|check|berapa|lihat)\s+(?:budget|anggaran|biaya|sisa|rap)\s*(?:project|proyek|prj)?\s*(.*)?/i,
          /(?:sisa\s+(?:budget|anggaran))\s*(.*)?/i,
        ],
        confidence: 0.90,
        extract: (match) => ({ projectName: match[1]?.trim() || null }),
      },
      {
        intent: "check_progress",
        patterns: [
          /(?:cek|check|berapa|lihat)\s+(?:progress|proses)\s*(?:project|proyek|prj)?\s*(.*)?/i,
          /(?:progress)\s+(?:project|proyek|prj)\s+(.*)/i,
        ],
        confidence: 0.90,
        extract: (match) => ({ projectName: match[1]?.trim() || null }),
      },
      {
        intent: "open_project",
        patterns: [
          /(?:buka|open|tampilkan|lihat)\s+(?:project|proyek|prj)\s+(.*)/i,
        ],
        confidence: 0.90,
        extract: (match) => ({ projectName: match[1]?.trim() }),
      },
      {
        intent: "add_worker_log",
        patterns: [
          /(?:hari\s+ini|log)\s+(?:hadir|kerja|pekerja)\s+(\d+)\s*(?:orang|org)/i,
          /(?:pekerja|tukang|kuli)\s+(?:hadir|datang)\s+(\d+)\s*(?:orang|org)?/i,
        ],
        confidence: 0.80,
        extract: (match) => ({ workers: parseInt(match[1]) || 0 }),
      },
      {
        intent: "open_report",
        patterns: [
          /(?:buka|lihat|tampilkan|show)\s+(?:laporan|report)/i,
        ],
        confidence: 0.90,
        extract: () => ({}),
      },
      {
        intent: "ask_recommendation",
        patterns: [
          /(?:rekomendasi|saran|analisa|analisis)\s*(?:project|proyek|prj|untuk)?\s*(.*)?/i,
        ],
        confidence: 0.85,
        extract: (match) => ({ projectName: match[1]?.trim() || null }),
      },
    ];
  }

  function parseNumberFromText(str) {
    if (!str) return 0;
    return parseFloat(str.replace(/[.,]/g, "")) || 0;
  }

  /* ============================================================
     INTENT EXECUTION
     ============================================================ */
  async function executeIntent(result) {
    const { intent, params } = result;
    let project = STATE.currentProject;

    if (params.projectName && !project) {
      project = fuzzyMatchProject(params.projectName);
    }
    if (!project && STATE.projects.length === 1) {
      project = STATE.projects[0];
    }

    switch (intent) {
      case "record_cost": {
        if (!project) {
          showSmartOutput({ success: false, message: "Proyek tidak ditemukan", details: "Buka proyek terlebih dahulu atau sebutkan nama proyek." });
          return;
        }
        const data = {
          project_id: project.id,
          date: todayStr(),
          description: params.item || "Pembelian",
          quantity: params.qty,
          unit_price: params.unitPrice,
          total_amount: params.total || 0,
          recorded_by: STATE.user.id,
        };
        const { error } = await sb.from("planner_cost_realizations").insert(data);
        if (error) {
          showSmartOutput({ success: false, message: "Gagal mencatat: " + error.message });
          return;
        }
        const totalDisplay = formatCurrency(params.total || 0);
        const detail = params.qty && params.unitPrice
          ? `${params.item} ${formatNum(params.qty)} × ${formatCurrency(params.unitPrice)} = ${totalDisplay}`
          : `${params.item} = ${totalDisplay}`;
        showSmartOutput({ success: true, message: "Tercatat!", details: detail + " → " + project.name });

        if (STATE.currentProject?.id === project.id) {
          await loadCostRealizations();
          renderCostRealization();
          renderOverview();
        }
        break;
      }

      case "update_progress": {
        if (!project) {
          showSmartOutput({ success: false, message: "Buka proyek terlebih dahulu." });
          return;
        }
        const wi = fuzzyMatchWorkItem(params.workItem);
        if (!wi) {
          showSmartOutput({ success: false, message: `Pekerjaan "${params.workItem}" tidak ditemukan di proyek ${project.name}.` });
          return;
        }
        const newProgress = Math.min(params.progress, 100);
        await sb.from("planner_work_items").update({
          progress_pct: newProgress,
          status: newProgress >= 100 ? "completed" : "in_progress",
        }).eq("id", wi.id);
        await sb.from("planner_daily_logs").insert({
          project_id: project.id,
          work_item_id: wi.id,
          date: todayStr(),
          description: `Update progress ${wi.name} → ${newProgress}%`,
          progress_increment: newProgress - (wi.progress_pct || 0),
          recorded_by: STATE.user.id,
        });

        showSmartOutput({ success: true, message: `Progress diupdate!`, details: `${wi.name}: ${wi.progress_pct || 0}% → ${newProgress}%` });

        await Promise.all([loadWorkItems(), loadDailyLogs()]);
        renderTimeline();
        renderDailyLogs();
        await updateProjectProgress();
        renderOverview();
        break;
      }

      case "check_budget": {
        if (!project) {
          const totalBudget = STATE.projects.reduce((s, p) => s + (p.total_budget || 0), 0);
          const totalSpent = STATE.projects.reduce((s, p) => s + (p.total_spent || 0), 0);
          showSmartOutput({
            success: true,
            message: "Ringkasan Budget",
            details: `Total RAP: ${formatCurrency(totalBudget)} | Terpakai: ${formatCurrency(totalSpent)} | Sisa: ${formatCurrency(totalBudget - totalSpent)}`,
          });
        } else {
          showSmartOutput({
            success: true,
            message: `Budget ${project.name}`,
            details: `RAP: ${formatCurrency(project.total_budget || 0)} | Terpakai: ${formatCurrency(project.total_spent || 0)} | Sisa: ${formatCurrency((project.total_budget || 0) - (project.total_spent || 0))}`,
          });
        }
        break;
      }

      case "check_progress": {
        if (!project) {
          const avg = STATE.projects.length
            ? (STATE.projects.reduce((s, p) => s + (p.progress_pct || 0), 0) / STATE.projects.length).toFixed(1)
            : 0;
          showSmartOutput({ success: true, message: "Rata-rata progress: " + avg + "%", details: STATE.projects.map((p) => `${p.name}: ${(p.progress_pct || 0).toFixed(0)}%`).join(" | ") });
        } else {
          showSmartOutput({ success: true, message: `Progress ${project.name}: ${(project.progress_pct || 0).toFixed(1)}%` });
        }
        break;
      }

      case "open_project": {
        const found = fuzzyMatchProject(params.projectName);
        if (found) {
          closeSmartButton();
          openProjectDetail(found.id);
        } else {
          showSmartOutput({ success: false, message: `Proyek "${params.projectName}" tidak ditemukan.` });
        }
        break;
      }

      case "open_report": {
        if (project || STATE.currentProject) {
          closeSmartButton();
          switchDetailTab("report", document.querySelector('.detail-tab[data-tab="report"]'));
          generateReport();
        } else {
          showSmartOutput({ success: false, message: "Buka proyek terlebih dahulu." });
        }
        break;
      }

      case "ask_recommendation": {
        if (project || STATE.currentProject) {
          closeSmartButton();
          switchDetailTab("overview", document.querySelector('.detail-tab[data-tab="overview"]'));
        } else {
          showSmartOutput({ success: true, message: "Buka proyek untuk melihat rekomendasi." });
        }
        break;
      }

      case "add_worker_log": {
        if (!project) {
          showSmartOutput({ success: false, message: "Buka proyek terlebih dahulu." });
          return;
        }
        await sb.from("planner_daily_logs").insert({
          project_id: project.id,
          date: todayStr(),
          description: `${params.workers} pekerja hadir`,
          workers_present: params.workers,
          recorded_by: STATE.user.id,
        });
        showSmartOutput({ success: true, message: `Dicatat: ${params.workers} pekerja hadir hari ini.` });
        if (STATE.currentProject?.id === project.id) {
          await loadDailyLogs();
          renderDailyLogs();
        }
        break;
      }

      default:
        showSmartOutput({ success: false, message: "Perintah tidak dikenali.", details: `"${result.raw}"` });
    }

    await sb.from("planner_command_logs").insert({
      user_id: STATE.user.id,
      org_id: STATE.org?.id,
      input_type: STATE.smartButton.listening ? "voice" : "text",
      raw_input: result.raw,
      parsed_intent: intent,
      parsed_params: params,
      confidence: result.confidence,
      execution_status: intent !== "unknown" ? "executed" : "failed",
    }).catch(() => {});
  }

  function fuzzyMatchProject(name) {
    if (!name) return null;
    const lower = name.toLowerCase();
    return STATE.projects.find((p) => p.name.toLowerCase().includes(lower)) ||
      STATE.projects.find((p) => lower.includes(p.name.toLowerCase()));
  }

  function fuzzyMatchWorkItem(name) {
    if (!name) return null;
    const lower = name.toLowerCase();
    return STATE.workItems.find((wi) => wi.name.toLowerCase().includes(lower)) ||
      STATE.workItems.find((wi) => lower.includes(wi.name.toLowerCase()));
  }

  /* ============================================================
     AI PARSER (Layer 2 — Fallback)
     ============================================================ */
  async function aiParseCommand(input) {
    try {
      const context = {
        projects: STATE.projects.map((p) => ({ name: p.name, id: p.id, status: p.status })),
        work_items: STATE.workItems.map((wi) => ({ name: wi.name, id: wi.id, progress: wi.progress_pct })),
        current_project: STATE.currentProject?.name || null,
      };

      const { data } = await sb.functions.invoke(CFG.fnParseCommand, {
        body: { input, context, user_id: STATE.user.id },
      });

      if (data?.intent) {
        return {
          intent: data.intent,
          params: data.params || {},
          confidence: data.confidence || 0.7,
          raw: input,
        };
      }
    } catch (e) {
      console.warn("AI parser fallback failed:", e);
    }
    return null;
  }

  function logParsingImprovement(input, failedResult, aiResult) {
    sb.from("planner_command_logs").update({
      was_corrected: true,
      correction_data: { original_intent: failedResult.intent, ai_intent: aiResult.intent, ai_params: aiResult.params },
    }).eq("raw_input", input).eq("user_id", STATE.user.id);
  }

  window.confirmSmartCommand = function () {
    document.getElementById("smartOutput").classList.add("hidden");
    document.getElementById("smartInput").value = "";
    toast("Dikonfirmasi!");
  };

  window.rejectSmartCommand = function () {
    document.getElementById("smartOutput").classList.add("hidden");
    document.getElementById("smartInput").focus();
  };

  /* ============================================================
     VOICE INPUT
     ============================================================ */
  window.toggleVoiceInput = function () {
    if (STATE.smartButton.listening) {
      stopVoiceInput();
    } else {
      startVoiceInput();
    }
  };

  function startVoiceInput() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast("Browser tidak mendukung voice input");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "id-ID";
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onresult = (e) => {
      let transcript = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        transcript += e.results[i][0].transcript;
      }
      document.getElementById("smartInput").value = transcript;

      if (e.results[e.results.length - 1].isFinal) {
        stopVoiceInput();
        executeSmartCommand();
      }
    };

    recognition.onerror = (e) => {
      console.warn("Speech error:", e.error);
      stopVoiceInput();
      if (e.error === "not-allowed") toast("Izinkan akses mikrofon");
    };

    recognition.onend = () => {
      stopVoiceInput();
    };

    recognition.start();
    STATE.smartButton.recognition = recognition;
    STATE.smartButton.listening = true;
    document.getElementById("smartMicBtn").classList.add("listening");
    document.getElementById("listeningIndicator").classList.remove("hidden");
    document.getElementById("quickCommands").classList.add("hidden");
  }

  window.stopVoiceInput = function () {
    if (STATE.smartButton.recognition) {
      STATE.smartButton.recognition.abort();
      STATE.smartButton.recognition = null;
    }
    STATE.smartButton.listening = false;
    document.getElementById("smartMicBtn")?.classList.remove("listening");
    document.getElementById("listeningIndicator")?.classList.add("hidden");
    document.getElementById("quickCommands")?.classList.remove("hidden");
  };

  /* ============================================================
     NOTIFICATIONS
     ============================================================ */
  async function loadNotifications() {
    if (!STATE.user) return;
    const { data, error } = await sb.from("planner_notifications")
      .select("*")
      .eq("user_id", STATE.user.id)
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) {
      if (isPlannerSchemaMissingError(error)) {
        STATE.notifications = [];
        renderNotifications();
        return;
      }
      console.warn("planner_notifications:", error);
    }
    STATE.notifications = data || [];
    renderNotifications();
  }

  function renderNotifications() {
    const badge = document.getElementById("notifBadge");
    const unread = STATE.notifications.filter((n) => !n.is_read).length;
    if (unread > 0) {
      badge.textContent = unread;
      badge.classList.remove("hidden");
    } else {
      badge.classList.add("hidden");
    }

    const el = document.getElementById("notifList");
    if (!STATE.notifications.length) {
      el.innerHTML = '<p class="text-secondary text-sm">Tidak ada notifikasi</p>';
      return;
    }
    el.innerHTML = STATE.notifications.map((n) => `
      <div class="notif-item ${n.is_read ? "" : "unread"}" onclick="markNotifRead('${n.id}')">
        <div class="notif-item-title">${esc(n.title)}</div>
        <div class="notif-item-msg">${esc(n.message)}</div>
        <div class="notif-item-time">${timeAgo(n.created_at)}</div>
      </div>
    `).join("");
  }

  window.markNotifRead = async function (id) {
    await sb.from("planner_notifications").update({ is_read: true }).eq("id", id);
    const notif = STATE.notifications.find((n) => n.id === id);
    if (notif) notif.is_read = true;
    renderNotifications();
  };

  /* ============================================================
     ADMIN
     ============================================================ */
  function checkAdmin() {
    const isAdmin = CFG.adminEmails.includes(STATE.user.email) || STATE.profile?.role === "admin";
    document.getElementById("adminSection").style.display = isAdmin ? "" : "none";
  }

  window.searchAdminUsers = function () {
    toast("Panel admin: fitur akan tersedia segera");
  };

  /* ============================================================
     NAVIGATION
     ============================================================ */
  window.switchTab = function (tab) {
    STATE.ui.activeTab = tab;
    document.querySelectorAll(".page").forEach((p) => p.classList.remove("active"));
    document.querySelectorAll(".nav-item").forEach((n) => n.classList.remove("active"));
    const page = document.getElementById("page" + tab.charAt(0).toUpperCase() + tab.slice(1));
    if (page) page.classList.add("active");
    const navBtn = document.querySelector(`.nav-item[data-tab="${tab}"]`);
    if (navBtn) navBtn.classList.add("active");

    const titles = { home: "Dashboard", project: "Proyek", finance: "Keuangan", settings: "Pengaturan" };
    document.getElementById("pageTitle").textContent = titles[tab] || "Monefyi Planner";

    if (tab === "finance") loadFinanceData();
  };

  window.showAuthView = function (view) {
    document.getElementById("loginForm").classList.toggle("hidden", view !== "login");
    document.getElementById("registerForm").classList.toggle("hidden", view !== "register");
    document.getElementById("forgotForm").classList.toggle("hidden", view !== "forgot");
    const bypassRow = document.getElementById("authBypassRow");
    if (bypassRow) bypassRow.classList.toggle("hidden", view === "forgot");
  };

  window.plannerBypassLogin = async function () {
    if (!CFG.bypassLoginEnabled) {
      toast("Bypass login dimatikan di config.");
      return;
    }
    showLoading(true);
    try {
      const { error } = await sb.auth.signInWithPassword({
        email: CFG.bypassEmail,
        password: CFG.bypassPassword,
      });
      if (error) {
        console.warn("[planner-auth] bypass", error);
        toast(authUserMessage(error) + " Pastikan migrasi seed auth sudah di-push ke Supabase.");
        return;
      }
      toast("Masuk sebagai demo…");
    } catch (err) {
      console.error(err);
      toast("Bypass gagal: " + (err.message || String(err)));
    } finally {
      showLoading(false);
    }
  };

  /* ============================================================
     SHEETS
     ============================================================ */
  window.openSheet = function (id) {
    const sheet = document.getElementById(id);
    if (sheet) {
      sheet.classList.remove("hidden");
      if (id === "costFormSheet") {
        document.getElementById("cfDate").value = todayStr();
        if (STATE.currentProject) {
          document.getElementById("cfProject").value = STATE.currentProject.id;
          loadCostRapItems();
        }
      }
      if (id === "dailyLogFormSheet") {
        document.getElementById("dlDate").value = todayStr();
      }
      if (id === "projectFormSheet") {
        if (!document.getElementById("pfId").value) {
          document.getElementById("projectFormTitle").textContent = "Proyek Baru";
          document.getElementById("pfStartDate").value = todayStr();
          const end = new Date();
          end.setDate(end.getDate() + 30);
          document.getElementById("pfEndDate").value = end.toISOString().split("T")[0];
        }
      }
      if (id === "rapItemFormSheet" && !document.getElementById("riId").value) {
        document.getElementById("rapItemFormTitle").textContent = "Tambah Item RAP";
      }
      if (id === "workItemFormSheet" && !document.getElementById("wiId").value) {
        document.getElementById("workItemFormTitle").textContent = "Tambah Pekerjaan";
        if (STATE.currentProject) {
          document.getElementById("wiStart").value = STATE.currentProject.planned_start;
          document.getElementById("wiEnd").value = STATE.currentProject.planned_end;
        }
      }
      if (id === "orgSheet") {
        const inp = document.getElementById("orgName");
        if (inp) {
          if (STATE.org) inp.value = STATE.org.name || "";
          else {
            const meta = STATE.user?.user_metadata || {};
            if (!inp.value.trim()) inp.value = meta.org_name || "";
          }
        }
      }
    }
  };

  window.closeSheet = function (id) {
    const sheet = document.getElementById(id);
    if (sheet) sheet.classList.add("hidden");
  };

  /* ============================================================
     DARK MODE
     ============================================================ */
  window.toggleDarkMode = function () {
    const dark = document.getElementById("darkModeToggle").checked;
    STATE.ui.darkMode = dark;
    localStorage.setItem("planner_dark", dark ? "1" : "0");
    document.documentElement.classList.toggle("dark", dark);
    Object.values(STATE.charts).forEach((c) => { if (c) c.destroy(); });
    STATE.charts = {};
    if (STATE.currentProject) {
      renderSCurve();
    }
  };

  window.changeLanguage = function (lang) {
    STATE.ui.lang = lang;
    localStorage.setItem("planner_lang", lang);
    toast(lang === "en" ? "Language changed to English" : "Bahasa diubah ke Indonesia");
  };

  /* ============================================================
     HELPERS
     ============================================================ */
  function esc(str) {
    if (!str) return "";
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function formatCurrency(num) {
    return "Rp " + (num || 0).toLocaleString("id-ID", { maximumFractionDigits: 0 });
  }

  function formatCurrencyShort(num) {
    if (!num) return "Rp 0";
    if (num >= 1e9) return "Rp " + (num / 1e9).toFixed(1) + "M";
    if (num >= 1e6) return "Rp " + (num / 1e6).toFixed(1) + "jt";
    if (num >= 1e3) return "Rp " + (num / 1e3).toFixed(0) + "rb";
    return "Rp " + num.toLocaleString("id-ID");
  }

  function formatNum(n) {
    return (n || 0).toLocaleString("id-ID", { maximumFractionDigits: 3 });
  }

  function formatDate(str) {
    if (!str) return "-";
    const d = new Date(str);
    return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
  }

  function daysBetween(start, end) {
    if (!start || !end) return 0;
    const a = new Date(start);
    const b = new Date(end);
    return Math.max(0, Math.ceil((b - a) / 86400000) + 1);
  }

  function todayStr() {
    return new Date().toISOString().split("T")[0];
  }

  function timeAgo(dateStr) {
    if (!dateStr) return "";
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Baru saja";
    if (mins < 60) return mins + " menit lalu";
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return hrs + " jam lalu";
    const days = Math.floor(hrs / 24);
    return days + " hari lalu";
  }

  function updateGreeting() {
    const hr = new Date().getHours();
    let greeting = "Selamat Pagi";
    if (hr >= 11 && hr < 15) greeting = "Selamat Siang";
    else if (hr >= 15 && hr < 18) greeting = "Selamat Sore";
    else if (hr >= 18) greeting = "Selamat Malam";
    document.getElementById("greetingText").textContent = greeting;
    document.getElementById("todayDate").textContent = new Date().toLocaleDateString("id-ID", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    });
  }

  function renderHome() {
    syncPlannerSchemaBanner();
    renderProjectList();
    updateGreeting();
    loadFinanceData();
  }

  function drawProgressRing(canvasId, progress) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const size = canvas.width;
    const center = size / 2;
    const radius = center - 8;
    const lineWidth = 6;

    ctx.clearRect(0, 0, size, size);

    ctx.beginPath();
    ctx.arc(center, center, radius, 0, Math.PI * 2);
    ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue("--border").trim() || "#E2E8F0";
    ctx.lineWidth = lineWidth;
    ctx.stroke();

    const angle = (progress / 100) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(center, center, radius, -Math.PI / 2, -Math.PI / 2 + angle);
    ctx.strokeStyle = progress >= 100 ? "#10B981" : "#2563EB";
    ctx.lineWidth = lineWidth;
    ctx.lineCap = "round";
    ctx.stroke();
  }

  function showLoading(show) {
    document.getElementById("loadingOverlay").classList.toggle("hidden", !show);
  }

  function toast(msg, duration = 3000) {
    const el = document.getElementById("toast");
    el.textContent = msg;
    el.classList.remove("hidden");
    clearTimeout(el._timeout);
    el._timeout = setTimeout(() => el.classList.add("hidden"), duration);
  }

  /* ============================================================
     REALTIME SUBSCRIPTIONS
     ============================================================ */
  function setupRealtime() {
    if (!STATE.org) return;

    sb.channel("planner-projects")
      .on("postgres_changes", { event: "*", schema: "public", table: "planner_projects", filter: "org_id=eq." + STATE.org.id }, async () => {
        await loadProjects();
        renderProjectList();
      })
      .subscribe();

    sb.channel("planner-notifications")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "planner_notifications", filter: "user_id=eq." + STATE.user.id }, async () => {
        await loadNotifications();
      })
      .subscribe();
  }

  /* ============================================================
     BOOT
     ============================================================ */
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
