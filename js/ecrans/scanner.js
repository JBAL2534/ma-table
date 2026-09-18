// Écran Scanner : code-barres lu par la caméra quand l'appareil le permet, sinon saisi à la main ;
// fiche produit via Open Food Facts, Nutri-Score, alternative douce si D ou E.
(function (racine) {
  const MaTable = racine.MaTable;
  const U = MaTable.util, S = MaTable.Scan, C = MaTable.Courses, IA = MaTable.IA;
  const { el, feuille, toast, demander, vide, sauver, sauverDoucement, vibrer, utilisateur } = MaTable.ui;
  const E = () => MaTable.Stockage.etat;
  const app = () => MaTable.app;

  let flux = null, boucle = null, lecteurZXing = null;
  function arreterCamera() {
    if (boucle) { clearTimeout(boucle); boucle = null; }
    if (lecteurZXing) { try { lecteurZXing.reset(); } catch (e) { /* déjà arrêté */ } lecteurZXing = null; }
    if (flux) { try { flux.getTracks().forEach(t => t.stop()); } catch (e) { /* déjà arrêtée */ } flux = null; }
  }

  // Lecture native quand le navigateur sait le faire (Android, Chrome), sinon par ZXing en JavaScript (iPhone, Mac).
  function cameraPossible() {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && (typeof window.BarcodeDetector !== 'undefined' || typeof window.ZXing !== 'undefined'));
  }

  function monter(conteneur, params) {
    const etat = E();
    conteneur.append(el('div', 'entete', el('div', {}, el('div', 'sur-titre', 'Ma Table'), el('h1', {}, 'Scanner'))));
    const resultat = el('div', {});
    if (IA.active(etat)) conteneur.append(cartePhoto(resultat));
    if (cameraPossible()) {
      const video = el('video', { playsinline: true, muted: true, autoplay: true });
      const indication = el('div', 'indication', 'Placez le code-barres dans le cadre');
      conteneur.append(el('div', 'viseur', video, el('div', { class: 'cadre', 'aria-hidden': 'true' }), indication));
      demarrerCamera(video, indication, code => chercher(code, resultat));
    } else {
      conteneur.append(el('div', 'carte douce', el('h3', {}, '📷 Saisie du code'), el('p', 'petit', 'La caméra n\u2019est pas disponible ici. Tapez les chiffres imprimés sous le code : la fiche arrive en une seconde.')));
    }
    const champ = el('input', { type: 'tel', inputmode: 'numeric', placeholder: 'Chiffres sous le code-barres', 'aria-label': 'Code-barres', enterkeyhint: 'search', value: params.code || '' });
    const valider = () => chercher(champ.value, resultat);
    champ.addEventListener('keydown', ev => { if (ev.key === 'Enter') { ev.preventDefault(); valider(); } });
    conteneur.append(el('div', 'ajout', el('div', 'ligne', champ, el('button', { class: 'btn icone principal', 'aria-label': 'Chercher', onclick: valider }, '🔍'))));
    conteneur.append(resultat);
    if (params.code) chercher(params.code, resultat);
    const recents = Object.values(etat.produits).sort((a, b) => (b.consulteLe || '').localeCompare(a.consulteLe || '')).slice(0, 12);
    if (recents.length) conteneur.append(el('div', 'carte', el('h3', {}, 'Derniers produits scannés'), el('ul', 'liste', recents.map(p => el('li', {}, el('span', 'ico', '🏷️'), el('button', { class: 'pousse', style: 'text-align:left;background:none;border:0;padding:0;min-height:44px', onclick: () => afficher(p, resultat) }, el('div', 'gras', p.nom), el('div', 'petit', [p.marque, p.quantite].filter(Boolean).join(' · '))), p.nutriscore ? el('span', 'badge nutri nutri-' + p.nutriscore, p.nutriscore) : null)))));
    else conteneur.append(el('p', 'minuscule centre', 'Les fiches produits viennent d’Open Food Facts, une base collaborative et gratuite.'));
  }

  async function demarrerCamera(video, indication, auCode) {
    if (typeof window.BarcodeDetector === 'undefined') return demarrerZXing(video, indication, auCode);
    try {
      flux = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } }, audio: false });
      video.srcObject = flux;
      await video.play();
    } catch (e) {
      indication.textContent = 'Caméra indisponible : autorisez-la dans les réglages, ou tapez le code ci-dessous.';
      return;
    }
    let detecteur;
    try { detecteur = new window.BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128'] }); }
    catch (e) { indication.textContent = 'Lecture impossible ici : tapez le code ci-dessous.'; return; }
    const confirmer = S.confirmateur(2500);
    const tour = async () => {
      if (!flux) return;
      try {
        const codes = await detecteur.detect(video);
        const brut = codes.length && codes[0].rawValue;
        if (brut) {
          const code = confirmer(brut);
          if (code) {
            vibrer(20);
            indication.textContent = 'Code lu : ' + code;
            auCode(code);
            boucle = setTimeout(tour, 4000);
            return;
          }
          indication.textContent = 'Encore un instant…';
        }
      } catch (e) { /* image pas prête */ }
      boucle = setTimeout(tour, 200);
    };
    tour();
  }

  // Lecture par ZXing : la caméra est gérée par la bibliothèque, qui analyse les images en continu.
  async function demarrerZXing(video, indication, auCode) {
    const Z = window.ZXing;
    let pause = false;
    const confirmer = S.confirmateur(2500);
    try {
      const indices = new Map();
      indices.set(Z.DecodeHintType.POSSIBLE_FORMATS, [Z.BarcodeFormat.EAN_13, Z.BarcodeFormat.EAN_8, Z.BarcodeFormat.UPC_A, Z.BarcodeFormat.UPC_E, Z.BarcodeFormat.CODE_128]);
      indices.set(Z.DecodeHintType.TRY_HARDER, true);
      lecteurZXing = new Z.BrowserMultiFormatReader(indices, 250);
      await lecteurZXing.decodeFromConstraints({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } }, audio: false }, video, (resultat) => {
        if (!resultat || pause) return;
        const brut = resultat.getText();
        if (!brut) return;
        const code = confirmer(brut);
        if (!code) { indication.textContent = 'Encore un instant…'; return; }
        pause = true; vibrer(20);
        indication.textContent = 'Code lu : ' + code;
        auCode(code);
        boucle = setTimeout(() => { pause = false; indication.textContent = 'Placez le code-barres dans le cadre'; }, 4000);
      });
    } catch (e) {
      indication.textContent = 'Caméra indisponible : autorisez-la dans les réglages, ou tapez le code ci-dessous.';
      arreterCamera();
    }
  }

  async function chercher(code, zone) {
    const etat = E();
    zone.innerHTML = '';
    zone.append(el('div', 'carte', el('p', 'sous', 'Recherche du produit…')));
    try {
      const r = await S.chercherProduit(etat, code);
      sauverDoucement();
      if (!r.produit) {
        zone.innerHTML = '';
        zone.append(el('div', 'carte', el('h3', {}, 'Produit inconnu'), el('p', 'sous', 'Open Food Facts ne connaît pas encore ce code (' + String(code).replace(/\D/g, '') + '). Vous pouvez l’ajouter sous un nom à vous.'),
          el('div', 'boutons', el('button', { class: 'btn principal', onclick: async () => { const n = await demander('Nom du produit', { placeholder: 'Ex. : Yaourts nature x8' }); if (n && n.trim()) MaTable.ecrans.courses.ajouterArticle(n.trim()); } }, '🧺 À acheter'), el('button', { class: 'btn', onclick: async () => { const n = await demander('Nom du produit', { placeholder: 'Ex. : Yaourts nature x8' }); if (n && n.trim()) { S.ajouterGardeManger(etat, { nom: n }); sauver(); toast('Ajouté au garde-manger.'); } } }, '🥫 Je l’ai déjà'))));
        return;
      }
      afficher(r.produit, zone);
    } catch (e) {
      zone.innerHTML = '';
      zone.append(el('div', 'erreur', e.message || 'Le produit n’a pas pu être trouvé.'));
    }
  }

  function afficher(p, zone) {
    const etat = E();
    zone.innerHTML = '';
    const alt = S.alternative(p);
    zone.append(el('div', 'carte',
      el('div', 'ligne haut', el('div', 'pousse', el('h2', {}, p.nom), el('p', 'sous', [p.marque, p.quantite].filter(Boolean).join(' · ')), p.categorie ? el('p', 'petit', p.categorie + ' · rayon ' + p.rayon) : null),
        p.nutriscore ? el('div', 'centre', el('span', { class: 'badge nutri nutri-' + p.nutriscore, 'aria-label': 'Nutri-Score ' + p.nutriscore }, p.nutriscore), el('div', 'minuscule', 'Nutri-Score')) : el('span', 'badge', 'Nutri-Score inconnu')),
      alt ? el('div', { class: 'carte ambre', style: 'margin:12px 0 0' }, el('p', {}, alt)) : null,
      el('p', 'minuscule', '« À acheter » met le produit sur la liste de courses. « Je l’ai déjà » le range au garde-manger, ce qu’il y a à la maison.'),
      el('div', 'boutons',
        el('button', { class: 'btn principal', onclick: () => {
          const avant = new Set(etat.liste.map(x => x.id));
          const a = C.ajouter(etat.liste, { nom: p.nom, rayon: p.rayon, source: 'scan', par: utilisateur(etat) }, { preferencesMagasin: etat.preferencesMagasin, magasins: etat.reglages.magasins });
          sauverDoucement(); vibrer();
          toast(p.nom + ' → liste de courses, ' + C.nomMagasin(a.magasin), 8000, { libelle: 'Annuler', action: () => { if (!avant.has(a.id)) C.retirer(etat, a); else { a.sources = a.sources.filter(x => x !== 'scan'); } sauverDoucement(); toast('Annulé.'); } });
        } }, '🧺 À acheter'),
        el('button', { class: 'btn', onclick: () => {
          const existait = etat.gardeManger.find(g => U.racineMot(g.nom) === U.racineMot(p.nom));
          const copie = existait ? JSON.parse(JSON.stringify(existait)) : null;
          const g = S.ajouterGardeManger(etat, { nom: p.nom, qte: p.quantite, rayon: p.rayon }); sauverDoucement();
          toast(p.nom + ' → garde-manger', 8000, { libelle: 'Annuler', action: () => { if (copie) Object.assign(g, copie); else { g.retire = true; C.toucher(g); } sauverDoucement(); toast('Annulé.'); } });
        } }, '🥫 Je l’ai déjà'))));
  }

  // ---- Photo analysée par l'IA (seulement si une clé est enregistrée) -------------
  function cartePhoto(zone) {
    const entree = el('input', { type: 'file', accept: 'image/*', capture: 'environment', hidden: true });
    let mode = 'produit';
    entree.addEventListener('change', async () => {
      const f = entree.files && entree.files[0]; entree.value = '';
      if (!f) return;
      zone.innerHTML = ''; zone.append(el('div', 'carte', el('p', 'sous', '🔎 Analyse de la photo…')));
      try {
        const base64 = await IA.redimensionner(f, 1280, 0.82);
        const res = await IA.analyserPhoto(E(), base64, mode);
        zone.innerHTML = '';
        if (mode === 'ticket') feuilleTicket(res); else feuilleArticles(res, mode);
      } catch (e) { zone.innerHTML = ''; zone.append(el('div', 'erreur', e.message)); }
    });
    const bouton = (m, ico, libelle) => el('button', { class: 'btn', onclick: () => { mode = m; entree.click(); } }, ico + ' ' + libelle);
    return el('div', 'carte douce', el('h3', {}, '📷 Photo'), el('p', 'petit', 'Un produit, un frigo ouvert ou un ticket de caisse : les articles sont reconnus et proposés, à corriger d\u2019un tap.'),
      el('div', 'boutons', bouton('produit', '🛍️', 'Produit'), bouton('frigo', '🧊', 'Frigo, placard'), bouton('ticket', '🧾', 'Ticket')), entree);
  }
  function feuilleArticles(res, mode) {
    const etat = E();
    if (!res.articles.length) { toast('Aucun article reconnu sur cette photo. Essayez de plus près, ou tapez le nom.'); return; }
    const lignes = res.articles.map(a => ({ a, case: el('input', { type: 'checkbox', checked: a.confiance >= 0.5 }), nom: el('input', { type: 'text', value: a.nom, 'aria-label': 'Nom' }) }));
    const choisis = () => lignes.filter(l => l.case.checked && l.nom.value.trim()).map(l => ({ nom: l.nom.value.trim(), rayon: l.a.rayon, quantite: l.a.quantite }));
    feuille({ titre: mode === 'frigo' ? '🧊 Ce que je vois' : '🛍️ Produits reconnus',
      contenu: el('div', {}, res.commentaire ? el('p', 'sous', res.commentaire) : null, el('div', 'espace'),
        lignes.map(l => el('div', 'ligne', { style: 'margin-bottom:8px' }, l.case, el('div', 'pousse', l.nom, el('div', 'minuscule', [l.a.rayon, l.a.quantite, l.a.confiance < 0.5 ? 'peu sûr' : null].filter(Boolean).join(' · ')))))),
      actions: [
        { libelle: '🥫 Au garde-manger', action: () => { const c = choisis(); for (const x of c) S.ajouterGardeManger(etat, { nom: x.nom, qte: x.quantite, rayon: x.rayon }); sauver(); toast(U.pluriel(c.length, 'produit ajouté', 'produits ajoutés') + ' au garde-manger.'); } },
        { libelle: '🧺 À la liste', classe: 'principal', action: () => { const c = choisis(); const ctx = { preferencesMagasin: etat.preferencesMagasin, magasins: etat.reglages.magasins }; for (const x of c) { const q = x.quantite ? C.analyserSaisie(x.quantite + ' x') : { qte: null, unite: null }; C.ajouter(etat.liste, { nom: x.nom, rayon: x.rayon, qte: q.qte, unite: q.unite, source: 'photo', par: utilisateur(etat) }, ctx); } sauver(); vibrer(); toast(U.pluriel(c.length, 'article ajouté', 'articles ajoutés') + ' à la liste.'); } },
      ] });
  }
  function feuilleTicket(res) {
    const etat = E();
    const magasin = el('select', {}, C.MAGASINS.map(m => el('option', { value: m.id, selected: m.id === res.magasin }, m.emoji + ' ' + m.nom)));
    const date = el('input', { type: 'date', value: res.date || U.aujourdhui() });
    const montant = el('input', { type: 'text', inputmode: 'decimal', value: res.montant != null ? String(res.montant).replace('.', ',') : '' });
    const lignes = res.articles.map(a => ({ a, case: el('input', { type: 'checkbox', checked: true }) }));
    feuille({ titre: '🧾 Ticket de caisse',
      contenu: el('div', {}, el('div', 'grille-2', el('label', 'champ', el('span', {}, 'Magasin'), magasin), el('label', 'champ', el('span', {}, 'Date'), date)),
        el('label', 'champ', el('span', {}, 'Total payé (€)'), montant),
        el('p', 'gras', U.pluriel(res.articles.length, 'article lu', 'articles lus')),
        lignes.map(l => el('label', 'case', l.case, el('span', 'pousse', l.a.nom), el('span', 'petit', l.a.prix != null ? U.euros(l.a.prix) : '')))),
      actions: [{ libelle: 'Annuler' }, { libelle: 'Enregistrer ce passage', classe: 'principal', action: () => {
        const m = montant.value.replace(/\s/g, '').replace(',', '.');
        if (m && isNaN(Number(m))) { toast('Le montant doit être un nombre.'); return false; }
        const articles = lignes.filter(l => l.case.checked).map(l => ({ nom: l.a.nom, qte: null, unite: null, rayon: l.a.rayon, prix: l.a.prix }));
        etat.achats.push({ id: U.idUnique('achat'), date: date.value || U.aujourdhui(), magasin: magasin.value, articles, montant: m ? Number(m) : null, par: utilisateur(etat), source: 'ticket' });
        for (const a of articles) S.ajouterGardeManger(etat, { nom: a.nom, rayon: a.rayon });
        // Ce qui était sur la liste pour ce magasin et qui figure sur le ticket est considéré acheté.
        const noms = new Set(articles.map(a => U.racineMot(a.nom)));
        for (const x of etat.liste.slice()) if (x.magasin === magasin.value && noms.has(U.racineMot(x.nom))) C.archiver(etat, x, 'achete');
        sauver(); vibrer(20);
        toast('Passage enregistré dans l\u2019historique' + (m ? ' · ' + U.euros(m) : '') + '.');
      } }] });
  }

  MaTable.ecrans = MaTable.ecrans || {};
  MaTable.ecrans.scanner = { monter, arreterCamera, quitter: arreterCamera };
})(typeof window !== 'undefined' ? window : globalThis);
