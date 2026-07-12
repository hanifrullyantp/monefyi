"use client";

import { useEffect } from "react";

export default function Home() {
  useEffect(() => {
    // Dynamically import the app module after component mounts
    import("../lib/app").then((mod) => {
      mod.initApp();
    });
  }, []);

  return (
    <div id="app">
      {/* Sidebar */}
      <aside className="sidebar" id="sidebar">
        <div className="sidebar-logo">
          <div className="logo-brand">
            Monefyi<span className="logo-dot"></span>com
          </div>
          <div className="logo-tagline">Plan. Track. Profit.</div>
        </div>
        <nav className="sidebar-nav" id="sidebar-nav">
          {/* Rendered by JS */}
        </nav>
        <div className="sidebar-user">
          <div className="user-avatar">BK</div>
          <div className="user-info">
            <div className="user-name">CV Berkah Konstruksi</div>
            <div className="user-role">Administrator</div>
          </div>
        </div>
      </aside>

      {/* Sidebar Overlay (mobile) */}
      <div className="sidebar-overlay" id="sidebar-overlay"></div>

      {/* Main Wrapper */}
      <div className="main-wrapper">
        {/* Topbar */}
        <header className="topbar" id="topbar">
          <div className="topbar-left">
            <button className="topbar-menu-btn icon-btn" id="menu-btn" aria-label="Toggle menu">
              <i data-lucide="menu"></i>
            </button>
            <div className="topbar-breadcrumb" id="topbar-breadcrumb">
              <span className="breadcrumb-current">Dashboard</span>
            </div>
          </div>
          
          <div className="topbar-center">
            <div className="topbar-search" id="desktop-search-trigger">
              <i data-lucide="search"></i>
              <input type="text" placeholder="Cari cepat... (Ctrl+K)" id="global-search" aria-label="Global search" />
              <span className="search-kbd">⌘K</span>
            </div>
          </div>

          <div className="topbar-actions">
            <button className="icon-btn hide-mobile" title="Refresh Data" onClick={() => (window as any).APP?.syncWithServer()}>
              <i data-lucide="rotate-cw"></i>
            </button>
            <button className="icon-btn" aria-label="Notifications" id="notif-btn">
              <i data-lucide="bell"></i>
              <span className="notif-dot"></span>
            </button>
            <div className="user-profile-trigger">
               <button className="avatar-btn" aria-label="Profile">BK</button>
               <div className="user-name-desktop hide-mobile">CV Berkah</div>
            </div>
          </div>
        </header>

        <div className="content-layout-container">
          {/* Page Content */}
          <main className="page-content" id="page-content" role="main">
            <div id="page-view">
              {/* Page views rendered here by JS */}
            </div>
          </main>

          {/* Right Panel (Desktop Wide Only) */}
          <aside className="right-panel hide-tablet" id="right-panel">
            <div className="right-panel-section">
              <div className="section-header">
                <div className="section-title"><i data-lucide="zap"></i> Aksi Cepat</div>
              </div>
              <div className="quick-actions-grid">
                <button className="quick-action-card" onClick={() => (window as any).APP?.openModal('tambah-project')}>
                  <div className="quick-action-icon" style={{background: 'var(--primary-light)'}}><i data-lucide="plus" style={{color: 'var(--primary)'}}></i></div>
                  <span>Proyek</span>
                </button>
                <button className="quick-action-card" onClick={() => (window as any).APP?.openModal('tambah-transaksi')}>
                  <div className="quick-action-icon" style={{background: 'var(--success-light)'}}><i data-lucide="arrow-left-right" style={{color: 'var(--success)'}}></i></div>
                  <span>Kas</span>
                </button>
                <button className="quick-action-card" onClick={() => (window as any).APP?.openModal('generate-rap')}>
                  <div className="quick-action-icon" style={{background: 'var(--purple-light)'}}><i data-lucide="sparkles" style={{color: 'var(--purple)'}}></i></div>
                  <span>RAP</span>
                </button>
                <button className="quick-action-card" onClick={() => (window as any).APP?.openModal('lapor-progress')}>
                  <div className="quick-action-icon" style={{background: 'var(--info-light)'}}><i data-lucide="activity" style={{color: 'var(--info)'}}></i></div>
                  <span>Progress</span>
                </button>
              </div>
            </div>

            <div className="right-panel-section">
              <div className="section-header">
                <div className="section-title"><i data-lucide="bell"></i> Notifikasi</div>
              </div>
              <div id="right-panel-notif-list">
                <div className="alert-card warning">
                  <i data-lucide="alert-triangle"></i>
                  <div className="alert-card-content">
                    <div className="alert-card-title" style={{fontSize: '12px'}}>Besi 4x8 Over Budget</div>
                    <div className="alert-card-desc" style={{fontSize: '11px'}}>Project Aloevera melewati RAP.</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="right-panel-section">
              <div className="section-header">
                <div className="section-title"><i data-lucide="history"></i> Aktivitas Terakhir</div>
              </div>
              <div id="right-panel-activity-list" className="timeline-mini">
                <div className="tx-item" style={{padding: '8px 0'}}>
                  <div className="tx-icon out" style={{width: '28px', height: '28px', background: 'var(--danger-light)', color: 'var(--danger)'}}><i data-lucide="package" style={{width: '14px'}}></i></div>
                  <div className="tx-info">
                    <div className="tx-name" style={{fontSize: '12px'}}>Beli Semen</div>
                    <div className="tx-date" style={{fontSize: '10px'}}>10 menit lalu</div>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* Bottom Nav (Mobile) */}
      <nav className="bottom-nav" id="bottom-nav" aria-label="Bottom navigation">
        <div className="bottom-nav-inner" id="bottom-nav-inner">
          {/* Rendered by JS */}
        </div>
      </nav>

      {/* Toast Container */}
      <div className="toast-container" id="toast-container" aria-live="polite"></div>

      {/* Modal Container */}
      <div id="modal-container"></div>

      {/* Dropdown overlay */}
      <div id="dropdown-overlay" style={{position:'fixed',inset:0,zIndex:290,display:'none'}}></div>
    </div>
  );
}
