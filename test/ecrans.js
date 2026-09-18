// Tests d'écran : la vraie page index.html montée dans jsdom, chaque écran affiché, chaque bouton cliqué,
// et le parcours du premier jour joué de bout en bout (semaine → courses → magasin → historique).
//   node test/ecrans.js          (jsdom : npm install --no-save --no-package-lock jsdom@30)
const assert = require('assert');
const fs = require('fs');
const path = require('path');
let JSDOM;
try { ({ JSDOM } = require('jsdom')); }
catch (e) {
  try { ({ JSDOM } = require(path.join(__dirname, '..', '..', 'ma-maison', 'node_modules', 'jsdom'))); }
  catch (e2) { console.error('jsdom manque : npm install --no-save --no-package-lock jsdom@30'); process.exit(1); }
}
const racine = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(racine, 'index.html'), 'utf8');

function creerPage() {
  const erreurs = [];
  const { VirtualConsole } = require(require.resolve('jsdom', { paths: [path.join(__dirname, '..', '..', 'ma-maison')] }).replace(/lib[\/\\].*$/, ''));
  const vc = new VirtualConsole();
  vc.on('error', (m) => erreurs.push(String(m)));
  vc.on('jsdomError', (e) => { if (!/not implemented/i.test(String(e && e.message))) erreurs.push(String(e && e.message)); });
  const dom = new JSDOM(html, { url: 'http://localhost/ma-table/', runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole: vc });
  const w = dom.window;
  w.__MA_TABLE_SANS_DEMARRAGE = true;
  w.scrollTo = () => {};
  w.HTMLElement.prototype.scrollIntoView = () => {};
  w.addEventListener('error', (ev) => erreurs.push(String(ev.error || ev.message)));
  const scripts = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m => m[1]);
  assert.ok(scripts.length >= 15, 'les scripts sont listés dans index.html');
  for (const src of scripts) w.eval(fs.readFileSync(path.join(racine, src), 'utf8'));
  return { dom, w, erreurs, scripts };
}
function texte(el) { return (el.textContent || '').replace(/\s+/g, ' ').trim(); }
function boutons(w, racineEl) { return [...(racineEl || w.document.getElementById('contenu')).querySelectorAll('button')].filter(b => !b.disabled); }
function dialogues(w) { return [...w.document.querySelectorAll('#couches .feuille')]; }
function fermerFeuilles(w) { w.MaTable.ui.fermerTout(); }
function cliquer(el) { el.dispatchEvent(new el.ownerDocument.defaultView.MouseEvent('click', { bubbles: true, cancelable: true })); }
function attendre(ms) { return new Promise(r => setTimeout(r, ms)); }
function aller(w, ecran, params) { w.MaTable.app.aller(ecran, params || {}, true); }
function contenu(w) { return w.document.getElementById('contenu'); }
function verifierSain(w, erreurs, ou) {
  assert.ok(!texte(contenu(w)).includes('Oups'), ou + ' : l’écran affiche une erreur');
  assert.ok(texte(contenu(w)).length > 20, ou + ' : écran vide');
  assert.deepStrictEqual(erreurs, [], ou + ' : erreurs de console ' + erreurs.join(' | '));
}

const tests = [];
function test(nom, f) { tests.push({ nom, f }); }
const ECRANS = ['menus', 'courses', 'scanner', 'historique', 'profil'];

test('la page est bien une PWA pour iPhone', () => {
  assert.ok(/name="viewport"[^>]*width=device-width/.test(html), 'balise viewport');
  assert.ok(/apple-mobile-web-app-capable/.test(html), 'mode plein écran iPhone');
  assert.ok(/rel="manifest"/.test(html) && /apple-touch-icon/.test(html));
  const manifest = JSON.parse(fs.readFileSync(path.join(racine, 'manifest.webmanifest'), 'utf8'));
  assert.strictEqual(manifest.display, 'standalone');
  for (const i of manifest.icons) assert.ok(fs.existsSync(path.join(racine, i.src)), i.src + ' existe');
  const sw = fs.readFileSync(path.join(racine, 'sw.js'), 'utf8');
  for (const src of [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m => m[1])) assert.ok(sw.includes("'./" + src + "'"), 'le service worker met en cache ' + src);
  assert.ok(sw.includes("'./css/style.css'"));
  assert.ok(!/unsafe-eval|new Function\(|\beval\(/.test(fs.readFileSync(path.join(racine, 'js/ui.js'), 'utf8')), 'pas d’évaluation de texte');
});

test('la feuille de style a un mode sombre et des zones tactiles de 44 px', () => {
  const css = fs.readFileSync(path.join(racine, 'css/style.css'), 'utf8');
  assert.ok(css.includes('prefers-color-scheme: dark'));
  assert.ok(/\.btn\s*\{[^}]*min-height:\s*44px/.test(css));
  assert.ok(css.includes('env(safe-area-inset-bottom)'));
  assert.ok(css.includes('Nunito'));
});

test('chaque écran s’affiche sans erreur, au premier lancement comme avec des données', async () => {
  const { w, erreurs } = creerPage();
  w.MaTable.app.demarrer();
  assert.ok(dialogues(w).length === 1, 'la fenêtre de bienvenue s’ouvre au premier lancement');
  cliquer(boutons(w, dialogues(w)[0]).find(b => /Papa|Maman/.test(texte(b))));
  assert.ok(w.MaTable.Stockage.etat.utilisateur, 'l’utilisateur du téléphone est enregistré');
  for (const e of ECRANS) { aller(w, e); verifierSain(w, erreurs, e + ' (vide)'); }
  const nav = [...w.document.querySelectorAll('#navigation a')];
  assert.strictEqual(nav.length, 5, 'cinq onglets');
  assert.ok(nav[2].classList.contains('central') && texte(nav[2]).includes('Scanner'), 'le scanner est le bouton central');
  // Avec des données : une semaine, une liste, des achats, des avis.
  const etat = w.MaTable.Stockage.etat;
  const lundi = w.MaTable.util.lundiDe(w.MaTable.util.aujourdhui());
  etat.semaines[lundi] = w.MaTable.Menus.genererSemaine(etat, lundi, 11);
  etat.semaines[w.MaTable.util.ajouterJours(lundi, -7)] = w.MaTable.Menus.genererSemaine(etat, w.MaTable.util.ajouterJours(lundi, -7), 12);
  w.MaTable.Courses.ajouterIngredients(etat.liste, w.MaTable.Menus.ingredientsSemaine(etat, etat.semaines[lundi]), {}, [], 'semaine');
  etat.achats.push({ id: 'a1', date: w.MaTable.util.ajouterJours(lundi, -5), magasin: 'biocoop', articles: [{ nom: 'Quinoa', qte: 500, unite: 'g', rayon: 'Épicerie', prix: 4.2 }], montant: 12.5 });
  etat.achats.push({ id: 'a0', date: w.MaTable.util.ajouterJours(lundi, -12), magasin: 'biocoop', articles: [{ nom: 'Quinoa', prix: 3.9 }], montant: 3.9 });
  etat.avis.push({ id: 'v1', date: w.MaTable.util.ajouterJours(lundi, -6), creneau: 'soir', recetteId: 'r8', titre: 'x', note: 'refait', enfant: 'adore', quand: new Date().toISOString() });
  etat.gardeManger.push({ id: 'g1', nom: 'Gnocchis', qte: '500 g', rayon: 'Épicerie', peremption: w.MaTable.util.ajouterJours(w.MaTable.util.aujourdhui(), 2), epuise: false });
  etat.reglages.drive.actif = true;
  etat.poids['m1'] = { code: '1234', actif: true, mesures: [{ date: '2026-09-01', kg: 80 }, { date: '2026-09-08', kg: 79.5 }] };
  w.MaTable.Stockage.sauver();
  const vues = [['menus', {}], ['menus', { vue: 'batch' }], ['menus', { vue: 'catalogue' }], ['menus', { vue: 'catalogue', q: 'poulet', f: 'enfant,rapide' }], ['menus', { vue: 'recette', id: 'r8' }],
    ['courses', {}], ['courses', { onglet: 'liste', magasin: 'biocoop' }], ['courses', { mode: 'magasin', magasin: 'supermarche' }], ['courses', { onglet: 'essentiels' }], ['courses', { onglet: 'garde' }],
    ['scanner', {}], ['historique', {}], ['historique', { onglet: 'semaines', lundi }], ['historique', { onglet: 'tableau' }], ['historique', { onglet: 'stats' }], ['historique', { q: 'quinoa' }], ['profil', {}]];
  for (const [e, p] of vues) { aller(w, e, p); verifierSain(w, erreurs, e + ' ' + JSON.stringify(p)); }
  w.MaTable.Courses.ajouter(etat.liste, { nom: 'Quinoa', qte: 500, unite: 'g' }); w.MaTable.Stockage.sauver();
  aller(w, 'courses', { onglet: 'liste', magasin: 'biocoop' });
  assert.ok(texte(contenu(w)).includes('4,20 €') && texte(contenu(w)).includes('Estimation'), 'prix mémorisé et estimation affichés');
  aller(w, 'historique', { onglet: 'stats' });
  assert.ok(texte(contenu(w)).includes('Prix qui ont bougé') && texte(contenu(w)).includes('+0,30 €'), 'variation de prix affichée');
  aller(w, 'profil', {});
  assert.ok(texte(contenu(w)).includes('Ouverte dans le navigateur'), 'la provenance des données est indiquée');
  aller(w, 'courses', { mode: 'magasin', magasin: 'supermarche' });
  assert.ok(w.document.querySelector('.magasin-plein .compteur'), 'le mode magasin affiche un compteur');
  assert.strictEqual(w.document.getElementById('navigation').style.display, 'none', 'la navigation disparaît en mode magasin');
  aller(w, 'courses', {});
  assert.strictEqual(w.document.getElementById('navigation').style.display, '', 'la navigation revient');
});

test('chaque bouton de chaque écran fait quelque chose, et tout « + » ouvre une fenêtre', async () => {
  const { w, erreurs } = creerPage();
  w.MaTable.app.demarrer(); fermerFeuilles(w);
  const etat = w.MaTable.Stockage.etat; etat.utilisateur = 'm1';
  const U = w.MaTable.util; const lundi = U.lundiDe(U.aujourdhui());
  etat.semaines[lundi] = w.MaTable.Menus.genererSemaine(etat, lundi, 21);
  w.MaTable.Courses.ajouterIngredients(etat.liste, w.MaTable.Menus.ingredientsSemaine(etat, etat.semaines[lundi]), {}, [], 'semaine');
  etat.gardeManger.push({ id: 'g1', nom: 'Gnocchis', rayon: 'Épicerie', peremption: null, epuise: false });
  etat.achats.push({ id: 'a1', date: U.ajouterJours(lundi, -5), magasin: 'biocoop', articles: [{ nom: 'Quinoa' }], montant: 12.5 });
  etat.reglages.drive.actif = true; etat.poids['m1'] = { code: '1234', actif: true, mesures: [] };
  w.MaTable.Stockage.sauver();
  w.fetch = async () => ({ ok: true, status: 200, json: async () => ({ status: 1, product: { product_name_fr: 'Produit test', brands: 'Marque', nutriscore_grade: 'e', categories: 'Biscuits' } }) });
  const vues = [['menus', {}], ['menus', { vue: 'batch' }], ['menus', { vue: 'catalogue' }], ['menus', { vue: 'recette', id: 'r8' }], ['courses', {}], ['courses', { onglet: 'essentiels' }], ['courses', { onglet: 'garde' }], ['scanner', {}], ['historique', {}], ['historique', { onglet: 'semaines', lundi }], ['historique', { onglet: 'tableau' }], ['historique', { onglet: 'stats' }], ['profil', {}]];
  let clics = 0, plus = 0;
  for (const [e, p] of vues) {
    aller(w, e, p);
    const n = boutons(w).length;
    for (let i = 0; i < n; i++) {
      aller(w, e, p); fermerFeuilles(w);
      const b = boutons(w)[i];
      if (!b) continue;
      const libelle = texte(b) || b.getAttribute('aria-label') || '?';
      const avantHash = w.location.hash, avantHtml = contenu(w).innerHTML, avantEtat = JSON.stringify(etat);
      const ou = e + ' ' + JSON.stringify(p) + ' → « ' + libelle + ' »';
      try { cliquer(b); await attendre(5); } catch (err) { assert.fail(ou + ' : ' + err.message); }
      clics++;
      assert.deepStrictEqual(erreurs, [], ou + ' : erreur ' + erreurs.join(' | '));
      assert.ok(!texte(contenu(w)).includes('Oups'), ou + ' : écran en erreur');
      const ouvert = dialogues(w).length > 0, toast = !!w.document.querySelector('.toast'), bouge = w.location.hash !== avantHash || contenu(w).innerHTML !== avantHtml || JSON.stringify(etat) !== avantEtat;
      const dejaActif = b.getAttribute('aria-selected') === 'true';
      assert.ok(ouvert || toast || bouge || dejaActif || b.getAttribute('aria-pressed') !== null, ou + ' : le bouton ne fait rien');
      if (/^[＋+]/.test(libelle)) { plus++; assert.ok(ouvert || toast || bouge, ou + ' : un bouton « + » doit ouvrir une fenêtre ou ajouter'); }
      if (w.document.querySelector('.toast')) w.document.querySelector('.toast').remove();
    }
  }
  assert.ok(clics > 80, 'assez de boutons testés (' + clics + ')');
  assert.ok(plus >= 5, 'des boutons « + » ont été rencontrés (' + plus + ')');
});

test('le parcours du premier jour tient de bout en bout', async () => {
  const { w, erreurs } = creerPage();
  w.MaTable.app.demarrer(); fermerFeuilles(w);
  const etat = w.MaTable.Stockage.etat; etat.utilisateur = 'm2';
  const U = w.MaTable.util; const lundi = U.lundiDe(U.aujourdhui());
  // 1. Proposer ma semaine
  aller(w, 'menus', {});
  cliquer(boutons(w).find(b => /Proposer ma semaine/.test(texte(b))));
  assert.ok(etat.semaines[lundi], 'la semaine est créée');
  assert.strictEqual(w.document.querySelectorAll('.repas:not(.vide)').length, 21, '21 repas affichés');
  assert.ok(texte(contenu(w)).includes('Cantine'), 'la cantine apparaît');
  // 2. Autre idée sur un dîner
  const carte = w.document.querySelector('.jour .repas:not(.vide):nth-of-type(3)');
  const avant = texte(carte); cliquer(carte);
  cliquer(boutons(w, dialogues(w)[0]).find(b => /Autre idée/.test(texte(b))));
  await attendre(5);
  assert.notStrictEqual(texte(w.document.querySelector('.jour .repas:not(.vide):nth-of-type(3)')), avant, 'le repas a changé');
  // 3. Tout aux courses
  cliquer(boutons(w).find(b => /Tout aux courses/.test(texte(b))));
  assert.ok(etat.liste.length > 20, 'la liste est remplie (' + etat.liste.length + ')');
  // 4. Batch du dimanche
  cliquer(boutons(w).find(b => /Batch du/.test(texte(b))));
  assert.ok(/Dans l.ordre/.test(texte(contenu(w))) && w.document.querySelectorAll('.etiquette').length >= 5, 'le plan de batch et les étiquettes');
  // 5. Courses : ajout rapide, magasin, mode magasin
  aller(w, 'courses', {});
  const champ = contenu(w).querySelector('.ajout input');
  champ.value = '2 kg carottes bio'; champ.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  assert.ok(etat.liste.some(a => /carottes bio/i.test(a.nom) && a.qte === 2 && a.unite === 'kg'), 'article ajouté avec quantité');
  cliquer(boutons(w).find(b => /Mode « En magasin »/.test(texte(b))));
  assert.ok(w.document.querySelector('.magasin-plein'), 'mode magasin ouvert');
  const magasin = w.document.querySelector('.magasin-plein').dataset.magasin;
  const cases = [...w.document.querySelectorAll('.magasin-plein .article .coche')].slice(0, 3);
  for (const c of cases) cliquer(c);
  assert.strictEqual(etat.liste.filter(a => a.coche).length, 3, 'trois articles cochés');
  assert.ok(etat.liste.filter(a => a.coche).every(a => a.cochePar === 'm2'), 'on sait qui a coché');
  assert.ok(/3 \/ \d+/.test(texte(w.document.querySelector('.magasin-plein .compteur'))), 'compteur « 3 / n »');
  cliquer(boutons(w, w.document.querySelector('.magasin-plein')).find(b => /Terminer ce magasin/.test(texte(b))));
  const f = dialogues(w)[0]; assert.ok(f, 'fenêtre de fin de magasin');
  f.querySelector('input').value = '64,50';
  cliquer(boutons(w, f).find(b => /^Terminer$/.test(texte(b))));
  await attendre(5);
  assert.strictEqual(etat.achats.length, 1, 'un passage archivé'); assert.strictEqual(etat.achats[0].montant, 64.5); assert.strictEqual(etat.achats[0].magasin, magasin);
  assert.strictEqual(etat.gardeManger.length, 3, 'le garde-manger a reçu les achats');
  assert.strictEqual(etat.liste.filter(a => a.coche).length, 0, 'les cochés ont quitté la liste');
  // 6. Historique : noter un repas
  aller(w, 'historique', { onglet: 'semaines', lundi });
  const refait = boutons(w).find(b => /On refait/.test(texte(b)));
  if (refait) { cliquer(refait); assert.ok(etat.avis.some(a => a.note === 'refait'), 'avis enregistré'); }
  else assert.ok(U.aujourdhui() === lundi, 'aucun repas passé à noter n’est possible seulement le lundi');
  assert.ok(texte(contenu(w)).includes('64,50'), 'la dépense apparaît dans la semaine');
  aller(w, 'historique', { onglet: 'tableau' });
  assert.ok(/lunch boxes/.test(texte(contenu(w))) && !/calorie[^s]/.test(texte(contenu(w)).replace('Aucune calorie', '')), 'tableau de bord sans calories');
  // 7. Scanner : saisie d'un code
  w.fetch = async () => ({ ok: true, status: 200, json: async () => ({ status: 1, product: { product_name_fr: 'Biscuits test', brands: 'Marque', nutriscore_grade: 'd', categories: 'Biscuits' } }) });
  aller(w, 'scanner', {});
  const code = contenu(w).querySelector('input[type="tel"]'); code.value = '3017620422003';
  cliquer(boutons(w).find(b => b.getAttribute('aria-label') === 'Chercher'));
  await attendre(20);
  assert.ok(texte(contenu(w)).includes('Biscuits test') && w.document.querySelector('.nutri-D'), 'fiche produit avec Nutri-Score');
  assert.ok(/Plus léger/.test(texte(contenu(w))), 'alternative proposée pour un D');
  cliquer(boutons(w).find(b => /À la liste/.test(texte(b))));
  assert.ok(etat.liste.some(a => a.nom === 'Biscuits test'), 'le produit scanné est sur la liste');
  // 8. Garde-manger : que cuisiner ce soir
  aller(w, 'courses', { onglet: 'garde' });
  cliquer(boutons(w).find(b => /Que cuisiner ce soir/.test(texte(b))));
  assert.ok(dialogues(w).length === 1, 'les idées s’ouvrent');
  fermerFeuilles(w);
  // 9. Profil : suivi du poids privé
  aller(w, 'profil', {});
  cliquer(boutons(w).find(b => /^Activer$/.test(texte(b))));
  let d = dialogues(w)[0]; d.querySelector('input').value = '4321';
  cliquer(boutons(w, d).find(b => /Valider/.test(texte(b))));
  await attendre(5);
  assert.ok(etat.poids['m1'] && etat.poids['m1'].code === '4321', 'le suivi est activé avec un code');
  d = dialogues(w)[0]; assert.ok(d && /suivi du poids/.test(texte(d)), 'l’espace privé s’ouvre');
  d.querySelector('input[inputmode="decimal"]').value = '78,2';
  cliquer(boutons(w, d).find(b => /Enregistrer la pesée/.test(texte(b))));
  assert.strictEqual(etat.poids['m1'].mesures.length, 1, 'pesée enregistrée');
  fermerFeuilles(w);
  aller(w, 'profil', {});
  assert.ok(!texte(contenu(w)).includes('78,2'), 'le poids n’apparaît pas hors de l’espace privé');
  // 10. Export / import
  const exp = w.MaTable.Stockage.exporter();
  assert.ok(exp.includes('Biscuits test'));
  // 11. Historique : réutiliser la semaine dernière — on crée une semaine passée puis on la reprend
  const passe = U.ajouterJours(lundi, -7);
  etat.semaines[passe] = w.MaTable.Menus.genererSemaine(etat, passe, 5); w.MaTable.Stockage.sauver();
  aller(w, 'historique', { onglet: 'semaines', lundi: passe });
  cliquer(boutons(w).find(b => /Réutiliser cette semaine/.test(texte(b))));
  d = dialogues(w)[0]; if (d) cliquer(boutons(w, d).find(b => /^Réutiliser$/.test(texte(b))));
  await attendre(5);
  assert.strictEqual(etat.semaines[lundi].copieDe, passe, 'la semaine en cours est une copie');
  assert.strictEqual(w.location.hash.split('?')[0], '#menus');
  assert.deepStrictEqual(erreurs, [], 'aucune erreur de console : ' + erreurs.join(' | '));
  // La persistance : recharger la page redonne le même état.
  const brut = w.localStorage.getItem('ma-table');
  assert.ok(brut && JSON.parse(brut).liste.length === etat.liste.length, 'l’état est enregistré dans le navigateur');
});

test('la photo n\u2019apparaît qu\u2019avec une clé, et l\u2019import propose la fusion', async () => {
  const { w, erreurs } = creerPage();
  w.MaTable.app.demarrer(); fermerFeuilles(w);
  const etat = w.MaTable.Stockage.etat; etat.utilisateur = 'm1';
  aller(w, 'scanner', {});
  assert.ok(!boutons(w).some(b => /Ticket/.test(texte(b))), 'pas de bouton photo sans clé');
  aller(w, 'profil', {});
  assert.ok(texte(contenu(w)).includes('Reconnaissance de photos'), 'la carte IA est dans Profil');
  etat.reglages.ia.cle = 'sk-ant-test'; w.MaTable.Stockage.sauver();
  aller(w, 'scanner', {});
  assert.ok(boutons(w).some(b => /Ticket/.test(texte(b))) && boutons(w).some(b => /Frigo/.test(texte(b))), 'les boutons photo apparaissent avec une clé');
  verifierSain(w, erreurs, 'scanner avec clé');
  // Import : la fenêtre propose Fusionner et Remplacer.
  aller(w, 'profil', {});
  const fichier = contenu(w).querySelector('input[type="file"]');
  const exp = w.MaTable.Stockage.exporter();
  const f = new w.File([exp], 'export.json', { type: 'application/json' });
  Object.defineProperty(fichier, 'files', { value: [f] });
  fichier.dispatchEvent(new w.Event('change', { bubbles: true }));
  await attendre(30);
  const d = dialogues(w)[0];
  assert.ok(d && /Fusionner/.test(texte(d)) && /Remplacer/.test(texte(d)), 'choix Fusionner / Remplacer');
  cliquer(boutons(w, d).find(b => /Fusionner/.test(texte(b))));
  await attendre(5);
  assert.ok(w.document.querySelector('.toast') && /Fusion faite/.test(texte(w.document.querySelector('.toast'))), 'la fusion est confirmée');
  assert.deepStrictEqual(erreurs, []);
});

test('la carte de synchronisation guide et réagit', async () => {
  const { w, erreurs } = creerPage();
  w.MaTable.app.demarrer(); fermerFeuilles(w);
  const etat = w.MaTable.Stockage.etat; etat.utilisateur = 'm1';
  aller(w, 'profil', {});
  assert.ok(texte(contenu(w)).includes('Synchronisation entre appareils') && texte(contenu(w)).includes('Tokens (classic)'), 'carte et mode d\u2019emploi');
  const gists = {};
  w.MaTable.Synchro.fetchImpl = async (url, o) => {
    const h = { get: () => '"1"' };
    if (url.endsWith('/gists?per_page=100')) return { ok: true, status: 200, headers: h, json: async () => [] };
    if (o.method === 'POST') { gists.g1 = { id: 'g1', files: { 'ma-table.json': { content: JSON.parse(o.body).files['ma-table.json'].content } } }; return { ok: true, status: 201, headers: h, json: async () => gists.g1 }; }
    if (o.method === 'GET') return { ok: true, status: 200, headers: h, json: async () => gists.g1 };
    return { ok: true, status: 200, headers: h, json: async () => gists.g1 };
  };
  contenu(w).querySelector('input[aria-label="Jeton GitHub"]').value = 'ghp_test';
  cliquer(boutons(w).find(b => /Activer la synchronisation/.test(texte(b))));
  await attendre(50);
  assert.ok(w.MaTable.Synchro.actif(etat), 'activée');
  assert.ok(texte(contenu(w)).includes('À jour') || texte(contenu(w)).includes('Activée'), 'statut affiché : ' + texte(contenu(w)).slice(0, 80));
  assert.ok(boutons(w).some(b => /Synchroniser maintenant/.test(texte(b))));
  cliquer(boutons(w).find(b => /^Désactiver$/.test(texte(b))));
  cliquer(boutons(w, dialogues(w)[0]).find(b => /^Désactiver$/.test(texte(b))));
  await attendre(10);
  assert.ok(!w.MaTable.Synchro.actif(etat));
  w.MaTable.Synchro.fetchImpl = null; w.MaTable.Synchro.arreter();
  assert.deepStrictEqual(erreurs, []);
});

test('sans lecteur natif (iPhone), le scanner passe par ZXing avec la caméra', async () => {
  const { w, erreurs } = creerPage();
  w.MaTable.app.demarrer(); fermerFeuilles(w);
  assert.strictEqual(typeof w.ZXing, 'object', 'ZXing est chargé par la page');
  // Faux appareil : une caméra, pas de BarcodeDetector, et un lecteur ZXing qui « lit » un code.
  delete w.BarcodeDetector;
  Object.defineProperty(w.navigator, 'mediaDevices', { value: { getUserMedia: async () => ({ getTracks: () => [] }) }, configurable: true });
  let appels = 0, reinitialise = 0;
  const vrai = w.ZXing.BrowserMultiFormatReader;
  w.ZXing.BrowserMultiFormatReader = class { constructor(indices) { assert.ok(indices.get(w.ZXing.DecodeHintType.POSSIBLE_FORMATS).includes(w.ZXing.BarcodeFormat.EAN_13)); } async decodeFromConstraints(c, video, cb) { appels++; assert.ok(c.video, 'contraintes caméra'); cb({ getText: () => '3017620422003' }); } reset() { reinitialise++; } };
  w.fetch = async () => ({ ok: true, status: 200, json: async () => ({ status: 1, product: { product_name_fr: 'Produit ZXing', nutriscore_grade: 'b', categories: 'Test' } }) });
  aller(w, 'scanner', {});
  await attendre(30);
  assert.strictEqual(appels, 1, 'ZXing démarré sur la caméra');
  assert.ok(texte(contenu(w)).includes('Code lu : 3017620422003'), 'le code lu est affiché');
  assert.ok(texte(contenu(w)).includes('Produit ZXing'), 'la fiche produit suit');
  aller(w, 'menus', {});
  assert.strictEqual(reinitialise, 1, 'la caméra est relâchée en quittant l\u2019écran');
  w.ZXing.BrowserMultiFormatReader = vrai;
  assert.deepStrictEqual(erreurs, []);
});

test('dans Essentiels, le magasin se change d\u2019un tap et l\u2019habitude est retenue', async () => {
  const { w, erreurs } = creerPage();
  w.MaTable.app.demarrer(); fermerFeuilles(w);
  const etat = w.MaTable.Stockage.etat; etat.utilisateur = 'm1';
  aller(w, 'courses', { onglet: 'essentiels' });
  const b = boutons(w).find(x => (x.getAttribute('aria-label') || '') === 'Changer le magasin de Lait');
  assert.ok(b && /Supermarché/.test(texte(b)), 'le lait part au supermarché par défaut');
  cliquer(b);
  const d = dialogues(w)[0]; assert.ok(d, 'le choix du magasin s\u2019ouvre');
  cliquer(boutons(w, d).find(x => /Biocoop/.test(texte(x))));
  await attendre(5);
  assert.strictEqual(w.MaTable.Courses.affecter('lait', { preferencesMagasin: etat.preferencesMagasin }).magasin, 'biocoop', 'habitude apprise');
  assert.ok(/Biocoop/.test(texte(boutons(w).find(x => (x.getAttribute('aria-label') || '') === 'Changer le magasin de Lait'))), 'l\u2019écran reflète le choix');
  cliquer(boutons(w).find(x => /＋ Liste/.test(texte(x)) && /Lait/.test(texte(x.closest('li')))));
  assert.strictEqual(etat.liste.find(a => a.nom === 'Lait').magasin, 'biocoop', 'l\u2019ajout suit l\u2019habitude');
  assert.deepStrictEqual(erreurs, []);
});

test('les réglages influencent la proposition (temps max, jour du batch, repas plaisir)', () => {
  const { w } = creerPage();
  w.MaTable.app.demarrer(); fermerFeuilles(w);
  const etat = w.MaTable.Stockage.etat;
  etat.reglages.tempsMaxSemaine = 20; etat.reglages.jourBatch = 6; etat.reglages.tolerancePlaisir = 0;
  const s = w.MaTable.Menus.genererSemaine(etat, '2026-09-21', 3);
  assert.strictEqual(s.batch.date, '2026-09-26', 'batch le samedi');
  for (const j of Object.keys(s.repas).slice(0, 5)) { const r = s.repas[j].soir; assert.ok(r.type === 'rechauffer' || r.minutes <= 20, r.titre); }
  const plaisirs = Object.values(s.repas).flatMap(j => [j.midi, j.soir]).filter(r => r && r.badges.includes('plaisir')).length;
  assert.strictEqual(plaisirs, 0, 'aucun repas plaisir quand la tolérance est à zéro');
});

(async () => {
  let ok = 0, ko = 0;
  for (const t of tests) {
    try { await t.f(); ok++; console.log('  ✓ ' + t.nom); }
    catch (e) { ko++; console.log('  ✗ ' + t.nom + '\n      ' + (e.stack || e.message).split('\n').slice(0, 4).join('\n      ')); }
  }
  console.log('\n' + ok + ' réussis, ' + ko + ' échoués (écrans)');
  process.exit(ko ? 1 : 0);
})();
