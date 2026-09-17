// Scan de code-barres : Open Food Facts (base collaborative, gratuite) donne nom, marque et Nutri-Score.
// Le garde-manger et « que cuisiner ce soir » vivent ici aussi.
(function (racine) {
  const MaTable = racine.MaTable = racine.MaTable || {};
  const U = MaTable.util;

  const URL_OFF = 'https://world.openfoodfacts.org/api/v2/product/';
  const CHAMPS = 'product_name,product_name_fr,brands,nutriscore_grade,categories,categories_tags,quantity,image_small_url';

  // Alternatives plus saines par famille de produits, proposées discrètement pour un Nutri-Score D ou E.
  const ALTERNATIVES = [
    [/biscuit|cookie|gateau|gâteau|cake|madeleine|brioche|viennoiserie/, 'un pain complet avec un peu de confiture ou de pâte à tartiner aux noisettes sans huile de palme, ou des fruits secs'],
    [/cereale|céréale|muesli|granola/, 'des flocons d’avoine nature ou un muesli sans sucre ajouté'],
    [/soda|boisson gazeuse|cola|limonade|energy|énergisante/, 'une eau pétillante avec un trait de citron ou de sirop léger'],
    [/jus/, 'un fruit entier, ou un jus 100 % pur jus sans sucre ajouté en petite quantité'],
    [/chips|apéritif|aperitif|crackers|biscuits salés/, 'des fruits à coque nature, des bâtonnets de légumes ou du pop-corn maison'],
    [/pate a tartiner|pâte à tartiner|nutella|chocolat au lait/, 'une purée de noisettes ou un chocolat noir à 70 %'],
    [/yaourt|dessert lacté|dessert lacte|crème dessert|creme dessert|flan/, 'un yaourt nature ou un fromage blanc avec des fruits frais'],
    [/pizza|quiche|tarte salée|tarte salee|plat cuisiné|plat cuisine|plat préparé|plat prepare|lasagne/, 'une version maison au four ou à l’air fryer, avec des légumes en plus'],
    [/nugget|pané|pane|cordon bleu|frites/, 'des nuggets ou des frites maison à l’air fryer (une recette est dans Ma Table)'],
    [/charcuterie|saucisson|jambon|lardons|saucisse|knack|rillette|pâté|pate/, 'du jambon blanc découenné, du blanc de poulet ou du poisson'],
    [/sauce|ketchup|mayonnaise/, 'une sauce au yaourt nature, à la moutarde ou aux herbes, faite en deux minutes'],
    [/bonbon|confiserie|sucrerie|barre chocolatée|barre chocolatee/, 'quelques carrés de chocolat noir ou des fruits secs'],
    [/glace|sorbet|crème glacée|creme glacee/, 'un sorbet aux fruits ou une banane congelée mixée'],
    [/pain de mie|pain/, 'un pain complet ou aux céréales'],
    [/beurre|margarine/, 'du beurre en petite quantité ou de l’huile d’olive'],
  ];

  function alternative(produit) {
    if (!produit || !/^[DE]$/.test(produit.nutriscore || '')) return null;
    const texte = U.normaliser((produit.categorie || '') + ' ' + (produit.nom || ''));
    for (const [motif, conseil] of ALTERNATIVES) {
      const m = new RegExp(motif.source.normalize('NFD').replace(/[̀-ͯ]/g, ''));
      if (m.test(texte)) return 'Plus léger, dans la même famille : ' + conseil + '.';
    }
    return 'Dans la même famille, une version moins sucrée, moins salée ou moins grasse existe souvent : un coup d’œil au Nutri-Score des voisins de rayon suffit.';
  }

  function nettoyerCategorie(categories) {
    if (!categories) return null;
    const premiere = String(categories).split(',').map(s => s.trim()).filter(Boolean);
    // Les catégories vont de la plus large à la plus précise : on prend la plus précise lisible.
    const lisible = premiere.filter(c => !c.includes(':'));
    return lisible.length ? lisible[lisible.length - 1] : (premiere[0] || null).replace(/^[a-z]{2}:/, '');
  }

  function depuisOff(code, json) {
    if (!json || !json.product || json.status === 0) return null;
    const p = json.product;
    const nom = p.product_name_fr || p.product_name || null;
    if (!nom) return null;
    const categorie = nettoyerCategorie(p.categories);
    const produit = {
      code, nom, marque: p.brands || null, quantite: p.quantity || null,
      nutriscore: p.nutriscore_grade ? p.nutriscore_grade.toUpperCase() : null,
      categorie, rayon: MaTable.Courses.devinerRayon(nom + ' ' + (categorie || '')), image: p.image_small_url || null,
      consulteLe: new Date().toISOString(),
    };
    if (produit.nutriscore && !/^[A-E]$/.test(produit.nutriscore)) produit.nutriscore = null;
    return produit;
  }

  // Cherche un produit : d'abord dans ce qu'on a déjà scanné, sinon sur Open Food Facts.
  async function chercherProduit(etat, code, fetchImpl) {
    code = String(code || '').replace(/\D/g, '');
    if (code.length < 8) throw new Error('Un code-barres compte au moins 8 chiffres.');
    if (etat.produits[code]) return { produit: etat.produits[code], source: 'memoire' };
    const f = fetchImpl || (typeof fetch !== 'undefined' ? fetch : null);
    if (!f) throw new Error('Pas de connexion possible depuis cet appareil.');
    let rep;
    try { rep = await f(URL_OFF + code + '.json?fields=' + CHAMPS, { headers: { 'User-Agent': 'MaTable/1.0 (application familiale)' } }); }
    catch (e) { throw new Error('Pas de connexion : le scan a besoin d’Internet pour reconnaître le produit.'); }
    if (!rep.ok && rep.status !== 404) throw new Error('Open Food Facts ne répond pas pour le moment. Réessayez dans un instant.');
    let json = null;
    try { json = await rep.json(); } catch (e) { json = null; }
    const produit = depuisOff(code, json);
    if (!produit) return { produit: null, code, source: 'inconnu' };
    etat.produits[code] = produit;
    return { produit, source: 'off' };
  }

  // Garde-manger
  function ajouterGardeManger(etat, { nom, qte, rayon, peremption }) {
    nom = String(nom || '').trim();
    if (!nom) return null;
    const cle = U.racineMot(nom);
    let g = etat.gardeManger.find(x => U.racineMot(x.nom) === cle);
    if (g) { g.epuise = false; if (qte) g.qte = qte; if (peremption) g.peremption = peremption; g.ajouteLe = U.aujourdhui(); return g; }
    g = { id: U.idUnique('gm'), nom: U.majuscule(nom), qte: qte || null, rayon: rayon || MaTable.Courses.devinerRayon(nom), peremption: peremption || null, ajouteLe: U.aujourdhui(), epuise: false };
    etat.gardeManger.push(g);
    return g;
  }
  function joursAvantPeremption(g, aujourdhui) {
    if (!g.peremption) return null;
    return U.joursEntre(aujourdhui || U.aujourdhui(), g.peremption);
  }
  // « Que cuisiner ce soir avec ce que j'ai ? » : trois recettes rapides, priorité aux produits à consommer vite.
  function idéesAvecGardeManger(etat, options) {
    options = options || {};
    const dispo = etat.gardeManger.filter(g => !g.epuise);
    if (!dispo.length) return [];
    const auj = options.aujourdhui || U.aujourdhui();
    const cles = dispo.map(g => ({ cle: U.racineMot(g.nom), urgent: (() => { const j = joursAvantPeremption(g, auj); return j != null && j <= 3; })(), nom: g.nom }));
    const basiques = new Set(['sel', 'poivre', 'huile d olive', 'huile', 'beurre', 'sucre', 'farine', 'eau', 'vinaigre', 'moutarde', 'bouillon de legume', 'ail', 'oignon']);
    const max = options.tempsMax || etat.reglages.tempsMaxSemaine || 25;
    const res = [];
    for (const r of MaTable.Menus.toutesRecettes(etat)) {
      if (r.creneau === 'matin' || r.minutes > max) continue;
      const ings = r.ingredients.map(i => U.racineMot(i.nom));
      const importants = ings.filter(i => !basiques.has(i));
      const presents = importants.filter(i => cles.some(c => c.cle === i || i.includes(c.cle) || c.cle.includes(i)));
      const manquants = importants.filter(i => !presents.includes(i));
      if (!importants.length) continue;
      const couverture = presents.length / importants.length;
      if (couverture < 0.5) continue;
      const urgents = cles.filter(c => c.urgent && ings.some(i => i === c.cle || i.includes(c.cle) || c.cle.includes(i))).map(c => c.nom);
      res.push({ recette: r, couverture, manquants: r.ingredients.filter(i => manquants.includes(U.racineMot(i.nom))).map(i => i.nom), urgents, score: couverture + urgents.length * 0.5 + (manquants.length === 0 ? 0.3 : 0) });
    }
    return res.sort((a, b) => b.score - a.score).slice(0, options.nombre || 3);
  }

  MaTable.Scan = { URL_OFF, alternative, depuisOff, chercherProduit, ajouterGardeManger, joursAvantPeremption, ideesAvecGardeManger: idéesAvecGardeManger };
})(typeof window !== 'undefined' ? window : globalThis);
