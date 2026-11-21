// Keep the existing ranking/team/news implementation, then load the ranking UI enhancement.
(() => {
    const base = document.createElement("script");
    base.src = "https://raw.githubusercontent.com/mysticmiro-lab/203csmanager/b343fe003193c6388b8b85f7c149da2f0009ac85/enhancements.js";
    base.onload = () => {
        const extra = document.createElement("script");
        extra.src = "ranking-date-controls.js";
        document.body.append(extra);
    };
    base.onerror = () => console.error("Die bestehende Anwendungserweiterung konnte nicht geladen werden.");
    document.write(`<script src="${base.src}" onload="var extra=document.createElement('script');extra.src='ranking-date-controls.js';document.body.append(extra)" onerror="console.error('Die bestehende Anwendungserweiterung konnte nicht geladen werden.')"><\/script>`);
})();
