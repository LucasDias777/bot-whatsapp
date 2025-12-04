import React, { useEffect, useState, useRef } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import styles from "./Dashboard.module.css";
import logo from "../../assets/images/logo.png";
import Status from "../Status/Status";
import { getDashboardData } from "../../services/dashboardService";
import { useAtualizar } from "../../context/AtualizarContexto";
import { Chart, ArcElement, DoughnutController, Tooltip, Legend, BarElement, BarController, CategoryScale, LinearScale } from "chart.js";
import { useCountAnimation } from "../../hooks/DispararAnimation";

Chart.register( DoughnutController, ArcElement, BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend );

export default function Dashboard() {
  const { pathname } = useLocation();
  const { atualizarToken } = useAtualizar();

  const doughnutRef = useRef(null);
  const barRef = useRef(null);

  const doughnutInstance = useRef(null);
  const barInstance = useRef(null);

  const [dados, setDados] = useState({
    grafico: { totalNumeros: 0 },
    metricas: {
      chatsAtivos: 0,
      chatsIndividuais: 0,
      chatsGrupos: 0
    }
  });

  const [dadosCarregados, setDadosCarregados] = useState(false);

  /* ============================================
      TRIGGER PARA REANIMAR CONTADORES
  ============================================ */
  const [triggerAnim, setTriggerAnim] = useState(0);

  useEffect(() => {
    if (pathname === "/") {
      setTriggerAnim((prev) => prev + 1);
    }
  }, [pathname]);

  /* ============================================
      CARREGAR DADOS
  ============================================ */
  useEffect(() => {
    let mounted = true;

    async function carregar() {
      try {
        const res = await getDashboardData();
        if (!mounted) return;

        setDados({
          grafico: { totalNumeros: res?.grafico?.totalNumeros || 0 },
          metricas: {
            chatsAtivos: res?.metricas?.chatsAtivos || 0,
            chatsIndividuais: res?.metricas?.chatsIndividuais || 0,
            chatsGrupos: res?.metricas?.chatsGrupos || 0
          }
        });

        if (!dadosCarregados) setDadosCarregados(true);
      } catch (error) {
        console.error("Erro ao carregar dashboard:", error);
      }
    }

    carregar();
    const interval = setInterval(carregar, 3000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  /* ============================================
      ANIMAÇÃO DOS CONTADORES
  ============================================ */
  const chatsAtivosAnim = useCountAnimation(
    dados.metricas.chatsAtivos,
    1200,
    triggerAnim
  );

  /* ============================================
      DESTRUIR GRÁFICOS AO VOLTAR AO DASHBOARD
  ============================================ */
  useEffect(() => {
    if (pathname === "/") {
      if (doughnutInstance.current) {
        doughnutInstance.current.destroy();
        doughnutInstance.current = null;
      }
      if (barInstance.current) {
        barInstance.current.destroy();
        barInstance.current = null;
      }
    }
  }, [pathname]);

  /* ============================================
      CRIAÇÃO / ATUALIZAÇÃO DOS GRÁFICOS
  ============================================ */
  useEffect(() => {
    if (!dadosCarregados) return;

    const totalNumeros = Number(dados.grafico.totalNumeros || 0);

    /* ========== DOUGHNUT ========== */
    if (!doughnutInstance.current) {
      doughnutInstance.current = new Chart(doughnutRef.current, {
        type: "doughnut",
        data: {
          labels: ["Números Cadastrados"],
          datasets: [
            {
              data: [0], // começa vazio
              backgroundColor: ["#3b82f6"],
              hoverOffset: 8,
              borderWidth: 0
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: "68%",
          animation: {
            duration: 1200,
            animateRotate: true,
            easing: "easeOutCubic"
          },
          plugins: {
            legend: {
              position: "bottom",
              labels: { usePointStyle: true, padding: 12 }
            }
          }
        }
      });
    }

    doughnutInstance.current.data.datasets[0].data = [totalNumeros];
    doughnutInstance.current.update();

    /* ========== BARRA ========== */
    if (!barInstance.current) {
      barInstance.current = new Chart(barRef.current, {
        type: "bar",
        data: {
          labels: ["Chats Individuais", "Chats em Grupo"],
          datasets: [
            {
              label: "Quantidade",
              data: [0, 0], // começa vazio
              backgroundColor: ["#3b82f6", "#10b981"],
              borderWidth: 1
            }
          ]
        },
        options: {
          indexAxis: "y",
          responsive: true,
          animation: { duration: 1200, easing: "easeOutQuart" },
          plugins: {
            legend: { display: false }
          },
          scales: {
            x: { beginAtZero: true }
          }
        }
      });
    }

    barInstance.current.data.datasets[0].data = [
      dados.metricas.chatsIndividuais,
      dados.metricas.chatsGrupos
    ];
    barInstance.current.update();
  }, [dadosCarregados, dados]);

  /* ============================================
      TÍTULOS
  ============================================ */
  const pageTitles = {
    "/": "Dashboard",
    "/contatos": "Cadastrar Contatos",
    "/grupos": "Cadastrar Grupos",
    "/mensagens": "Cadastrar Mensagens",
    "/agendamentos": "Cadastrar Agendamentos",
    "/enviar-agora": "Enviar Mensagem Agora"
  };

  const title = pageTitles[pathname] || "BOT WhatsApp";
  const totalNumeros = Number(dados.grafico.totalNumeros || 0);

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
            🏠 Dashboard
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
        <header className={styles.header}>
          <h3 className={styles.pageTitle}>{title}</h3>

          <div className={styles.headerActions}>
            <input type="text" placeholder="Pesquisar..." className={styles.searchInput} />
            <div className={styles.userBadge}>GD</div>
          </div>
        </header>

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
                  <h2 className={styles.cardValue}>{chatsAtivosAnim}</h2>
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
                <div className={styles.chartCard}>
                  <div className={styles.chartTitle}>Números Cadastrados</div>

                  <div className={styles.chartArea}>
                    {!dadosCarregados ? (
                      <p style={{ textAlign: "center", opacity: 0.6 }}>Carregando gráfico...</p>
                    ) : (
                      <canvas ref={doughnutRef}></canvas>
                    )}
                  </div>

                  <div className={styles.chartLegend}>
                    <div className={styles.legendItem}>
                      <span className={styles.legendSwatch} style={{ background: "#3b82f6" }}></span>
                      <span>Números: {totalNumeros.toLocaleString("pt-BR")}</span>
                    </div>
                  </div>
                </div>

                <div className={styles.chartCard}>
                  <div className={styles.chartTitle}>Chats Individuais x Grupos</div>

                  <div className={styles.chartArea}>
                    <canvas ref={barRef}></canvas>
                  </div>

                  <div className={styles.chartLegend}>
                    <div className={styles.legendItem}>
                      <span className={styles.legendSwatch} style={{ background: "#3b82f6" }}></span>
                      <span>Individuais: {dados.metricas.chatsIndividuais.toLocaleString("pt-BR")}</span>
                    </div>

                    <div className={styles.legendItem}>
                      <span className={styles.legendSwatch} style={{ background: "#10b981" }}></span>
                      <span>Grupos: {dados.metricas.chatsGrupos.toLocaleString("pt-BR")}</span>
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