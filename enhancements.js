// Admin news controls and improved team/ranking navigation.
(() => {
    const keys = { players: "hltv_game_players", news: "hltv_game_news" };
    let editingNewsId = null;

    const escapeHTML = (value) => {
        const node = document.createElement("span");
        node.textContent = String(value ?? "");
        return node.innerHTML;
    };
    const getPlayers = () => {
        try { return JSON.parse(localStorage.getItem(keys.players)) || []; }
        catch { return []; }
    };
    const getNews = () => {
        try { return JSON.parse(localStorage.getItem(keys.news)) || []; }
        catch { return []; }
    };
    const isAdmin = () => window.currentUser?.role === "admin";

    function updateTeamDirectory() {
        const sidebarTitle = document.getElementById("team-sidebar-title");
        const sidebarList = document.getElementById("team-nav-list");
        const directory = document.getElementById("team-directory-list");
        if (!sidebarTitle || !sidebarList || !directory) return;

        // The sidebar list remains as a compatibility target for the original app,
        // but team navigation is now presented in one clear directory view.
        sidebarTitle.classList.add("hidden");
        sidebarList.classList.add("hidden");
        const players = getPlayers().map(player => typeof player === "string" ? { username: player } : player);
        if (!players.length) {
            directory.innerHTML = '<li class="empty-team-hint">Noch keine Teams vorhanden.</li>';
            return;
        }
        directory.innerHTML = players.map(player => `<li><button type="button" class="team-directory-item" data-team-open="${escapeHTML(player.username)}"><span class="team-directory-icon">🛡️</span><span><strong>Team ${escapeHTML(player.username)}</strong><small>Manager: ${escapeHTML(player.username)}</small></span><span class="team-directory-arrow">›</span></button></li>`).join("");
    }

    function renderRanking() {
        const target = document.getElementById("ranking-content");
        if (!target) return;
        const players = getPlayers().map(player => typeof player === "string" ? { username: player } : player)
            .sort((a, b) => String(a.username).localeCompare(String(b.username), "de"));
        if (!players.length) {
            target.innerHTML = '<div class="placeholder-box">Noch keine Teams im Ranking. Teams werden nach der Registrierung hier angezeigt.</div>';
            return;
        }
        target.innerHTML = `<div class="ranking-table-wrap"><table class="ranking-table"><thead><tr><th>Platz</th><th>Team</th><th>Manager</th><th>Punkte</th></tr></thead><tbody>${players.map((player, index) => `<tr><td><span class="ranking-position">${index + 1}</span></td><td>🛡️ Team ${escapeHTML(player.username)}</td><td>${escapeHTML(player.username)}</td><td>–</td></tr>`).join("")}</tbody></table></div><p class="ranking-note">Punkte sind noch nicht verfügbar, da das Spiel aktuell keine Punktestände speichert.</p>`;
    }

    function resetNewsEditor() {
        editingNewsId = null;
        const form = document.getElementById("news-form");
        if (form) form.reset();
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
        const items = getNews();
        feed.innerHTML = items.map(item => `<article class="news-item"><div class="news-meta">Veröffentlicht am ${escapeHTML(item.date)} von ${escapeHTML(item.author)}</div><h3>${escapeHTML(item.title)}</h3><p>${escapeHTML(item.body)}</p>${isAdmin() ? `<div class="news-admin-actions"><button type="button" class="btn btn-secondary btn-small" data-news-action="edit" data-news-id="${escapeHTML(item.id)}">✏️ Bearbeiten</button><button type="button" class="btn btn-danger btn-small" data-news-action="delete" data-news-id="${escapeHTML(item.id)}">🗑️ Löschen</button></div>` : ""}</article>`).join("");
    }

    function addRankingNavigation() {
        const nav = document.getElementById("main-nav-list");
        if (!nav || nav.querySelector('[data-view="ranking"]')) return;
        const item = document.createElement("li");
        item.innerHTML = '<button class="nav-item" data-view="ranking" type="button">🏆 Ranking</button>';
        const adminEntry = document.getElementById("admin-nav-li");
        nav.insertBefore(item, adminEntry || null);
    }

    document.addEventListener("DOMContentLoaded", () => {
        addRankingNavigation();
        updateTeamDirectory();
        renderRanking();
        // Replace the renderer used by cross-tab updates as well.
        window.renderNews = renderNewsWithAdminControls;
        renderNewsWithAdminControls();

        document.getElementById("main-nav-list")?.addEventListener("click", event => {
            const button = event.target.closest('[data-view="ranking"]');
            if (button) renderRanking();
        });
        document.getElementById("team-directory-list")?.addEventListener("click", event => {
            const button = event.target.closest("[data-team-open]");
            if (!button) return;
            const username = button.dataset.teamOpen;
            document.getElementById("team-directory")?.classList.add("hidden");
            document.getElementById("team-details")?.classList.remove("hidden");
            window.openTeamView?.(username);
        });
        document.getElementById("view-team")?.addEventListener("click", event => {
            if (!event.target.closest("[data-team-open]")) return;
            document.getElementById("team-directory")?.classList.add("hidden");
            document.getElementById("team-details")?.classList.remove("hidden");
        });

        document.getElementById("news-form")?.addEventListener("submit", event => {
            if (!isAdmin()) return;
            if (editingNewsId === null) return; // Existing app handles new article creation.
            event.preventDefault();
            const items = getNews();
            const article = items.find(item => String(item.id) === String(editingNewsId));
            if (!article) { resetNewsEditor(); return; }
            article.title = document.getElementById("news-title-input").value.trim();
            article.body = document.getElementById("news-body-input").value.trim();
            article.date = new Date().toLocaleDateString("de-DE");
            article.author = window.currentUser.username;
            localStorage.setItem(keys.news, JSON.stringify(items));
            resetNewsEditor();
            renderNewsWithAdminControls();
        });

        document.getElementById("news-cancel-edit-btn")?.addEventListener("click", resetNewsEditor);
        document.getElementById("news-feed")?.addEventListener("click", event => {
            const button = event.target.closest("[data-news-action]");
            if (!button || !isAdmin()) return;
            const id = button.dataset.newsId;
            const items = getNews();
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
            } else if (button.dataset.newsAction === "delete" && window.confirm(`News-Artikel „${article.title}“ wirklich löschen?`)) {
                localStorage.setItem(keys.news, JSON.stringify(items.filter(item => String(item.id) !== String(id))));
                if (String(editingNewsId) === String(id)) resetNewsEditor();
                renderNewsWithAdminControls();
            }
        });

        window.addEventListener("storage", event => {
            if (event.key === keys.players) { updateTeamDirectory(); renderRanking(); }
            if (event.key === keys.news) renderNewsWithAdminControls();
        });
        const originalShowApp = window.showApp;
        if (typeof originalShowApp === "function") {
            window.showApp = function (...args) {
                const result = originalShowApp.apply(this, args);
                updateTeamDirectory();
                renderRanking();
                renderNewsWithAdminControls();
                return result;
            };
        }
        const originalRenderTeamSidebar = window.renderTeamSidebar;
        if (typeof originalRenderTeamSidebar === "function") {
            window.renderTeamSidebar = function (...args) {
                const result = originalRenderTeamSidebar.apply(this, args);
                updateTeamDirectory();
                return result;
            };
        }
    });
})();
