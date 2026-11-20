// Team directory, shared team details, manager-only renaming, ranking and admin news tools.
(() => {
    const KEY = { players: "hltv_game_players", news: "hltv_game_news", session: "hltv_game_session" };
    let editingNewsId = null;

    const readJSON = (key, fallback = []) => {
        try { return JSON.parse(localStorage.getItem(key)) || fallback; }
        catch { return fallback; }
    };
    const getPlayers = () => readJSON(KEY.players).map(item => typeof item === "string" ? { username: item } : item);
    const getNews = () => readJSON(KEY.news);
    const getUser = () => {
        try { return JSON.parse(sessionStorage.getItem(KEY.session) || "null"); }
        catch { return null; }
    };
    const escapeHTML = value => {
        const node = document.createElement("span");
        node.textContent = String(value ?? "");
        return node.innerHTML;
    };
    const displayName = player => player.teamName?.trim() || `Team ${player.username}`;

    function updateTeamDirectory() {
        const list = document.getElementById("team-directory-list");
        const sidebarTitle = document.getElementById("team-sidebar-title");
        const sidebarList = document.getElementById("team-nav-list");
        if (!list) return;
        sidebarTitle?.classList.add("hidden");
        sidebarList?.classList.add("hidden");

        const teams = getPlayers();
        list.innerHTML = teams.length
            ? teams.map(team => `<li><button type="button" class="team-directory-item" data-team-open="${escapeHTML(team.username)}"><span class="team-directory-icon">🛡️</span><span><strong>${escapeHTML(displayName(team))}</strong><small>Manager: ${escapeHTML(team.username)}</small></span><span class="team-directory-arrow">›</span></button></li>`).join("")
            : '<li class="empty-team-hint">Noch keine Teams vorhanden.</li>';
    }

    function renderRanking() {
        const target = document.getElementById("ranking-content");
        if (!target) return;
        const teams = getPlayers().sort((a, b) => displayName(a).localeCompare(displayName(b), "de"));
        target.innerHTML = teams.length
            ? `<div class="ranking-table-wrap"><table class="ranking-table"><thead><tr><th>Platz</th><th>Team</th><th>Manager</th><th>Punkte</th></tr></thead><tbody>${teams.map((team, index) => `<tr><td><span class="ranking-position">${index + 1}</span></td><td>🛡️ ${escapeHTML(displayName(team))}</td><td>${escapeHTML(team.username)}</td><td>–</td></tr>`).join("")}</tbody></table></div><p class="ranking-note">Punkte sind noch nicht verfügbar, da das Spiel aktuell keine Punktestände speichert.</p>`
            : '<div class="placeholder-box">Noch keine Teams im Ranking. Teams werden nach der Registrierung hier angezeigt.</div>';
    }

    function ensureNavigation() {
        const nav = document.getElementById("main-nav-list");
        if (!nav) return;
        if (!nav.querySelector('[data-view="team"]')) {
            const item = document.createElement("li");
            item.innerHTML = '<button type="button" class="nav-item" data-view="team">👥 Teams</button>';
            nav.insertBefore(item, document.getElementById("admin-nav-li") || null);
        }
        if (!nav.querySelector('[data-view="ranking"]')) {
            const item = document.createElement("li");
            item.innerHTML = '<button type="button" class="nav-item" data-view="ranking">🏆 Ranking</button>';
            nav.insertBefore(item, document.getElementById("admin-nav-li") || null);
        }
    }

    function renderTeam(username) {
        const team = getPlayers().find(item => item.username === username);
        if (!team) return;
        document.getElementById("team-directory")?.classList.add("hidden");
        document.getElementById("team-details")?.classList.remove("hidden");
        if (typeof window.openTeamView === "function") window.openTeamView(username);

        const name = displayName(team);
        const roster = Array.isArray(team.roster) ? team.roster : (Array.isArray(team.players) ? team.players : []);
        const budget = Number.isFinite(Number(team.budget)) ? Number(team.budget) : 10000;
        document.getElementById("team-view-name").textContent = name;
        document.getElementById("team-view-badge").textContent = name.charAt(0).toUpperCase();
        document.getElementById("team-view-owner").textContent = `Manager: ${team.username}`;
        document.getElementById("team-view-owner-inline").textContent = team.username;
        document.getElementById("view-title").textContent = name;

        const statValues = document.querySelectorAll("#team-details .team-details-grid .stat-value");
        if (statValues[0]) statValues[0].textContent = team.status || "Aktiv";
        if (statValues[1]) statValues[1].textContent = `${roster.length} / 5 Spieler`;
        if (statValues[2]) statValues[2].textContent = `${budget.toLocaleString("de-DE")} $`;

        const overview = document.querySelector("#team-details > .placeholder-box");
        if (overview) {
            const rosterMarkup = roster.length
                ? `<ul class="team-roster-list">${roster.map(player => `<li>${escapeHTML(typeof player === "string" ? player : (player.name || player.username || "Spieler"))}</li>`).join("")}</ul>`
                : '<p class="team-empty-roster">Noch keine Spieler im Kader eingetragen.</p>';
            overview.innerHTML = `<div class="team-roster-heading">Kader von <strong>${escapeHTML(name)}</strong></div>${rosterMarkup}<p class="team-data-note">Kader und Budget werden derzeit lokal im Browser gespeichert. Für gemeinsame, geräteübergreifende Teamdaten wird ein Backend benötigt.</p>`;
        }

        const header = document.querySelector("#team-details .team-header");
        if (!header) return;
        let actions = document.getElementById("team-manager-actions");
        if (!actions) {
            actions = document.createElement("div");
            actions.id = "team-manager-actions";
            actions.className = "team-manager-actions";
            header.append(actions);
        }
        const viewer = getUser();
        const canRename = viewer?.role === "player" && viewer.username === username;
        actions.innerHTML = `${canRename ? `<form id="rename-team-form" class="rename-team-form"><label for="rename-team-input">Nur du kannst den Namen deines Teams ändern</label><div class="rename-team-controls"><input id="rename-team-input" type="text" maxlength="40" required value="${escapeHTML(name)}"><button type="submit" class="btn btn-primary btn-small">Speichern</button></div><p id="team-rename-feedback" class="team-rename-feedback" aria-live="polite"></p></form>` : ""}<button type="button" id="back-to-teams-btn" class="btn btn-secondary btn-small">← Alle Teams</button>`;
    }

    function renderNews() {
        const feed = document.getElementById("news-feed");
        if (!feed) return;
        const admin = getUser()?.role === "admin";
        feed.innerHTML = getNews().map(article => `<article class="news-item"><div class="news-meta">Veröffentlicht am ${escapeHTML(article.date)} von ${escapeHTML(article.author)}</div><h3>${escapeHTML(article.title)}</h3><p>${escapeHTML(article.body)}</p>${admin ? `<div class="news-admin-actions"><button type="button" class="btn btn-secondary btn-small" data-news-action="edit" data-news-id="${escapeHTML(article.id)}">✏️ Bearbeiten</button><button type="button" class="btn btn-danger btn-small" data-news-action="delete" data-news-id="${escapeHTML(article.id)}">🗑️ Löschen</button></div>` : ""}</article>`).join("");
    }

    function resetNewsEditor() {
        editingNewsId = null;
        document.getElementById("news-form")?.reset();
        const heading = document.getElementById("news-form-heading");
        const submit = document.getElementById("news-submit-btn");
        if (heading) heading.textContent = "Neue HLTV-News veröffentlichen (Admin)";
        if (submit) submit.textContent = "News posten";
        document.getElementById("news-cancel-edit-btn")?.classList.add("hidden");
    }

    function showTeamDirectory() {
        document.getElementById("team-details")?.classList.add("hidden");
        document.getElementById("team-directory")?.classList.remove("hidden");
        updateTeamDirectory();
    }

    document.addEventListener("DOMContentLoaded", () => {
        ensureNavigation();
        updateTeamDirectory();
        renderRanking();
        window.renderNews = renderNews;
        renderNews();

        // Open the directory when the Teams navigation item is selected.
        document.getElementById("main-nav-list")?.addEventListener("click", event => {
            if (event.target.closest('[data-view="team"]')) showTeamDirectory();
            if (event.target.closest('[data-view="ranking"]')) renderRanking();
        });
        document.getElementById("team-directory-list")?.addEventListener("click", event => {
            const button = event.target.closest("[data-team-open]");
            if (button) renderTeam(button.dataset.teamOpen);
        });
        document.getElementById("view-team")?.addEventListener("submit", event => {
            if (!event.target.matches("#rename-team-form")) return;
            event.preventDefault();
            const viewer = getUser();
            if (viewer?.role !== "player") return;
            const newName = document.getElementById("rename-team-input").value.trim().slice(0, 40);
            const feedback = document.getElementById("team-rename-feedback");
            if (!newName) return;
            const stored = readJSON(KEY.players).map(item => typeof item === "string" ? { username: item } : item);
            const ownTeam = stored.find(item => item.username === viewer.username);
            if (!ownTeam) return;
            ownTeam.teamName = newName;
            localStorage.setItem(KEY.players, JSON.stringify(stored));
            updateTeamDirectory();
            renderRanking();
            renderTeam(viewer.username);
            const updatedFeedback = document.getElementById("team-rename-feedback");
            if (updatedFeedback) { updatedFeedback.textContent = "Teamname gespeichert."; updatedFeedback.classList.add("success"); }
        });
        document.getElementById("view-team")?.addEventListener("click", event => {
            if (event.target.closest("#back-to-teams-btn")) {
                showTeamDirectory();
                if (typeof window.switchView === "function") window.switchView("team");
            }
        });
        document.getElementById("news-form")?.addEventListener("submit", event => {
            if (editingNewsId === null || getUser()?.role !== "admin") return;
            event.preventDefault();
            event.stopImmediatePropagation();
            const items = getNews();
            const article = items.find(item => String(item.id) === String(editingNewsId));
            if (!article) { resetNewsEditor(); return; }
            article.title = document.getElementById("news-title-input").value.trim();
            article.body = document.getElementById("news-body-input").value.trim();
            article.author = getUser().username;
            article.date = new Date().toLocaleDateString("de-DE");
            localStorage.setItem(KEY.news, JSON.stringify(items));
            resetNewsEditor();
            renderNews();
        }, true);
        document.getElementById("news-cancel-edit-btn")?.addEventListener("click", resetNewsEditor);
        document.getElementById("news-feed")?.addEventListener("click", event => {
            const button = event.target.closest("[data-news-action]");
            if (!button || getUser()?.role !== "admin") return;
            const items = getNews();
            const article = items.find(item => String(item.id) === String(button.dataset.newsId));
            if (!article) return;
            if (button.dataset.newsAction === "edit") {
                editingNewsId = article.id;
                document.getElementById("news-title-input").value = article.title || "";
                document.getElementById("news-body-input").value = article.body || "";
                document.getElementById("news-form-heading").textContent = "News-Artikel bearbeiten";
                document.getElementById("news-submit-btn").textContent = "Änderungen speichern";
                document.getElementById("news-cancel-edit-btn").classList.remove("hidden");
                document.getElementById("admin-news-creator").scrollIntoView({ behavior: "smooth", block: "start" });
            } else if (button.dataset.newsAction === "delete" && confirm(`News-Artikel „${article.title}“ wirklich löschen?`)) {
                localStorage.setItem(KEY.news, JSON.stringify(items.filter(item => String(item.id) !== String(article.id))));
                renderNews();
            }
        });

        // Make the security warning visible whenever the password dialog opens.
        document.getElementById("open-password-modal-btn")?.addEventListener("click", () => {
            const form = document.getElementById("change-password-form");
            if (form && !document.getElementById("password-security-warning")) {
                const warning = document.createElement("p");
                warning.id = "password-security-warning";
                warning.className = "password-security-warning";
                warning.textContent = "Sicherheitshinweis: Verwende hier auf keinen Fall ein echtes Passwort, das du aktuell für andere Dienste nutzt. Diese Seite speichert Anmeldedaten lokal im Browser und ist nicht für sichere Konten ausgelegt.";
                form.prepend(warning);
            }
        });
        ["player-login-form", "admin-login-form"].forEach(id => document.getElementById(id)?.addEventListener("submit", () => setTimeout(renderNews, 0)));
        document.getElementById("add-player-form")?.addEventListener("submit", () => setTimeout(() => { updateTeamDirectory(); renderRanking(); }, 0));
        document.getElementById("admin-player-list")?.addEventListener("click", () => setTimeout(() => { updateTeamDirectory(); renderRanking(); }, 0));
        window.addEventListener("storage", event => {
            if (event.key === KEY.players) { updateTeamDirectory(); renderRanking(); }
            if (event.key === KEY.news) renderNews();
        });
    });
})();
