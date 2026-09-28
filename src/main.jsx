import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ShieldCheck, Globe, FileText, Image as ImageIcon, History,
  Database, Bot, UserCircle, LogOut, Search, Plus, Pencil, Trash2,
  AlertTriangle, CheckCircle2, XCircle, BarChart3, Megaphone, Menu,
  X, Send, Upload, Eye, MousePointerClick
} from "lucide-react";
import "./styles.css";

const DEFAULT_SITES = [
  { id: "1", name: "DIAN", domain: "dian.gov.co", url: "https://www.dian.gov.co", category: "Gobierno", verified: true },
  { id: "2", name: "Banco de la República", domain: "banrep.gov.co", url: "https://www.banrep.gov.co", category: "Finanzas", verified: true },
  { id: "3", name: "Claro Colombia", domain: "claro.com.co", url: "https://www.claro.com.co", category: "Telecomunicaciones", verified: true },
  { id: "4", name: "Colsanitas", domain: "colsanitas.com", url: "https://www.colsanitas.com", category: "Salud", verified: true }
];

const DEMO_ADS = [
  {
    id: "a1",
    title: "Protege tus dispositivos",
    advertiser: "Aliado de seguridad",
    description: "Soluciones de protección digital para hogares y pequeñas empresas.",
    url: "https://example.com",
    active: true,
    impressions: 1280,
    clicks: 84
  }
];

function load(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

function save(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

/* =========================================================
   ANALIZADOR DE URL
========================================================= */
function riskForUrl(raw, sites) {
  let score = 10;
  const findings = [];
  const positive = [];
  const value = raw.trim();

  try {
    const url = new URL(value.includes("://") ? value : "https://" + value);
    const host = url.hostname.toLowerCase();

    if (url.protocol === "https:") {
      score -= 5;
      positive.push("La URL utiliza HTTPS.");
    } else {
      score += 12;
      findings.push("La URL no utiliza HTTPS.");
    }

    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
      score += 28;
      findings.push("La dirección utiliza una IP en lugar de un dominio.");
    }

    if (host.length > 35) {
      score += 12;
      findings.push("El dominio tiene una longitud inusual.");
    }

    if (/[._-]{2,}/.test(host)) {
      score += 8;
      findings.push("El dominio contiene patrones poco habituales.");
    }

    const official = sites.find(
      site =>
        host === site.domain.toLowerCase() ||
        host.endsWith("." + site.domain.toLowerCase())
    );

    if (official) {
      score = Math.max(0, score - 30);
      positive.push(`Coincide con el dominio oficial registrado de ${official.name}.`);
    } else {
      score += 15;
      findings.push("El dominio no coincide con un sitio oficial registrado en Virluz.");
    }

    const suspiciousWords = [
      "login", "verify", "secure", "account",
      "update", "confirm", "password", "bank", "payment", "bonus"
    ];

    const hits = suspiciousWords.filter(word => host.includes(word));

    if (hits.length) {
      score += hits.length * 6;
      findings.push(
        "El dominio contiene términos que pueden aparecer en páginas de suplantación."
      );
    }

    score = Math.max(0, Math.min(100, score));

    const level =
      score >= 60 ? "ALTO" :
      score >= 30 ? "PRECAUCIÓN" :
      "BAJO";

    return {
      score,
      level,
      findings,
      positive,
      normalized: value
    };
  } catch {
    return {
      score: 75,
      level: "ALTO",
      findings: ["El contenido introducido no parece ser una URL válida."],
      positive: [],
      normalized: value
    };
  }
}

/* =========================================================
   ANALIZADOR DE TEXTO
========================================================= */
function riskForText(text) {
  const t = text.toLowerCase().trim();

  let score = 5;
  const findings = [];
  const positive = [];

  // INDICADORES FUERTES
  const strongRules = [
    [
      /contraseña|password|clave|credencial/,
      "Solicita una contraseña o credencial de acceso.",
      25
    ],
    [
      /código|otp|token|código de seguridad|código de verificación/,
      "Solicita un código de autenticación o verificación.",
      25
    ],
    [
      /número de tarjeta|tarjeta de crédito|tarjeta débito|cvv|cvc/,
      "Solicita información de una tarjeta o datos financieros sensibles.",
      30
    ],
    [
      /transferencia|consignación|realiza el pago|haz el pago|paga ahora/,
      "Solicita realizar un pago o transferencia.",
      25
    ],
    [
      /cuenta será bloqueada|cuenta será suspendida|último aviso|será cancelada/,
      "Utiliza una amenaza de bloqueo, suspensión o cancelación.",
      20
    ]
  ];

  strongRules.forEach(([pattern, message, points]) => {
    if (pattern.test(t)) {
      score += points;
      findings.push(message);
    }
  });

  // INDICADORES DE PRECAUCIÓN
  const cautionRules = [
    [
      /te ganaste|has ganado|ganaste|felicitaciones.*premio|premio/,
      "El mensaje anuncia un premio o beneficio inesperado.",
      18
    ],
    [
      /carro|vehículo|auto|moto/,
      "Menciona un premio o beneficio de alto valor.",
      12
    ],
    [
      /bono|regalo|dinero gratis|dinero fácil|beneficio/,
      "Promete un beneficio económico o regalo inesperado.",
      15
    ],
    [
      /sorteo|concurso|rifa/,
      "Hace referencia a un sorteo o concurso que debe ser verificado.",
      10
    ],
    [
      /comunícate|llámanos|llame|escríbenos|contáctanos/,
      "Invita al usuario a establecer contacto para continuar el proceso.",
      5
    ],
    [
      /urgente|inmediatamente|ahora mismo|rápidamente/,
      "Utiliza lenguaje de urgencia o presión.",
      15
    ]
  ];

  cautionRules.forEach(([pattern, message, points]) => {
    if (pattern.test(t)) {
      score += points;
      findings.push(message);
    }
  });

  // ENLACES
  if (/https?:\/\/|www\./.test(t)) {
    score += 12;
    findings.push(
      "El mensaje contiene un enlace que debe verificarse antes de abrirlo."
    );
  }

  // INDICADORES CONTEXTUALES POSITIVOS
  if (/hola\s+[a-záéíóúñ]+|estimad[oa]\s+[a-záéíóúñ]+/i.test(t)) {
    positive.push("El mensaje utiliza un saludo personalizado.");
  }

  if (/canales oficiales|sitio oficial|página oficial|línea oficial|centro de atención/i.test(t)) {
    positive.push("El mensaje orienta hacia canales oficiales de comunicación.");
  }

  if (!/contraseña|password|clave|credencial/.test(t)) {
    positive.push("No se detectó una solicitud directa de contraseña.");
  }

  if (!/tarjeta|cvv|cvc|transferencia|consignación|pago/.test(t)) {
    positive.push(
      "No se detectó una solicitud directa de información financiera o pagos."
    );
  }

  score = Math.max(0, Math.min(100, score));

  const level =
    score >= 65 ? "ALTO" :
    score >= 30 ? "PRECAUCIÓN" :
    "BAJO";

  return {
    score,
    level,
    findings,
    positive
  };
}

/* =========================================================
   RESULTADO
========================================================= */
function ResultCard({ result, title = "Resultado del análisis" }) {
  const high = result.level === "ALTO";
  const medium = result.level === "PRECAUCIÓN";

  return (
    <div className={`result-card ${high ? "danger" : medium ? "warning" : "safe"}`}>
      <div className="result-head">
        {high ? <XCircle /> : medium ? <AlertTriangle /> : <CheckCircle2 />}

        <div>
          <div className="eyebrow">{title}</div>
          <h2>
            {high
              ? "Posible phishing"
              : medium
              ? "Precaución"
              : "No se detectaron señales relevantes"}
          </h2>
        </div>

        <strong>{result.score}%</strong>
      </div>

      <p className="muted">
        Evaluación orientativa basada en los indicadores detectados; no constituye
        una garantía absoluta.
      </p>

      <div className="findings">
        <div>
          <b>Principales hallazgos</b>
        </div>

        {result.findings.length ? (
          result.findings.map((item, index) => (
            <div className="finding" key={index}>
              ● {item}
            </div>
          ))
        ) : (
          <div className="finding good">
            ● No se detectaron señales importantes con las reglas actuales.
          </div>
        )}

        {result.positive?.map((item, index) => (
          <div className="finding good" key={`positive-${index}`}>
            ✓ {item}
          </div>
        ))}
      </div>

      <div className="recommendation">
        <b>Recomendación:</b>{" "}
        {high
          ? "No ingreses credenciales ni datos financieros hasta verificar la dirección directamente desde una fuente oficial."
          : medium
          ? "Verifica la entidad por un canal oficial antes de continuar."
          : "Aun así, evita compartir información sensible sin verificar la fuente."}
      </div>
    </div>
  );
}

/* =========================================================
   APP PRINCIPAL
========================================================= */
function App() {
  const [user, setUser] = useState(load("virluz_user", null));

  // VIRLUZ AHORA INICIA DIRECTAMENTE EN LA APP
  const [page, setPage] = useState("home");

  const [mobile, setMobile] = useState(false);
  const [sites, setSites] = useState(load("virluz_sites", DEFAULT_SITES));
  const [analyses, setAnalyses] = useState(load("virluz_analyses", []));
  const [ads, setAds] = useState(load("virluz_ads", DEMO_ADS));

  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [urlResult, setUrlResult] = useState(null);
  const [textResult, setTextResult] = useState(null);

  const [imageName, setImageName] = useState("");
  const [imageResult, setImageResult] = useState(null);

  const [chat, setChat] = useState([
    {
      role: "bot",
      text: "Hola 👋 Soy el asistente Virluz. Puedo explicarte qué es phishing o ayudarte a revisar un mensaje sospechoso."
    }
  ]);

  const [chatInput, setChatInput] = useState("");

  const [siteSearch, setSiteSearch] = useState("");
  const [showSiteForm, setShowSiteForm] = useState(false);
  const [editingSite, setEditingSite] = useState(null);

  const [newSite, setNewSite] = useState({
    name: "",
    domain: "",
    url: "",
    category: "Otros",
    verified: false
  });

  const [showAdForm, setShowAdForm] = useState(false);

  const [newAd, setNewAd] = useState({
    title: "",
    advertiser: "",
    description: "",
    url: "",
    active: true
  });

  const isAdmin = user?.role === "admin";

  const filteredSites = useMemo(
    () =>
      sites.filter(site =>
        (site.name + site.domain + site.category)
          .toLowerCase()
          .includes(siteSearch.toLowerCase())
      ),
    [sites, siteSearch]
  );

  function login(event) {
    event.preventDefault();

    const email = event.currentTarget.email.value;

    const role = email.toLowerCase().includes("admin")
      ? "admin"
      : "user";

    const newUser = {
      name: role === "admin" ? "Administrador" : "Usuario Virluz",
      email,
      role
    };

    setUser(newUser);
    save("virluz_user", newUser);
    setPage("home");
  }

  function logout() {
    localStorage.removeItem("virluz_user");
    setUser(null);
    setPage("home");
  }

  function record(type, input, result) {
    const item = {
      id: Date.now(),
      date: new Date().toLocaleString("es-CO"),
      type,
      input,
      result
    };

    const next = [item, ...analyses];

    setAnalyses(next);
    save("virluz_analyses", next);
  }

  function analyzeUrl() {
    if (!url.trim()) return;

    const result = riskForUrl(url, sites);

    setUrlResult(result);
    record("URL", url, result);
  }

  function analyzeText() {
    if (!text.trim()) return;

    const result = riskForText(text);

    setTextResult(result);
    record("Texto", text.slice(0, 100), result);
  }

  function analyzeImage() {
    if (!imageName) return;

    const result = {
      score: 68,
      level: "ALTO",
      findings: [
        "Se detectó una imagen cargada. El prototipo requiere OCR/IA para extraer y verificar automáticamente todo el contenido visual.",
        "La imagen queda marcada para revisión porque puede contener texto, enlaces o elementos de suplantación."
      ],
      positive: []
    };

    setImageResult(result);
    record("Imagen", imageName, result);
  }

  function saveSite() {
    if (!newSite.name || !newSite.domain) return;

    let next;

    if (editingSite) {
      next = sites.map(site =>
        site.id === editingSite.id
          ? { ...editingSite, ...newSite }
          : site
      );
    } else {
      next = [
        ...sites,
        {
          ...newSite,
          id: Date.now().toString()
        }
      ];
    }

    setSites(next);
    save("virluz_sites", next);

    setNewSite({
      name: "",
      domain: "",
      url: "",
      category: "Otros",
      verified: false
    });

    setEditingSite(null);
    setShowSiteForm(false);
  }

  function deleteSite(id) {
    const next = sites.filter(site => site.id !== id);

    setSites(next);
    save("virluz_sites", next);
  }

  function saveAd() {
    if (!newAd.title) return;

    const next = [
      ...ads,
      {
        ...newAd,
        id: Date.now().toString(),
        impressions: 0,
        clicks: 0
      }
    ];

    setAds(next);
    save("virluz_ads", next);

    setNewAd({
      title: "",
      advertiser: "",
      description: "",
      url: "",
      active: true
    });

    setShowAdForm(false);
  }

  function sendChat() {
    if (!chatInput.trim()) return;

    const question = chatInput.trim();

    const messages = [
      ...chat,
      {
        role: "user",
        text: question
      }
    ];

    let answer =
      "Puedo ayudarte a identificar señales como urgencia, solicitudes de contraseñas, pagos, enlaces sospechosos o suplantación. Si quieres un análisis detallado, usa el módulo correspondiente.";

    if (/phishing/i.test(question)) {
      answer =
        "El phishing es una técnica de engaño que busca que una persona entregue información o realice una acción perjudicial. Verifica siempre el dominio y evita enlaces inesperados.";
    }

    if (/mensaje|sms|whatsapp/i.test(question)) {
      answer =
        "Puedes copiar el mensaje en 'Analizar texto'. Virluz buscará señales de urgencia, credenciales, pagos, amenazas y enlaces.";
    }

    setChat([
      ...messages,
      {
        role: "bot",
        text: answer
      }
    ]);

    setChatInput("");
  }

  /*
    Si el usuario quiere iniciar sesión, mostramos la pantalla
    de login independientemente de que ya pueda usar la aplicación.
  */
  if (page === "login") {
    return (
      <Login
        onLogin={login}
        continueWithoutLogin={() => setPage("home")}
      />
    );
  }

  const menu = [
    ["home", "Inicio", ShieldCheck],
    ["analyze", "Analizar", Search],
    ["sites", "Sitios oficiales", Database]
  ];

  // Estas opciones son exclusivas para usuarios registrados.
  if (user) {
    menu.push(
      ["history", "Historial", History],
      ["chat", "Chatbot", Bot],
      ["profile", "Perfil", UserCircle]
    );
  }

  // Estas opciones son exclusivas para administradores.
  if (isAdmin) {
    menu.push(
      ["admin", "Administración", BarChart3],
      ["ads", "Publicidad", Megaphone]
    );
  }

  return (
    <div className="app">
      <aside className={`sidebar ${mobile ? "open" : ""}`}>
        <div className="brand">
          <div className="brand-mark">
            <ShieldCheck />
          </div>

          <div>
            <b>Virluz</b>
            <small>Navega seguro</small>
          </div>
        </div>

        <nav>
          {menu.map(([id, label, Icon]) => (
            <button
              className={page === id ? "active" : ""}
              key={id}
              onClick={() => {
                setPage(id);
                setMobile(false);
              }}
            >
              <Icon size={18} />
              {label}
            </button>
          ))}
        </nav>

        {user ? (
          <button className="logout" onClick={logout}>
            <LogOut size={18} />
            Cerrar sesión
          </button>
        ) : (
          <button
            className="logout login-button"
            onClick={() => setPage("login")}
          >
            <UserCircle size={18} />
            Iniciar sesión
          </button>
        )}
      </aside>

      {mobile && (
        <div
          className="overlay"
          onClick={() => setMobile(false)}
        />
      )}

      <main className="main">
        <header>
          <button
            className="mobile-menu"
            onClick={() => setMobile(!mobile)}
          >
            {mobile ? <X /> : <Menu />}
          </button>

          <div>
            <span className="eyebrow">
              Plataforma de seguridad digital
            </span>

            <h1>
              {page === "home"
                ? user
                  ? `Bienvenido, ${user.name} 👋`
                  : "Bienvenido a Virluz 🛡️"
                : page === "analyze"
                ? "Analizar contenido"
                : page === "history"
                ? "Historial"
                : page === "sites"
                ? "Sitios oficiales"
                : page === "chat"
                ? "Asistente Virluz"
                : page === "profile"
                ? "Mi perfil"
                : page === "admin"
                ? "Administración"
                : "Publicidad"}
            </h1>
          </div>

          {user ? (
            <div className="avatar" title={user.email}>
              {user.name[0]}
            </div>
          ) : (
            <button
              className="login-top"
              onClick={() => setPage("login")}
            >
              Iniciar sesión
            </button>
          )}
        </header>

        {page === "home" && (
          <Home
            setPage={setPage}
            analyses={analyses}
            ads={ads}
            user={user}
          />
        )}

        {page === "analyze" && (
          <Analyze
            url={url}
            setUrl={setUrl}
            analyzeUrl={analyzeUrl}
            urlResult={urlResult}
            text={text}
            setText={setText}
            analyzeText={analyzeText}
            textResult={textResult}
            imageName={imageName}
            setImageName={setImageName}
            analyzeImage={analyzeImage}
            imageResult={imageResult}
          />
        )}

        {page === "history" && user && (
          <HistoryPage analyses={analyses} />
        )}

        {page === "sites" && (
          <Sites
            sites={filteredSites}
            search={siteSearch}
            setSearch={setSiteSearch}
            admin={isAdmin}
            onAdd={() => {
              setEditingSite(null);
              setShowSiteForm(true);
            }}
            onEdit={site => {
              setEditingSite(site);
              setNewSite(site);
              setShowSiteForm(true);
            }}
            onDelete={deleteSite}
          />
        )}

        {page === "chat" && user && (
          <Chat
            chat={chat}
            input={chatInput}
            setInput={setChatInput}
            send={sendChat}
          />
        )}

        {page === "profile" && user && (
          <Profile user={user} analyses={analyses} />
        )}

        {page === "admin" && isAdmin && (
          <Admin
            analyses={analyses}
            sites={sites}
            ads={ads}
          />
        )}

        {page === "ads" && isAdmin && (
          <Ads
            ads={ads}
            setAds={setAds}
            show={showAdForm}
            setShow={setShowAdForm}
            newAd={newAd}
            setNewAd={setNewAd}
            save={saveAd}
          />
        )}

        {showSiteForm && (
          <Modal
            title={editingSite ? "Editar sitio" : "Agregar sitio oficial"}
            close={() => setShowSiteForm(false)}
          >
            <div className="form-grid">
              <input
                placeholder="Nombre"
                value={newSite.name || ""}
                onChange={e =>
                  setNewSite({
                    ...newSite,
                    name: e.target.value
                  })
                }
              />

              <input
                placeholder="Dominio"
                value={newSite.domain || ""}
                onChange={e =>
                  setNewSite({
                    ...newSite,
                    domain: e.target.value
                  })
                }
              />

              <input
                placeholder="URL"
                value={newSite.url || ""}
                onChange={e =>
                  setNewSite({
                    ...newSite,
                    url: e.target.value
                  })
                }
              />

              <input
                placeholder="Categoría"
                value={newSite.category || ""}
                onChange={e =>
                  setNewSite({
                    ...newSite,
                    category: e.target.value
                  })
                }
              />
            </div>

            <label className="check">
              <input
                type="checkbox"
                checked={!!newSite.verified}
                onChange={e =>
                  setNewSite({
                    ...newSite,
                    verified: e.target.checked
                  })
                }
              />
              Verificado por el administrador
            </label>

            <button className="primary" onClick={saveSite}>
              Guardar sitio
            </button>
          </Modal>
        )}
      </main>
    </div>
  );
}

/* =========================================================
   LOGIN
========================================================= */
function Login({ onLogin, continueWithoutLogin }) {
  return (
    <div className="login-page">
      <div className="login-art">
        <ShieldCheck size={72} />

        <h1>Virluz</h1>

        <p>Navega seguro, decide informado.</p>

        <span>
          Detecta posibles señales de phishing en enlaces,
          mensajes e imágenes.
        </span>
      </div>

      <form className="login-card" onSubmit={onLogin}>
        <div className="brand centered">
          <div className="brand-mark">
            <ShieldCheck />
          </div>

          <div>
            <b>Virluz</b>
            <small>Seguridad digital</small>
          </div>
        </div>

        <h2>Iniciar sesión</h2>

        <p className="muted">
          Accede para guardar tu historial y utilizar el asistente Virluz.
        </p>

        <label>
          Correo
          <input
            name="email"
            type="email"
            placeholder="tu@correo.com"
            required
          />
        </label>

        <label>
          Contraseña
          <input
            name="password"
            type="password"
            placeholder="••••••••"
            required
          />
        </label>

        <button className="primary">
          Iniciar sesión
        </button>

        <button
          type="button"
          className="secondary"
          onClick={continueWithoutLogin}
        >
          Continuar sin iniciar sesión
        </button>

        <small className="demo">
          Demo: cualquier correo funciona. Para entrar como administrador
          utiliza un correo que contenga <b>admin</b>.
        </small>
      </form>
    </div>
  );
}

/* =========================================================
   HOME
========================================================= */
function Home({ setPage, analyses, ads, user }) {
  const threats = analyses.filter(
    analysis => analysis.result?.level === "ALTO"
  ).length;

  const activeAd = ads.find(ad => ad.active);

  return (
    <section>
      <div className="hero-card">
        <div>
          <span className="eyebrow">
            Centro de protección
          </span>

          <h2>Analiza antes de confiar.</h2>

          <p>
            Verifica enlaces, mensajes e imágenes para encontrar
            señales que podrían indicar phishing.
          </p>

          <button
            className="primary"
            onClick={() => setPage("analyze")}
          >
            Comenzar análisis
          </button>

          {!user && (
            <p className="guest-note">
              Puedes utilizar los analizadores sin crear una cuenta.
              Inicia sesión cuando quieras guardar tu historial o
              utilizar el asistente Virluz.
            </p>
          )}
        </div>

        <div className="hero-icon">
          <ShieldCheck size={110} />
        </div>
      </div>

      <div className="cards three">
        <Action
          title="Analizar página web"
          text="Verifica una URL y compárala con sitios oficiales."
          icon={Globe}
          onClick={() => setPage("analyze")}
        />

        <Action
          title="Analizar texto"
          text="Revisa correos, SMS y mensajes sospechosos."
          icon={FileText}
          onClick={() => setPage("analyze")}
        />

        <Action
          title="Analizar imagen"
          text="Carga un pantallazo para una revisión orientativa."
          icon={ImageIcon}
          onClick={() => setPage("analyze")}
        />
      </div>

      <div className="stats">
        <Stat
          label="Análisis realizados"
          value={analyses.length}
        />

        <Stat
          label="Amenazas detectadas"
          value={threats}
        />

        <Stat
          label="Sitios oficiales"
          value={load("virluz_sites", DEFAULT_SITES).length}
        />
      </div>

      {activeAd && (
        <div className="ad-card">
          <Megaphone />

          <div>
            <span className="eyebrow">
              Aliado de seguridad
            </span>

            <h3>{activeAd.title}</h3>

            <p>{activeAd.description}</p>
          </div>

          <a
            href={activeAd.url}
            target="_blank"
            rel="noreferrer"
          >
            Conocer más
          </a>
        </div>
      )}
    </section>
  );
}

/* =========================================================
   COMPONENTES
========================================================= */
function Action({ title, text, icon: Icon, onClick }) {
  return (
    <button className="action-card" onClick={onClick}>
      <Icon />
      <h3>{title}</h3>
      <p>{text}</p>
      <span>Analizar →</span>
    </button>
  );
}

function Stat({ label, value }) {
  return (
    <div className="stat">
      <BarChart3 />

      <div>
        <b>{value}</b>
        <span>{label}</span>
      </div>
    </div>
  );
}

/* =========================================================
   ANALIZADORES
========================================================= */
function Analyze(props) {
  return (
    <section>
      <div className="tabs">
        <button className="tab active">
          <Globe />
          URL
        </button>

        <button className="tab">
          <FileText />
          Texto
        </button>

        <button className="tab">
          <ImageIcon />
          Imagen
        </button>
      </div>

      <div className="analysis-grid">
        <div className="panel">
          <h3>Analizar página web</h3>

          <p className="muted">
            Introduce la dirección que deseas verificar.
          </p>

          <input
            value={props.url}
            onChange={e => props.setUrl(e.target.value)}
            placeholder="https://ejemplo.com"
          />

          <button
            className="primary"
            onClick={props.analyzeUrl}
          >
            <Search />
            Analizar URL
          </button>

          {props.urlResult && (
            <ResultCard result={props.urlResult} />
          )}
        </div>

        <div className="panel">
          <h3>Analizar texto</h3>

          <p className="muted">
            Pega un correo, SMS, WhatsApp u otro mensaje.
          </p>

          <textarea
            value={props.text}
            onChange={e => props.setText(e.target.value)}
            placeholder="Pega aquí el mensaje sospechoso..."
          />

          <button
            className="primary"
            onClick={props.analyzeText}
          >
            <FileText />
            Analizar texto
          </button>

          {props.textResult && (
            <ResultCard result={props.textResult} />
          )}
        </div>

        <div className="panel">
          <h3>Analizar imagen</h3>

          <p className="muted">
            Carga una captura de pantalla. El prototipo
            prepara el flujo para OCR/IA.
          </p>

          <label className="upload">
            <Upload />

            <span>
              {props.imageName ||
                "Selecciona una imagen JPG, PNG o WEBP"}
            </span>

            <input
              type="file"
              accept="image/*"
              onChange={e =>
                props.setImageName(
                  e.target.files?.[0]?.name || ""
                )
              }
            />
          </label>

          <button
            className="primary"
            onClick={props.analyzeImage}
          >
            <ImageIcon />
            Analizar imagen
          </button>

          {props.imageResult && (
            <ResultCard
              result={props.imageResult}
              title="Resultado de imagen"
            />
          )}
        </div>
      </div>
    </section>
  );
}

/* =========================================================
   HISTORIAL
========================================================= */
function HistoryPage({ analyses }) {
  return (
    <section>
      <div className="panel">
        <div className="section-head">
          <div>
            <h3>Análisis recientes</h3>

            <p className="muted">
              Tus resultados guardados en este prototipo.
            </p>
          </div>

          <History />
        </div>

        {analyses.length === 0 ? (
          <Empty text="Todavía no tienes análisis." />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Tipo</th>
                  <th>Contenido</th>
                  <th>Resultado</th>
                </tr>
              </thead>

              <tbody>
                {analyses.map(analysis => (
                  <tr key={analysis.id}>
                    <td>{analysis.date}</td>
                    <td>{analysis.type}</td>
                    <td>{analysis.input}</td>
                    <td>
                      <span
                        className={`badge ${
                          analysis.result.level === "ALTO"
                            ? "red"
                            : analysis.result.level === "PRECAUCIÓN"
                            ? "yellow"
                            : "green"
                        }`}
                      >
                        {analysis.result.level} ·{" "}
                        {analysis.result.score}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

/* =========================================================
   SITIOS OFICIALES
========================================================= */
function Sites({
  sites,
  search,
  setSearch,
  admin,
  onAdd,
  onEdit,
  onDelete
}) {
  return (
    <section>
      <div className="panel">
        <div className="section-head">
          <div>
            <h3>Base de datos de sitios oficiales</h3>

            <p className="muted">
              Dominios de referencia administrados por Virluz.
            </p>
          </div>

          {admin && (
            <button
              className="primary small"
              onClick={onAdd}
            >
              <Plus />
              Agregar sitio
            </button>
          )}
        </div>

        <div className="search">
          <Search />

          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por entidad, dominio o categoría..."
          />
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Entidad</th>
                <th>Dominio</th>
                <th>Categoría</th>
                <th>Estado</th>

                {admin && <th>Acciones</th>}
              </tr>
            </thead>

            <tbody>
              {sites.map(site => (
                <tr key={site.id}>
                  <td>{site.name}</td>
                  <td>{site.domain}</td>
                  <td>{site.category}</td>

                  <td>
                    <span className="badge green">
                      Oficial
                    </span>
                  </td>

                  {admin && (
                    <td>
                      <button
                        className="icon-btn"
                        onClick={() => onEdit(site)}
                      >
                        <Pencil />
                      </button>

                      <button
                        className="icon-btn danger-btn"
                        onClick={() => onDelete(site.id)}
                      >
                        <Trash2 />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

/* =========================================================
   CHATBOT
========================================================= */
function Chat({
  chat,
  input,
  setInput,
  send
}) {
  return (
    <section>
      <div className="chat panel">
        <div className="chat-head">
          <Bot />

          <div>
            <h3>Asistente Virluz</h3>
            <span>
              Orientación sobre seguridad digital
            </span>
          </div>
        </div>

        <div className="messages">
          {chat.map((message, index) => (
            <div
              className={`bubble ${message.role}`}
              key={index}
            >
              {message.text}
            </div>
          ))}
        </div>

        <div className="chat-input">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e =>
              e.key === "Enter" && send()
            }
            placeholder="Escribe tu pregunta..."
          />

          <button
            className="primary icon-only"
            onClick={send}
          >
            <Send />
          </button>
        </div>
      </div>
    </section>
  );
}

/* =========================================================
   PERFIL
========================================================= */
function Profile({ user, analyses }) {
  return (
    <section>
      <div className="profile-card panel">
        <div className="big-avatar">
          {user.name[0]}
        </div>

        <h2>{user.name}</h2>

        <p>{user.email}</p>

        <span className="badge blue">
          {user.role === "admin"
            ? "Administrador"
            : "Usuario"}
        </span>

        <div className="stats">
          <Stat
            label="Análisis"
            value={analyses.length}
          />

          <Stat
            label="Cuenta"
            value="Activa"
          />
        </div>
      </div>
    </section>
  );
}

/* =========================================================
   ADMINISTRACIÓN
========================================================= */
function Admin({ analyses, sites, ads }) {
  return (
    <section>
      <div className="stats">
        <Stat label="Usuarios demo" value="1" />
        <Stat label="Análisis" value={analyses.length} />
        <Stat label="Sitios oficiales" value={sites.length} />
        <Stat label="Anuncios" value={ads.length} />
      </div>

      <div className="cards two">
        <div className="panel">
          <h3>Estado del prototipo</h3>

          <p className="muted">
            Autenticación, historial, sitios oficiales
            y publicidad funcionan actualmente en modo local.
          </p>

          <div className="finding good">
            ✓ Datos persistidos en localStorage.
          </div>

          <div className="finding good">
            ✓ Roles usuario/administrador.
          </div>

          <div className="finding good">
            ✓ CRUD de sitios oficiales.
          </div>
        </div>

        <div className="panel">
          <h3>Próxima integración</h3>

          <p className="muted">
            Conectar Supabase permitirá usuarios y datos
            persistentes en la nube, además de políticas RLS
            y funciones backend.
          </p>
        </div>
      </div>
    </section>
  );
}

/* =========================================================
   PUBLICIDAD
========================================================= */
function Ads({
  ads,
  setAds,
  show,
  setShow,
  newAd,
  setNewAd,
  save
}) {
  function toggle(id) {
    const next = ads.map(ad =>
      ad.id === id
        ? { ...ad, active: !ad.active }
        : ad
    );

    setAds(next);
    save("virluz_ads", next);
  }

  return (
    <section>
      <div className="panel">
        <div className="section-head">
          <div>
            <h3>Publicidad y monetización</h3>

            <p className="muted">
              Gestiona anuncios de aliados relacionados
              con seguridad digital.
            </p>
          </div>

          <button
            className="primary small"
            onClick={() => setShow(true)}
          >
            <Plus />
            Nuevo anuncio
          </button>
        </div>

        {ads.map(ad => (
          <div className="ad-row" key={ad.id}>
            <div className="ad-logo">
              <Megaphone />
            </div>

            <div className="ad-info">
              <b>{ad.title}</b>

              <span>
                {ad.advertiser} · {ad.description}
              </span>
            </div>

            <div className="ad-metrics">
              <span>
                <Eye />
                {ad.impressions}
              </span>

              <span>
                <MousePointerClick />
                {ad.clicks}
              </span>
            </div>

            <button
              className={`toggle ${ad.active ? "on" : ""}`}
              onClick={() => toggle(ad.id)}
            >
              {ad.active ? "Activo" : "Inactivo"}
            </button>
          </div>
        ))}
      </div>

      {show && (
        <Modal
          title="Nuevo anuncio"
          close={() => setShow(false)}
        >
          <div className="form-grid">
            <input
              placeholder="Título"
              value={newAd.title}
              onChange={e =>
                setNewAd({
                  ...newAd,
                  title: e.target.value
                })
              }
            />

            <input
              placeholder="Anunciante"
              value={newAd.advertiser}
              onChange={e =>
                setNewAd({
                  ...newAd,
                  advertiser: e.target.value
                })
              }
            />

            <input
              placeholder="URL de destino"
              value={newAd.url}
              onChange={e =>
                setNewAd({
                  ...newAd,
                  url: e.target.value
                })
              }
            />

            <textarea
              placeholder="Descripción"
              value={newAd.description}
              onChange={e =>
                setNewAd({
                  ...newAd,
                  description: e.target.value
                })
              }
            />
          </div>

          <button
            className="primary"
            onClick={save}
          >
            Guardar anuncio
          </button>
        </Modal>
      )}
    </section>
  );
}

/* =========================================================
   MODAL Y EMPTY STATE
========================================================= */
function Modal({ title, close, children }) {
  return (
    <div className="modal-backdrop">
      <div className="modal">
        <button
          className="close"
          onClick={close}
        >
          <X />
        </button>

        <h2>{title}</h2>

        {children}
      </div>
    </div>
  );
}

function Empty({ text }) {
  return (
    <div className="empty">
      <Database />
      <p>{text}</p>
    </div>
  );
}

createRoot(document.getElementById("root")).render(
  <App />
);
