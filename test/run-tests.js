// Tests du moteur de « Ma Table », sans interface : node test/run-tests.js
const assert = require('assert');
const path = require('path');
for (const f of ['js/util.js', 'js/donnees/recettes.js', 'js/donnees/articles.js', 'js/moteur/stockage.js', 'js/moteur/courses.js', 'js/moteur/menus.js', 'js/moteur/historique.js', 'js/moteur/scan.js', 'js/moteur/ia.js']) {
  require(path.join(__dirname, '..', f));
}
const T = globalThis.MaTable;
const U = T.util;
let reussis = 0, echoues = 0;
const tests = [];
function test(nom, f) { tests.push({ nom, f }); }

function etatNeuf() { return T.Stockage.reinitialiserPourTests(); }

// --- Utilitaires ---------------------------------------------------------
test('lundiDe trouve le lundi de la semaine, dimanche compris', () => {
  assert.strictEqual(U.lundiDe('2026-09-17'), '2026-09-14');
  assert.strictEqual(U.lundiDe('2026-09-20'), '2026-09-14');
  assert.strictEqual(U.lundiDe('2026-09-14'), '2026-09-14');
});
test('les dates sont en heure locale, sans décalage d’un jour', () => {
  assert.strictEqual(U.iso(new Date(2026, 0, 1, 23, 30)), '2026-01-01');
  assert.strictEqual(U.ajouterJours('2026-01-31', 1), '2026-02-01');
  assert.strictEqual(U.libelleSemaine('2026-09-28'), 'du 28 septembre au 4 octobre');
});
test('normaliser rapproche « Tomates cerises » et « tomate cerise »', () => {
  assert.strictEqual(U.racineMot('Tomates cerises'), U.racineMot('tomate cerise'));
  assert.strictEqual(U.normaliser('Œufs'), 'oeufs');
});

// --- Données de départ ------------------------------------------------------
test('les données de départ sont complètes et cohérentes', () => {
  const R = T.RECETTES_DEPART, A = T.ARTICLES_DEPART;
  assert.ok(R.length >= 40, 'au moins 40 recettes');
  assert.ok(R.filter(r => r.badges.includes('enfant')).length >= 12, '12 approuvées enfant');
  assert.ok(R.filter(r => r.cuisson === 'cookeo').length >= 10, '10 Cookeo');
  assert.ok(R.filter(r => r.cuisson === 'airfryer').length >= 8, '8 air fryer');
  assert.ok(R.filter(r => r.badges.includes('lunchbox')).length >= 8, '8 lunch box');
  assert.strictEqual(R.filter(r => r.creneau === 'matin').length, 6, '6 petits-déjeuners');
  assert.ok(A.length >= 100, 'une centaine d’articles');
  for (const r of R) {
    assert.ok(r.id && r.titre && r.ingredients.length && r.etapes.length, r.titre);
    assert.ok(['cookeo', 'airfryer', 'four', 'plaques', 'aucun'].includes(r.cuisson), r.cuisson);
    assert.ok(r.conservationJours >= 0);
  }
  for (const a of A) assert.ok(T.Courses.RAYONS.includes(a.rayon), a.nom + ' : rayon inconnu ' + a.rayon);
  const ids = new Set(R.map(r => r.id)); assert.strictEqual(ids.size, R.length, 'identifiants uniques');
});
test('aucune donnée personnelle dans les fichiers livrés', () => {
  const fs = require('fs');
  // Les mots sont assemblés pour que ce fichier ne les contienne pas lui-même.
  const motsInterdits = [['lou', 'ise'], ['bit', 'ton'], ['wana', 'doo'], ['jac', 'ques']].map(m => new RegExp(m.join(''), 'i'));
  const marcher = d => fs.readdirSync(d).flatMap(n => { const p = path.join(d, n); return fs.statSync(p).isDirectory() ? (n === 'node_modules' || n === '.git' ? [] : marcher(p)) : [p]; });
  for (const f of marcher(path.join(__dirname, '..'))) {
    if (!/\.(js|html|css|json|webmanifest|md)$/.test(f)) continue;
    const texte = fs.readFileSync(f, 'utf8');
    for (const m of motsInterdits) assert.ok(!m.test(texte), f + ' contient ' + m);
  }
});

// --- Stockage ---------------------------------------------------------------
test('l’état par défaut est complet et l’import pose une copie de sûreté', () => {
  const etat = etatNeuf();
  assert.strictEqual(etat.famille.membres.length, 3);
  assert.strictEqual(etat.famille.membres.filter(m => m.role === 'adulte').length, 2);
  T.Stockage.etat.liste.push({ id: 'x', nom: 'Test', coche: false });
  const exp = T.Stockage.exporter();
  assert.ok(exp.includes('"application": "Ma Table"'));
  const autre = JSON.parse(exp); autre.donnees.liste = [];
  T.Stockage.importer(JSON.stringify(autre));
  assert.strictEqual(T.Stockage.etat.liste.length, 0);
  const copie = T.Stockage.copieDeSurete();
  assert.strictEqual(copie.donnees.liste.length, 1, 'la copie de sûreté garde l’ancien état');
  assert.throws(() => T.Stockage.importer('{"bidule":1}'), /pas un export/);
});
test('un état ancien est complété sans rien perdre', () => {
  const etat = etatNeuf();
  delete etat.gardeManger; delete etat.reglages.drive; etat.liste = [{ id: 'a', nom: 'Lait' }];
  const brut = JSON.stringify(etat);
  const mem = {}; global.localStorage = { getItem: k => mem[k] || null, setItem: (k, v) => { mem[k] = v; }, removeItem: k => { delete mem[k]; } };
  mem['ma-table'] = brut;
  const charge = T.Stockage.charger();
  assert.deepStrictEqual(charge.gardeManger, []);
  assert.strictEqual(charge.reglages.drive.actif, false);
  assert.strictEqual(charge.liste[0].nom, 'Lait');
  delete global.localStorage;
});

// --- Liste de courses -------------------------------------------------------
test('affectation par défaut : légumes → Grand Frais ou Marché, vrac → Biocoop, reste → Supermarché', () => {
  const C = T.Courses;
  assert.ok(['grand_frais', 'marche'].includes(C.affecter('Courgettes').magasin));
  assert.strictEqual(C.affecter('Courgettes').rayon, 'Fruits & légumes');
  assert.strictEqual(C.affecter('Quinoa').magasin, 'biocoop');
  assert.strictEqual(C.affecter('Papier toilette').magasin, 'supermarche');
  assert.strictEqual(C.affecter('Papier toilette').rayon, 'Hygiène & maison');
  assert.strictEqual(C.affecter('Un article totalement inconnu').magasin, 'supermarche');
  assert.strictEqual(C.affecter('Un article totalement inconnu').rayon, 'Épicerie');
  assert.strictEqual(C.affecter('Brebis fermier').magasin, 'supermarche');
  assert.strictEqual(C.affecter('Fromage de brebis').magasin, 'grand_frais');
});
test('l’habitude apprise l’emporte sur le catalogue, et respecte les magasins fréquentés', () => {
  const C = T.Courses;
  const prefs = {};
  const liste = [];
  const a = C.ajouter(liste, { nom: 'Courgettes', qte: 2, unite: 'pièces' }, { preferencesMagasin: prefs });
  C.changerMagasin(a, 'biocoop', prefs);
  assert.strictEqual(C.affecter('courgette', { preferencesMagasin: prefs }).magasin, 'biocoop');
  assert.strictEqual(C.affecter('Quinoa', { magasins: ['supermarche', 'marche'] }).magasin, 'supermarche');
});
test('ajouter deux fois le même article cumule les quantités, sans doublon', () => {
  const C = T.Courses; const liste = [];
  C.ajouter(liste, { nom: 'Œufs', qte: 6, unite: 'pièces', source: 'r1' });
  C.ajouter(liste, { nom: 'oeufs', qte: 3, unite: 'pièces', source: 'r2' });
  C.ajouter(liste, { nom: 'Lait', qte: 1, unite: 'l' });
  C.ajouter(liste, { nom: 'Lait', qte: 400, unite: 'ml' });
  assert.strictEqual(liste.length, 3);
  assert.strictEqual(liste[0].qte, 9);
  assert.deepStrictEqual(liste[0].sources, ['r1', 'r2']);
  assert.strictEqual(C.ajouter(liste, { nom: '   ' }), null);
});
test('les ingrédients déjà au garde-manger ne sont pas ajoutés', () => {
  const C = T.Courses; const liste = [];
  const gm = [{ nom: 'Huile d’olive', epuise: false }, { nom: 'Riz complet', epuise: true }];
  const r = C.ajouterIngredients(liste, [{ nom: 'Huile d\'olive', qte: 1, unite: 'c. à soupe' }, { nom: 'Riz complet', qte: 300, unite: 'g' }], {}, gm, 'recette');
  assert.strictEqual(r.dejaLa.length, 1);
  assert.strictEqual(r.ajoutes.length, 1);
  assert.strictEqual(liste[0].nom, 'Riz complet');
});
test('classement par rayon dans l’ordre du parcours, cochés en bas', () => {
  const C = T.Courses; const liste = [];
  C.ajouter(liste, { nom: 'Lessive' }); C.ajouter(liste, { nom: 'Pommes' }); C.ajouter(liste, { nom: 'Lait' }); C.ajouter(liste, { nom: 'Filets de poulet' });
  C.cocher(liste[1], true, 'm1');
  const tries = C.trierRayons(liste.filter(a => a.magasin === 'supermarche'));
  assert.deepStrictEqual(tries.map(a => a.rayon), ['Viandes & poissons', 'Crèmerie', 'Hygiène & maison']);
  const groupes = C.parRayon(liste);
  assert.strictEqual(groupes[groupes.length - 1].coche, true);
  assert.strictEqual(groupes[groupes.length - 1].articles[0].nom, 'Pommes');
  assert.strictEqual(liste[1].cochePar, 'm1');
});
test('terminer un magasin archive les articles cochés et alimente le garde-manger', () => {
  const etat = etatNeuf(); const C = T.Courses;
  C.ajouter(etat.liste, { nom: 'Lait', qte: 2, unite: 'l' }); C.ajouter(etat.liste, { nom: 'Beurre' }); C.ajouter(etat.liste, { nom: 'Pommes' });
  C.cocher(etat.liste[0], true, 'm2');
  const achat = C.terminerMagasin(etat, 'supermarche', { montant: '42,5'.replace(',', '.'), date: '2026-09-15' });
  assert.strictEqual(achat.articles.length, 1);
  assert.strictEqual(achat.montant, 42.5);
  assert.strictEqual(etat.liste.length, 2, 'le beurre non coché reste, les pommes sont ailleurs');
  assert.strictEqual(etat.gardeManger.length, 1);
  assert.strictEqual(etat.gardeManger[0].nom, 'Lait');
  assert.strictEqual(etat.achats.length, 1);
});
test('essentiels : ceux du catalogue par défaut, basculables', () => {
  const etat = etatNeuf(); const C = T.Courses;
  const e = C.essentiels(etat);
  assert.ok(e.includes('Lait') && e.includes('Papier toilette'));
  assert.strictEqual(C.basculerEssentiel(etat, 'Lait'), false);
  assert.ok(!C.essentiels(etat).includes('Lait'));
  assert.strictEqual(C.basculerEssentiel(etat, 'Chocolat noir'), true);
  assert.ok(C.essentiels(etat).includes('Chocolat noir'));
});
test('suggestions : ce qu’on achète presque chaque semaine et qui manque', () => {
  const etat = etatNeuf(); const C = T.Courses;
  for (const d of ['2026-08-18', '2026-08-25', '2026-09-01', '2026-09-08']) {
    etat.achats.push({ id: d, date: d, magasin: 'supermarche', articles: [{ nom: 'Yaourt nature' }, { nom: 'Lait' }], montant: null });
  }
  etat.achats.push({ id: 'x', date: '2026-09-01', magasin: 'marche', articles: [{ nom: 'Cerises' }], montant: null });
  C.ajouter(etat.liste, { nom: 'Lait' });
  const s = C.suggestions(etat);
  assert.deepStrictEqual(s.map(x => x.nom), ['Yaourt nature']);
  assert.strictEqual(s[0].fois, 4);
  assert.deepStrictEqual(C.suggestions(etatNeuf()), []);
});
test('autocomplétion sur le catalogue et l’historique, préfixe d’abord', () => {
  const etat = etatNeuf(); const C = T.Courses;
  etat.achats.push({ id: 'a', date: '2026-09-01', magasin: 'marche', articles: [{ nom: 'Pommes golden' }] });
  const r = C.autocompleter(etat, 'pom');
  assert.strictEqual(r[0].toLowerCase().startsWith('pom'), true);
  assert.ok(r.includes('Pommes golden'));
  assert.deepStrictEqual(C.autocompleter(etat, ''), []);
});
test('texte prêt pour un drive et lien de recherche', () => {
  const C = T.Courses; const liste = [];
  C.ajouter(liste, { nom: 'Lait', qte: 2, unite: 'l' }); C.ajouter(liste, { nom: 'Pommes' });
  assert.strictEqual(C.texteDrive(liste, 'supermarche'), 'Lait (2 l)');
  assert.strictEqual(C.lienRecherche('https://exemple.test/recherche?q=%s', 'lait demi écrémé'), 'https://exemple.test/recherche?q=lait%20demi%20%C3%A9cr%C3%A9m%C3%A9');
  assert.strictEqual(C.lienRecherche('pas une adresse', 'lait'), null);
});

// --- Menus -------------------------------------------------------------------
function semaineTest(etat, graine) { return T.Menus.genererSemaine(etat, '2026-09-21', graine || 7); }
test('la semaine respecte l’organisation familiale', () => {
  const etat = etatNeuf();
  for (let g = 1; g <= 12; g++) {
    const s = semaineTest(etat, g);
    const jours = Object.keys(s.repas).sort();
    assert.strictEqual(jours.length, 7);
    for (const j of jours) assert.ok(s.repas[j].matin, 'petit-déjeuner ' + j);
    for (const j of jours.slice(0, 5)) {
      assert.strictEqual(s.repas[j].midi.type, 'lunchbox', 'déjeuner semaine = lunch box');
      assert.ok(/Cantine/.test(s.repas[j].midi.sousTitre));
      const soir = s.repas[j].soir;
      assert.ok(soir, 'dîner ' + j);
      assert.ok(soir.type === 'rechauffer' || soir.minutes <= 25, 'dîner rapide ou réchauffé : ' + soir.titre + ' ' + soir.minutes);
    }
    for (const j of jours.slice(5)) { assert.ok(s.repas[j].midi && s.repas[j].midi.type === 'recette'); assert.ok(s.repas[j].soir); }
    const soirs = jours.map(j => s.repas[j].soir);
    assert.ok(soirs.filter(r => r.badges.includes('enfant')).length >= 2, 'au moins 2 dîners enfant (graine ' + g + ')');
    const plaisirs = jours.slice(5).flatMap(j => [s.repas[j].midi, s.repas[j].soir]).filter(r => r.badges.includes('plaisir')).length;
    assert.strictEqual(plaisirs, 1, 'un repas plaisir le week-end (graine ' + g + ')');
    const plaisirsSemaine = jours.slice(0, 5).flatMap(j => [s.repas[j].soir]).filter(r => r.badges.includes('plaisir')).length;
    assert.strictEqual(plaisirsSemaine, 0, 'pas de repas plaisir en semaine');
    // pas de répétition hors petits-déjeuners
    const ids = jours.flatMap(j => [s.repas[j].midi, s.repas[j].soir]).filter(r => r && r.type === 'recette').map(r => r.recetteId);
    assert.strictEqual(new Set(ids).size, ids.length, 'pas deux fois la même recette');
    // batch
    assert.strictEqual(s.batch.date, '2026-09-27');
    const lb = s.batch.preparations.filter(p => p.role === 'lunchbox');
    assert.ok(lb.length >= 3 && lb.length <= 4, '3 à 4 préparations');
    const couverts = lb.flatMap(p => p.jours).sort();
    assert.deepStrictEqual(couverts, jours.slice(0, 5), 'les lunch boxes couvrent lundi → vendredi');
    for (const p of s.batch.preparations) assert.ok(p.conservation, 'conservation indiquée');
    assert.ok(s.batch.etapes.length >= 3 && s.batch.contenants.length >= 5);
    assert.ok(s.batch.etapes.some(e => /Cookeo|Air fryer|Four|Plaques/.test(e.texte)));
  }
});
test('la génération est reproductible avec la même graine, différente sinon', () => {
  const etat = etatNeuf();
  const a = semaineTest(etat, 3), b = semaineTest(etat, 3), c = semaineTest(etat, 4);
  assert.strictEqual(JSON.stringify(a.repas), JSON.stringify(b.repas));
  assert.notStrictEqual(JSON.stringify(a.repas), JSON.stringify(c.repas));
});
test('« Jamais plus » disparaît, « On refait » revient plus souvent', () => {
  const etat = etatNeuf();
  const rec = T.RECETTES_DEPART.find(r => r.titre.startsWith('Wok de dinde'));
  etat.avis.push({ id: 'a', date: '2026-09-08', creneau: 'soir', recetteId: rec.id, titre: rec.titre, note: 'jamais', quand: '2026-09-08T20:00:00Z' });
  for (let g = 1; g <= 30; g++) {
    const s = semaineTest(etat, g);
    for (const j of Object.keys(s.repas)) for (const c of ['midi', 'soir']) assert.notStrictEqual(s.repas[j][c] && s.repas[j][c].recetteId, rec.id, 'jamais plus doit disparaître');
  }
  assert.strictEqual(T.Menus.poids(etat, rec, {}), 0);
  const fav = T.RECETTES_DEPART.find(r => r.titre.startsWith('Saumon air fryer'));
  const sans = T.Menus.poids(etatNeuf(), fav, {});
  etat.avis.push({ id: 'b', date: '2026-09-09', creneau: 'soir', recetteId: fav.id, titre: fav.titre, note: 'refait', enfant: 'adore', quand: '2026-09-09T20:00:00Z' });
  assert.ok(T.Menus.poids(etat, fav, {}) > sans * 3);
});
test('un refus de l’enfant et les aliments peu aimés pèsent sur le tirage', () => {
  const etat = etatNeuf();
  const rec = T.RECETTES_DEPART.find(r => r.titre.startsWith('Dahl'));
  const base = T.Menus.poids(etat, rec, { lundi: '2026-09-21' });
  etat.avis.push({ id: 'a', date: '2026-09-10', creneau: 'soir', recetteId: rec.id, titre: rec.titre, note: null, enfant: 'refuse', quand: '2026-09-10T20:00:00Z' });
  assert.ok(T.Menus.poids(etat, rec, { lundi: '2026-09-21' }) < base);
  const etat2 = etatNeuf();
  etat2.famille.membres[2].aimePeu = ['lentilles'];
  assert.ok(T.Menus.poids(etat2, rec, {}) < 1);
});
test('« Autre idée » change le repas en restant compatible avec le créneau', () => {
  const etat = etatNeuf();
  const s = semaineTest(etat, 5);
  const avant = s.repas['2026-09-22'].soir;
  const apres = T.Menus.autreIdee(etat, s, '2026-09-22', 'soir', 99);
  assert.ok(apres && apres.recetteId !== avant.recetteId);
  assert.ok(apres.minutes <= 25 || apres.type === 'rechauffer');
  const lbAvant = s.repas['2026-09-23'].midi;
  const lbApres = T.Menus.autreIdee(etat, s, '2026-09-23', 'midi', 7);
  assert.strictEqual(lbApres.type, 'lunchbox');
  assert.notStrictEqual(lbApres.recetteId, lbAvant.recetteId);
  const couverts = s.batch.preparations.filter(p => p.role === 'lunchbox').flatMap(p => p.jours).sort();
  assert.deepStrictEqual(couverts, ['2026-09-21', '2026-09-22', '2026-09-23', '2026-09-24', '2026-09-25'], 'le batch suit le changement');
  assert.ok(s.batch.preparations.some(p => p.recetteId === lbApres.recetteId && p.jours.includes('2026-09-23')));
});
test('déplacer un repas échange les deux jours et met le batch à jour', () => {
  const etat = etatNeuf();
  const s = semaineTest(etat, 8);
  const a = s.repas['2026-09-21'].soir, b = s.repas['2026-09-24'].soir;
  T.Menus.deplacerRepas(s, '2026-09-21', 'soir', '2026-09-24');
  assert.strictEqual(s.repas['2026-09-21'].soir, b);
  assert.strictEqual(s.repas['2026-09-24'].soir, a);
});
test('ingrédients de la semaine : cumulés, ajustés aux lunch boxes, quantités lisibles', () => {
  const etat = etatNeuf();
  const s = semaineTest(etat, 7);
  const ings = T.Menus.ingredientsSemaine(etat, s);
  assert.ok(ings.length > 20);
  const cles = ings.map(i => U.racineMot(i.nom) + '|' + (i.unite || ''));
  assert.strictEqual(new Set(cles).size, cles.length, 'dédoublonnés');
  for (const i of ings) if (i.unite === 'g' && i.qte > 50) assert.strictEqual(i.qte % 10, 0, i.nom + ' arrondi à 10 g');
  assert.strictEqual(T.Menus.arrondir(1166.7, 'g'), 1170);
  assert.strictEqual(T.Menus.arrondir(2.3, 'pièces'), 3);
  assert.strictEqual(T.Menus.arrondir(1.2, 'c. à soupe'), 1.5);
  const r = T.Menus.ingredientsRecette(T.RECETTES_DEPART[0], 6);
  assert.strictEqual(r[0].qte, T.RECETTES_DEPART[0].ingredients[0].qte * 2);
});
test('une recette de la famille rejoint le catalogue et le planificateur', () => {
  const etat = etatNeuf();
  const r = T.Menus.enregistrerRecette(etat, { titre: 'Soupe de test', creneau: 'soir', minutes: 15, cuisson: 'cookeo', ingredients: [{ nom: 'Carottes', qte: 3, unite: 'pièces' }], etapes: ['Cuire.'], badges: ['leger'] });
  assert.ok(r.id && r.badges.includes('cookeo'));
  assert.ok(T.Menus.toutesRecettes(etat).some(x => x.id === r.id));
  etat.recettesMasquees.push(T.RECETTES_DEPART[0].id);
  assert.ok(!T.Menus.toutesRecettes(etat).some(x => x.id === T.RECETTES_DEPART[0].id));
  assert.ok(T.Menus.recetteParId(etat, T.RECETTES_DEPART[0].id), 'masquée mais toujours lisible dans l’historique');
});

// --- Historique ---------------------------------------------------------------
test('noter un repas, puis compléter la note sans perdre la précédente', () => {
  const etat = etatNeuf();
  const s = semaineTest(etat, 7); etat.semaines[s.lundi] = s;
  const a = T.Historique.noter(etat, { date: '2026-09-22', creneau: 'soir', note: 'refait' });
  assert.strictEqual(a.recetteId, s.repas['2026-09-22'].soir.recetteId);
  const b = T.Historique.noter(etat, { date: '2026-09-22', creneau: 'soir', enfant: 'adore' });
  assert.strictEqual(b.note, 'refait'); assert.strictEqual(b.enfant, 'adore');
  assert.strictEqual(etat.avis.length, 2, 'rien n’est effacé');
  assert.strictEqual(T.Historique.avisDe(etat, '2026-09-22', 'soir').id, b.id);
});
test('résumé de semaine et dépenses par magasin', () => {
  const etat = etatNeuf();
  const s = semaineTest(etat, 7); etat.semaines[s.lundi] = s;
  etat.achats.push({ id: 'a', date: '2026-09-23', magasin: 'biocoop', articles: [{ nom: 'Quinoa' }], montant: 18.9 });
  etat.achats.push({ id: 'b', date: '2026-09-24', magasin: 'supermarche', articles: [{ nom: 'Lait' }, { nom: 'Beurre' }], montant: null });
  const r = T.Historique.resumeSemaine(etat, '2026-09-21');
  assert.strictEqual(r.lunchBoxes, 5);
  assert.strictEqual(r.plaisirs, 1);
  assert.ok(r.repasMaison >= 19);
  assert.strictEqual(r.total, 18.9);
  assert.strictEqual(r.depenses.supermarche.articles, 2);
  assert.deepStrictEqual(T.Historique.semainesConnues(etat), ['2026-09-21']);
});
test('réutiliser une semaine la recopie sur une autre, batch compris', () => {
  const etat = etatNeuf();
  const s = semaineTest(etat, 7); etat.semaines[s.lundi] = s;
  const c = T.Historique.reutiliserSemaine(etat, '2026-09-21', '2026-10-05');
  assert.strictEqual(c.repas['2026-10-06'].soir.titre, s.repas['2026-09-22'].soir.titre);
  assert.strictEqual(c.batch.date, '2026-10-11');
  assert.ok(c.batch.preparations.every(p => p.jours.every(j => j >= '2026-10-05' && j <= '2026-10-11')));
  assert.strictEqual(c.copieDe, '2026-09-21');
  assert.ok(etat.semaines['2026-09-21'], 'la source reste archivée');
});
test('recherche et statistiques', () => {
  const etat = etatNeuf();
  const s = semaineTest(etat, 7); etat.semaines[s.lundi] = s;
  etat.achats.push({ id: 'a', date: '2026-09-23', magasin: 'biocoop', articles: [{ nom: 'Quinoa' }], montant: 18.9 });
  const titre = s.repas['2026-09-22'].soir.titre;
  const r = T.Historique.rechercher(etat, titre.split(' ')[0]);
  assert.ok(r.some(x => x.titre === titre));
  assert.ok(T.Historique.rechercher(etat, 'quinoa').some(x => x.type === 'achat'));
  const st = T.Historique.statistiques(etat, 3);
  assert.ok(st.recettes.length && st.articles[0].nom === 'Quinoa' && st.parEnseigne[0].magasin === 'biocoop');
});
test('tableau de bord sans calories, ton encourageant', () => {
  const etat = etatNeuf();
  const s = semaineTest(etat, 7); etat.semaines[s.lundi] = s;
  const t = T.Historique.tableauDeBord(etat, '2026-09-21');
  assert.ok(t.existe && t.total > 15 && t.legumes > 0 && t.lunchBoxes === 5);
  assert.ok(!/calorie/i.test(JSON.stringify(t)));
  assert.ok(t.message.length > 10);
  assert.strictEqual(T.Historique.tableauDeBord(etat, '2026-01-05').existe, false);
});
test('export CSV : point-virgule, BOM, guillemets échappés', () => {
  const etat = etatNeuf();
  const s = semaineTest(etat, 7); etat.semaines[s.lundi] = s;
  etat.achats.push({ id: 'a', date: '2026-09-23', magasin: 'biocoop', articles: [{ nom: 'Pain "spécial"', qte: 1, unite: 'pièce', rayon: 'Épicerie' }], montant: 3 });
  const c = T.Historique.csv(etat);
  assert.ok(c.repas.startsWith('﻿Date;Créneau;Repas'));
  assert.ok(c.achats.includes('"Pain ""spécial"""'));
  assert.ok(c.repas.split('\n').length > 20);
});

// --- Scan & garde-manger ------------------------------------------------------
test('Open Food Facts : lecture d’un produit, mémoire, alternative pour D/E', async () => {
  const etat = etatNeuf();
  let appels = 0;
  const faussFetch = async (url) => { appels++; assert.ok(url.startsWith(T.Scan.URL_OFF)); return { ok: true, status: 200, json: async () => ({ status: 1, product: { product_name_fr: 'Biscuits chocolat', brands: 'Marque', nutriscore_grade: 'd', categories: 'Snacks sucrés, Biscuits et gâteaux, Biscuits' } }) }; };
  const r = await T.Scan.chercherProduit(etat, '3017620422003', faussFetch);
  assert.strictEqual(r.produit.nom, 'Biscuits chocolat');
  assert.strictEqual(r.produit.nutriscore, 'D');
  assert.strictEqual(r.produit.categorie, 'Biscuits');
  assert.ok(/pain complet|fruits secs/i.test(T.Scan.alternative(r.produit)));
  const r2 = await T.Scan.chercherProduit(etat, '3017620422003', faussFetch);
  assert.strictEqual(r2.source, 'memoire'); assert.strictEqual(appels, 1);
  assert.strictEqual(T.Scan.alternative({ nutriscore: 'A' }), null);
  const inconnu = await T.Scan.chercherProduit(etat, '00000000', async () => ({ ok: false, status: 404, json: async () => ({ status: 0 }) }));
  assert.strictEqual(inconnu.produit, null);
  await assert.rejects(() => T.Scan.chercherProduit(etat, '123', faussFetch), /au moins 8 chiffres/);
  await assert.rejects(() => T.Scan.chercherProduit(etat, '99999999', async () => { throw new Error('réseau'); }), /Pas de connexion/);
});
test('garde-manger : ajout, péremption, et idées pour ce soir', () => {
  const etat = etatNeuf();
  T.Scan.ajouterGardeManger(etat, { nom: 'Gnocchis', qte: '500 g' });
  T.Scan.ajouterGardeManger(etat, { nom: 'Épinards frais', peremption: '2026-09-18' });
  T.Scan.ajouterGardeManger(etat, { nom: 'Ricotta' });
  T.Scan.ajouterGardeManger(etat, { nom: 'ricotta' });
  assert.strictEqual(etat.gardeManger.length, 3, 'pas de doublon');
  assert.strictEqual(T.Scan.joursAvantPeremption(etat.gardeManger[1], '2026-09-17'), 1);
  const idees = T.Scan.ideesAvecGardeManger(etat, { aujourdhui: '2026-09-17' });
  assert.ok(idees.length >= 1 && idees.length <= 3);
  assert.ok(idees[0].recette.titre.includes('gnocchis'), idees[0].recette.titre);
  assert.ok(idees[0].urgents.includes('Épinards frais'));
  assert.ok(idees[0].recette.minutes <= 25);
  assert.deepStrictEqual(T.Scan.ideesAvecGardeManger(etatNeuf()), []);
});

// --- Partage à deux et IA en option ---------------------------------------------
test('la clé API ne part jamais dans l\u2019export et survit à un import', () => {
  const etat = etatNeuf();
  etat.reglages.ia.cle = 'sk-ant-test-123';
  const exp = T.Stockage.exporter();
  assert.ok(!exp.includes('sk-ant-test-123'), 'clé absente de l\u2019export');
  const autre = JSON.parse(exp); autre.donnees.reglages.ia = { cle: '' };
  T.Stockage.importer(JSON.stringify(autre));
  assert.strictEqual(T.Stockage.etat.reglages.ia.cle, 'sk-ant-test-123', 'la clé locale est conservée');
});
test('fusionner deux téléphones ne perd rien de part et d\u2019autre', () => {
  const etat = etatNeuf(); const C = T.Courses;
  C.ajouter(etat.liste, { nom: 'Lait', qte: 1, unite: 'l' }); C.ajouter(etat.liste, { nom: 'Pommes' });
  etat.achats.push({ id: 'a1', date: '2026-09-14', magasin: 'biocoop', articles: [{ nom: 'Quinoa' }], montant: 10 });
  etat.semaines['2026-09-14'] = T.Menus.genererSemaine(etat, '2026-09-14', 1); etat.semaines['2026-09-14'].generee = '2026-09-10T10:00:00Z';
  etat.poids['m1'] = { code: '1111', actif: true, mesures: [{ date: '2026-09-01', kg: 80 }] };
  // L'autre téléphone : mêmes articles dont un coché, un article de plus, un achat de plus, une semaine plus récente, un avis.
  const autre = T.Stockage.etatDefaut();
  C.ajouter(autre.liste, { nom: 'lait', qte: 1, unite: 'l' }); C.cocher(autre.liste[0], true, 'm2'); C.ajouter(autre.liste, { nom: 'Beurre' });
  autre.achats.push({ id: 'a1', date: '2026-09-14', magasin: 'biocoop', articles: [{ nom: 'Quinoa' }], montant: 10 });
  autre.achats.push({ id: 'a2', date: '2026-09-15', magasin: 'marche', articles: [{ nom: 'Poires' }], montant: null });
  autre.semaines['2026-09-14'] = T.Menus.genererSemaine(autre, '2026-09-14', 2); autre.semaines['2026-09-14'].generee = '2026-09-12T10:00:00Z';
  autre.semaines['2026-09-21'] = T.Menus.genererSemaine(autre, '2026-09-21', 3);
  autre.avis.push({ id: 'v1', date: '2026-09-15', creneau: 'soir', recetteId: 'r8', titre: 'x', note: 'refait', quand: '2026-09-15T20:00:00Z' });
  autre.gardeManger.push({ id: 'g9', nom: 'Riz complet', epuise: false });
  autre.poids['m1'] = { code: '2222', actif: true, mesures: [{ date: '2026-09-01', kg: 80 }, { date: '2026-09-08', kg: 79 }] };
  autre.reglages.ia.cle = 'sk-ant-autre';
  const bilan = T.Stockage.fusionner(JSON.stringify({ application: 'Ma Table', donnees: autre }));
  assert.strictEqual(etat.liste.length, 3, 'Lait, Pommes, Beurre');
  const lait = etat.liste.find(a => a.nom === 'Lait');
  assert.strictEqual(lait.coche, true); assert.strictEqual(lait.cochePar, 'm2', 'on sait qui a coché');
  assert.strictEqual(etat.achats.length, 2); assert.strictEqual(bilan.achats, 1);
  assert.strictEqual(etat.avis.length, 1);
  assert.strictEqual(etat.semaines['2026-09-14'].generee, '2026-09-12T10:00:00Z', 'la semaine la plus récente gagne');
  assert.ok(etat.semaines['2026-09-21'], 'la semaine manquante arrive');
  assert.strictEqual(etat.gardeManger.length, 1);
  assert.strictEqual(etat.poids['m1'].code, '1111', 'le code local reste'); assert.strictEqual(etat.poids['m1'].mesures.length, 2, 'les pesées s\u2019unissent');
  assert.strictEqual(etat.reglages.ia.cle, '', 'la clé de l\u2019autre ne vient pas');
  assert.ok(T.Stockage.copieDeSurete(), 'copie de sûreté posée avant la fusion');
});
test('IA : inactive sans clé, appel structuré avec clé, erreurs traduites', async () => {
  const etat = etatNeuf();
  assert.strictEqual(T.IA.active(etat), false);
  await assert.rejects(() => T.IA.analyserPhoto(etat, 'xx', 'produit', async () => ({})), /Aucune clé/);
  etat.reglages.ia.cle = 'sk-ant-test';
  assert.strictEqual(T.IA.active(etat), true);
  let requete = null;
  const fauxFetch = async (url, options) => { requete = { url, options }; return { ok: true, status: 200, json: async () => ({ stop_reason: 'end_turn', content: [{ type: 'text', text: JSON.stringify({ articles: [{ nom: 'lait demi-écrémé', rayon: 'Crèmerie', quantite: '1 L', confiance: 0.9 }, { nom: '', rayon: 'Épicerie', quantite: '', confiance: 0.2 }], commentaire: 'Joli frigo.' }) }] }) }; };
  const res = await T.IA.analyserPhoto(etat, 'AAAA', 'frigo', fauxFetch);
  assert.strictEqual(requete.url, 'https://api.anthropic.com/v1/messages');
  assert.strictEqual(requete.options.headers['x-api-key'], 'sk-ant-test');
  assert.strictEqual(requete.options.headers['anthropic-dangerous-direct-browser-access'], 'true');
  const corps = JSON.parse(requete.options.body);
  assert.strictEqual(corps.model, 'claude-opus-5');
  assert.strictEqual(corps.output_config.format.type, 'json_schema');
  assert.strictEqual(corps.messages[0].content[0].type, 'image');
  assert.strictEqual(corps.messages[0].content[0].source.data, 'AAAA');
  assert.strictEqual(res.articles.length, 1, 'les lignes sans nom sont écartées');
  assert.strictEqual(res.articles[0].nom, 'Lait demi-écrémé');
  assert.strictEqual(res.commentaire, 'Joli frigo.');
  const ticket = T.IA.nettoyer({ magasin: 'inconnu', date: '15/09/2026', montant: '42.5', articles: [{ nom: 'pain', prix: 1.2, rayon: 'Épicerie' }] }, 'ticket');
  assert.strictEqual(ticket.magasin, 'supermarche'); assert.strictEqual(ticket.date, null); assert.strictEqual(ticket.montant, 42.5); assert.strictEqual(ticket.articles[0].nom, 'Pain');
  await assert.rejects(() => T.IA.analyserPhoto(etat, 'x', 'produit', async () => ({ ok: false, status: 401 })), /clé API est refusée/);
  await assert.rejects(() => T.IA.analyserPhoto(etat, 'x', 'produit', async () => ({ ok: false, status: 429 })), /réessayez/i);
  await assert.rejects(() => T.IA.analyserPhoto(etat, 'x', 'produit', async () => { throw new Error('réseau'); }), /Pas de connexion/);
  await assert.rejects(() => T.IA.analyserPhoto(etat, 'x', 'produit', async () => ({ ok: true, status: 200, json: async () => ({ stop_reason: 'refusal', content: [] }) })), /refusée/);
});

(async () => {
  for (const t of tests) {
    try { await t.f(); reussis++; console.log('  ✓ ' + t.nom); }
    catch (e) { echoues++; console.log('  ✗ ' + t.nom + '\n      ' + (e.stack || e.message).split('\n').slice(0, 3).join('\n      ')); }
  }
  console.log('\n' + reussis + ' réussis, ' + echoues + ' échoués');
  if (echoues) process.exit(1);
})();
