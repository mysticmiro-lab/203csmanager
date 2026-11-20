// HLTV VRS ranking snapshot from 2025-01-01 plus player-managed teams.
(() => {
    const KEYS = { players: "hltv_game_players", news: "hltv_game_news", session: "hltv_game_session" };
    let selectedTeamUsername = null;
    let editingNewsId = null;

    const readJSON = (key, fallback = []) => {
        try { return JSON.parse(localStorage.getItem(key)) || fallback; }
        catch (_) { return fallback; }
    };
    const players = () => readJSON(KEYS.players).map(item => typeof item === "string" ? { username: item } : item);
    const user = () => {
        try { return JSON.parse(sessionStorage.getItem(KEYS.session) || "null"); }
        catch (_) { return null; }
    };
    const teamName = team => String(team.teamName || team.team_name || `Team ${team.username}`).trim();
    const escapeHTML = value => {
        const node = document.createElement("span");
        node.textContent = String(value ?? "");
        return node.innerHTML;
    };

    const VRS_TEAMS_2025_01_01 = [
        ["G2",1951],["Spirit",1921],["Vitality",1837],["The MongolZ",1835],["FaZe",1816],["MOUZ",1774],["Natus Vincere",1748],["HEROIC",1688],["Liquid",1646],["FURIA",1585],["paiN",1439],["3DMAX",1425],["MIBR",1422],["Eternal Fire",1407],["Complexity",1366],["SAW",1364],["GamerLegion",1362],["BIG",1334],["FlyQuest",1331],["Astralis",1330],["Virtus.pro",1305],["Wildcard",1305],["Sangal",1275],["Imperial Valkyries",1254],["FURIA fe",1252],["Nemiga",1235],["Fluxo",1212],["ENCE",1211],["NAVI Javelins",1208],["9 Pandas",1206],["M80",1203],["Nexus",1182],["B8",1182],["ECLOT",1180],["Passion UA",1178],["BETBOOM",1177],["NRG",1175],["Imperial",1173],["Partizan",1171],["GUN5",1164],["Cloud9",1157],["Metizport",1154],["fnatic",1153],["PEGADA",1140],["BESTIA",1140],["ATOX",1138],["Spirit Academy",1138],["NAVI Junior",1138],["Ninjas in Pyjamas",1131],["Sharks",1129],["Monte",1105],["Johnny Speeds",1099],["500",1092],["Legacy",1089],["Falcons",1080],["RED Canids",1075],["Nouns",1065],["ECSTATIC",1054],["Sashi",1050],["9INE",1049],["UNPAID",1049],["SINNERS",1046],["9z",1034],["BOSS",1031],["Zero Tenacity",1026],["Aurora Young Blud",1022],["France fe",1004],["Aurora",1002],["Into the Breach",998],["ODDIK",993],["OG",988],["Rare Atom",985],["ALTERNATE aTTaX",980],["los kogutos",971],["Gaimin Gladiators",969],["PARIVISION",959],["FAVBET",950],["Lynn Vision",948],["Betclic",948],["Solid",943],["timbermen",941],["KOI",940],["TYLOO",935],["AMKAL",933],["Party Astronauts",920],["TSM",915],["Fire Flux",914],["The Huns",913],["CYBERSHOCK",912],["UNiTY",900],["Monte Gen",899],["DMS",897],["kONO",892],["DRILLAS",890],["CPH Wolves",881],["ex-Enterprise",877],["Hungary",875],["BC.Game",875],["FLUFFY AIMERS",875],["Sampi",874],["Alliance",873],["Verdant",871],["L&G",869],["RUSH BRUSH B",869],["WOPA",868],["Insilio",864],["BIG EQUIPA",864],["JANO",862],["Illuminar",859],["RBLS",858],["Fluxo Demons",855],["Undone",850],["Endpoint",845],["inSanitY",838],["KRÜ",827],["HOTU",817],["Revenant",816],["Tropa do Taco",814],["Rhyno",811],["Dusty Roots",808],["Chinggis Warriors",806],["Anonymo",803],["NIP Impact",799],["TNL",798],["ENCE Academy",792],["Case",791],["Young Ninjas",782],["GenOne",781],["Kappa Bar",778],["EYEBALLERS",777],["K27 fe",774],["FLuffy Gangsters",772],["Hype",772],["E-Xolos LAZER",770],["ARCRED",767],["MOUZ NXT",758],["Denmark fe",758],["Shimmer",751],["Vagrants",742],["Astralis Talent",740],["Vikings KR",739],["Akimbo",731],["ex-GR",731],["Players",729],["FlyQuest RED",721],["Revenge Nation",719],["JiJieHao",718],["Bad News Chickens",714],["Take Flyte",713],["Gods Reign",713],["ShindeN",713],["GameHunters",712],["1win",709],["MIBR fe",705],["Bromo",703],["Heimo",701],["Mindfreak",700],["DASH",696],["Galorys",696],["Rooster",693],["Spirit fe",688],["Betera",684],["Daystar",682],["Atrix",677],["The Art of War",670],["W7M",669],["MIBR Academy",667],["Yawara",666],["Bounty Hunters",666],["Qiang",660],["NITRO",655],["QUAZAR",654],["Intense",651],["inSanitY fe",651],["SovvyKiNG",649],["TALON",645],["RUBY",644],["Preasy",643],["CatEvil",638],["thekillaz fe",638],["G2 Ares",633],["Limitless",632],["Housebets",631],["DXA",627],["Patins da Ferrari",623],["Viperio",621],["Arcade",620],["KZG",618],["InControl",615],["2070",615],["Canada",613],["Final Form",609],["K27",607],["LAG",598],["PEAK fe",597],["MANTRA",594],["JOGA DE TERNO",587],["LaChampionsLiga",576],["WW",573],["Kosovo",568],["Mythic",568],["VELOX",560],["9z Academy",557],["Alter Ego",551],["GameAgents",516],["HAVU",511],["Vantage",506],["ADEPTS",506],["Aether",504],["SPORT",496],["True Rippers",494],["DETONATE",486],["USA",467],["paiN Academy",409]
    ];

    function ensureNavigation() {
        const nav = document.getElementById("main-nav-list");
        if (!nav) return;
        for (const [view, label] of [["team", "👥 Teams"], ["ranking", "🏆 Ranking"]]) {
            if (nav.querySelector(`[data-view="${view}"]`)) continue;
            const item = document.createElement("li");
            const button = document.createElement("button");
            button.type = "button"; button.className = "nav-item"; button.dataset.view = view; button.textContent = label;
            item.append(button); nav.insertBefore(item, document.getElementById("admin-nav-li") || null);
        }
    }

    function hideSidebarTeams() {
        document.getElementById("team-sidebar-title")?.classList.add("hidden");
        document.getElementById("team-nav-list")?.classList.add("hidden");
    }

    function showView(name, title) {
        document.querySelectorAll(".view-section").forEach(section => section.classList.remove("active"));
        document.getElementById(`view-${name}`)?.classList.add("active");
        document.querySelectorAll("#main-nav-list .nav-item").forEach(button => button.classList.toggle("active", button.dataset.view === name));
        const heading = document.getElementById("view-title"); if (heading) heading.textContent = title;
    }

    function renderDirectory() {
        hideSidebarTeams();
        const list = document.getElementById("team-directory-list"); if (!list) return;
        const all = players(); list.replaceChildren();
        if (!all.length) { const empty = document.createElement("li"); empty.className = "empty-team-hint"; empty.textContent = "Noch keine Teams vorhanden."; list.append(empty); return; }
        all.forEach(team => { const item = document.createElement("li"); const button = document.createElement("button"); button.type = "button"; button.className = "team-directory-item"; button.dataset.teamOpen = team.username; button.innerHTML = `<span class="team-directory-icon">🛡️</span><span><strong>${escapeHTML(teamName(team))}</strong><small>Spielerteam · Manager: ${escapeHTML(team.username)}</small></span><span class="team-directory-arrow">›</span>`; item.append(button); list.append(item); });
    }

    function showDirectory() { selectedTeamUsername = null; showView("team", "Meine Teams"); document.getElementById("team-details")?.classList.add("hidden"); document.getElementById("team-directory")?.classList.remove("hidden"); renderDirectory(); }

    function openTeam(username) {
        const team = players().find(item => item.username === username); if (!team) return;
        selectedTeamUsername = team.username; hideSidebarTeams(); showView("team", teamName(team));
        document.getElementById("team-directory")?.classList.add("hidden"); document.getElementById("team-details")?.classList.remove("hidden");
        const name = teamName(team);
        document.getElementById("team-view-name").textContent = name; document.getElementById("team-view-badge").textContent = "🛡️";
        document.getElementById("team-view-owner").textContent = `Spielerteam · Manager: ${team.username}`;
        document.getElementById("team-view-owner-inline").textContent = team.username;
        const roster = Array.isArray(team.roster) ? team.roster : (Array.isArray(team.players) ? team.players : []);
        const stats = document.querySelectorAll("#team-details .team-details-grid .stat-value");
        if (stats[0]) stats[0].textContent = team.status || "Aktiv"; if (stats[1]) stats[1].textContent = `${roster.length} / 5 Spieler`; if (stats[2]) stats[2].textContent = `${(Number(team.budget) || 10000).toLocaleString("de-DE")} $`;
        const rosterPanel = document.querySelector("#team-details .placeholder-box");
        if (rosterPanel) rosterPanel.innerHTML = roster.length ? `<strong>Kader von ${escapeHTML(name)}</strong><ul class="team-roster-list">${roster.map(player => `<li>${escapeHTML(typeof player === "string" ? player : (player.name || player.username || "Spieler"))}</li>`).join("")}</ul>` : `Noch keine Spieler im Kader von <strong>${escapeHTML(name)}</strong> eingetragen.`;
        const header = document.querySelector("#team-details .team-header"); if (!header) return;
        let actions = document.getElementById("team-manager-actions"); if (!actions) { actions = document.createElement("div"); actions.id = "team-manager-actions"; actions.className = "team-manager-actions"; header.append(actions); } actions.replaceChildren();
        const viewer = user();
        if (viewer?.role === "player" && viewer.username === team.username) { const form = document.createElement("form"); form.id = "rename-team-form"; form.className = "rename-team-form"; form.dataset.owner = team.username; form.innerHTML = `<label for="rename-team-input">Dein Team umbenennen</label><div class="rename-team-controls"><input id="rename-team-input" type="text" maxlength="40" required value="${escapeHTML(name)}"><button type="submit" class="btn btn-primary btn-small">Speichern</button></div><p id="team-rename-feedback" class="rename-team-feedback" aria-live="polite"></p>`; actions.append(form); }
        const back = document.createElement("button"); back.type = "button"; back.className = "btn btn-secondary btn-small"; back.dataset.teamBack = "true"; back.textContent = "← Alle Teams"; actions.append(back);
    }

    function renderRanking() {
        const target = document.getElementById("ranking-content"); if (!target) return;
        const playerTeams = players().map(team => ({ name: teamName(team), manager: team.username, points: Number(team.points) || 0, official: false }));
        const officialTeams = VRS_TEAMS_2025_01_01.map(([name, points]) => ({ name, manager: "HLTV / VRS", points, official: true }));
        const all = [...playerTeams, ...officialTeams].sort((a, b) => b.points - a.points || a.name.localeCompare(b.name, "de"));
        target.innerHTML = `<div class="ranking-table-wrap"><table class="ranking-table"><thead><tr><th>Platz</th><th>Team</th><th>Art</th><th>Manager / Quelle</th><th>Punkte</th></tr></thead><tbody>${all.map((team, index) => `<tr><td>${index + 1}</td><td>${team.official ? "🏆" : "🛡️"} ${escapeHTML(team.name)}</td><td>${team.official ? "HLTV-Team" : "Spielerteam"}</td><td>${escapeHTML(team.manager)}</td><td><strong>${team.points.toLocaleString("de-DE")}</strong></td></tr>`).join("")}</tbody></table></div><p class="ranking-note">🏆 = offizielles HLTV-/VRS-Team · 🛡️ = von Spielern verwaltetes Team. HLTV-Datenstand: 1. Januar 2025.</p>`;
    }

    function renderNews() { const feed = document.getElementById("news-feed"); if (!feed) return; const admin = user()?.role === "admin"; feed.innerHTML = readJSON(KEYS.news).map(article => `<article class="news-item"><div class="news-meta">Veröffentlicht am ${escapeHTML(article.date)} von ${escapeHTML(article.author)}</div><h3>${escapeHTML(article.title)}</h3><p>${escapeHTML(article.body)}</p>${admin ? `<div class="news-admin-actions"><button class="btn btn-secondary btn-small" type="button" data-news-action="edit" data-news-id="${escapeHTML(article.id)}">✏️ Bearbeiten</button><button class="btn btn-danger btn-small" type="button" data-news-action="delete" data-news-id="${escapeHTML(article.id)}">🗑️ Löschen</button></div>` : ""}`).join(""); }

    function resetNewsEditor() { editingNewsId = null; document.getElementById("news-form")?.reset(); const heading = document.getElementById("news-form-heading"); const submit = document.getElementById("news-submit-btn"); if (heading) heading.textContent = "Neue HLTV-News veröffentlichen (Admin)"; if (submit) submit.textContent = "News posten"; document.getElementById("news-cancel-edit-btn")?.classList.add("hidden"); }

    document.addEventListener("DOMContentLoaded", () => {
        ensureNavigation(); hideSidebarTeams(); renderDirectory(); renderRanking(); window.renderNews = renderNews; renderNews();
        document.addEventListener("click", event => {
            const teamNav = event.target.closest('#main-nav-list [data-view="team"]'); const rankingNav = event.target.closest('#main-nav-list [data-view="ranking"]'); const back = event.target.closest("[data-team-back]"); const card = event.target.closest("[data-team-open]");
            if (teamNav) { event.preventDefault(); event.stopImmediatePropagation(); showDirectory(); }
            else if (back) { event.preventDefault(); event.stopImmediatePropagation(); showDirectory(); }
            else if (card) { event.preventDefault(); event.stopImmediatePropagation(); openTeam(card.dataset.teamOpen); }
            else if (rankingNav) { renderRanking(); }
        }, true);
        document.getElementById("view-team")?.addEventListener("submit", event => { if (!event.target.matches("#rename-team-form")) return; event.preventDefault(); const viewer = user(); const owner = event.target.dataset.owner; if (viewer?.role !== "player" || !selectedTeamUsername || owner !== selectedTeamUsername || viewer.username !== selectedTeamUsername) return; const newName = document.getElementById("rename-team-input").value.trim().slice(0, 40); const feedback = document.getElementById("team-rename-feedback"); if (!newName) { if (feedback) { feedback.textContent = "Bitte gib einen Teamnamen ein."; feedback.className = "rename-team-feedback error"; } return; } const stored = readJSON(KEYS.players).map(item => typeof item === "string" ? { username: item } : item); const ownTeam = stored.find(item => item.username === viewer.username); if (!ownTeam || ownTeam.username !== selectedTeamUsername) return; ownTeam.teamName = newName; localStorage.setItem(KEYS.players, JSON.stringify(stored)); renderDirectory(); renderRanking(); openTeam(viewer.username); const saved = document.getElementById("team-rename-feedback"); if (saved) { saved.textContent = "Teamname erfolgreich gespeichert."; saved.className = "rename-team-feedback success"; } });
        document.getElementById("news-form")?.addEventListener("submit", event => { if (editingNewsId === null || user()?.role !== "admin") return; event.preventDefault(); event.stopImmediatePropagation(); const items = readJSON(KEYS.news); const article = items.find(item => String(item.id) === String(editingNewsId)); if (!article) { resetNewsEditor(); return; } article.title = document.getElementById("news-title-input").value.trim(); article.body = document.getElementById("news-body-input").value.trim(); article.date = new Date().toLocaleDateString("de-DE"); article.author = user().username; localStorage.setItem(KEYS.news, JSON.stringify(items)); resetNewsEditor(); renderNews(); }, true);
        document.getElementById("news-cancel-edit-btn")?.addEventListener("click", resetNewsEditor);
        document.getElementById("news-feed")?.addEventListener("click", event => { const button = event.target.closest("[data-news-action]"); if (!button || user()?.role !== "admin") return; const items = readJSON(KEYS.news); const article = items.find(item => String(item.id) === String(button.dataset.newsId)); if (!article) return; if (button.dataset.newsAction === "edit") { editingNewsId = article.id; document.getElementById("news-title-input").value = article.title || ""; document.getElementById("news-body-input").value = article.body || ""; document.getElementById("news-form-heading").textContent = "News-Artikel bearbeiten"; document.getElementById("news-submit-btn").textContent = "Änderungen speichern"; document.getElementById("news-cancel-edit-btn").classList.remove("hidden"); document.getElementById("admin-news-creator").scrollIntoView({ behavior: "smooth", block: "start" }); } else if (button.dataset.newsAction === "delete" && confirm(`News-Artikel „${article.title}“ wirklich löschen?`)) { localStorage.setItem(KEYS.news, JSON.stringify(items.filter(item => String(item.id) !== String(article.id)))); renderNews(); } });
        document.getElementById("open-password-modal-btn")?.addEventListener("click", () => { const form = document.getElementById("change-password-form"); if (form && !document.getElementByID("password-security-warning")) { const warning = document.createElement("p"); warning.id = "password-security-warning"; warning.className = "password-security-warning"; warning.textContent = "Sicherheitshinweis: Nutze hier niemals ein Passwort, das du auch für andere Dienste verwendest. Diese Seite ist nicht für sichere Konten ausgelegt."; form.prepend(warning); } });
        ["player-login-form", "admin-login-form"].forEach(id => document.getElementById(id)?.addEventListener("submit", () => setTimeout(renderNews, 0)));
        document.getElementById("add-player-form")?.addEventListener("submit", () => setTimeout(() => { renderDirectory(); renderRanking(); }, 0));
        document.getElementById("admin-player-list")?.addEventListener("click", () => setTimeout(() => { renderDirectory(); renderRanking(); }, 0));
        window.addEventListener("storage", event => { if (event.key === KEYS.players) { renderDirectory(); renderRanking(); } if (event.key === KEYS.news) renderNews(); });
    });
})();
