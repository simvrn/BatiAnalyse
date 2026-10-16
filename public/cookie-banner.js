/* ════════════════════════════════════════════════════
   BatiAnalyse : Cookie Consent Banner
   Conforme RGPD / recommandations CNIL
   ════════════════════════════════════════════════════ */
(function () {
  const KEY = 'ba_cookie_consent';

  // Si consentement déjà enregistré, ne rien faire
  if (localStorage.getItem(KEY)) return;

  // Styles inline : pas de fichier CSS externe à charger
  const style = document.createElement('style');
  style.textContent = `
    #ba-cookie-banner {
      position: fixed;
      bottom: 0; left: 0; right: 0;
      z-index: 10000;
      background: #16191C;
      border-top: 2px solid #16191C;
      padding: 18px 28px;
      display: flex;
      align-items: center;
      gap: 20px;
      flex-wrap: wrap;
      font-family: 'Archivo', system-ui, 'Helvetica Neue', Arial, sans-serif;
    }
    #ba-cookie-banner p {
      flex: 1;
      font-size: 15px;
      color: #F1F2EE;
      line-height: 1.5;
      min-width: min(260px, 100%);
      margin: 0;
    }
    #ba-cookie-banner a {
      color: #FFFFFF;
      text-decoration: underline;
    }
    .ba-cookie-btn {
      font-family: inherit;
      font-size: 15px;
      font-weight: 600;
      padding: 10px 18px;
      border: 2px solid #F1F2EE;
      cursor: pointer;
      white-space: nowrap;
      flex-shrink: 0;
    }
    .ba-cookie-btn-accept {
      background: #F1F2EE;
      color: #16191C;
    }
    .ba-cookie-btn-accept:hover { background: #FFFFFF; }
    .ba-cookie-btn-refuse {
      background: none;
      color: #F1F2EE;
    }
    .ba-cookie-btn-refuse:hover { color: #FFFFFF; border-color: #FFFFFF; }
    @media (max-width: 600px) {
      #ba-cookie-banner { padding: 16px 18px; gap: 12px; }
      .ba-cookie-btn { flex: 1; text-align: center; }
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
