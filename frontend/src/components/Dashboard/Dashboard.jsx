import React, { useEffect, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import styles from "./Dashboard.module.css";
import logo from "../../assets/images/logo.png";
import Status from "../Status/Status";
import { getDashboardData } from "../../services/dashboardService";
import { useAtualizar } from "../../context/AtualizarContexto";

import { Doughnut, Bar } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend, BarElement, CategoryScale, LinearScale } from "chart.js";

// Registrar gráficos
ChartJS.register( ArcElement, Tooltip, Legend, BarElement, CategoryScale, LinearScale );

export default function Dashboard() {
  const { pathname } = useLocation();
  const { atualizarToken } = useAtualizar();  

  /* ======================================================
        STATE (AJUSTADO PARA NOVAS MÉTRICAS)
     ====================================================== */
  const [dados, setDados] = useState({
    grafico: { totalNumeros: 0 },
    metricas: {
      chatsAtivos: 0,
      chatsIndividuais: 0,
      chatsGrupos: 0
    }
  });

  /* ======================================================
      BUSCAR DADOS DO BACKEND (COM POLLING)
   ====================================================== */
useEffect(() => {
  let mounted = true;

  async function carregar() {
    try {
      const res = await getDashboardData();
      console.log("RES DASHBOARD:", res);

      if (!mounted) return;

      setDados({
        grafico: {
          totalNumeros: res?.grafico?.totalNumeros || 0
        },
        metricas: {
          chatsAtivos: res?.metricas?.chatsAtivos || 0,
          chatsIndividuais: res?.metricas?.chatsIndividuais || 0,
          chatsGrupos: res?.metricas?.chatsGrupos || 0
        }
      });
    } catch (error) {
      console.error("Erro ao carregar dashboard:", error);
    }
  }

  // ✅ carrega imediatamente ao abrir
  carregar();

  // ✅ continua atualizando a cada 3 segundos
  const interval = setInterval(carregar, 3000);

  return () => {
    mounted = false;
    clearInterval(interval);
  };
  }, []);

  const pageTitles = {
    "/": "Dashboard",
    "/contatos": "Cadastrar Contatos",
    "/grupos": "Cadastrar Grupos",
    "/mensagens": "Cadastrar Mensagens",
    "/agendamentos": "Cadastrar Agendamentos",
    "/enviar-agora": "Enviar Mensagem Agora"
  };

  const title = pageTitles[pathname] || "BOT WhatsApp";

  /* ======================================================
      GRÁFICO DOUGHNUT
   ====================================================== */
  const totalNumeros = Number(dados.grafico?.totalNumeros || 0);

  const doughnutData =
    totalNumeros > 0
      ? {
          labels: ["Números Cadastrados"],
          datasets: [
            {
              data: [totalNumeros],
              backgroundColor: ["#3b82f6"],
              hoverOffset: 8,
              borderWidth: 0
            }
          ]
        }
      : {
          labels: ["Nenhum"],
          datasets: [
            {
              data: [1],
              backgroundColor: ["rgba(0,0,0,0.06)"],
              hoverOffset: 0,
              borderWidth: 0
            }
          ]
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
          padding: 12
        }
      }
    }
  };

  /* ======================================================
        GRÁFICO HORIZONTAL — NOVAS MÉTRICAS
     ====================================================== */
  const barData = {
    labels: ["Chats Individuais", "Chats em Grupo"],
    datasets: [
      {
        label: "Quantidade",
        data: [
          dados.metricas.chatsIndividuais,
          dados.metricas.chatsGrupos
        ],
        backgroundColor: ["#3b82f6", "#10b981"],
        borderWidth: 1
      }
    ]
  };

  const barOptions = {
    responsive: true,
    indexAxis: "y",
    plugins: {
      legend: { display: false }
    },
    scales: {
      x: {
        beginAtZero: true
      }
    }
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
            className={`${styles.menuItem} ${
              pathname === "/" && styles.active
            }`}
          >
            <span>🏠</span> Dashboard
          </Link>

          <Link
            to="/contatos"
            className={`${styles.menuItem} ${
              pathname === "/contatos" && styles.active
            }`}
          >
            👥 Contatos
          </Link>

          <Link
            to="/grupos"
            className={`${styles.menuItem} ${
              pathname === "/grupos" && styles.active
            }`}
          >
            💬 Grupos
          </Link>

          <Link
            to="/mensagens"
            className={`${styles.menuItem} ${
              pathname === "/mensagens" && styles.active
            }`}
          >
            ✉️ Mensagens
          </Link>

          <Link
            to="/agendamentos"
            className={`${styles.menuItem} ${
              pathname === "/agendamentos" && styles.active
            }`}
          >
            ⏰ Agendamentos
          </Link>

          <Link
            to="/enviar-agora"
            className={`${styles.menuItem} ${
              pathname === "/enviar-agora" && styles.active
            }`}
          >
            🚀 Enviar Agora
          </Link>
        </nav>

        <footer className={styles.sidebarFooter}>
          v1.0 • BOT-WHATSAPP
        </footer>
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

          {pathname === "/" && (
            <>
              {/* CARDS */}
              <div className={styles.cardsWrapper}>
                <div className={styles.statusFull}>
                  <Status />
                </div>

                <div className={styles.card}>
                  <span className={styles.cardTitle}>Chats Ativos</span>
                  <h2 className={styles.cardValue}>
                    {dados.metricas.chatsAtivos}
                  </h2>
                </div>

                <div className={styles.card}>
                  <span className={styles.cardTitle}>Mensagens Hoje</span>
                  <h2 className={styles.cardValue}>0</h2>
                </div>

                <div className={`${styles.card} ${styles.highlight}`}>
                  <span className={styles.cardTitle}>Performance</span>
                  <h2 className={styles.cardValue}>49.65%</h2>
                </div>
              </div>

              {/* GRÁFICOS */}
              <div className={styles.chartsRow}>
                {/* GRÁFICO DOUGHNUT — NÃO REMOVIDO */}
                <div className={styles.chartCard}>
                  <div className={styles.chartTitle}>Números Cadastrados</div>

                  <div className={styles.chartArea}>
                    {totalNumeros > 0 ? (
                      <Doughnut data={doughnutData} options={doughnutOptions} />
                    ) : (
                      <p style={{ textAlign: "center", opacity: 0.6 }}>
                        Nenhum número cadastrado.
                      </p>
                    )}
                  </div>

                  <div className={styles.chartLegend}>
                    <div className={styles.legendItem}>
                      <span
                        className={styles.legendSwatch}
                        style={{ background: "#3b82f6" }}
                      />
                      <span>
                        Números: {totalNumeros.toLocaleString("pt-BR")}
                      </span>
                    </div>
                  </div>
                </div>

                {/* GRÁFICO HORIZONTAL */}
                <div className={styles.chartCard}>
                  <div className={styles.chartTitle}>
                    Chats Individuais x Grupos
                  </div>

                  <div className={styles.chartArea}>
                    <Bar data={barData} options={barOptions} />
                  </div>

                  {/* ✅ CONTADORES EMBAIXO */}
                  <div className={styles.chartLegend}>
                    <div className={styles.legendItem}>
                      <span
                        className={styles.legendSwatch}
                        style={{ background: "#3b82f6" }}
                      />
                      <span>
                        Individuais:{" "}
                        {dados.metricas.chatsIndividuais.toLocaleString(
                          "pt-BR"
                        )}
                      </span>
                    </div>

                    <div className={styles.legendItem}>
                      <span
                        className={styles.legendSwatch}
                        style={{ background: "#10b981" }}
                      />
                      <span>
                        Grupos:{" "}
                        {dados.metricas.chatsGrupos.toLocaleString("pt-BR")}
                      </span>
                    </div>
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