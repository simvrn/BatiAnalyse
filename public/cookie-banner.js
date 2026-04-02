/* ════════════════════════════════════════════════════
   BatiAnalyse — Cookie Consent Banner
   Conforme RGPD / recommandations CNIL
   ════════════════════════════════════════════════════ */
(function () {
  const KEY = 'ba_cookie_consent';

  // Si consentement déjà enregistré, ne rien faire
  if (localStorage.getItem(KEY)) return;

  // Styles inline — pas de fichier CSS externe à charger
  const style = document.createElement('style');
  style.textContent = `
    #ba-cookie-banner {
      position: fixed;
      bottom: 0; left: 0; right: 0;
      z-index: 10000;
      background: #111110;
      border-top: 1px solid rgba(201,168,76,0.25);
      padding: 20px 32px;
      display: flex;
      align-items: center;
      gap: 24px;
      flex-wrap: wrap;
      font-family: 'Syne', 'DM Sans', sans-serif;
      animation: slideUp 0.3s ease;
    }
    @keyframes slideUp {
      from { transform: translateY(100%); opacity: 0; }
      to   { transform: translateY(0);    opacity: 1; }
    }
    #ba-cookie-banner p {
      flex: 1;
      font-size: 13px;
      color: #a09880;
      line-height: 1.6;
      min-width: 260px;
      margin: 0;
    }
    #ba-cookie-banner a {
      color: #c9a84c;
      text-decoration: none;
    }
    #ba-cookie-banner a:hover { text-decoration: underline; }
    .ba-cookie-btn {
      font-family: 'DM Mono', monospace;
      font-size: 10px;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      padding: 10px 20px;
      border: none;
      cursor: pointer;
      transition: all 0.15s;
      white-space: nowrap;
      flex-shrink: 0;
    }
    .ba-cookie-btn-accept {
      background: #c9a84c;
      color: #080807;
    }
    .ba-cookie-btn-accept:hover { background: #e8c97a; }
    .ba-cookie-btn-refuse {
      background: none;
      color: #a09880;
      border: 1px solid rgba(201,168,76,0.25);
    }
    .ba-cookie-btn-refuse:hover { color: #e8e4da; border-color: rgba(201,168,76,0.6); }
    @media (max-width: 600px) {
      #ba-cookie-banner { padding: 16px; gap: 14px; }
      .ba-cookie-btn { width: 100%; text-align: center; }
    }
  `;
  document.head.appendChild(style);

  // HTML du bandeau
  const banner = document.createElement('div');
  banner.id = 'ba-cookie-banner';
  banner.innerHTML = `
    <p>
      Nous utilisons des cookies strictement nécessaires au fonctionnement du site et, avec votre accord, des cookies de mesure d'audience anonymisés.
      Pour en savoir plus, consultez notre <a href="/mentions-legales#cookies">politique de cookies</a>.
    </p>
    <button class="ba-cookie-btn ba-cookie-btn-refuse" id="ba-refuse">Refuser</button>
    <button class="ba-cookie-btn ba-cookie-btn-accept" id="ba-accept">Accepter</button>
  `;
  document.body.appendChild(banner);

  function dismiss(choice) {
    localStorage.setItem(KEY, choice); // 'accepted' ou 'refused'
    banner.style.transition = 'opacity 0.25s, transform 0.25s';
    banner.style.opacity = '0';
    banner.style.transform = 'translateY(20px)';
    setTimeout(() => banner.remove(), 280);
  }

  document.getElementById('ba-accept').addEventListener('click', () => dismiss('accepted'));
  document.getElementById('ba-refuse').addEventListener('click', () => dismiss('refused'));
})();
