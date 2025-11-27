import React, { useEffect, useState, useRef } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import styles from "./Dashboard.module.css";
import logo from "../../assets/images/logo.png";
import Status from "../Status/Status";

import { getDashboardData } from "../../services/dashboardService";

import { Doughnut, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
} from "chart.js";

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement
);

export default function Dashboard() {
  const { pathname } = useLocation();
  const mountedRef = useRef(true);

  // ===============================
  // STATE DO DASHBOARD
  // ===============================
  const [dados, setDados] = useState({
    usuariosAtivos: 0,
    mensagensHoje: 0,
    grafico: {
      totalNumeros: 0,
    },
    // opcional: performance pode vir do backend mais tarde
    performance: 0,
  });

  

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

  /* ✅ CONFIGURAÇÃO DO GRÁFICO - DOUGHNUT (NÚMEROS CADASTRADOS) */
  const totalNumeros = Number(dados.grafico?.totalNumeros || 0);
  // Para visual agradável, contra-valor (restante) mínimo 1 para manter o donut visível
  const restante = Math.max(1, Math.round(totalNumeros * 0.02));
  const doughnutData = {
    labels: ["Números Cadastrados", " "],
    datasets: [
      {
        data: [totalNumeros, restante],
        backgroundColor: ["#3b82f6", "rgba(59,130,246,0.12)"],
        hoverOffset: 8,
        borderWidth: 0,
      },
    ],
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "68%",
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          usePointStyle: true,
          padding: 12,
        },
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const label = context.label || "";
            const value = context.raw || 0;
            if (label.trim() === "") return `${value}`;
            return `${label}: ${value.toLocaleString("pt-BR")}`;
          },
        },
      },
    },
  };

  /* ✅ CONFIGURAÇÃO DO GRÁFICO 2 - BAR (Usuários Ativos vs Mensagens Hoje) */
  const barData = {
    labels: ["Usuários Ativos", "Mensagens Hoje"],
    datasets: [
      {
        label: "Quantidade",
        data: [Number(dados.usuariosAtivos || 0), Number(dados.mensagensHoje || 0)],
        // usa tons do tema
        backgroundColor: ["#60a5fa", "#3b82f6"],
        borderRadius: 8,
        barThickness: 28,
      },
    ],
  };

  const barOptions = {
    indexAxis: "y",
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            return ctx.raw.toLocaleString("pt-BR");
          },
        },
      },
    },
    scales: {
      x: {
        ticks: {
          callback: (value) => {
            // formata números grandes
            if (value >= 1000) return (value / 1000) + "k";
            return value;
          },
        },
        grid: { display: false },
      },
      y: {
        grid: { display: false },
      },
    },
  };

  return (
    <div className={styles.dashboard}>
      {/* SIDEBAR */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarLogoBox}>
          <img src={logo} alt="Logo" className={styles.logo} />
          <span className={styles.logoText}>BOT WhatsApp</span>
        </div>

        <nav className={styles.menu}>
          <Link
            to="/"
            className={`${styles.menuItem} ${pathname === "/" && styles.active}`}
          >
            <span>🏠</span> Dashboard
          </Link>

          <Link
            to="/contatos"
            className={`${styles.menuItem} ${pathname === "/contatos" && styles.active}`}
          >
            👥 Contatos
          </Link>

          <Link
            to="/grupos"
            className={`${styles.menuItem} ${pathname === "/grupos" && styles.active}`}
          >
            💬 Grupos
          </Link>

          <Link
            to="/mensagens"
            className={`${styles.menuItem} ${pathname === "/mensagens" && styles.active}`}
          >
            ✉️ Mensagens
          </Link>

          <Link
            to="/agendamentos"
            className={`${styles.menuItem} ${pathname === "/agendamentos" && styles.active}`}
          >
            ⏰ Agendamentos
          </Link>

          <Link
            to="/enviar-agora"
            className={`${styles.menuItem} ${pathname === "/enviar-agora" && styles.active}`}
          >
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
            <div className={styles.userBadge}>GD</div>
          </div>
        </header>

        {/* CONTENT */}
        <div className={styles.content}>
          <Outlet />

          {/* HOME */}
          {pathname === "/" && (
            <>
              {/* CARDS */}
              <div className={styles.cardsWrapper}>
                <div className={styles.statusFull}>
                  <Status />
                </div>

                <div className={styles.card}>
                  <span className={styles.cardTitle}>Usuários Ativos</span>
                  <h2 className={styles.cardValue}>{dados.usuariosAtivos}</h2>
                </div>
                <div className={styles.card}>
                  <span className={styles.cardTitle}>Mensagens Hoje</span>
                  <h2 className={styles.cardValue}>
                    {Number(dados.mensagensHoje || 0).toLocaleString("pt-BR")}
                  </h2>
                </div>
                <div className={`${styles.card} ${styles.highlight}`}>
                  <span className={styles.cardTitle}>Performance</span>
                  <h2 className={styles.cardValue}>
                    {dados.performance ? `${dados.performance}%` : "49.65%"}
                  </h2>
                </div>
              </div>

              {/* ESPAÇO ENTRE CARDS E GRÁFICOS */}
              <div className={styles.chartsRow}>
                <div className={styles.chartCard}>
                  <div className={styles.chartTitle}>Números Cadastrados</div>
                  <div className={styles.chartArea}>
                    <Doughnut data={doughnutData} options={doughnutOptions} />
                  </div>
                  <div className={styles.chartLegend}>
                    <div className={styles.legendItem}>
                      <span className={styles.legendSwatch} style={{ background: "#3b82f6" }} />
                      <span>Números: {totalNumeros.toLocaleString("pt-BR")}</span>
                    </div>
                  </div>
                </div>

                <div className={styles.chartCard}>
                  <div className={styles.chartTitle}>Atividade</div>
                  <div className={styles.chartArea}>
                    <Bar data={barData} options={barOptions} />
                  </div>
                  <div className={styles.chartLegend}>
                    <small className={styles.legendNote}>Última atualização automática</small>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
