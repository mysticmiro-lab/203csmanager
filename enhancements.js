// Admin news controls, manager-owned team renaming, ranking, and team directory.
(() => {
    const keys = { players: "hltv_game_players", news: "hltv_game_news", session: "hltv_game_session" };
    let editingNewsId = null;
    const escapeHTML = value => { const node = document.createElement("span"); node.textContent = String(value ?? ""); return node.innerHTML; };
    const readJSON = (key, fallback = []) => { try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch { return fallback; } };
    const players = () => readJSON(keys.players).map(player => typeof player === "string" ? { username: player } : player);
    const newsItems = () => readJSON(keys.news);
    const sessionUser = () => { try { return JSON.parse(sessionStorage.getItem(keys.session) || "null"); } catch { return null; } };
    const isAdmin = () => sessionUser()?.role === "admin";
    const currentUsername = () => sessionUser()?.username;
    const teamName = player => player.teamName?.trim() || `Team ${player.username}`;

    function updateTeamDirectory() {
        const title = document.getElementById("team-sidebar-title");
        const sidebar = document.getElementById("team-nav-list");
        const list = document.getElementById("team-directory-list");
        if (!title || !sidebar || !list) return;
        title.classList.add("hidden"); sidebar.classList.add("hidden");
        const all = players();
        list.innerHTML = all.length ? all.map(player => `<li><button type="button" class="team-directory-item" data-team-open="${escapeHTML(player.username)}"><span class="team-directory-icon">🛡️</span><span><strong>${escapeHTML(teamName(player))}</strong><small>Manager: ${escapeHTML(player.username)}</small></span><span class="team-directory-arrow">›</span></button></li>`).join("") : '<li class="empty-team-hint">Noch keine Teams vorhanden.</li>';
    }
    function renderRanking() {
        const target = document.getElementById("ranking-content"); if (!target) return;
        const all = players().sort((a,b) => teamName(a).localeCompare(teamName(b),"de"));
        target.innerHTML = all.length ? `<div class="ranking-table-wrap"><table class="ranking-table"><thead><tr><th>Platz</th><th>Team</th><th>Manager</th><th>Punkte</th></tr></thead><tbody>${all.map((p,i) => `<tr><td><span class="ranking-position">${i+1}</span></td><td>🛡️ ${escapeHTML(teamName(p))}</td><td>${escapeHTML(p.username)}</td><td>–</td></tr>`).join("")}</tbody></table></div><p class="ranking-note">Punkte sind noch nicht verfügbar, da das Spiel aktuell keine Punktestände speichert.</p>` : '<div class="placeholder-box">Noch keine Teams im Ranking. Teams werden nach der Registrierung hier angezeigt.</div>';
    }
    function resetNewsEditor() {
        editingNewsId = null; document.getElementById("news-form")?.reset();
        const heading = document.getElementById("news-form-heading"), submit = document.getElementById("news-submit-btn");
        if (heading) heading.textContent = "Neue HLTV-News veröffentlichen (Admin)";
        if (submit) submit.textContent = "News posten";
        document.getElementById("news-cancel-edit-btn")?.classList.add("hidden");
    }
    function renderNewsWithAdminControls() {
        const feed = document.getElementById("news-feed"); if (!feed) return;
        feed.innerHTML = newsItems().map(item => `<article class="news-item"><div class="news-meta">Veröffentlicht am ${escapeHTML(item.date)} von ${escapeHTML(item.author)}</div><h3>${escapeHTML(item.title)}</h3><p>${escapeHTML(item.body)}</p>${isAdmin() ? `<div class="news-admin-actions"><button type="button" class="btn btn-secondary btn-small" data-news-action="edit" data-news-id="${escapeHTML(item.id)}">✏️ Bearbeiten</button><button type="button" class="btn btn-danger btn-small" data-news-action="delete" data-news-id="${escapeHTML(item.id)}">🗑️ Löschen</button></div>` : ""}</article>`).join("");
    }
    function ensureRankingNavigation() {
        const nav = document.getElementById("main-nav-list"); if (!nav || nav.querySelector('[data-view="ranking"]')) return;
        const li = document.createElement("li"); li.innerHTML = '<button class="nav-item" data-view="ranking" type="button">🏆 Ranking</button>';
        nav.insertBefore(li, document.getElementById("admin-nav-li") || null);
    }
    function showTeam(username) {
        const player = players().find(item => item.username === username); if (!player) return;
        document.getElementById("team-directory")?.classList.add("hidden");
        document.getElementById("team-details")?.classList.remove("hidden");
        if (typeof window.openTeamView === "function") window.openTeamView(username);
        document.getElementById("team-view-name").textContent = teamName(player);
        document.getElementById("team-view-badge").textContent = teamName(player).charAt(0).toUpperCase();
        document.getElementById("view-title").textContent = teamName(player);
        document.getElementById("team-view-owner").textContent = `Manager: ${player.username}`;
        document.getElementById("team-view-owner-inline").textContent = player.username;
        const header = document.querySelector("#team-details .team-header"); if (!header) return;
        let actions = document.getElementById("team-manager-actions");
        if (!actions) { actions = document.createElement("div"); actions.id = "team-manager-actions"; actions.className = "team-manager-actions"; header.append(actions); }
        const canRename = currentUsername() === username && !isAdmin();
        actions.innerHTML = `${canRename ? `<form id="rename-team-form" class="rename-team-form"><label for="rename-team-input">Teamnamen ändern</label><div class="rename-team-controls"><input id="rename-team-input" type="text" maxlength="40" required value="${escapeHTML(teamName(player))}"><button class="btn btn-primary btn-small" type="submit">Speichern</button></div></form>` : ""}<button type="button" id="back-to-teams-btn" class="btn btn-secondary btn-small">← Alle Teams</button>`;
    }
    function afterFrame(callback) { setTimeout(callback, 0); }

    document.addEventListener("DOMContentLoaded", () => {
        ensureRankingNavigation(); updateTeamDirectory(); renderRanking();
        // Override the renderer called by the original app after login and when news changes.
        window.renderNews = renderNewsWithAdminControls;
        renderNewsWithAdminControls();
        ["player-login-form", "admin-login-form"].forEach(id => document.getElementById(id)?.addEventListener("submit", () => afterFrame(renderNewsWithAdminControls)));
        document.getElementById("news-form")?.addEventListener("submit", event => {
            if (editingNewsId === null || !isAdmin()) { afterFrame(renderNewsWithAdminControls); return; }
            event.preventDefault(); event.stopImmediatePropagation();
            const items = newsItems(), article = items.find(item => String(item.id) === String(editingNewsId));
            if (!article) { resetNewsEditor(); return; }
            article.title = document.getElementById("news-title-input").value.trim();
            article.body = document.getElementById("news-body-input").value.trim();
            article.date = new Date().toLocaleDateString("de-DE"); article.author = currentUsername();
            localStorage.setItem(keys.news, JSON.stringify(items)); resetNewsEditor(); renderNewsWithAdminControls();
        }, true);
        document.getElementById("news-cancel-edit-btn")?.addEventListener("click", resetNewsEditor);
        document.getElementById("news-feed")?.addEventListener("click", event => {
            const button = event.target.closest("[data-news-action]"); if (!button || !isAdmin()) return;
            const id = button.dataset.newsId, items = newsItems(), article = items.find(item => String(item.id) === String(id)); if (!article) return;
            if (button.dataset.newsAction === "edit") {
                editingNewsId = article.id; document.getElementById("news-title-input").value = article.title || ""; document.getElementById("news-body-input").value = article.body || "";
                document.getElementById("news-form-heading").textContent = "News-Artikel bearbeiten"; document.getElementById("news-submit-btn").textContent = "Änderungen speichern";
                document.getElementById("news-cancel-edit-btn").classList.remove("hidden"); document.getElementById("admin-news-creator").scrollIntoView({behavior:"smooth",block:"start"}); document.getElementById("news-title-input").focus();
            } else if (button.dataset.newsAction === "delete" && confirm(`News-Artikel „${article.title}“ wirklich löschen?`)) {
                localStorage.setItem(keys.news, JSON.stringify(items.filter(item => String(item.id) !== String(id)))); if (String(editingNewsId) === String(id)) resetNewsEditor(); renderNewsWithAdminControls();
            }
        });
        document.getElementById("team-directory-list")?.addEventListener("click", event => { const button = event.target.closest("[data-team-open]"); if (button) showTeam(button.dataset.teamOpen); });
        document.getElementById("view-team")?.addEventListener("submit", event => {
            if (!event.target.matches("#rename-team-form")) return;
            event.preventDefault(); const username = currentUsername();
            if (isAdmin() || !username) return;
            const name = document.getElementById("rename-team-input").value.trim().slice(0,40); if (!name) return;
            const storedPlayers = readJSON(keys.players).map(p => typeof p === "string" ? {username:p} : p);
            const own = storedPlayers.find(p => p.username === username); if (!own) return;
            own.teamName = name; localStorage.setItem(keys.players, JSON.stringify(storedPlayers));
            showTeam(username); updateTeamDirectory(); renderRanking();
        });
        document.getElementById("view-team")?.addEventListener("click", event => {
            if (event.target.closest("#back-to-teams-btn")) {
                document.getElementById("team-details")?.classList.add("hidden"); document.getElementById("team-directory")?.classList.remove("hidden");
                if (typeof window.switchView === "function") window.switchView("team");
            }
        });
        document.getElementById("main-nav-list")?.addEventListener("click", event => { if (event.target.closest('[data-view="ranking"]')) renderRanking(); });
        document.getElementById("add-player-form")?.addEventListener("submit", () => afterFrame(() => { updateTeamDirectory(); renderRanking(); }));
        document.getElementById("admin-player-list")?.addEventListener("click", () => afterFrame(() => { updateTeamDirectory(); renderRanking(); }));
        window.addEventListener("storage", event => {
            if (event.key === keys.players) { updateTeamDirectory(); renderRanking(); if (currentUsername() && document.getElementById("view-team")?.classList.contains("active")) showTeam(currentUsername()); }
            if (event.key === keys.news) renderNewsWithAdminControls();
        });
    });
})();
