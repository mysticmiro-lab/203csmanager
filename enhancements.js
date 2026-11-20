// UI enhancements for team directory, per-manager rename, ranking and admin news.
(() => {
    const KEYS = { players: "hltv_game_players", news: "hltv_game_news", session: "hltv_game_session" };
    let selectedTeamUsername = null;
    let editingNewsId = null;

    const readJSON = (key, fallback = []) => {
        try { return JSON.parse(localStorage.getItem(key)) || fallback; }
        catch (_) { return fallback; }
    };
    const getPlayers = () => readJSON(KEYS.players).map(item => typeof item === "string" ? { username: item } : item);
    const getUser = () => {
        try { return JSON.parse(sessionStorage.getItem(KEYS.session) || "null"); }
        catch (_) { return null; }
    };
    const getNews = () => readJSON(KEYS.news);
    const escapeHTML = value => {
        const span = document.createElement("span");
        span.textContent = String(value ?? "");
        return span.innerHTML;
    };
    const teamName = team => String(team.teamName || team.team_name || `Team ${team.username}`).trim();

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

    function renderDirectory() {
        const list = document.getElementById("team-directory-list");
        if (!list) return;
        document.getElementById("team-sidebar-title")?.classList.add("hidden");
        document.getElementById("team-nav-list")?.classList.add("hidden");
        const teams = getPlayers();
        list.innerHTML = teams.length ? teams.map(team => `
            <li><button type="button" class="team-directory-item" data-team-open="${escapeHTML(team.username)}">
                <span class="team-directory-icon">🛡️</span>
                <span><strong>${escapeHTML(teamName(team))}</strong><small>Manager: ${escapeHTML(team.username)}</small></span>
                <span class="team-directory-arrow">›</span>
            </button></li>`).join("") : '<li class="empty-team-hint">Noch keine Teams vorhanden.</li>';
    }

    function renderRanking() {
        const target = document.getElementById("ranking-content");
        if (!target) return;
        const teams = getPlayers().sort((a, b) => teamName(a).localeCompare(teamName(b), "de"));
        target.innerHTML = teams.length ? `
            <div class="ranking-table-wrap"><table class="ranking-table"><thead><tr><th>Platz</th><th>Team</th><th>Manager</th><th>Punkte</th></tr></thead>
            <tbody>${teams.map((team, index) => `<tr><td>${index + 1}</td><td>🛡️ ${escapeHTML(teamName(team))}</td><td>${escapeHTML(team.username)}</td><td>–</td></tr>`).join("")}</tbody></table></div>
            <p class="ranking-note">Punkte sind noch nicht verfügbar, da das Spiel aktuell keine Punktestände speichert.</p>`
            : '<div class="placeholder-box">Noch keine Teams im Ranking.</div>';
    }

    function setDirectoryVisible(visible) {
        document.getElementById("team-directory")?.classList.toggle("hidden", !visible);
        document.getElementById("team-details")?.classList.toggle("hidden", visible);
    }

    function renderTeam(username) {
        const team = getPlayers().find(item => item.username === username);
        if (!team) return;
        selectedTeamUsername = team.username;
        setDirectoryVisible(false);

        // The rename form must be tied to the team currently open, never just to the logged-in user.
        const current = getUser();
        const mayRenameThisTeam = current?.role === "player" && current.username === team.username;
        const name = teamName(team);
        const ownerControls = document.getElementById("team-manager-actions");
        if (ownerControls) {
            ownerControls.innerHTML = `${mayRenameThisTeam ? `
                <form id="rename-team-form" class="rename-team-form" data-owner="${escapeHTML(team.username)}">
                    <label for="rename-team-input">Dein Team umbenennen</label>
                    <div class="rename-team-controls"><input id="rename-team-input" type="text" maxlength="40" required value="${escapeHTML(name)}"><button type="submit" class="btn btn-primary btn-small">Speichern</button></div>
                    <p id="team-rename-feedback" class="rename-team-feedback" aria-live="polite"></p>
                </form>` : ""}<button type="button" id="back-to-teams-btn" class="btn btn-secondary btn-small">← Alle Teams</button>`;
        }

        if (typeof window.openTeamView === "function") window.openTeamView(team.username);
        document.getElementById("team-view-name").textContent = name;
        document.getElementById("team-view-badge").textContent = name.charAt(0).toUpperCase();
        document.getElementById("team-view-owner").textContent = `Manager: ${team.username}`;
        document.getElementById("team-view-owner-inline").textContent = team.username;
        document.getElementById("view-title").textContent = name;

        const roster = Array.isArray(team.roster) ? team.roster : (Array.isArray(team.players) ? team.players : []);
        const values = document.querySelectorAll("#view-team .team-details-grid .stat-value");
        if (values[0]) values[0].textContent = team.status || "Aktiv";
        if (values[1]) values[1].textContent = `${roster.length} / 5 Spieler`;
        if (values[2]) values[2].textContent = `${(Number(team.budget) || 10000).toLocaleString("de-DE")} $`;
        const panel = document.querySelector("#view-team .placeholder-box");
        if (panel) panel.innerHTML = roster.length
            ? `<strong>Kader von ${escapeHTML(name)}</strong><ul class="team-roster-list">${roster.map(player => `<li>${escapeHTML(typeof player === "string" ? player : (player.name || player.username || "Spieler"))}</li>`).join("")}</ul>`
            : `Noch keine Spieler im Kader von <strong>${escapeHTML(name)}</strong> eingetragen.`;
    }

    function renderNews() {
        const feed = document.getElementById("news-feed");
        if (!feed) return;
        const admin = getUser()?.role === "admin";
        feed.innerHTML = getNews().map(article => `<article class="news-item">
            <div class="news-meta">Veröffentlicht am ${escapeHTML(article.date)} von ${escapeHTML(article.author)}</div>
            <h3>${escapeHTML(article.title)}</h3><p>${escapeHTML(article.body)}</p>
            ${admin ? `<div class="news-admin-actions"><button class="btn btn-secondary btn-small" type="button" data-news-action="edit" data-news-id="${escapeHTML(article.id)}">✏️ Bearbeiten</button><button class="btn btn-danger btn-small" type="button" data-news-action="delete" data-news-id="${escapeHTML(article.id)}">🗑️ Löschen</button></div>` : ""}
        </article>`).join("");
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

    document.addEventListener("DOMContentLoaded", () => {
        ensureNavigation();
        renderDirectory();
        renderRanking();
        window.renderNews = renderNews;
        renderNews();

        document.getElementById("main-nav-list")?.addEventListener("click", event => {
            if (event.target.closest('[data-view="team"]')) {
                selectedTeamUsername = null;
                setDirectoryVisible(true);
                renderDirectory();
            }
            if (event.target.closest('[data-view="ranking"]')) renderRanking();
        });

        document.getElementById("team-directory-list")?.addEventListener("click", event => {
            const button = event.target.closest("[data-team-open]");
            if (button) renderTeam(button.dataset.teamOpen);
        });

        // Enforce the displayed team's identity at submit time. This prevents a stale or
        // misplaced rename form on another team's page from editing/redirecting to yours.
        document.getElementById("view-team")?.addEventListener("submit", event => {
            if (!event.target.matches("#rename-team-form")) return;
            event.preventDefault();
            const current = getUser();
            const formOwner = event.target.dataset.owner;
            if (current?.role !== "player" || !selectedTeamUsername || formOwner !== selectedTeamUsername || current.username !== selectedTeamUsername) {
                event.target.remove();
                return;
            }
            const newName = document.getElementById("rename-team-input").value.trim().slice(0, 40);
            const feedback = document.getElementById("team-rename-feedback");
            if (!newName) {
                feedback.textContent = "Bitte gib einen Teamnamen ein.";
                feedback.className = "rename-team-feedback error";
                return;
            }
            const stored = readJSON(KEYS.players).map(item => typeof item === "string" ? { username: item } : item);
            const ownTeam = stored.find(item => item.username === current.username);
            if (!ownTeam || ownTeam.username !== selectedTeamUsername) return;
            ownTeam.teamName = newName;
            localStorage.setItem(KEYS.players, JSON.stringify(stored));
            renderDirectory();
            renderTeam(current.username);
            const savedMessage = document.getElementById("team-rename-feedback");
            if (savedMessage) {
                savedMessage.textContent = "Teamname erfolgreich gespeichert.";
                savedMessage.className = "rename-team-feedback success";
            }
        });

        document.getElementById("view-team")?.addEventListener("click", event => {
            if (!event.target.closest("#back-to-teams-btn")) return;
            selectedTeamUsername = null;
            setDirectoryVisible(true);
            renderDirectory();
            if (typeof window.switchView === "function") window.switchView("team");
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
            localStorage.setItem(KEYS.news, JSON.stringify(items));
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
                localStorage.setItem(KEYS.news, JSON.stringify(items.filter(item => String(item.id) !== String(article.id))));
                renderNews();
            }
        });

        document.getElementById("open-password-modal-btn")?.addEventListener("click", () => {
            const form = document.getElementById("change-password-form");
            if (form && !document.getElementById("password-security-warning")) {
                const warning = document.createElement("p");
                warning.id = "password-security-warning";
                warning.className = "password-security-warning";
                warning.textContent = "Sicherheitshinweis: Nutze hier niemals ein Passwort, das du auch für andere Dienste verwendest. Diese Seite ist nicht für sichere Konten ausgelegt.";
                form.prepend(warning);
            }
        });

        ["player-login-form", "admin-login-form"].forEach(id => document.getElementById(id)?.addEventListener("submit", () => setTimeout(renderNews, 0)));
        document.getElementById("add-player-form")?.addEventListener("submit", () => setTimeout(() => { renderDirectory(); renderRanking(); }, 0));
        document.getElementById("admin-player-list")?.addEventListener("click", () => setTimeout(() => { renderDirectory(); renderRanking(); }, 0));
        window.addEventListener("storage", event => {
            if (event.key === KEYS.players) { renderDirectory(); renderRanking(); }
            if (event.key === KEYS.news) renderNews();
        });
    });
})();
