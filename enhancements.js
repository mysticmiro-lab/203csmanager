// Admin news controls, manager-owned team renaming, ranking, and team directory.
(() => {
    const keys = { players: "hltv_game_players", news: "hltv_game_news", session: "hltv_game_session" };
    let editingNewsId = null;

    const escapeHTML = value => {
        const node = document.createElement("span");
        node.textContent = String(value ?? "");
        return node.innerHTML;
    };
    const readJSON = (key, fallback = []) => {
        try { return JSON.parse(localStorage.getItem(key)) || fallback; }
        catch { return fallback; }
    };
    const players = () => readJSON(keys.players).map(player => typeof player === "string" ? { username: player } : player);
    const newsItems = () => readJSON(keys.news);
    const sessionUser = () => {
        try { return JSON.parse(sessionStorage.getItem(keys.session) || "null"); }
        catch { return null; }
    };
    const isAdmin = () => sessionUser()?.role === "admin";
    const currentUsername = () => sessionUser()?.username;
    const teamName = player => player.teamName?.trim() || `Team ${player.username}`;

    function updateTeamDirectory() {
        const sidebarTitle = document.getElementById("team-sidebar-title");
        const sidebarList = document.getElementById("team-nav-list");
        const directory = document.getElementById("team-directory-list");
        if (!sidebarTitle || !sidebarList || !directory) return;
        sidebarTitle.classList.add("hidden");
        sidebarList.classList.add("hidden");
        const allPlayers = players();
        directory.innerHTML = allPlayers.length
            ? allPlayers.map(player => `<li><button type="button" class="team-directory-item" data-team-open="${escapeHTML(player.username)}"><span class="team-directory-icon">🛡️</span><span><strong>${escapeHTML(teamName(player))}</strong><small>Manager: ${escapeHTML(player.username)}</small></span><span class="team-directory-arrow">›</span></button></li>`).join("")
            : '<li class="empty-team-hint">Noch keine Teams vorhanden.</li>';
    }

    function renderRanking() {
        const target = document.getElementById("ranking-content");
        if (!target) return;
        const allPlayers = players().sort((a, b) => teamName(a).localeCompare(teamName(b), "de"));
        target.innerHTML = allPlayers.length
            ? `<div class="ranking-table-wrap"><table class="ranking-table"><thead><tr><th>Platz</th><th>Team</th><th>Manager</th><th>Punkte</th></tr></thead><tbody>${allPlayers.map((player, index) => `<tr><td><span class="ranking-position">${index + 1}</span></td><td>🛡️ ${escapeHTML(teamName(player))}</td><td>${escapeHTML(player.username)}</td><td>–</td></tr>`).join("")}</tbody></table></div><p class="ranking-note">Punkte sind noch nicht verfügbar, da das Spiel aktuell keine Punktestände speichert.</p>`
            : '<div class="placeholder-box">Noch keine Teams im Ranking. Teams werden nach der Registrierung hier angezeigt.</div>';
    }

    function resetNewsEditor() {
        editingNewsId = null;
        document.getElementById("news-form")?.reset();
        const heading = document.getElementById("news-form-heading");
        const submit = document.getElementById("news-submit-btn");
        const cancel = document.getElementById("news-cancel-edit-btn");
        if (heading) heading.textContent = "Neue HLTV-News veröffentlichen (Admin)";
        if (submit) submit.textContent = "News posten";
        cancel?.classList.add("hidden");
    }

    function renderNewsWithAdminControls() {
        const feed = document.getElementById("news-feed");
        if (!feed) return;
        feed.innerHTML = newsItems().map(item => `<article class="news-item"><div class="news-meta">Veröffentlicht am ${escapeHTML(item.date)} von ${escapeHTML(item.author)}</div><h3>${escapeHTML(item.title)}</h3><p>${escapeHTML(item.body)}</p>${isAdmin() ? `<div class="news-admin-actions"><button type="button" class="btn btn-secondary btn-small" data-news-action="edit" data-news-id="${escapeHTML(item.id)}">✏️ Bearbeiten</button><button type="button" class="btn btn-danger btn-small" data-news-action="delete" data-news-id="${escapeHTML(item.id)}">🗑️ Löschen</button></div>` : ""}</article>`).join("");
    }

    function ensureRankingNavigation() {
        const nav = document.getElementById("main-nav-list");
        if (!nav || nav.querySelector('[data-view="ranking"]')) return;
        const li = document.createElement("li");
        li.innerHTML = '<button class="nav-item" data-view="ranking" type="button">🏆 Ranking</button>';
        nav.insertBefore(li, document.getElementById("admin-nav-li") || null);
    }

    function renderTeamDetails(username) {
        const player = players().find(item => item.username === username);
        if (!player) return;
        document.getElementById("team-view-name").textContent = teamName(player);
        document.getElementById("team-view-badge").textContent = teamName(player).charAt(0).toUpperCase();
        document.getElementById("view-title").textContent = teamName(player);
        const header = document.querySelector("#team-details .team-header");
        if (!header) return;
        let actions = document.getElementById("team-manager-actions");
        if (!actions) {
            actions = document.createElement("div");
            actions.id = "team-manager-actions";
            actions.className = "team-manager-actions";
            header.append(actions);
            actions.addEventListener("submit", event => {
                if (!event.target.matches("#rename-team-form")) return;
                event.preventDefault();
                const viewer = currentUsername();
                const ownPlayer = players().find(item => item.username === viewer);
                if (!ownPlayer || viewer !== username || isAdmin()) return;
                const input = document.getElementById("rename-team-input");
                const newName = input.value.trim();
                if (!newName) return;
                const allPlayers = readJSON(keys.players).map(item => typeof item === "string" ? { username: item } : item);
                const stored = allPlayers.find(item => item.username === viewer);
                if (!stored) return;
                stored.teamName = newName.slice(0, 40);
                localStorage.setItem(keys.players, JSON.stringify(allPlayers));
                renderTeamDetails(viewer);
                updateTeamDirectory();
                renderRanking();
            });
        }
        const isOwner = currentUsername() === username && !isAdmin();
        actions.innerHTML = `${isOwner ? `<form id="rename-team-form" class="rename-team-form"><label for="rename-team-input">Teamnamen ändern</label><div class="rename-team-controls"><input id="rename-team-input" type="text" maxlength="40" required value="${escapeHTML(teamName(player))}" aria-label="Neuer Teamname"><button class="btn btn-primary btn-small" type="submit">Speichern</button></div></form>` : ""}<button type="button" id="back-to-teams-btn" class="btn btn-secondary btn-small">← Alle Teams</button>`;
        document.getElementById("back-to-teams-btn")?.addEventListener("click", () => {
            document.getElementById("team-details")?.classList.add("hidden");
            document.getElementById("team-directory")?.classList.remove("hidden");
            window.switchView?.("team");
        });
    }

    document.addEventListener("DOMContentLoaded", () => {
        ensureRankingNavigation();
        updateTeamDirectory();
        renderRanking();
        // window.renderNews is used by the app's cross-tab update handler.
        window.renderNews = renderNewsWithAdminControls;
        renderNewsWithAdminControls();

        document.getElementById("main-nav-list")?.addEventListener("click", event => {
            if (event.target.closest('[data-view="ranking"]')) renderRanking();
        });
        document.getElementById("team-directory-list")?.addEventListener("click", event => {
            const button = event.target.closest("[data-team-open]");
            if (!button) return;
            const username = button.dataset.teamOpen;
            document.getElementById("team-directory")?.classList.add("hidden");
            document.getElementById("team-details")?.classList.remove("hidden");
            // Use the original app's registered navigation handler to open its team view.
            const sidebarButton = document.querySelector(`#team-nav-list [data-team="${CSS.escape(username)}"]`);
            if (sidebarButton) sidebarButton.click();
            renderTeamDetails(username);
        });
        document.getElementById("news-form")?.addEventListener("submit", event => {
            if (editingNewsId === null || !isAdmin()) return;
            event.preventDefault();
            event.stopImmediatePropagation();
            const items = newsItems();
            const article = items.find(item => String(item.id) === String(editingNewsId));
            if (!article) { resetNewsEditor(); return; }
            article.title = document.getElementById("news-title-input").value.trim();
            article.body = document.getElementById("news-body-input").value.trim();
            article.date = new Date().toLocaleDateString("de-DE");
            article.author = currentUsername();
            localStorage.setItem(keys.news, JSON.stringify(items));
            resetNewsEditor();
            renderNewsWithAdminControls();
        }, true);
        document.getElementById("news-cancel-edit-btn")?.addEventListener("click", resetNewsEditor);
        document.getElementById("news-feed")?.addEventListener("click", event => {
            const button = event.target.closest("[data-news-action]");
            if (!button || !isAdmin()) return;
            const id = button.dataset.newsId;
            const items = newsItems();
            const article = items.find(item => String(item.id) === String(id));
            if (!article) return;
            if (button.dataset.newsAction === "edit") {
                editingNewsId = article.id;
                document.getElementById("news-title-input").value = article.title || "";
                document.getElementById("news-body-input").value = article.body || "";
                document.getElementById("news-form-heading").textContent = "News-Artikel bearbeiten";
                document.getElementById("news-submit-btn").textContent = "Änderungen speichern";
                document.getElementById("news-cancel-edit-btn").classList.remove("hidden");
                document.getElementById("admin-news-creator").scrollIntoView({ behavior: "smooth", block: "start" });
                document.getElementById("news-title-input").focus();
            } else if (button.dataset.newsAction === "delete" && confirm(`News-Artikel „${article.title}“ wirklich löschen?`)) {
                localStorage.setItem(keys.news, JSON.stringify(items.filter(item => String(item.id) !== String(id))));
                if (String(editingNewsId) === String(id)) resetNewsEditor();
                renderNewsWithAdminControls();
            }
        });
        window.addEventListener("storage", event => {
            if (event.key === keys.players) { updateTeamDirectory(); renderRanking(); }
            if (event.key === keys.news) renderNewsWithAdminControls();
        });
    });
})();
