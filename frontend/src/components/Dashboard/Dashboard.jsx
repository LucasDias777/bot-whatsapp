// src/components/Dashboard/Dashboard.jsx
import React from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import styles from "./Dashboard.module.css";
import logo from "../../assets/images/logo.png";

export default function Dashboard() {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const isHome = pathname === "/";
  const showBackButton = !isHome;

  return (
    <div className={styles.dashboardAppWrap}>

      {/* HEADER */}
      <header className={styles.dashboardHeader}>
        <div className={styles.dashboardHeaderInner}>
          <div className={styles.dashboardBrand}>
            <div className={styles.dashboardBrandLogo}>
              <img src={logo} alt="Logo" className={styles.dashboardBrandImg} />
            </div>
            <div className={styles.dashboardBrandText}>
              <div className={styles.dashboardBrandSmall}>Painel</div>
              <div className={styles.dashboardBrandTitle}>Painel do BOT WhatsApp</div>
            </div>
          </div>

          <div className={styles.dashboardHeaderRight}>
            <div className={styles.dashboardSearchWrap}>
              <input className={styles.dashboardSearchInput} placeholder="Search..." />
            </div>

            <div className={styles.dashboardHeaderIcons}>
              <button className={styles.dashboardIconBtn}>🔍</button>
              <button className={styles.dashboardIconBtn}>🔔</button>
              <div className={styles.dashboardAvatar}>LD</div>
            </div>
          </div>
        </div>
      </header>

      {/* LAYOUT */}
      <div className={styles.dashboardMainGrid}>

        {/* SIDEBAR */}
        <aside className={styles.dashboardSidebar}>
          <div className={styles.dashboardLogoBox}>
            <img src={logo} alt="Logo" className={styles.dashboardLogo} />
          </div>

          <nav className={styles.dashboardMenu}>
            <Link
              className={`${styles.dashboardMenuItem} ${pathname === "/" ? styles.dashboardActive : ""}`}
              to="/"
            >
              <span className={styles.dashboardMenuIcon}>🏠</span>
              <span className={styles.dashboardMenuLabel}>Dashboard</span>
            </Link>

            <Link
              className={`${styles.dashboardMenuItem} ${pathname === "/contatos" ? styles.dashboardActive : ""}`}
              to="/contatos"
            >
              <span className={styles.dashboardMenuIcon}>👥</span>
              <span className={styles.dashboardMenuLabel}>Contatos</span>
            </Link>

            <Link
              className={`${styles.dashboardMenuItem} ${pathname === "/grupos" ? styles.dashboardActive : ""}`}
              to="/grupos"
            >
              <span className={styles.dashboardMenuIcon}>💬</span>
              <span className={styles.dashboardMenuLabel}>Grupos</span>
            </Link>

            <Link
              className={`${styles.dashboardMenuItem} ${pathname === "/mensagens" ? styles.dashboardActive : ""}`}
              to="/mensagens"
            >
              <span className={styles.dashboardMenuIcon}>✉️</span>
              <span className={styles.dashboardMenuLabel}>Mensagens</span>
            </Link>

            <Link
              className={`${styles.dashboardMenuItem} ${pathname === "/agendamentos" ? styles.dashboardActive : ""}`}
              to="/agendamentos"
            >
              <span className={styles.dashboardMenuIcon}>⏰</span>
              <span className={styles.dashboardMenuLabel}>Agendamentos</span>
            </Link>

            <Link
              className={`${styles.dashboardMenuItem} ${pathname === "/enviar-agora" ? styles.dashboardActive : ""}`}
              to="/enviar-agora"
            >
              <span className={styles.dashboardMenuIcon}>🚀</span>
              <span className={styles.dashboardMenuLabel}>Enviar Agora</span>
            </Link>
          </nav>

          <div className={styles.dashboardSidebarFooter}>
            <small>v1.0 • BOT-WHATSAPP</small>
          </div>
        </aside>

        {/* CONTEÚDO */}
        <main className={styles.dashboardContent}>
          <div className={styles.dashboardContainerInner}>

            {/* OUTLET */}
            <Outlet />

            {/* HOME METRICS */}
            {isHome && (
              <section className={styles.dashboardMetricsRow}>
                <div className={styles.dashboardMetricCard}>
                  <div className={styles.dashboardMetricTitle}>Traffic</div>
                  <div className={styles.dashboardMetricValue}>350.897</div>
                  <div className={styles.dashboardMetricDelta}>
                    +3.48%
                    <span className={styles.dashboardMuted}>Since last month</span>
                  </div>
                </div>
              </section>
            )}

            {/* VOLTAR */}
            {showBackButton && (
              <div className={styles.dashboardBackWrap}>
                <button
                  className={styles.dashboardBackButton}
                  onClick={() => navigate("/")}
                >
                  ← Voltar
                </button>
              </div>
            )}

          </div>
        </main>
      </div>
    </div>
  );
}
