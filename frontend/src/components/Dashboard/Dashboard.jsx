import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import {
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  Filler,
  Legend,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from "chart.js";
import {
  FiActivity,
  FiCalendar,
  FiClock,
  FiCpu,
  FiGrid,
  FiHome,
  FiMessageSquare,
  FiSearch,
  FiSend,
  FiSmartphone,
  FiTrendingUp,
  FiUsers,
  FiWifi,
} from "react-icons/fi";
import { useAtualizar } from "../../context/AtualizarContexto";
import { getDashboardData } from "../../services/dashboardService";
import Status from "../Status/Status";
import styles from "./Dashboard.module.css";

Chart.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  LineController,
  BarController,
  BarElement,
  Filler,
  Tooltip,
  Legend,
);

const navItems = [
  { to: "/", label: "Dashboard", icon: FiHome },
  { to: "/sessoes", label: "Sessões", icon: FiWifi },
  { to: "/contatos", label: "Contatos", icon: FiUsers },
  { to: "/grupos", label: "Grupos", icon: FiGrid },
  { to: "/mensagens", label: "Mensagens", icon: FiMessageSquare },
  { to: "/agendamentos", label: "Agendamentos", icon: FiCalendar },
  { to: "/enviar-agora", label: "Enviar agora", icon: FiSend },
];

const pageTitles = {
  "/": "Dashboard",
  "/sessoes": "Sessões",
  "/contatos": "Contatos",
  "/grupos": "Grupos",
  "/mensagens": "Mensagens",
  "/agendamentos": "Agendamentos",
  "/enviar-agora": "Enviar agora",
};

function formatDuration(ms) {
  if (!ms || ms < 1000) return "00:00:00";
  const seconds = Math.floor(ms / 1000);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = seconds % 60;

  return [hours, minutes, rest].map((item) => String(item).padStart(2, "0")).join(":");
}

function formatTick(label) {
  const date = new Date(label);
  if (Number.isNaN(date.getTime())) return label;
  return date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function DashboardLegacy() {
  const { pathname } = useLocation();
  const { atualizarToken } = useAtualizar();
  const lineCanvasRef = useRef(null);
  const barCanvasRef = useRef(null);
  const lineChartRef = useRef(null);
  const barChartRef = useRef(null);

  const [search, setSearch] = useState("");
  const [dados, setDados] = useState({
    grafico: { totalNumeros: 0 },
    metricas: {
      chatsAtivos: 0,
      chatsIndividuais: 0,
      chatsGrupos: 0,
      mensagensHoje: 0,
      cpuUso: 0,
      tempoConexao: 0,
      tempoUltimoQR: 0,
      reconexoes: 0,
    },
  });
  const [history, setHistory] = useState([]);

  useEffect(() => {
    let active = true;

    async function carregarDados() {
      try {
        const response = await getDashboardData();
        if (!active) return;

        const nextData = {
          grafico: {
            totalNumeros: Number(response?.grafico?.totalNumeros || 0),
          },
          metricas: {
            chatsAtivos: Number(response?.metricas?.chatsAtivos || 0),
            chatsIndividuais: Number(response?.metricas?.chatsIndividuais || 0),
            chatsGrupos: Number(response?.metricas?.chatsGrupos || 0),
            mensagensHoje: Number(response?.metricas?.mensagensHoje || 0),
            cpuUso: Number(response?.metricas?.cpuUso || 0),
            tempoConexao: Number(response?.metricas?.tempoConexao || 0),
            tempoUltimoQR: Number(response?.metricas?.tempoUltimoQR || 0),
            reconexoes: Number(response?.metricas?.reconexoes || 0),
          },
        };

        setDados(nextData);
        setHistory((prev) => {
          const snapshot = {
            at: new Date().toISOString(),
            mensagensHoje: nextData.metricas.mensagensHoje,
            chatsAtivos: nextData.metricas.chatsAtivos,
            cpuUso: nextData.metricas.cpuUso,
          };

          return [...prev, snapshot].slice(-7);
        });
      } catch (error) {
        console.error(error);
      }
    }

    carregarDados();
    const intervalId = setInterval(carregarDados, 4000);

    return () => {
      active = false;
      clearInterval(intervalId);
    };
  }, [atualizarToken]);

  useEffect(() => {
    return () => {
      lineChartRef.current?.destroy();
      barChartRef.current?.destroy();
    };
  }, []);

  const heroCards = useMemo(() => {
    return [
      {
        key: "contatos",
        label: "Base ativa",
        value: dados.grafico.totalNumeros.toLocaleString("pt-BR"),
        detail: "Contatos prontos para disparo",
        icon: FiUsers,
        tone: "cyan",
      },
      {
        key: "mensagens",
        label: "Mensagens hoje",
        value: dados.metricas.mensagensHoje.toLocaleString("pt-BR"),
        detail: "Envios executados no dia",
        icon: FiSend,
        tone: "orange",
      },
      {
        key: "chats",
        label: "Chats ativos",
        value: dados.metricas.chatsAtivos.toLocaleString("pt-BR"),
        detail: "Conversas abertas no momento",
        icon: FiActivity,
        tone: "pink",
      },
      {
        key: "cpu",
        label: "Performance",
        value: `${dados.metricas.cpuUso}%`,
        detail: "Uso atual de CPU do backend",
        icon: FiCpu,
        tone: "teal",
      },
    ];
  }, [dados]);

  const chartPoints = history.length > 0 ? history : [
    {
      at: new Date().toISOString(),
      mensagensHoje: dados.metricas.mensagensHoje,
      chatsAtivos: dados.metricas.chatsAtivos,
      cpuUso: dados.metricas.cpuUso,
    },
  ];

  useEffect(() => {
    if (!lineCanvasRef.current) return;

    const labels = chartPoints.map((item) => formatTick(item.at));
    const lineData = chartPoints.map((item) => item.mensagensHoje);
    const secondaryData = chartPoints.map((item) => item.chatsAtivos);

    if (!lineChartRef.current) {
      lineChartRef.current = new Chart(lineCanvasRef.current, {
        type: "line",
        data: {
          labels,
          datasets: [
            {
              label: "Mensagens",
              data: lineData,
              borderColor: "#5e72e4",
              backgroundColor: "rgba(94, 114, 228, 0.18)",
              borderWidth: 3,
              tension: 0.42,
              fill: true,
              pointRadius: 0,
              pointHoverRadius: 4,
            },
            {
              label: "Chats",
              data: secondaryData,
              borderColor: "#11cdef",
              backgroundColor: "transparent",
              borderWidth: 2,
              tension: 0.35,
              fill: false,
              pointRadius: 0,
              pointHoverRadius: 4,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: {
            intersect: false,
            mode: "index",
          },
          plugins: {
            legend: {
              display: true,
              labels: {
                color: "rgba(255,255,255,0.76)",
                usePointStyle: true,
                boxWidth: 8,
              },
            },
            tooltip: {
              backgroundColor: "#111f43",
              borderColor: "rgba(255,255,255,0.12)",
              borderWidth: 1,
              titleColor: "#ffffff",
              bodyColor: "rgba(255,255,255,0.8)",
            },
          },
          scales: {
            x: {
              grid: {
                display: false,
              },
              ticks: {
                color: "rgba(255,255,255,0.5)",
              },
            },
            y: {
              beginAtZero: true,
              grid: {
                color: "rgba(255,255,255,0.06)",
              },
              ticks: {
                color: "rgba(255,255,255,0.45)",
              },
            },
          },
        },
      });
    } else {
      lineChartRef.current.data.labels = labels;
      lineChartRef.current.data.datasets[0].data = lineData;
      lineChartRef.current.data.datasets[1].data = secondaryData;
      lineChartRef.current.update();
    }
  }, [chartPoints]);

  useEffect(() => {
    if (!barCanvasRef.current) return;

    const barData = [dados.metricas.chatsIndividuais, dados.metricas.chatsGrupos];

    if (!barChartRef.current) {
      barChartRef.current = new Chart(barCanvasRef.current, {
        type: "bar",
        data: {
          labels: ["Individuais", "Grupos"],
          datasets: [
            {
              label: "Chats",
              data: barData,
              backgroundColor: ["#fb6340", "#5e72e4"],
              borderRadius: 12,
              maxBarThickness: 28,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false,
            },
            tooltip: {
              backgroundColor: "#ffffff",
              titleColor: "#172b4d",
              bodyColor: "#4f6480",
              borderColor: "#dfe7f3",
              borderWidth: 1,
            },
          },
          scales: {
            x: {
              grid: {
                display: false,
              },
              ticks: {
                color: "#8898aa",
              },
            },
            y: {
              beginAtZero: true,
              grid: {
                color: "#edf2f8",
              },
              ticks: {
                color: "#8898aa",
              },
            },
          },
        },
      });
    } else {
      barChartRef.current.data.datasets[0].data = barData;
      barChartRef.current.update();
    }
  }, [dados.metricas.chatsGrupos, dados.metricas.chatsIndividuais]);

  const isOverview = pathname === "/";
  const currentTitle = pageTitles[pathname] || "Dashboard";

  useEffect(() => {
    if (!isOverview) {
      lineChartRef.current?.destroy();
      lineChartRef.current = null;
      barChartRef.current?.destroy();
      barChartRef.current = null;
    }
  }, [isOverview]);

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.logoBlock}>
          <img
            src="/logo-andon-bot.png"
            alt="Andon Bot"
            className={styles.logoImage}
          />
        </div>

        <div className={styles.menuGroup}>
          <span className={styles.menuLabel}>Dashboard</span>
          <nav className={styles.nav}>
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.to;

              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`${styles.navLink} ${active ? styles.navLinkActive : ""}`}
                >
                  <span className={styles.navIcon}>
                    <Icon size={16} />
                  </span>
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

      </aside>

      <main className={styles.main}>
        <section className={`${styles.hero} ${!isOverview ? styles.heroCompact : ""}`}>
          <div className={styles.heroTop}>
            <div>
              <span className={styles.heroEyebrow}>Painel principal</span>
              <h1 className={styles.heroTitle}>{currentTitle}</h1>
            </div>

            <div className={styles.heroActions}>
              <label className={styles.searchField}>
                <FiSearch size={15} />
                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar"
                />
              </label>

              <div className={styles.profileChip}>
                <div className={styles.profileAvatar}>BW</div>
              </div>
            </div>
          </div>

          {isOverview && (
            <div className={styles.heroStats}>
              {heroCards.map((card) => {
                const Icon = card.icon;

                return (
                  <article key={card.key} className={`${styles.heroCard} ${styles[`tone${card.tone}`]}`}>
                    <div className={styles.heroCardLabel}>{card.label}</div>
                    <div className={styles.heroCardRow}>
                      <strong className={styles.heroCardValue}>{card.value}</strong>
                      <span className={styles.heroCardIcon}>
                        <Icon size={16} />
                      </span>
                    </div>
                    <p className={styles.heroCardText}>{card.detail}</p>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className={`${styles.content} ${isOverview ? styles.contentOverview : styles.contentInner}`}>
          {isOverview ? (
            <div className={styles.overviewGrid}>
              <article className={`${styles.panel} ${styles.panelDark}`}>
                <div className={styles.panelHeader}>
                  <div>
                    <span className={styles.panelEyebrow}>Overview</span>
                    <h2 className={styles.panelTitleDark}>Ritmo de atividade</h2>
                  </div>
                  <div className={styles.segmented}>
                    <button type="button" className={styles.segmentActive}>Live</button>
                    <button type="button">Queue</button>
                  </div>
                </div>
                <div className={styles.chartArea}>
                  <canvas ref={lineCanvasRef} />
                </div>
              </article>

              <article className={styles.panel}>
                <div className={styles.panelHeader}>
                  <div>
                    <span className={styles.panelEyebrow}>Performance</span>
                    <h2 className={styles.panelTitle}>Distribuicao de chats</h2>
                  </div>
                </div>
                <div className={styles.barArea}>
                  <canvas ref={barCanvasRef} />
                </div>
              </article>

              <div className={styles.panelWide}>
                <Status />
              </div>

              <article className={styles.panel}>
                <div className={styles.panelHeader}>
                  <div>
                    <span className={styles.panelEyebrow}>Sessao</span>
                    <h2 className={styles.panelTitle}>Telemetria rapida</h2>
                  </div>
                </div>
                <div className={styles.statsList}>
                  <div className={styles.statLine}>
                    <span>
                      <FiClock size={15} />
                      Tempo conectado
                    </span>
                    <strong>{formatDuration(dados.metricas.tempoConexao)}</strong>
                  </div>
                  <div className={styles.statLine}>
                    <span>
                      <FiTrendingUp size={15} />
                      Ultimo QR
                    </span>
                    <strong>{formatDuration(dados.metricas.tempoUltimoQR)}</strong>
                  </div>
                  <div className={styles.statLine}>
                    <span>
                      <FiActivity size={15} />
                      Reconexões
                    </span>
                    <strong>{dados.metricas.reconexoes}</strong>
                  </div>
                </div>
              </article>

              <article className={styles.panel}>
                <div className={styles.panelHeader}>
                  <div>
                    <span className={styles.panelEyebrow}>Fila</span>
                    <h2 className={styles.panelTitle}>Leitura operacional</h2>
                  </div>
                </div>
                <div className={styles.summaryStack}>
                  <div className={styles.summaryCard}>
                    <span>Chats individuais</span>
                    <strong>{dados.metricas.chatsIndividuais}</strong>
                  </div>
                  <div className={styles.summaryCard}>
                    <span>Chats em grupo</span>
                    <strong>{dados.metricas.chatsGrupos}</strong>
                  </div>
                  <div className={styles.summaryCard}>
                    <span>Uso de CPU</span>
                    <strong>{dados.metricas.cpuUso}%</strong>
                  </div>
                </div>
              </article>
            </div>
          ) : (
            <div className={styles.pageFrame}>
              <Outlet />
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function formatPhoneDashboard(number) {
  if (!number) return "Numero ainda nao vinculado";
  const digits = String(number).replace(/\D/g, "");
  if (!digits.startsWith("55") || digits.length < 12) return number;

  const local = digits.slice(4);
  const prefix = local.length === 9 ? local.slice(0, 5) : local.slice(0, 4);
  const suffix = local.length === 9 ? local.slice(5) : local.slice(4);

  return `+${digits.slice(0, 2)} (${digits.slice(2, 4)}) ${prefix}-${suffix}`;
}

function getDashboardStatusTone(connection) {
  if (connection.status === "connected") return "success";
  if (connection.status === "qr") return "warning";
  if (["connecting", "checking"].includes(connection.status)) return "info";
  if (["remote_disconnected", "disconnecting"].includes(connection.status)) return "danger";
  return "neutral";
}

function getDashboardStatusHint(connection) {
  if (connection.connectionMode === "restore" && ["checking", "connecting"].includes(connection.status)) {
    return "Sessao valida encontrada. Reconectando automaticamente.";
  }

  if (connection.awaitingReauth && connection.status === "qr") {
    return "Novo QR pronto para reautenticar este numero.";
  }

  if (connection.status === "connected") {
    return "Sessao pronta para operar.";
  }

  if (["disconnected", "remote_disconnected"].includes(connection.status)) {
    return "Aguardando comando para gerar um novo QR Code.";
  }

  if (connection.status === "qr") {
    return "Aguardando leitura do QR Code.";
  }

  if (connection.status === "connecting") {
    return "QR lido, finalizando conexao.";
  }

  return "Acompanhe detalhes na tela de Status.";
}

export default function Dashboard() {
  const { pathname } = useLocation();
  const { atualizarToken } = useAtualizar();
  const [search, setSearch] = useState("");
  const [restoreNoticeConnections, setRestoreNoticeConnections] = useState([]);
  const notifiedRestoreIdsRef = useRef(new Set());
  const restoreNoticeTimeoutRef = useRef(null);
  const [dados, setDados] = useState({
    grafico: {
      totalNumeros: 0,
      totalMensagens: 0,
      totalGrupos: 0,
      totalAgendamentos: 0,
    },
    conexoes: [],
    metricas: {
      totalConexoes: 0,
      conexoesAtivas: 0,
      limiteConexoes: 5,
      slotsDisponiveis: 5,
      aguardandoQR: 0,
      reconectando: 0,
      mensagensHoje: 0,
    },
  });

  useEffect(() => {
    let active = true;

    async function carregarDados() {
      try {
        const response = await getDashboardData();
        if (!active) return;
        const conexoes = Array.isArray(response?.conexoes) ? response.conexoes : [];
        const newlyRestoredConnections = conexoes.filter(
          (connection) =>
            connection.status === "connected" &&
            connection.connectionMode === "restore" &&
            !notifiedRestoreIdsRef.current.has(connection.id),
        );

        if (newlyRestoredConnections.length > 0) {
          newlyRestoredConnections.forEach((connection) => notifiedRestoreIdsRef.current.add(connection.id));
          setRestoreNoticeConnections(newlyRestoredConnections);
          window.clearTimeout(restoreNoticeTimeoutRef.current);
          restoreNoticeTimeoutRef.current = window.setTimeout(() => {
            setRestoreNoticeConnections([]);
          }, 8000);
        }

        setDados({
          grafico: {
            totalNumeros: Number(response?.grafico?.totalNumeros || 0),
            totalMensagens: Number(response?.grafico?.totalMensagens || 0),
            totalGrupos: Number(response?.grafico?.totalGrupos || 0),
            totalAgendamentos: Number(response?.grafico?.totalAgendamentos || 0),
          },
          conexoes,
          metricas: {
            totalConexoes: Number(response?.metricas?.totalConexoes || 0),
            conexoesAtivas: Number(response?.metricas?.conexoesAtivas || 0),
            limiteConexoes: Number(response?.metricas?.limiteConexoes || 5),
            slotsDisponiveis: Number(response?.metricas?.slotsDisponiveis || 0),
            aguardandoQR: Number(response?.metricas?.aguardandoQR || 0),
            reconectando: Number(response?.metricas?.reconectando || 0),
            mensagensHoje: Number(response?.metricas?.mensagensHoje || 0),
          },
        });
      } catch (error) {
        console.error(error);
      }
    }

    carregarDados();
    const intervalId = setInterval(carregarDados, 4000);

    return () => {
      active = false;
      clearInterval(intervalId);
      window.clearTimeout(restoreNoticeTimeoutRef.current);
    };
  }, [atualizarToken]);

  const isOverview = pathname === "/";
  const currentTitle = pageTitles[pathname] || "Dashboard";

  const heroCards = useMemo(() => {
    return [
      {
        key: "contatos",
        label: "Contatos",
        value: dados.grafico.totalNumeros.toLocaleString("pt-BR"),
        detail: "Numeros cadastrados na base",
        icon: FiUsers,
        tone: "cyan",
      },
      {
        key: "conexoes",
        label: "Conexoes ativas",
        value: `${dados.metricas.conexoesAtivas}/${dados.metricas.limiteConexoes}`,
        detail: "Sessoes WhatsApp conectadas",
        icon: FiWifi,
        tone: "teal",
      },
      {
        key: "agendamentos",
        label: "Agendamentos",
        value: dados.grafico.totalAgendamentos.toLocaleString("pt-BR"),
        detail: "Disparos programados",
        icon: FiCalendar,
        tone: "orange",
      },
      {
        key: "mensagens",
        label: "Mensagens",
        value: dados.grafico.totalMensagens.toLocaleString("pt-BR"),
        detail: "Templates cadastrados",
        icon: FiMessageSquare,
        tone: "pink",
      },
    ];
  }, [dados]);

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.logoBlock}>
          <img
            src="/logo-andon-bot.png"
            alt="Andon Bot"
            className={styles.logoImage}
          />
        </div>

        <div className={styles.menuGroup}>
          <span className={styles.menuLabel}>Dashboard</span>
          <nav className={styles.nav}>
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.to;

              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`${styles.navLink} ${active ? styles.navLinkActive : ""}`}
                >
                  <span className={styles.navIcon}>
                    <Icon size={16} />
                  </span>
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>

      <main className={styles.main}>
        <section className={`${styles.hero} ${!isOverview ? styles.heroCompact : ""}`}>
          <div className={styles.heroTop}>
            <div>
              <span className={styles.heroEyebrow}>Painel principal</span>
              <h1 className={styles.heroTitle}>{currentTitle}</h1>
            </div>

            <div className={styles.heroActions}>
              <label className={styles.searchField}>
                <FiSearch size={15} />
                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar"
                />
              </label>

              <div className={styles.profileChip}>
                <div className={styles.profileAvatar}>BW</div>
              </div>
            </div>
          </div>

          {isOverview && (
            <div className={styles.heroStats}>
              {heroCards.map((card) => {
                const Icon = card.icon;

                return (
                  <article key={card.key} className={`${styles.heroCard} ${styles[`tone${card.tone}`]}`}>
                    <div className={styles.heroCardLabel}>{card.label}</div>
                    <div className={styles.heroCardRow}>
                      <strong className={styles.heroCardValue}>{card.value}</strong>
                      <span className={styles.heroCardIcon}>
                        <Icon size={16} />
                      </span>
                    </div>
                    <p className={styles.heroCardText}>{card.detail}</p>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className={`${styles.content} ${isOverview ? styles.contentOverview : styles.contentInner}`}>
          {isOverview ? (
            <div className={styles.overviewGrid}>
              <article className={`${styles.panel} ${styles.connectionPanel}`}>
                <div className={styles.panelHeader}>
                  <div>
                    <span className={styles.panelEyebrow}>Sessoes</span>
                    <h2 className={styles.panelTitle}>Conexões do WhatsApp</h2>
                  </div>
                  <Link to="/sessoes" className={styles.statusLink}>
                    Gerenciar sessões
                  </Link>
                </div>

                {restoreNoticeConnections.length > 0 && (
                  <div className={styles.dashboardNotice}>
                    <FiWifi size={16} />
                    <span>
                      Reconexão automatica concluida para{" "}
                      {restoreNoticeConnections.map((connection) => connection.name).join(", ")}.
                    </span>
                  </div>
                )}

                {dados.conexoes.length === 0 ? (
                  <div className={styles.emptyConnections}>
                    <FiWifi size={22} />
                    <strong>Nenhuma sessão cadastrada</strong>
                    <p>Abra a tela de Sessões para adicionar uma sessão e gerar o primeiro QR Code.</p>
                  </div>
                ) : (
                  <div className={styles.connectionCarousel}>
                    {dados.conexoes.map((connection) => {
                      const tone = getDashboardStatusTone(connection);

                      return (
                        <article key={connection.id} className={styles.dashboardConnectionCard}>
                          <div className={styles.connectionCardHeader}>
                            <span className={`${styles.connectionAvatar} ${styles[`dashboardAvatar${tone}`]}`}>
                              <FiSmartphone size={17} />
                            </span>
                            <span className={`${styles.connectionStatus} ${styles[`dashboardBadge${tone}`]}`}>
                              {connection.statusLabel || "Aguardando"}
                            </span>
                          </div>

                          <h3 className={styles.dashboardConnectionName}>{connection.name}</h3>
                          <p className={styles.dashboardConnectionNumber}>
                            {formatPhoneDashboard(connection.connectedNumber)}
                          </p>
                          <p className={styles.dashboardConnectionHint}>{getDashboardStatusHint(connection)}</p>
                        </article>
                      );
                    })}
                  </div>
                )}
              </article>

              <article className={styles.panel}>
                <div className={styles.panelHeader}>
                  <div>
                    <span className={styles.panelEyebrow}>Limite</span>
                    <h2 className={styles.panelTitle}>Capacidade de sessões</h2>
                  </div>
                </div>
                <div className={styles.summaryStack}>
                  <div className={styles.summaryCard}>
                    <span>Sessões cadastradas</span>
                    <strong>{dados.metricas.totalConexoes}/{dados.metricas.limiteConexoes}</strong>
                  </div>
                  <div className={styles.summaryCard}>
                    <span>Slots disponiveis</span>
                    <strong>{dados.metricas.slotsDisponiveis}</strong>
                  </div>
                  <div className={styles.summaryCard}>
                    <span>Aguardando QR</span>
                    <strong>{dados.metricas.aguardandoQR}</strong>
                  </div>
                </div>
              </article>

              <article className={styles.panel}>
                <div className={styles.panelHeader}>
                  <div>
                    <span className={styles.panelEyebrow}>Base</span>
                    <h2 className={styles.panelTitle}>Atividade do bot</h2>
                  </div>
                </div>
                <div className={styles.summaryStack}>
                  <div className={styles.summaryCard}>
                    <span>Mensagens hoje</span>
                    <strong>{dados.metricas.mensagensHoje}</strong>
                  </div>
                  <div className={styles.summaryCard}>
                    <span>Grupos cadastrados</span>
                    <strong>{dados.grafico.totalGrupos}</strong>
                  </div>
                  <div className={styles.summaryCard}>
                    <span>Reconectando agora</span>
                    <strong>{dados.metricas.reconectando}</strong>
                  </div>
                </div>
              </article>
            </div>
          ) : (
            <div className={styles.pageFrame}>
              <Outlet />
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
