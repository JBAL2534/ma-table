// La liste de courses : une seule liste vivante, chaque article affecté à un magasin et à un rayon.
(function (racine) {
  const MaTable = racine.MaTable = racine.MaTable || {};
  const U = MaTable.util;

  const MAGASINS = [
    { id: 'supermarche', nom: 'Supermarché', emoji: '🛒' },
    { id: 'biocoop', nom: 'Biocoop', emoji: '🌿' },
    { id: 'grand_frais', nom: 'Grand Frais', emoji: '🥬' },
    { id: 'marche', nom: 'Marché', emoji: '🧺' },
  ];
  const RAYONS = ['Fruits & légumes', 'Viandes & poissons', 'Crèmerie', 'Épicerie', 'Surgelés', 'Boissons', 'Hygiène & maison'];

  const MOTS_RAYON = [
    ['Fruits & légumes', ['pomme', 'banane', 'poire', 'orange', 'citron', 'fraise', 'raisin', 'kiwi', 'clementine', 'tomate', 'courgette', 'aubergine', 'poivron', 'carotte', 'patate', 'oignon', 'echalote', 'ail', 'brocoli', 'chou', 'epinard', 'salade', 'concombre', 'poireau', 'champignon', 'potimarron', 'avocat', 'persil', 'ciboulette', 'menthe', 'basilic', 'aneth', 'legume', 'fruit', 'peche', 'abricot', 'cerise', 'melon', 'haricot vert', 'radis', 'navet', 'celeri', 'fenouil', 'endive', 'mangue', 'ananas', 'framboise', 'myrtille', 'prune', 'figue', 'noix', 'noisette', 'amande']],
    ['Viandes & poissons', ['poulet', 'dinde', 'boeuf', 'steak', 'jambon', 'saumon', 'cabillaud', 'colin', 'poisson', 'lardon', 'veau', 'porc', 'agneau', 'merguez', 'saucisse', 'crevette', 'thon frais', 'truite', 'escalope', 'hache', 'filet', 'cuisse', 'pave', 'rôti', 'roti']],
    ['Crèmerie', ['lait', 'beurre', 'oeuf', 'yaourt', 'fromage', 'creme', 'emmental', 'parmesan', 'feta', 'ricotta', 'chevre', 'camembert', 'comte', 'mozzarella', 'skyr', 'faisselle', 'petit suisse', 'gruyere', 'mascarpone']],
    ['Surgelés', ['surgele', 'glace', 'sorbet']],
    ['Boissons', ['eau', 'jus', 'sirop', 'soda', 'the glace', 'vin', 'biere', 'cidre', 'limonade']],
    ['Hygiène & maison', ['papier', 'essuie', 'liquide vaisselle', 'lessive', 'eponge', 'sac poubelle', 'dentifrice', 'savon', 'shampoing', 'gel douche', 'deodorant', 'coton', 'mouchoir', 'nettoyant', 'javel', 'aluminium', 'film', 'boite de conservation', 'brosse', 'pile', 'ampoule', 'adoucissant']],
  ];
  const MOTS_BIO = ['bio', 'vrac', 'tofu', 'quinoa', 'boulgour', 'lentille', 'pois chiche', 'haricot rouge', 'flocon', 'avoine', 'graine', 'lait de coco', 'huile', 'epice', 'curry', 'cumin', 'paprika', 'curcuma', 'cannelle', 'bouillon', 'miel', 'granola', 'farine', 'riz complet', 'pate complete', 'the', 'cafe', 'chocolat noir', 'confiture', 'sirop d erable', 'levure', 'tahin', 'purée d amande', 'puree d amande'];

  function catalogue() { return MaTable.ARTICLES_DEPART || []; }

  function trouverCatalogue(nom) {
    const n = U.racineMot(nom);
    return catalogue().find(a => U.racineMot(a.nom) === n) || null;
  }

  function devinerRayon(nom) {
    const n = U.normaliser(nom);
    for (const [rayon, mots] of MOTS_RAYON) {
      if (mots.some(m => n.includes(m))) return rayon;
    }
    return 'Épicerie';
  }

  // Affectation d'un article : ce que la famille a déjà choisi, sinon le catalogue, sinon des règles simples.
  function affecter(nom, ctx) {
    ctx = ctx || {};
    const prefs = ctx.preferencesMagasin || {};
    const pref = prefs[U.racineMot(nom)];
    const cat = trouverCatalogue(nom);
    let rayon = (pref && pref.rayon) || (cat && cat.rayon) || devinerRayon(nom);
    let magasin = (pref && pref.magasin) || (cat && cat.magasin);
    if (!magasin) {
      const n = U.normaliser(nom);
      if (rayon === 'Fruits & légumes' || (rayon === 'Crèmerie' && /fromage|chevre|comte|emmental|parmesan|feta|camembert|mozzarella|ricotta/.test(n))) magasin = 'grand_frais';
      else if (MOTS_BIO.some(m => n.includes(m))) magasin = 'biocoop';
      else magasin = 'supermarche';
    }
    const ouverts = ctx.magasins && ctx.magasins.length ? ctx.magasins : MAGASINS.map(m => m.id);
    if (!ouverts.includes(magasin)) magasin = ouverts.includes('supermarche') ? 'supermarche' : ouverts[0];
    return { magasin, rayon };
  }

  // Ajoute un article ; s'il existe déjà (même nom, même unité), on cumule les quantités.
  function ajouter(liste, article, ctx) {
    const nom = String(article.nom || '').trim();
    if (!nom) return null;
    const cle = U.racineMot(nom);
    const unite = (article.unite || '').trim();
    const existant = liste.find(a => !a.coche && U.racineMot(a.nom) === cle && (a.unite || '') === unite);
    if (existant) {
      if (article.qte != null && article.qte !== '') existant.qte = (Number(existant.qte) || 0) + Number(article.qte);
      if (article.source && !existant.sources.includes(article.source)) existant.sources.push(article.source);
      toucher(existant);
      return existant;
    }
    const aff = affecter(nom, ctx);
    const nouveau = {
      id: U.idUnique('art'),
      nom: U.majuscule(nom),
      qte: article.qte != null && article.qte !== '' ? Number(article.qte) : null,
      unite: unite || null,
      magasin: article.magasin || aff.magasin,
      rayon: article.rayon || aff.rayon,
      coche: false,
      cochePar: null,
      cocheLe: null,
      sources: article.source ? [article.source] : [],
      essentiel: !!article.essentiel,
      ajouteLe: new Date().toISOString(),
      ajoutePar: article.par || null,
      statut: 'actif',
      modifieLe: new Date().toISOString(),
    };
    liste.push(nouveau);
    return nouveau;
  }
  // Toute modification d'un article est datée : la fusion entre appareils garde la plus récente.
  function toucher(objet) { objet.modifieLe = new Date().toISOString(); return objet; }
  // On ne supprime jamais un article : il passe dans les archives avec son statut.
  function archiver(etat, article, statut, extra) {
    etat.liste = etat.liste.filter(x => x.id !== article.id);
    Object.assign(article, { statut }, extra || {});
    toucher(article);
    etat.listeArchivee = etat.listeArchivee || [];
    etat.listeArchivee.push(article);
    return article;
  }
  function retirer(etat, article) { return archiver(etat, article, 'retire'); }

  function estAuGardeManger(nom, gardeManger) {
    const cle = U.racineMot(nom);
    return (gardeManger || []).some(g => U.racineMot(g.nom) === cle && !g.epuise && !g.retire);
  }

  // Ajoute les ingrédients d'une ou plusieurs recettes, en sautant ce qu'on a déjà à la maison.
  function ajouterIngredients(liste, ingredients, ctx, gardeManger, source) {
    const ajoutes = [], dejaLa = [];
    for (const ing of ingredients) {
      if (estAuGardeManger(ing.nom, gardeManger)) { dejaLa.push(ing.nom); continue; }
      const a = ajouter(liste, { nom: ing.nom, qte: ing.qte, unite: ing.unite, source: source || 'recette' }, ctx);
      if (a) ajoutes.push(a);
    }
    return { ajoutes, dejaLa };
  }

  function rangRayon(rayon) { const i = RAYONS.indexOf(rayon); return i === -1 ? RAYONS.length : i; }
  function trierRayons(articles) {
    return articles.slice().sort((a, b) => {
      if (a.coche !== b.coche) return a.coche ? 1 : -1;
      const r = rangRayon(a.rayon) - rangRayon(b.rayon);
      if (r) return r;
      return a.nom.localeCompare(b.nom, 'fr');
    });
  }
  function parMagasin(liste) {
    const res = {};
    for (const m of MAGASINS) res[m.id] = [];
    for (const a of liste) (res[a.magasin] = res[a.magasin] || []).push(a);
    for (const k of Object.keys(res)) res[k] = trierRayons(res[k]);
    return res;
  }
  function parRayon(articles) {
    const groupes = [];
    for (const a of trierRayons(articles)) {
      let g = groupes.find(x => x.rayon === a.rayon && x.coche === a.coche);
      if (!g) { g = { rayon: a.rayon, coche: a.coche, articles: [] }; groupes.push(g); }
      g.articles.push(a);
    }
    return groupes;
  }

  // Changer le magasin d'un article apprend l'habitude pour la prochaine fois.
  function changerMagasin(article, magasin, preferencesMagasin) {
    article.magasin = magasin; toucher(article);
    const cle = U.racineMot(article.nom);
    preferencesMagasin[cle] = Object.assign({}, preferencesMagasin[cle] || {}, { magasin, rayon: article.rayon });
  }
  function changerRayon(article, rayon, preferencesMagasin) {
    article.rayon = rayon; toucher(article);
    const cle = U.racineMot(article.nom);
    preferencesMagasin[cle] = Object.assign({}, preferencesMagasin[cle] || {}, { magasin: article.magasin, rayon });
  }

  function cocher(article, coche, par) {
    article.coche = coche;
    article.cochePar = coche ? (par || null) : null;
    if (coche) article.cocheLe = new Date().toISOString(); else article.decocheLe = new Date().toISOString();
    toucher(article);
  }

  // Termine un passage en magasin : les articles cochés partent dans l'historique d'achats, les autres restent.
  function terminerMagasin(etat, magasin, options) {
    options = options || {};
    const coches = etat.liste.filter(a => a.magasin === magasin && a.coche);
    const achat = {
      id: U.idUnique('achat'),
      date: options.date || U.aujourdhui(),
      magasin,
      articles: coches.map(a => ({ nom: a.nom, qte: a.qte, unite: a.unite, rayon: a.rayon, cochePar: a.cochePar })),
      montant: options.montant != null && options.montant !== '' ? Number(options.montant) : null,
      par: options.par || null,
      note: options.note || null,
    };
    etat.achats.push(achat);
    for (const a of coches) archiver(etat, a, 'achete', { achatId: achat.id });
    // Ce qu'on vient d'acheter rejoint le garde-manger.
    for (const a of coches) {
      const cle = U.racineMot(a.nom);
      const existant = etat.gardeManger.find(g => U.racineMot(g.nom) === cle);
      if (existant) { existant.epuise = false; existant.retire = false; existant.ajouteLe = achat.date; toucher(existant); }
      else etat.gardeManger.push({ id: U.idUnique('gm'), nom: a.nom, qte: a.qte != null ? U.formaterQte(a.qte, a.unite) : null, rayon: a.rayon, peremption: null, ajouteLe: achat.date, epuise: false, modifieLe: new Date().toISOString() });
    }
    return achat;
  }

  function essentiels(etat) {
    if (Array.isArray(etat.essentiels)) return etat.essentiels;
    return catalogue().filter(a => a.essentiel).map(a => a.nom);
  }
  function basculerEssentiel(etat, nom) {
    const liste = essentiels(etat).slice();
    const cle = U.racineMot(nom);
    const i = liste.findIndex(n => U.racineMot(n) === cle);
    if (i === -1) liste.push(U.majuscule(nom)); else liste.splice(i, 1);
    etat.essentiels = liste;
    return i === -1;
  }

  // Suggestions : ce qu'on achète presque chaque semaine et qui manque à la liste.
  function suggestions(etat, limite) {
    const semaines = {};
    for (const achat of etat.achats) {
      const lundi = U.lundiDe(achat.date);
      semaines[lundi] = semaines[lundi] || new Set();
      for (const a of achat.articles) semaines[lundi].add(U.racineMot(a.nom));
    }
    const lundis = Object.keys(semaines).sort().slice(-5);
    if (lundis.length < 2) return [];
    const compte = {};
    const nomsAffiches = {};
    for (const l of lundis) for (const cle of semaines[l]) compte[cle] = (compte[cle] || 0) + 1;
    for (const achat of etat.achats) for (const a of achat.articles) nomsAffiches[U.racineMot(a.nom)] = a.nom;
    const dansListe = new Set(etat.liste.map(a => U.racineMot(a.nom)));
    const seuil = Math.max(2, Math.ceil(lundis.length * 0.6));
    return Object.keys(compte)
      .filter(cle => compte[cle] >= seuil && !dansListe.has(cle))
      .sort((a, b) => compte[b] - compte[a])
      .slice(0, limite || 5)
      .map(cle => ({ nom: nomsAffiches[cle], fois: compte[cle], sur: lundis.length }));
  }

  // Autocomplétion : catalogue + tout ce que la famille a déjà acheté ou listé.
  function nomsConnus(etat) {
    const vus = new Map();
    const ajouterNom = n => { const cle = U.racineMot(n); if (n && !vus.has(cle)) vus.set(cle, n); };
    for (const a of etat.liste) ajouterNom(a.nom);
    for (const achat of etat.achats) for (const a of achat.articles) ajouterNom(a.nom);
    for (const a of catalogue()) ajouterNom(a.nom);
    return Array.from(vus.values());
  }
  function autocompleter(etat, saisie, limite) {
    const s = U.normaliser(saisie);
    if (!s) return [];
    const noms = nomsConnus(etat);
    const commence = noms.filter(n => U.normaliser(n).startsWith(s));
    const contient = noms.filter(n => !U.normaliser(n).startsWith(s) && U.normaliser(n).includes(s));
    return commence.concat(contient).slice(0, limite || 6);
  }

  // Texte prêt à coller dans la recherche d'un drive.
  function texteDrive(liste, magasin) {
    return trierRayons(liste.filter(a => a.magasin === magasin && !a.coche))
      .map(a => a.nom + (a.qte != null ? ' (' + U.formaterQte(a.qte, a.unite) + ')' : '')).join('\n');
  }
  function lienRecherche(modeleUrl, nom) {
    if (!modeleUrl || !/^https?:\/\//.test(modeleUrl)) return null;
    return modeleUrl.includes('%s') ? modeleUrl.replace('%s', encodeURIComponent(nom)) : modeleUrl + encodeURIComponent(nom);
  }

  // « 2 kg carottes », « 6 œufs », « lait » → { qte, unite, nom }.
  const UNITES = ['c. à soupe', 'c. à café', 'cuillères à soupe', 'cuillères à café', 'kg', 'g', 'ml', 'cl', 'l', 'pièces', 'pièce', 'tranches', 'tranche', 'boîtes', 'boîte', 'bottes', 'botte', 'gousses', 'gousse', 'sachets', 'sachet', 'pots', 'pot', 'pincée', 'paquets', 'paquet', 'bouteilles', 'bouteille', 'barquette', 'barquettes'];
  function analyserSaisie(texte) {
    const t = String(texte || '').trim().replace(/\s+/g, ' ');
    const m = t.match(/^(\d+(?:[.,]\d+)?)\s*(.*)$/);
    if (!m) return { qte: null, unite: null, nom: t };
    const qte = Number(m[1].replace(',', '.'));
    let reste = m[2];
    const unites = UNITES.slice().sort((a, b) => b.length - a.length);
    for (const u of unites) {
      const re = new RegExp('^' + u.replace(/\./g, '\\.') + '(?=\\s|$)', 'i');
      if (!re.test(reste)) continue;
      const nom = reste.slice(u.length).trim().replace(/^(de |d\u2019|d')/, '').trim();
      if (nom) return { qte, unite: u, nom };
    }
    return reste ? { qte, unite: null, nom: reste } : { qte: null, unite: null, nom: t };
  }

  function nomMagasin(id) { const m = MAGASINS.find(x => x.id === id); return m ? m.nom : 'Supermarché'; }
  function emojiMagasin(id) { const m = MAGASINS.find(x => x.id === id); return m ? m.emoji : '🛒'; }

  MaTable.Courses = {
    MAGASINS, RAYONS, affecter, devinerRayon, trouverCatalogue, ajouter, ajouterIngredients, estAuGardeManger, trierRayons, parMagasin, parRayon,
    changerMagasin, changerRayon, cocher, toucher, archiver, retirer, terminerMagasin, essentiels, basculerEssentiel, suggestions, autocompleter, nomsConnus, texteDrive,
    lienRecherche, nomMagasin, emojiMagasin, analyserSaisie, UNITES,
  };
})(typeof window !== 'undefined' ? window : globalThis);
