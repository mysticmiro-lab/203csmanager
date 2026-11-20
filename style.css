:root {
    --bg-dark: #0f141c;
    --bg-panel: #18202c;
    --bg-card: #1f2937;
    --bg-hover: #2a3648;
    --border-color: #2e3b4e;
    --text-main: #e5e7eb;
    --text-muted: #9ca3af;
    --accent-blue: #3b82f6;
    --accent-blue-hover: #2563eb;
    --accent-orange: #f59e0b;
    --accent-orange-hover: #d97706;
    --danger: #ef4444;
    --success: #10b981;
}

* {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
}

body {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    background-color: var(--bg-dark);
    color: var(--text-main);
    height: 100vh;
    overflow: hidden;
}

.hidden {
    display: none !important;
}

/* ==================== BUTTONS & INPUTS ==================== */
.btn {
    padding: 10px 16px;
    border: none;
    border-radius: 6px;
    font-size: 0.95rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s, transform 0.1s;
    color: #fff;
}

.btn:active {
    transform: scale(0.98);
}

.btn-primary {
    background-color: var(--accent-blue);
}
.btn-primary:hover {
    background-color: var(--accent-blue-hover);
}

.btn-accent {
    background-color: var(--accent-orange);
    color: #111827;
}
.btn-accent:hover {
    background-color: var(--accent-orange-hover);
}

.btn-danger {
    background-color: var(--danger);
    padding: 6px 12px;
    font-size: 0.8rem;
}

.btn-logout {
    background-color: transparent;
    border: 1px solid var(--border-color);
    color: var(--text-muted);
}
.btn-logout:hover {
    background-color: rgba(239, 68, 68, 0.15);
    border-color: var(--danger);
    color: var(--danger);
}

.btn-full {
    width: 100%;
}

input, textarea {
    width: 100%;
    padding: 10px 12px;
    background-color: var(--bg-dark);
    border: 1px solid var(--border-color);
    border-radius: 6px;
    color: var(--text-main);
    font-size: 0.95rem;
    outline: none;
}

input:focus, textarea:focus {
    border-color: var(--accent-blue);
}

/* ==================== LOGIN SCREEN ==================== */
.auth-container {
    height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: radial-gradient(circle at top, #1e293b 0%, var(--bg-dark) 70%);
    padding: 20px;
}

.auth-box {
    width: 100%;
    max-width: 420px;
    background-color: var(--bg-panel);
    border: 1px solid var(--border-color);
    border-radius: 10px;
    padding: 32px;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
}

.auth-logo {
    text-align: center;
    font-size: 1.8rem;
    font-weight: 800;
    letter-spacing: 1px;
    margin-bottom: 6px;
}

.logo-accent {
    color: var(--accent-orange);
}

.auth-subtitle {
    text-align: center;
    color: var(--text-muted);
    font-size: 0.9rem;
    margin-bottom: 24px;
}

.auth-tabs {
    display: flex;
    gap: 8px;
    margin-bottom: 20px;
    background-color: var(--bg-dark);
    padding: 4px;
    border-radius: 8px;
}

.auth-tab {
    flex: 1;
    padding: 10px;
    border: none;
    background: transparent;
    color: var(--text-muted);
    font-weight: 600;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s;
}

.auth-tab.active {
    background-color: var(--bg-card);
    color: var(--text-main);
}

.auth-form {
    display: none;
}

.auth-form.active {
    display: block;
}

.input-group {
    margin-bottom: 16px;
}

.input-group label {
    display: block;
    font-size: 0.85rem;
    color: var(--text-muted);
    margin-bottom: 6px;
}

.auth-hint {
    margin-top: 14px;
    font-size: 0.8rem;
    color: var(--text-muted);
    text-align: center;
}

.error-msg {
    margin-top: 16px;
    padding: 10px;
    background-color: rgba(239, 68, 68, 0.15);
    border: 1px solid var(--danger);
    color: #fca5a5;
    border-radius: 6px;
    font-size: 0.85rem;
    text-align: center;
}

/* ==================== APP LAYOUT ==================== */
.app-container {
    display: flex;
    height: 100vh;
    width: 100vw;
}

/* Sidebar / Taskleiste */
.sidebar {
    width: 270px;
    background-color: var(--bg-panel);
    border-right: 1px solid var(--border-color);
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
}

.sidebar-header {
    padding: 20px;
    border-bottom: 1px solid var(--border-color);
}

.brand {
    font-size: 1.3rem;
    font-weight: 800;
    margin-bottom: 16px;
    letter-spacing: 0.5px;
}

.user-card {
    display: flex;
    align-items: center;
    gap: 12px;
    background-color: var(--bg-card);
    padding: 10px;
    border-radius: 8px;
}

.user-avatar {
    width: 36px;
    height: 36px;
    border-radius: 6px;
    background-color: var(--accent-blue);
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    text-transform: uppercase;
}

.user-info {
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.user-name {
    font-weight: 600;
    font-size: 0.95rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.user-role {
    font-size: 0.75rem;
    color: var(--accent-orange);
    text-transform: uppercase;
    font-weight: 700;
}

.sidebar-nav {
    flex: 1;
    overflow-y: auto;
    padding: 16px 12px;
}

.nav-section-title {
    font-size: 0.72rem;
    font-weight: 700;
    color: var(--text-muted);
    letter-spacing: 1px;
    padding: 8px 10px 6px;
    margin-top: 8px;
}

.nav-list {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.nav-item {
    width: 100%;
    text-align: left;
    padding: 10px 12px;
    background: transparent;
    border: none;
    border-radius: 6px;
    color: var(--text-main);
    font-size: 0.92rem;
    cursor: pointer;
    transition: background 0.15s;
    display: flex;
    align-items: center;
    gap: 8px;
}

.nav-item:hover {
    background-color: var(--bg-hover);
}

.nav-item.active {
    background-color: var(--accent-blue);
    color: #fff;
    font-weight: 600;
}

.admin-nav-btn {
    color: var(--accent-orange);
}
.admin-nav-btn.active {
    background-color: var(--accent-orange);
    color: #111827;
}

.empty-team-hint {
    padding: 8px 12px;
    font-size: 0.82rem;
    color: var(--text-muted);
    font-style: italic;
}

.sidebar-footer {
    padding: 16px;
    border-top: 1px solid var(--border-color);
}

/* ==================== MAIN CONTENT ==================== */
.main-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background-color: var(--bg-dark);
}

.topbar {
    height: 64px;
    padding: 0 28px;
    background-color: var(--bg-panel);
    border-bottom: 1px solid var(--border-color);
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-shrink: 0;
}

.topbar h1 {
    font-size: 1.25rem;
    font-weight: 700;
}

.topbar-status {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.85rem;
    color: var(--text-muted);
}

.status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background-color: var(--success);
}

.content-body {
    flex: 1;
    overflow-y: auto;
    padding: 28px;
}

.view-section {
    display: none;
    max-width: 1000px;
    margin: 0 auto;
}

.view-section.active {
    display: block;
}

.card {
    background-color: var(--bg-panel);
    border: 1px solid var(--border-color);
    border-radius: 10px;
    padding: 24px;
}

.card h2 {
    margin-bottom: 10px;
    font-size: 1.2rem;
}

.muted-text {
    color: var(--text-muted);
    font-size: 0.9rem;
    margin-bottom: 16px;
}

.placeholder-box {
    margin-top: 16px;
    padding: 30px;
    border: 2px dashed var(--border-color);
    border-radius: 8px;
    text-align: center;
    color: var(--text-muted);
}

/* Tutorial */
.tutorial-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 16px;
    margin-top: 20px;
}

.tutorial-step {
    background-color: var(--bg-card);
    padding: 18px;
    border-radius: 8px;
    border: 1px solid var(--border-color);
}

.tutorial-step h3 {
    font-size: 1rem;
    color: var(--accent-orange);
    margin-bottom: 8px;
}

.tutorial-step p {
    font-size: 0.88rem;
    color: var(--text-muted);
    line-height: 1.45;
}

/* News */
.news-list {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.news-item {
    background-color: var(--bg-panel);
    border: 1px solid var(--border-color);
    border-left: 4px solid var(--accent-blue);
    border-radius: 8px;
    padding: 20px;
}

.news-meta {
    font-size: 0.78rem;
    color: var(--text-muted);
    margin-bottom: 6px;
}

.news-item h3 {
    margin-bottom: 8px;
    font-size: 1.1rem;
}

.news-item p {
    font-size: 0.92rem;
    line-height: 1.5;
    color: #d1d5db;
}

.inline-stack-form {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-top: 12px;
}

/* Forum Chat */
.chat-card {
    display: flex;
    flex-direction: column;
    height: calc(100vh - 140px);
    padding: 0;
    overflow: hidden;
}

.chat-header {
    padding: 16px 20px;
    border-bottom: 1px solid var(--border-color);
}

.chat-header h2 {
    margin-bottom: 2px;
}

.chat-header p {
    margin-bottom: 0;
}

.chat-messages {
    flex: 1;
    overflow-y: auto;
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.chat-msg {
    background-color: var(--bg-card);
    padding: 10px 14px;
    border-radius: 8px;
    border: 1px solid var(--border-color);
    max-width: 85%;
}

.chat-msg.own-msg {
    align-self: flex-end;
    background-color: #1e3a5f;
    border-color: #2b5282;
}

.chat-msg-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px;
    font-size: 0.8rem;
}

.chat-author {
    font-weight: 700;
    color: var(--accent-blue);
}

.chat-author.admin-badge {
    color: var(--accent-orange);
}

.chat-time {
    color: var(--text-muted);
    font-size: 0.72rem;
}

.chat-text {
    font-size: 0.93rem;
    line-height: 1.4;
    word-wrap: break-word;
}

.chat-input-area {
    padding: 16px;
    border-top: 1px solid var(--border-color);
    display: flex;
    gap: 10px;
    background-color: var(--bg-panel);
}

/* Team View */
.team-header {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 24px;
}

.team-badge {
    width: 60px;
    height: 60px;
    border-radius: 12px;
    background: linear-gradient(135deg, var(--accent-blue), var(--accent-orange));
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.6rem;
    font-weight: 800;
    text-transform: uppercase;
}

.team-details-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 14px;
}

.stat-box {
    background-color: var(--bg-card);
    padding: 14px;
    border-radius: 8px;
    border: 1px solid var(--border-color);
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.stat-label {
    font-size: 0.78rem;
    color: var(--text-muted);
}

.stat-value {
    font-size: 1.1rem;
    font-weight: 700;
}

/* Admin Panel */
.admin-grid {
    display: grid;
    gap: 20px;
}

.inline-form {
    display: flex;
    gap: 10px;
}

.feedback-msg {
    margin-top: 12px;
    padding: 8px 12px;
    border-radius: 6px;
    font-size: 0.85rem;
}

.feedback-msg.success {
    background-color: rgba(16, 185, 129, 0.15);
    border: 1px solid var(--success);
    color: #6ee7b7;
}

.feedback-msg.error {
    background-color: rgba(239, 68, 68, 0.15);
    border: 1px solid var(--danger);
    color: #fca5a5;
}

.admin-list {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 12px;
}

.admin-list-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background-color: var(--bg-card);
    padding: 10px 14px;
    border-radius: 6px;
    border: 1px solid var(--border-color);
}
