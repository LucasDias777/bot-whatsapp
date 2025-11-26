import React from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import styles from "./Dashboard.module.css";
import logo from "../../assets/images/logo.png";

// IMPORTAÇÃO NECESSÁRIA PARA A SOLUÇÃO 1
import Status from "../Status/Status";

export default function Dashboard() {
  const { pathname } = useLocation();

  // Map das rotas para títulos do header
  const pageTitles = {
    "/": "Dashboard",
    "/contatos": "Cadastrar Contatos",
    "/grupos": "Cadastrar Grupos",
    "/mensagens": "Cadastrar Mensagens",
    "/agendamentos": "Cadastrar Agendamentos",
    "/enviar-agora": "Enviar Mensagem Agora",
  };

  const title = pageTitles[pathname] || "BOT WhatsApp";

  return (
    <div className={styles.dashboard}>
      
      {/* SIDEBAR */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarLogoBox}>
          <img src={logo} alt="Logo" className={styles.logo} />
          <span className={styles.logoText}>BOT WhatsApp</span>
        </div>

        <nav className={styles.menu}>
          <Link to="/" className={`${styles.menuItem} ${pathname === "/" && styles.active}`}>
            <span>🏠</span> Dashboard
          </Link>

          <Link to="/contatos" className={`${styles.menuItem} ${pathname === "/contatos" && styles.active}`}>
            👥 Contatos
          </Link>

          <Link to="/grupos" className={`${styles.menuItem} ${pathname === "/grupos" && styles.active}`}>
            💬 Grupos
          </Link>

          <Link to="/mensagens" className={`${styles.menuItem} ${pathname === "/mensagens" && styles.active}`}>
            ✉️ Mensagens
          </Link>

          <Link to="/agendamentos" className={`${styles.menuItem} ${pathname === "/agendamentos" && styles.active}`}>
            ⏰ Agendamentos
          </Link>

          <Link to="/enviar-agora" className={`${styles.menuItem} ${pathname === "/enviar-agora" && styles.active}`}>
            🚀 Enviar Agora
          </Link>
        </nav>

        <footer className={styles.sidebarFooter}>v1.0 • BOT-WHATSAPP</footer>
      </aside>

      {/* MAIN */}
      <main className={styles.main}>
        
        {/* HEADER */}
        <header className={styles.header}>
          <h3 className={styles.pageTitle}>{title}</h3>

          <div className={styles.headerActions}>
            <input
              type="text"
              placeholder="Pesquisar..."
              className={styles.searchInput}
            />
            <div className={styles.userBadge}>LD</div>
          </div>
        </header>

        {/* CONTENT */}
        <div className={styles.content}>
          <Outlet />

          {/* HOME CARDS */}
          {pathname === "/" && (
            <div className={styles.cardsWrapper}>

              <div className={styles.statusFull}>
              <Status />
              </div>

              <div className={styles.card}>
                <span className={styles.cardTitle}>Usuários Ativos</span>
                <h2 className={styles.cardValue}>350.897</h2>
              </div>

              <div className={styles.card}>
                <span className={styles.cardTitle}>Mensagens Hoje</span>
                <h2 className={styles.cardValue}>12.470</h2>
              </div>

              <div className={`${styles.card} ${styles.highlight}`}>
                <span className={styles.cardTitle}>Performance</span>
                <h2 className={styles.cardValue}>49.65%</h2>
              </div>

            </div>
          )}
        </div>
      </main>
    </div>
  );
}
