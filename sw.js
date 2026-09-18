// Service worker : l'application s'ouvre même sans réseau (liste de courses comprise).
// Les appels à Open Food Facts passent toujours par le réseau.
const CACHE = 'ma-table-v7';
const FICHIERS = [
  './', './index.html', './manifest.webmanifest', './css/style.css',
  './js/lib/zxing.min.js', './js/util.js', './js/donnees/recettes.js', './js/donnees/articles.js',
  './js/moteur/stockage.js', './js/moteur/courses.js', './js/moteur/menus.js', './js/moteur/historique.js', './js/moteur/scan.js', './js/moteur/ia.js', './js/moteur/synchro.js',
  './js/ui.js', './js/ecrans/menus.js', './js/ecrans/courses.js', './js/ecrans/scanner.js', './js/ecrans/historique.js', './js/ecrans/profil.js', './js/app.js',
  './icones/icone-192.png', './icones/icone-512.png', './icones/icone-180.png',
];

// À l'installation d'une version, chaque fichier est demandé au réseau en ignorant le cache HTTP :
// une version est toujours cohérente, jamais un mélange d'ancien et de nouveau.
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(FICHIERS.map(f =>
    fetch(f, { cache: 'reload' }).then(r => { if (!r.ok) throw new Error(f); return c.put(f, r); })
  ))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then(cles => Promise.all(cles.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (url.origin !== self.location.origin) {
    // Polices : on garde une copie si elle arrive ; Open Food Facts : réseau seulement.
    if (/fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) {
      e.respondWith(caches.open(CACHE).then(async c => { const r = await c.match(e.request); if (r) return r; try { const n = await fetch(e.request); if (n.ok) c.put(e.request, n.clone()); return n; } catch (err) { return new Response('', { status: 504 }); } }));
    }
    return;
  }
  // Fichiers de l'application : cache d'abord, puis mise à jour silencieuse.
  e.respondWith(caches.open(CACHE).then(async c => {
    const enCache = await c.match(e.request, { ignoreSearch: true });
    const reseau = fetch(e.request, { cache: 'no-cache' }).then(n => { if (n && n.ok) c.put(e.request, n.clone()); return n; }).catch(() => null);
    if (enCache) { e.waitUntil(reseau); return enCache; }
    const n = await reseau;
    return n || c.match('./index.html');
  }));
});
