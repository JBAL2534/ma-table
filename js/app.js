// Démarrage : navigation à cinq onglets, adresse dans le hash, écran remonté à chaque changement.
(function (racine) {
  const MaTable = racine.MaTable;
  const { el } = MaTable.ui;
  const ONGLETS = [
    { id: 'menus', libelle: 'Menus', ico: '🗓️' },
    { id: 'courses', libelle: 'Courses', ico: '🧺' },
    { id: 'scanner', libelle: 'Scanner', ico: '▣', central: true },
    { id: 'historique', libelle: 'Historique', ico: '📖' },
    { id: 'profil', libelle: 'Profil', ico: '👪' },
  ];

  function lireHash() {
    const h = (location.hash || '#menus').slice(1);
    const [ecran, requete] = h.split('?');
    const params = {};
    if (requete) for (const [k, v] of new URLSearchParams(requete)) params[k] = v;
    return { ecran: ONGLETS.some(o => o.id === ecran) ? ecran : 'menus', params };
  }
  function ecrireHash(ecran, params) {
    const r = new URLSearchParams();
    for (const [k, v] of Object.entries(params || {})) if (v != null && v !== '') r.set(k, v);
    const q = r.toString();
    return '#' + ecran + (q ? '?' + q : '');
  }

  const app = {
    courant: null, params: {},
    aller(ecran, params, remplacer) {
      const hash = ecrireHash(ecran, params);
      if (remplacer) history.replaceState(null, '', hash); else location.hash = hash;
      if (remplacer || hash === location.hash) this.monter();
    },
    // Change les paramètres de l'écran courant sans créer d'entrée d'historique.
    parametrer(params) { this.aller(this.courant, Object.assign({}, this.params, params), true); },
    rafraichir() { const y = window.scrollY; this.monter(); window.scrollTo(0, y); },
    monter() {
      const { ecran, params } = lireHash();
      this.courant = ecran; this.params = params;
      const conteneur = document.getElementById('contenu');
      conteneur.innerHTML = '';
      MaTable.ui.fermerTout();
      // Chaque écran peut ranger derrière lui (caméra, plein écran…).
      for (const e of Object.values(MaTable.ecrans)) { if (e.quitter) { try { e.quitter(); } catch (err) { /* rien à ranger */ } } }
      document.getElementById('navigation').style.display = '';
      try {
        MaTable.ecrans[ecran].monter(conteneur, params);
      } catch (e) {
        console.error(e);
        conteneur.append(el('div', 'carte', el('h2', {}, 'Oups'), el('p', 'sous', 'Cet écran n’a pas pu s’afficher. Vos données sont intactes : essayez un autre onglet, puis revenez.'), el('p', 'minuscule', 'Détail technique : ' + (e && e.message))));
      }
      document.querySelectorAll('#navigation a').forEach(a => a.setAttribute('aria-current', a.dataset.ecran === ecran ? 'page' : 'false'));
      document.title = 'Ma Table — ' + (ONGLETS.find(o => o.id === ecran) || {}).libelle;
    },
    monterNavigation() {
      const nav = document.getElementById('navigation');
      nav.innerHTML = '';
      nav.append(el('div', 'interieur', ONGLETS.map(o =>
        el('a', { href: '#' + o.id, class: o.central ? 'central' : '', dataset: { ecran: o.id }, 'aria-label': o.libelle, onclick: () => MaTable.ui.vibrer(6) },
          el('span', { class: 'ico', 'aria-hidden': 'true' }, o.ico), el('span', {}, o.libelle)))));
    },
    premierLancement() {
      const etat = MaTable.Stockage.etat;
      if (etat.utilisateur) return;
      const { feuille, sauverDoucement } = MaTable.ui;
      feuille({
        titre: 'Bienvenue dans Ma Table', fermable: false,
        contenu: (corps, fermer) => el('div', {},
          el('p', 'sous', 'Menus sains sans prise de tête, batch cooking du dimanche, et une seule liste de courses pour tous les magasins. Tout reste sur ce téléphone.'),
          el('div', 'espace'), el('div', 'espace'),
          el('p', 'gras', 'Qui utilise ce téléphone ?'),
          el('p', 'petit', 'Les prénoms se changent ensuite dans Profil.'),
          el('div', 'espace'),
          el('div', 'boutons colonne', etat.famille.membres.map(m => el('button', { class: 'btn ' + (m.role === 'adulte' ? 'principal' : ''), onclick: () => { etat.utilisateur = m.id; sauverDoucement(); fermer(); } }, m.nom + (m.role === 'enfant' ? ' (enfant)' : ''))))),
      });
    },
    demarrer() {
      MaTable.Stockage.charger();
      this.monterNavigation();
      window.addEventListener('hashchange', () => this.monter());
      this.monter();
      this.premierLancement();
      if (MaTable.Synchro) MaTable.Synchro.demarrer();
      this.nouveautes();
      if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
        // Quand une nouvelle version vient d'être installée, un bandeau le dit ; un tap l'applique.
        const dejaControle = !!navigator.serviceWorker.controller;
        navigator.serviceWorker.addEventListener('controllerchange', () => { if (dejaControle) this.signalerMiseAJour(); });
        navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then(r => { this.enregistrementSW = r; }).catch(() => { /* hors ligne indisponible, l'application marche quand même */ });
      }
    },
    // Bandeau « Mise à jour prête », en haut de l'écran, jusqu'à ce qu'on l'applique.
    signalerMiseAJour() {
      if (document.getElementById('bandeau-maj')) return;
      const b = el('div', { class: 'bandeau-maj', id: 'bandeau-maj', role: 'status' },
        el('span', 'pousse', '✨ Une nouvelle version de Ma Table est prête.'),
        el('button', { class: 'btn petit-btn', onclick: () => { try { location.reload(); } catch (e) { /* aperçu de test */ } } }, 'Mettre à jour'));
      document.body.prepend(b);
      MaTable.ui.vibrer(15);
    },
    // Vérifie à la demande si une version plus récente existe.
    async rechercherMiseAJour() {
      const { toast } = MaTable.ui;
      if (!this.enregistrementSW) { toast('La vérification n\u2019est possible qu\u2019une fois l\u2019application installée en ligne.'); return false; }
      toast('Recherche d\u2019une mise à jour…', 1500);
      try {
        const r = await this.enregistrementSW.update();
        if (r && (r.installing || r.waiting)) { toast('Une mise à jour arrive, un instant…', 3000); return true; }
        toast('Vous avez la dernière version (' + MaTable.VERSION + ').', 3000);
        return false;
      } catch (e) { toast('Impossible de vérifier pour le moment (hors ligne ?).', 3000); return false; }
    },
    // À la première ouverture d'une nouvelle version, dire ce qui a changé.
    nouveautes() {
      const etat = MaTable.Stockage.etat;
      const vue = etat.derniereVersionVue;
      if (vue === MaTable.VERSION) return;
      etat.derniereVersionVue = MaTable.VERSION;
      MaTable.Stockage.sauverSilencieux();
      if (!vue || !etat.utilisateur) return; // première installation : pas de « nouveautés »
      const versions = Object.keys(MaTable.NOUVEAUTES || {}).filter(v => compareVersions(v, vue) > 0 && compareVersions(v, MaTable.VERSION) <= 0).sort(compareVersions).reverse();
      if (!versions.length) return;
      MaTable.ui.feuille({
        titre: '✨ Nouveautés · version ' + MaTable.VERSION,
        contenu: el('div', {}, versions.map(v => el('div', { style: 'margin-bottom:12px' }, versions.length > 1 ? el('p', 'gras', 'Version ' + v) : null, el('ul', { style: 'margin:6px 0 0;padding-left:20px' }, MaTable.NOUVEAUTES[v].map(t => el('li', { style: 'margin-bottom:6px' }, t)))))),
        actions: [{ libelle: 'Compris', classe: 'principal' }],
      });
    },
  };
  function compareVersions(a, b) {
    const pa = String(a).split('.').map(Number), pb = String(b).split('.').map(Number);
    for (let i = 0; i < 3; i++) { if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) - (pb[i] || 0); }
    return 0;
  }
  app.compareVersions = compareVersions;
  MaTable.app = app;
  if (typeof document !== 'undefined' && !racine.__MA_TABLE_SANS_DEMARRAGE) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => app.demarrer());
    else app.demarrer();
  }
})(typeof window !== 'undefined' ? window : globalThis);
