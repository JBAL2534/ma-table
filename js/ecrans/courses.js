// Écran Courses : la liste vivante par magasin, le mode « En magasin », les essentiels et le garde-manger.
(function (racine) {
  const MaTable = racine.MaTable;
  const U = MaTable.util, C = MaTable.Courses, S = MaTable.Scan, M = MaTable.Menus;
  const { el, feuille, menuActions, toast, confirmer, demander, vide, segments, sauver, sauverDoucement, vibrer, utilisateur, membreNom, copier, partager } = MaTable.ui;
  const E = () => MaTable.Stockage.etat;
  const app = () => MaTable.app;
  const ctx = () => ({ preferencesMagasin: E().preferencesMagasin, magasins: E().reglages.magasins });

  function monter(conteneur, params) {
    if (params.mode === 'magasin') return monterModeMagasin(conteneur, params.magasin || 'supermarche');
    const onglet = params.onglet || 'liste';
    conteneur.append(el('div', 'entete', el('div', {}, el('div', 'sur-titre', 'Ma Table'), el('h1', {}, 'Courses'))));
    conteneur.append(segments([{ id: 'liste', libelle: 'Liste' }, { id: 'essentiels', libelle: 'Essentiels' }, { id: 'garde', libelle: 'Garde-manger' }], onglet, id => app().aller('courses', { onglet: id })));
    if (onglet === 'essentiels') return monterEssentiels(conteneur);
    if (onglet === 'garde') return monterGardeManger(conteneur, params);
    monterListe(conteneur, params);
  }

  function ajouterArticle(texte, options) {
    const etat = E();
    const a = C.analyserSaisie(texte);
    if (!a.nom) return null;
    const art = C.ajouter(etat.liste, Object.assign({ nom: a.nom, qte: a.qte, unite: a.unite, source: 'manuel', par: utilisateur(etat) }, options || {}), ctx());
    if (art) { vibrer(); sauver(); toast(art.nom + ' → ' + C.nomMagasin(art.magasin)); }
    return art;
  }

  function reconnaissanceVocale() {
    const R = window.SpeechRecognition || window.webkitSpeechRecognition;
    return R ? new R() : null;
  }

  function barreAjout() {
    const etat = E();
    const champ = el('input', { type: 'text', placeholder: 'Ajouter : « 2 kg carottes », « lait »…', 'aria-label': 'Ajouter un article', autocomplete: 'off', autocapitalize: 'sentences', enterkeyhint: 'done' });
    const propositions = el('div', { class: 'suggestions', hidden: true });
    const valider = (texte) => { const t = texte || champ.value; if (!t.trim()) { toast('Tapez un article, par exemple « 6 œufs ».'); champ.focus(); return; } if (ajouterArticle(t)) { champ.value = ''; } propositions.hidden = true; champ.focus(); };
    champ.addEventListener('input', () => {
      const a = C.analyserSaisie(champ.value);
      const res = C.autocompleter(etat, a.nom, 5);
      propositions.innerHTML = '';
      if (!res.length || !champ.value.trim()) { propositions.hidden = true; return; }
      for (const n of res) propositions.append(el('button', { onclick: () => valider([U.formaterQte(a.qte, a.unite), n].filter(Boolean).join(' ')) }, n, el('span', 'petit', ' · ' + C.nomMagasin(C.affecter(n, ctx()).magasin))));
      propositions.hidden = false;
    });
    champ.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') { ev.preventDefault(); valider(); } });
    champ.addEventListener('blur', () => setTimeout(() => { propositions.hidden = true; }, 150));
    const zone = el('div', 'ajout', el('div', 'ligne', champ,
      etat.reglages.voixActive && reconnaissanceVocale() ? el('button', { class: 'btn icone', 'aria-label': 'Dicter un article', onclick: () => {
        const rec = reconnaissanceVocale(); rec.lang = 'fr-FR'; rec.interimResults = false;
        rec.onresult = (ev) => { const t = ev.results[0][0].transcript; champ.value = t; valider(t); };
        rec.onerror = () => toast('La dictée n’a pas fonctionné. Réessayez ou tapez l’article.');
        try { rec.start(); toast('Je vous écoute…', 1500); } catch (e) { toast('La dictée n’est pas disponible ici.'); }
      } }, '🎤') : null,
      el('button', { class: 'btn icone principal', 'aria-label': 'Ajouter', onclick: () => valider() }, '＋')), propositions);
    return zone;
  }

  function monterListe(conteneur, params) {
    const etat = E();
    conteneur.append(barreAjout());
    const sugg = C.suggestions(etat, 3);
    if (sugg.length) conteneur.append(el('div', 'carte ambre', el('h3', {}, '💡 D’habitude, vous prenez aussi…'),
      el('ul', 'liste', sugg.map(s => el('li', {}, el('span', 'pousse', el('span', 'gras', s.nom), el('span', 'petit', ' · ' + s.fois + ' semaines sur ' + s.sur)), el('button', { class: 'btn petit-btn', onclick: () => ajouterArticle(s.nom) }, '＋ Ajouter'))))));
    const parMag = C.parMagasin(etat.liste);
    const magasins = C.MAGASINS.filter(m => etat.reglages.magasins.includes(m.id) || (parMag[m.id] || []).length);
    if (!etat.liste.length) {
      conteneur.append(vide({ emoji: '🧺', titre: 'La liste est vide', texte: 'Ajoutez un article ci-dessus, cochez un essentiel, ou envoyez les ingrédients d’une recette depuis Menus.', action: { libelle: 'Voir les menus de la semaine', action: () => app().aller('menus', {}) }, secondaire: { libelle: 'Réactiver des essentiels', action: () => app().aller('courses', { onglet: 'essentiels' }) } }));
      return;
    }
    const actif = params.magasin && magasins.some(m => m.id === params.magasin) ? params.magasin : (magasins.find(m => (parMag[m.id] || []).some(a => !a.coche)) || magasins[0]).id;
    conteneur.append(el('div', { class: 'puces', style: 'margin-bottom:14px', role: 'tablist' }, magasins.map(m => {
      const arts = parMag[m.id] || []; const restants = arts.filter(a => !a.coche).length;
      return el('button', { class: 'puce', role: 'tab', 'aria-selected': String(m.id === actif), 'aria-pressed': String(m.id === actif), onclick: () => app().parametrer({ magasin: m.id }) }, m.emoji + ' ' + m.nom, el('span', 'compte', arts.length ? restants + '/' + arts.length : ''));
    })));
    const arts = parMag[actif] || [];
    const carte = el('div', 'carte');
    if (!arts.length) carte.append(el('p', 'sous centre', 'Rien à acheter ' + (actif === 'marche' ? 'au' : 'chez') + ' ' + C.nomMagasin(actif) + ' pour le moment.'));
    for (const g of C.parRayon(arts)) {
      carte.append(el('div', 'rayon-titre', g.coche ? '✓ Dans le panier' : g.rayon));
      for (const a of g.articles) carte.append(ligneArticle(a, false));
    }
    conteneur.append(carte);
    const coches = arts.filter(a => a.coche).length;
    conteneur.append(el('div', 'boutons colonne',
      arts.some(a => !a.coche) ? el('button', { class: 'btn chaud grand', onclick: () => app().aller('courses', { mode: 'magasin', magasin: actif }) }, '🛒 Mode « En magasin »') : null,
      coches ? el('button', { class: 'btn principal', onclick: () => terminer(actif) }, '✓ Terminer ' + C.nomMagasin(actif) + ' (' + U.pluriel(coches, 'coché') + ')') : null));
    if (etat.reglages.drive.actif && actif === 'supermarche') conteneur.append(carteDrive(arts));
  }

  function ligneArticle(a, grand) {
    const etat = E();
    const detail = [a.qte != null ? U.formaterQte(a.qte, a.unite) : (a.unite || ''), a.coche && a.cochePar ? 'coché par ' + (membreNom(etat, a.cochePar) || '?') : '', !a.coche && a.sources.length && a.sources[0] !== 'manuel' ? 'pour : ' + a.sources.filter(s => s !== 'manuel').map(s => s.replace(/^semaine .*/, 'la semaine').replace(/^batch .*/, 'le batch')).slice(0, 2).join(', ') : ''].filter(Boolean).join(' · ');
    return el('div', { class: 'article' + (a.coche ? ' est-coche' : ''), dataset: { id: a.id } },
      el('button', { class: 'coche', 'aria-label': (a.coche ? 'Décocher ' : 'Cocher ') + a.nom, 'aria-pressed': String(a.coche), onclick: (ev) => { C.cocher(a, !a.coche, utilisateur(etat)); vibrer(); if (grand) { sauverDoucement(); rafraichirMagasin(); } else sauver(); } }, a.coche ? '✓' : ''),
      el('button', { class: 'corps', onclick: () => menuArticle(a) }, el('div', 'nom', a.nom), detail ? el('div', 'detail', detail) : null),
      el('span', 'minuscule', C.emojiMagasin(a.magasin)));
  }

  function menuArticle(a) {
    const etat = E();
    menuActions(a.nom, [
      { ico: '🔢', libelle: 'Quantité', detail: a.qte != null ? U.formaterQte(a.qte, a.unite) : '', action: async () => { const v = await demander('Quantité pour ' + a.nom, { valeur: a.qte != null ? U.formaterQte(a.qte, a.unite) : '', placeholder: 'Ex. : 500 g, 2, 1 botte', aide: 'Laissez vide pour ne pas préciser.' }); if (v === null) return; const p = C.analyserSaisie(v.trim() ? v + ' x' : ''); a.qte = p.qte; a.unite = p.unite; C.toucher(a); sauver(); } },
      { ico: C.emojiMagasin(a.magasin), libelle: 'Changer de magasin', detail: C.nomMagasin(a.magasin), action: () => feuille({ titre: 'Où acheter ' + a.nom + ' ?', contenu: (corps, fermer) => el('div', 'menu-actions', C.MAGASINS.filter(m => etat.reglages.magasins.includes(m.id) || m.id === a.magasin).map(m => el('button', { onclick: () => { C.changerMagasin(a, m.id, etat.preferencesMagasin); fermer(); sauver(); toast(a.nom + ' ira désormais ' + (m.id === 'marche' ? 'au' : 'chez') + ' ' + m.nom + '.'); } }, el('span', 'ico', m.emoji), el('span', 'pousse', m.nom), m.id === a.magasin ? el('span', 'petit', 'actuel') : null))) }) },
      { ico: '🗂️', libelle: 'Changer de rayon', detail: a.rayon, action: () => feuille({ titre: 'Rayon de ' + a.nom, contenu: (corps, fermer) => el('div', 'menu-actions', C.RAYONS.map(r => el('button', { onclick: () => { C.changerRayon(a, r, etat.preferencesMagasin); fermer(); sauver(); } }, el('span', 'ico', r === a.rayon ? '✓' : '·'), el('span', 'pousse', r)))) }) },
      { ico: '⭐', libelle: C.essentiels(etat).some(n => U.racineMot(n) === U.racineMot(a.nom)) ? 'Retirer des essentiels' : 'Marquer comme essentiel', action: () => { const ajoute = C.basculerEssentiel(etat, a.nom); sauver(); toast(ajoute ? a.nom + ' est un essentiel : réactivable d’un tap.' : 'Retiré des essentiels.'); } },
      { ico: '🗑️', libelle: 'Retirer de la liste', danger: true, action: () => { C.retirer(etat, a); sauver(); } },
    ]);
  }

  function terminer(magasin) {
    const etat = E();
    const coches = etat.liste.filter(a => a.magasin === magasin && a.coche);
    const montant = el('input', { type: 'text', inputmode: 'decimal', placeholder: 'Ex. : 64,50 (facultatif)' });
    feuille({
      titre: 'Terminer ' + C.nomMagasin(magasin), focus: true,
      contenu: el('div', {}, el('p', 'sous', U.pluriel(coches.length, 'article coché part', 'articles cochés partent') + ' dans l’historique et rejoignent le garde-manger. Ce qui n’est pas coché reste sur la liste.'),
        el('div', 'espace'), el('label', 'champ', el('span', {}, 'Montant du ticket'), montant, el('div', 'aide', 'Pour suivre les dépenses par magasin. Laissez vide si vous ne l’avez pas.'))),
      actions: [{ libelle: 'Annuler' }, { libelle: 'Terminer', classe: 'principal', action: () => {
        const m = montant.value.replace(/\s/g, '').replace(',', '.');
        if (m && isNaN(Number(m))) { toast('Le montant doit être un nombre, par exemple 64,50.'); return false; }
        C.terminerMagasin(etat, magasin, { montant: m || null, par: utilisateur(etat) });
        sauverDoucement(); vibrer(20);
        app().aller('courses', { onglet: 'liste' });
        toast('Passage archivé' + (m ? ' · ' + U.euros(m) : '') + ' · garde-manger mis à jour.');
      } }],
    });
  }

  function carteDrive(arts) {
    const etat = E();
    const texte = C.texteDrive(etat.liste, 'supermarche');
    const modele = etat.reglages.drive.modeleUrl;
    return el('div', 'carte douce', el('h3', {}, '🚗 Drive'), el('p', 'petit', 'La liste du supermarché, prête à coller dans la recherche de votre drive.'),
      el('div', 'boutons', el('button', { class: 'btn', onclick: () => copier(texte) }, 'Copier la liste'), el('button', { class: 'btn', onclick: () => partager('Liste de courses', texte) }, 'Partager')),
      modele ? el('div', { style: 'margin-top:10px' }, arts.filter(a => !a.coche).map(a => { const lien = C.lienRecherche(modele, a.nom); return lien ? el('a', { class: 'btn petit-btn', href: lien, target: '_blank', rel: 'noopener', style: 'margin:3px' }, '🔎 ' + a.nom) : null; })) : el('p', 'minuscule', 'Dans Profil, vous pouvez indiquer l’adresse de recherche de votre drive pour obtenir un lien par article.'));
  }

  // ---- Mode « En magasin » ----------------------------------------------------
  let magasinCourant = null, verrouEcran = null;
  // En magasin, l'écran reste allumé quand l'appareil le permet.
  async function garderEcranAllume() {
    try { if (navigator.wakeLock && !verrouEcran) verrouEcran = await navigator.wakeLock.request('screen'); } catch (e) { verrouEcran = null; }
  }
  function relacherEcran() { try { if (verrouEcran) verrouEcran.release(); } catch (e) { /* déjà relâché */ } verrouEcran = null; }
  function rafraichirMagasin() { if (magasinCourant) { const y = magasinCourant.scrollTop; monterModeMagasinDans(magasinCourant, magasinCourant.dataset.magasin); magasinCourant.scrollTop = y; } }
  function monterModeMagasin(conteneur, magasin) {
    const plein = el('div', { class: 'magasin-plein', dataset: { magasin } });
    magasinCourant = plein;
    monterModeMagasinDans(plein, magasin);
    conteneur.append(plein);
    document.getElementById('navigation').style.display = 'none';
    garderEcranAllume();
  }
  function quitter() { magasinCourant = null; relacherEcran(); }
  function monterModeMagasinDans(plein, magasin) {
    const etat = E();
    plein.innerHTML = '';
    const arts = C.trierRayons(etat.liste.filter(a => a.magasin === magasin));
    const total = arts.length, faits = arts.filter(a => a.coche).length;
    plein.append(el('div', 'entete', el('button', { class: 'btn', onclick: () => app().aller('courses', { onglet: 'liste', magasin }) }, '✕ Quitter'),
      el('div', 'centre', el('div', 'gras', C.emojiMagasin(magasin) + ' ' + C.nomMagasin(magasin)), el('div', { class: 'compteur', 'aria-live': 'polite' }, faits + ' / ' + total)),
      el('span', { style: 'width:96px' })));
    if (!total) plein.append(el('p', 'sous centre', 'Rien sur la liste pour ce magasin.'));
    for (const g of C.parRayon(arts)) {
      plein.append(el('div', 'rayon-titre', g.coche ? '✓ Dans le panier' : g.rayon));
      for (const a of g.articles) plein.append(ligneArticle(a, true));
    }
    plein.append(el('div', 'espace'), el('div', 'espace'));
    plein.append(el('button', { class: 'btn principal grand large', disabled: !faits, onclick: () => terminer(magasin) }, '✓ Terminer ce magasin'));
    if (faits === total && total) { vibrer(30); }
  }

  // ---- Essentiels -------------------------------------------------------------
  function monterEssentiels(conteneur) {
    const etat = E();
    const noms = C.essentiels(etat).slice().sort((a, b) => a.localeCompare(b, 'fr'));
    const dansListe = new Set(etat.liste.filter(a => !a.coche).map(a => U.racineMot(a.nom)));
    conteneur.append(el('div', 'carte douce', el('h3', {}, '⭐ Les essentiels de la maison'), el('p', 'petit', 'Café, lait, papier toilette… Ce qui revient toujours. Un tap pour le remettre sur la liste.')));
    const champ = el('input', { type: 'text', placeholder: 'Nouvel essentiel', 'aria-label': 'Nouvel essentiel', enterkeyhint: 'done' });
    const ajouter = () => { const n = champ.value.trim(); if (!n) { toast('Tapez le nom d\u2019un essentiel, par exemple « Café ».'); champ.focus(); return; } C.basculerEssentiel(etat, n); champ.value = ''; sauver(); };
    champ.addEventListener('keydown', ev => { if (ev.key === 'Enter') { ev.preventDefault(); ajouter(); } });
    conteneur.append(el('div', 'ajout', el('div', 'ligne', champ, el('button', { class: 'btn icone principal', 'aria-label': 'Ajouter aux essentiels', onclick: ajouter }, '＋'))));
    const manquants = noms.filter(n => !dansListe.has(U.racineMot(n)));
    conteneur.append(el('div', 'carte', el('ul', 'liste', noms.map(n => {
      const present = dansListe.has(U.racineMot(n));
      return el('li', {}, el('span', 'ico', '⭐'), el('span', 'pousse', el('div', 'gras', n), el('div', 'petit', C.nomMagasin(C.affecter(n, ctx()).magasin))),
        present ? el('span', 'badge leger', 'Sur la liste') : el('button', { class: 'btn petit-btn principal', onclick: () => ajouterArticle(n) }, '＋ Liste'),
        el('button', { class: 'btn petit-btn', 'aria-label': 'Retirer ' + n + ' des essentiels', onclick: async () => { if (await confirmer(n + ' ne sera plus proposé comme essentiel.', { ok: 'Retirer' })) { C.basculerEssentiel(etat, n); sauver(); } } }, '✕'));
    }))));
    if (manquants.length > 1) conteneur.append(el('button', { class: 'btn large', onclick: () => { for (const n of manquants) C.ajouter(etat.liste, { nom: n, source: 'essentiel', essentiel: true, par: utilisateur(etat) }, ctx()); sauver(); toast(U.pluriel(manquants.length, 'essentiel ajouté', 'essentiels ajoutés') + ' à la liste.'); } }, 'Tout remettre sur la liste (' + manquants.length + ')'));
  }

  // ---- Garde-manger ------------------------------------------------------------
  function monterGardeManger(conteneur, params) {
    const etat = E();
    const auj = U.aujourdhui();
    const voirEpuises = params.epuises === '1';
    const items = etat.gardeManger.filter(g => !g.retire && (voirEpuises || !g.epuise)).sort((a, b) => {
      const ja = a.peremption || '9999', jb = b.peremption || '9999';
      return ja.localeCompare(jb) || a.nom.localeCompare(b.nom, 'fr');
    });
    conteneur.append(el('div', 'boutons', el('button', { class: 'btn principal', onclick: () => formulaireGardeManger() }, '＋ Ajouter'), el('button', { class: 'btn chaud', onclick: () => idees() }, '🍳 Que cuisiner ce soir ?')));
    if (!items.length) { conteneur.append(vide({ emoji: '🥫', titre: 'Le garde-manger est vide', texte: 'Il se remplit tout seul quand vous terminez un magasin. Vous pouvez aussi ajouter ce que vous avez déjà.' })); }
    else {
      conteneur.append(el('div', 'carte', el('ul', 'liste', items.map(g => {
        const j = S.joursAvantPeremption(g, auj);
        const etat_ = g.epuise ? el('span', 'badge', 'épuisé') : j == null ? null : j < 0 ? el('span', 'badge plaisir', 'périmé') : j <= 3 ? el('span', 'badge enfant', j === 0 ? 'aujourd’hui' : 'dans ' + U.pluriel(j, 'jour')) : el('span', 'badge leger', U.dateCourte(g.peremption));
        return el('li', {}, el('span', 'ico', g.epuise ? '▫️' : '🥫'), el('button', { class: 'pousse corps', style: 'text-align:left;background:none;border:0;padding:0;min-height:44px', onclick: () => menuGardeManger(g) }, el('div', 'gras', g.nom), el('div', 'petit', [g.qte, g.rayon].filter(Boolean).join(' · '))), etat_);
      }))));
    }
    conteneur.append(el('button', { class: 'btn discret large', onclick: () => app().parametrer({ epuises: voirEpuises ? '' : '1' }) }, voirEpuises ? 'Masquer les produits épuisés' : 'Voir aussi les produits épuisés'));
  }
  function formulaireGardeManger(g) {
    const etat = E();
    const nom = el('input', { type: 'text', value: g ? g.nom : '', placeholder: 'Ex. : Riz complet' });
    const qte = el('input', { type: 'text', value: g && g.qte ? g.qte : '', placeholder: 'Ex. : 500 g, 2 boîtes' });
    const per = el('input', { type: 'date', value: g && g.peremption ? g.peremption : '' });
    feuille({ titre: g ? g.nom : 'Ajouter au garde-manger', focus: true,
      contenu: el('div', {}, el('label', 'champ', el('span', {}, 'Produit'), nom), el('label', 'champ', el('span', {}, 'Quantité (facultatif)'), qte), el('label', 'champ', el('span', {}, 'À consommer avant (facultatif)'), per)),
      actions: [{ libelle: 'Annuler' }, { libelle: 'Enregistrer', classe: 'principal', action: () => {
        if (!nom.value.trim()) { toast('Indiquez le produit.'); return false; }
        if (g) { g.nom = U.majuscule(nom.value.trim()); g.qte = qte.value.trim() || null; g.peremption = per.value || null; g.epuise = false; C.toucher(g); }
        else S.ajouterGardeManger(etat, { nom: nom.value, qte: qte.value.trim(), peremption: per.value });
        sauver();
      } }] });
  }
  function menuGardeManger(g) {
    const etat = E();
    menuActions(g.nom, [
      { ico: '✏️', libelle: 'Modifier (quantité, date)', action: () => formulaireGardeManger(g) },
      !g.epuise && { ico: '🫙', libelle: 'C’est fini (épuisé)', action: () => { g.epuise = true; sauver(); } },
      g.epuise && { ico: '🥫', libelle: 'J’en ai de nouveau', action: () => { g.epuise = false; sauver(); } },
      { ico: '🧺', libelle: 'Remettre sur la liste de courses', action: () => ajouterArticle(g.nom) },
      { ico: '🗑️', libelle: 'Retirer du garde-manger', danger: true, action: () => { g.retire = true; C.toucher(g); sauver(); } },
    ]);
  }
  function idees() {
    const etat = E();
    const res = S.ideesAvecGardeManger(etat, {});
    feuille({ titre: '🍳 Ce soir, avec ce qu’il y a',
      contenu: (corps, fermer) => !res.length ? vide({ emoji: '🤷', titre: 'Pas assez d’ingrédients connus', texte: 'Ajoutez ce que vous avez au garde-manger, ou terminez un passage en magasin : les idées viendront toutes seules.' })
        : el('div', {}, res.map(i => el('div', 'carte', el('div', 'ligne', el('span', 'ico', i.recette.emoji), el('div', 'pousse', el('div', 'gras', i.recette.titre), el('div', 'petit', i.recette.minutes + ' min · ' + Math.round(i.couverture * 100) + ' % des ingrédients à la maison'))),
          i.urgents.length ? el('p', 'petit', '⏳ Utilise : ' + i.urgents.join(', ')) : null,
          i.manquants.length ? el('p', 'petit', 'Il manque : ' + i.manquants.join(', ')) : el('p', 'petit', '✓ Tout est là.'),
          el('div', 'boutons', el('button', { class: 'btn principal petit-btn', onclick: () => { fermer(); app().aller('menus', { vue: 'recette', id: i.recette.id, origine: 'garde' }); } }, 'Voir la recette'),
            i.manquants.length ? el('button', { class: 'btn petit-btn', onclick: () => { for (const n of i.manquants) C.ajouter(etat.liste, { nom: n, source: i.recette.titre, par: utilisateur(etat) }, ctx()); sauver(); toast('Les manquants sont sur la liste.'); } }, '＋ Les manquants') : null)))) });
  }

  MaTable.ecrans = MaTable.ecrans || {};
  MaTable.ecrans.courses = { monter, ajouterArticle, quitter };
})(typeof window !== 'undefined' ? window : globalThis);
