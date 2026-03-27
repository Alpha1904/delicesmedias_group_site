/**
 * Cloudflare Pages Function — GitHub OAuth Handler
 * Route : /api/auth
 *
 * Gère l'authentification GitHub OAuth pour Decap CMS
 * sans serveur backend dédié.
 *
 * Variables d'environnement requises dans Cloudflare Pages :
 *   GITHUB_CLIENT_ID     — Client ID de l'OAuth App GitHub
 *   GITHUB_CLIENT_SECRET — Client Secret de l'OAuth App GitHub
 */

const GITHUB_OAUTH_URL = 'https://github.com/login/oauth';

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  // ── Étape 1 : Rediriger vers GitHub pour l'autorisation ──
  if (!code) {
    const clientId = env.GITHUB_CLIENT_ID;
    if (!clientId) {
      return new Response('GITHUB_CLIENT_ID manquant dans les variables d\'environnement', { status: 500 });
    }

    const redirectUri = `${url.origin}/api/auth`;
    const scope = 'repo,user';
    const authUrl = `${GITHUB_OAUTH_URL}/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}${state ? `&state=${state}` : ''}`;

    return Response.redirect(authUrl, 302);
  }

  // ── Étape 2 : Échanger le code contre un token ──
  try {
    const tokenResponse = await fetch(`${GITHUB_OAUTH_URL}/access_token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        client_id: env.GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: `${url.origin}/api/auth`,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error || !tokenData.access_token) {
      console.error('GitHub OAuth error:', tokenData);
      return renderScript('error', `Erreur GitHub: ${tokenData.error_description || tokenData.error || 'Inconnu'}`);
    }

    // ── Étape 3 : Renvoyer le token au CMS via postMessage ──
    return renderScript('success', tokenData.access_token, 'github');

  } catch (err) {
    console.error('OAuth exchange error:', err);
    return renderScript('error', `Erreur serveur: ${err.message}`);
  }
}

/**
 * Génère une page HTML qui envoie le résultat au CMS
 * via window.opener.postMessage (protocole Decap CMS)
 */
function renderScript(status, content, provider = 'github') {
  const isSuccess = status === 'success';
  const messageContent = isSuccess
    ? JSON.stringify({ token: content, provider })
    : content;

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <title>${isSuccess ? 'Connexion réussie' : 'Erreur de connexion'} | Delices Medias Group</title>
  <style>
    body {
      margin: 0;
      background: #0A1628;
      color: #FAFCFF;
      font-family: system-ui, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      flex-direction: column;
      gap: 1rem;
      text-align: center;
    }
    .icon { font-size: 3rem; }
    h2 { font-size: 1.2rem; color: ${isSuccess ? '#C9A84C' : '#ef4444'}; }
    p { font-size: 0.85rem; color: #8899BB; }
  </style>
</head>
<body>
  <div class="icon">${isSuccess ? '✓' : '✗'}</div>
  <h2>${isSuccess ? 'Connexion réussie !' : 'Erreur d\'authentification'}</h2>
  <p>${isSuccess ? 'Redirection vers le gestionnaire de contenu…' : messageContent}</p>
  <script>
    (function() {
      function receiveMessage(e) {
        window.removeEventListener("message", receiveMessage, false);
        // postMessage au CMS opener
        if (window.opener) {
          window.opener.postMessage(
            'authorization:github:${status}:${JSON.stringify(isSuccess ? { token: content, provider } : { error: content }).replace(/'/g, "\\'")}',
            e.origin
          );
        }
        window.close();
      }
      window.addEventListener("message", receiveMessage, false);
      // Envoyer immédiatement si opener disponible
      if (window.opener) {
        window.opener.postMessage(
          'authorization:github:${status}:${JSON.stringify(isSuccess ? { token: content, provider } : { error: content }).replace(/'/g, "\\'")}',
          '*'
        );
        setTimeout(() => window.close(), 1500);
      }
    })();
  </script>
</body>
</html>`;

  return new Response(html, {
    headers: { 'Content-Type': 'text/html;charset=UTF-8' },
  }); 
}
