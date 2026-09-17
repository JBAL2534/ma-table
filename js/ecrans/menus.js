// Écran Menus : la semaine, la fiche recette, le catalogue et le batch cooking du dimanche.
(function (racine) {
  const MaTable = racine.MaTable;
  const U = MaTable.util, M = MaTable.Menus, C = MaTable.Courses, H = MaTable.Historique;
  const { el, feuille, menuActions, toast, confirmer, demander, badges, vide, sauver, sauverDoucement, vibrer } = MaTable.ui;
  const E = () => MaTable.Stockage.etat;
  const app = () => MaTable.app;
  const ctxCourses = () => ({ preferencesMagasin: E().preferencesMagasin, magasins: E().reglages.magasins });

  function monter(conteneur, params) {
    const lundi = params.lundi || U.lundiDe(U.aujourdhui());
    const vue = params.vue || 'semaine';
    if (vue === 'recette' && params.id) return monterRecette(conteneur, params);
    if (vue === 'batch') return monterBatch(conteneur, lundi);
    if (vue === 'catalogue') return monterCatalogue(conteneur, params);
    monterSemaine(conteneur, lundi);
  }

  function positionSemaine(lundi) {
    const d = U.joursEntre(U.lundiDe(U.aujourdhui()), lundi) / 7;
    if (d === 0) return 'Cette semaine';
    if (d === 1) return 'Semaine prochaine';
    if (d === -1) return 'Semaine dernière';
    return d > 0 ? 'Dans ' + d + ' semaines' : 'Il y a ' + (-d) + ' semaines';
  }

  function proposer(lundi, force) {
    const etat = E();
    const s = etat.semaines[lundi];
    const aDesRepas = s && Object.values(s.repas).some(j => j.matin || j.midi || j.soir);
    const faire = () => {
      const graine = Date.now() % 1000000;
      etat.semaines[lundi] = M.genererSemaine(etat, lundi, graine);
      sauver();
      vibrer(15);
      toast('Voilà une semaine équilibrée. Touchez un repas pour le changer.');
    };
    if (aDesRepas && !force) {
      confirmer('Les menus déjà posés cette semaine seront remplacés par une nouvelle proposition. Les semaines passées ne bougent pas.', { titre: 'Proposer à nouveau ?', ok: 'Proposer' }).then(ok => { if (ok) faire(); });
    } else faire();
  }

  function ajouterSemaineAuxCourses(lundi) {
    const etat = E();
    const s = etat.semaines[lundi];
    if (!s) return;
    const ings = M.ingredientsSemaine(etat, s);
    const r = C.ajouterIngredients(etat.liste, ings, ctxCourses(), etat.gardeManger, 'semaine ' + lundi);
    sauver();
    toast(U.pluriel(r.ajoutes.length, 'article ajouté', 'articles ajoutés') + (r.dejaLa.length ? ' · ' + U.pluriel(r.dejaLa.length, 'déjà à la maison', 'déjà à la maison') : ''));
  }
  function ajouterRecetteAuxCourses(recette, portions) {
    const etat = E();
    const r = C.ajouterIngredients(etat.liste, M.ingredientsRecette(recette, portions || recette.portions), ctxCourses(), etat.gardeManger, recette.titre);
    sauver();
    toast(U.pluriel(r.ajoutes.length, 'article ajouté', 'articles ajoutés') + (r.dejaLa.length ? ' · ' + r.dejaLa.length + ' déjà à la maison' : ''));
  }

  function carteRepas(s, date, creneau) {
    const rep = s ? s.repas[date][creneau] : null;
    const nomCreneau = M.NOMS_CRENEAU[creneau];
    if (!rep) {
      return el('button', { class: 'repas vide', onclick: () => menuRepas(s, date, creneau), 'aria-label': nomCreneau + ' : à prévoir' },
        el('span', 'emoji', '＋'), el('span', 'pousse', el('div', 'creneau', nomCreneau), el('div', 'sous-titre', 'À prévoir — touchez pour une idée')));
    }
    const b = el('button', {
      class: 'repas' + (rep.type === 'lunchbox' ? ' lunchbox' : ''), onclick: () => menuRepas(s, date, creneau), draggable: 'true',
      'aria-label': nomCreneau + ' : ' + rep.titre,
      ondragstart: (ev) => { ev.dataTransfer.setData('text/plain', date + '|' + creneau); b.classList.add('glisse'); },
      ondragend: () => b.classList.remove('glisse'),
      ondragover: (ev) => { ev.preventDefault(); b.classList.add('cible'); },
      ondragleave: () => b.classList.remove('cible'),
      ondrop: (ev) => { ev.preventDefault(); b.classList.remove('cible'); const [d, c] = (ev.dataTransfer.getData('text/plain') || '').split('|'); if (d && c === creneau && d !== date) { M.deplacerRepas(s, d, creneau, date); sauver(); } },
    },
      el('span', { class: 'emoji', 'aria-hidden': 'true' }, rep.emoji || '🍽️'),
      el('span', 'pousse',
        el('div', 'creneau', nomCreneau),
        el('div', 'titre', (rep.type === 'rechauffer' ? 'Réchauffer : ' : '') + rep.titre),
        rep.sousTitre ? el('div', 'sous-titre', rep.sousTitre) : null,
        badges(rep.badges, 3)),
      el('span', 'temps', rep.minutes ? rep.minutes + ' min' : ''));
    return b;
  }

  function menuRepas(s, date, creneau) {
    const etat = E();
    const lundi = U.lundiDe(date);
    if (!s) s = M.semaine(etat, lundi, true);
    const rep = s.repas[date][creneau];
    const passe = date <= U.aujourdhui();
    menuActions(U.majuscule(U.nomJour(date)) + ' · ' + M.NOMS_CRENEAU[creneau], [
      rep && rep.recetteId && { ico: '📖', libelle: 'Voir la recette', action: () => app().aller('menus', { vue: 'recette', id: rep.recetteId, lundi, retour: date + '|' + creneau }) },
      { ico: '🎲', libelle: rep ? 'Autre idée' : 'Une idée pour ce repas', action: () => { const n = M.autreIdee(etat, s, date, creneau, Date.now() % 1000000); if (n) { sauver(); vibrer(); toast(n.emoji + ' ' + n.titre); } else toast('Pas d’autre idée disponible pour ce créneau.'); } },
      { ico: '🔎', libelle: 'Choisir une recette…', action: () => app().aller('menus', { vue: 'catalogue', lundi, pour: date + '|' + creneau }) },
      rep && { ico: '↔️', libelle: 'Déplacer vers un autre jour', action: () => choisirJour(s, date, creneau) },
      rep && rep.recetteId && { ico: '🧺', libelle: 'Ajouter les ingrédients aux courses', action: () => { const r = M.recetteParId(etat, rep.recetteId); if (r) ajouterRecetteAuxCourses(r, rep.type === 'lunchbox' ? 2 : 3); } },
      rep && rep.recetteId && passe && { ico: '⭐', libelle: 'Noter ce repas', action: () => MaTable.ecrans.historique.noter(date, creneau) },
      rep && { ico: '🗑️', libelle: 'Retirer de la semaine', danger: true, action: () => { s.repas[date][creneau] = null; if (s.batch) { for (const p of s.batch.preparations) p.jours = p.jours.filter(j => j !== date); s.batch.preparations = s.batch.preparations.filter(p => p.jours.length); M.planBatch(s); } M.toucherSemaine(s); sauver(); } },
    ]);
  }
  function choisirJour(s, date, creneau) {
    feuille({
      titre: 'Échanger avec quel jour ?',
      contenu: (corps, fermer) => el('div', 'menu-actions', Object.keys(s.repas).sort().filter(j => j !== date).map(j => {
        const autre = s.repas[j][creneau];
        return el('button', { onclick: () => { M.deplacerRepas(s, date, creneau, j); fermer(); sauver(); toast('Repas déplacés.'); } },
          el('span', 'ico', autre ? autre.emoji : '＋'), el('span', 'pousse', U.majuscule(U.dateLongue(j))), el('span', 'petit tronque', autre ? autre.titre : 'libre'));
      })),
    });
  }

  function monterSemaine(conteneur, lundi) {
    const etat = E();
    const s = etat.semaines[lundi];
    const aDesRepas = s && Object.values(s.repas).some(j => j.matin || j.midi || j.soir);
    const auj = U.aujourdhui();
    conteneur.append(el('div', 'entete',
      el('div', {}, el('div', 'sur-titre', 'Ma Table'), el('h1', {}, 'Menus')),
      el('div', 'entete-actions', el('button', { class: 'btn petit-btn', onclick: () => app().aller('menus', { vue: 'catalogue', lundi }) }, '📖 Recettes'))));
    conteneur.append(el('div', 'semaine-nav',
      el('button', { class: 'btn icone', 'aria-label': 'Semaine précédente', onclick: () => app().aller('menus', { lundi: U.ajouterJours(lundi, -7) }) }, '‹'),
      el('button', { class: 'titre', style: 'background:none;border:0;padding:4px', 'aria-label': 'Revenir à la semaine en cours', onclick: () => { if (lundi === U.lundiDe(U.aujourdhui())) toast('Vous êtes sur la semaine en cours.'); else app().aller('menus', {}); } }, U.majuscule(U.libelleSemaine(lundi)), el('small', {}, positionSemaine(lundi))),
      el('button', { class: 'btn icone', 'aria-label': 'Semaine suivante', onclick: () => app().aller('menus', { lundi: U.ajouterJours(lundi, 7) }) }, '›')));

    if (!aDesRepas) {
      const passees = H.semainesConnues(etat).filter(l => l !== lundi && etat.semaines[l]);
      conteneur.append(vide({
        emoji: '🥗', titre: 'Rien de prévu pour cette semaine',
        texte: 'En un geste, Ma Table compose sept jours équilibrés : petits-déjeuners protéinés, lunch boxes préparées le dimanche, dîners rapides en semaine et un repas plaisir le week-end.',
        action: { libelle: '✨ Proposer ma semaine', action: () => proposer(lundi) },
        secondaire: passees.length ? { libelle: 'Reprendre une semaine passée', action: () => app().aller('historique', { onglet: 'semaines' }) } : null,
      }));
      conteneur.append(el('div', 'carte douce', el('h3', {}, 'Ou composer à la main'), el('p', 'sous', 'Touchez un créneau ci-dessous pour choisir une recette ou demander une idée.')));
      for (const j of U.joursSemaine(lundi)) conteneur.append(blocJour(s, j, auj));
      return;
    }

    const t = H.tableauDeBord(etat, lundi);
    conteneur.append(el('div', 'carte douce',
      el('div', 'ligne entre', el('h3', {}, t.message), null),
      el('p', 'petit', t.legumes + ' repas avec légumes · ' + U.pluriel(t.lunchBoxes, 'lunch box', 'lunch boxes') + ' · ' + U.pluriel(t.plaisirs, 'repas plaisir', 'repas plaisir') + ' · ' + t.enfant + ' approuvés enfant'),
      el('div', 'boutons',
        el('button', { class: 'btn chaud', onclick: () => app().aller('menus', { vue: 'batch', lundi }) }, '🍲 Batch du ' + U.nomJour(s.batch ? s.batch.date : U.ajouterJours(lundi, 6))),
        el('button', { class: 'btn principal', onclick: () => ajouterSemaineAuxCourses(lundi) }, '🧺 Tout aux courses')),
      el('div', 'ligne entre', el('button', { class: 'btn discret petit-btn', onclick: () => proposer(lundi) }, '🎲 Proposer à nouveau'), el('button', { class: 'btn discret petit-btn', onclick: () => app().aller('historique', { onglet: 'tableau', lundi }) }, 'Tableau de bord ›'))));
    for (const j of U.joursSemaine(lundi)) conteneur.append(blocJour(s, j, auj));
  }
  function blocJour(s, j, auj) {
    const estAuj = j === auj;
    return el('section', { class: 'jour' + (estAuj ? ' aujourdhui' : ''), 'aria-label': U.dateLongue(j) },
      el('div', 'jour-titre', el('h3', {}, U.nomJour(j)), el('span', 'date', U.dateCourte(j)), estAuj ? el('span', 'auj', 'Aujourd’hui') : null,
        s && s.batch && s.batch.date === j ? el('span', 'badge batch', 'Batch cooking') : null),
      M.CRENEAUX.map(c => carteRepas(s, j, c)));
  }

  // ---- Fiche recette --------------------------------------------------------
  function monterRecette(conteneur, params) {
    const etat = E();
    const r = M.recetteParId(etat, params.id);
    const lundi = params.lundi || U.lundiDe(U.aujourdhui());
    const retour = () => app().aller(params.origine === 'garde' ? 'courses' : 'menus', params.origine === 'garde' ? { onglet: 'garde' } : { lundi, vue: params.depuis === 'catalogue' ? 'catalogue' : undefined });
    if (!r) { conteneur.append(el('div', 'carte', el('p', {}, 'Cette recette n’existe plus.'), el('button', { class: 'btn', onclick: retour }, 'Retour'))); return; }
    const portions = Number(params.portions) || r.portions || 3;
    conteneur.append(el('div', 'entete', el('button', { class: 'btn', onclick: retour }, '‹ Retour'),
      el('div', 'entete-actions', el('button', { class: 'btn petit-btn', onclick: () => menuRecette(r, lundi) }, '⋯'))));
    conteneur.append(el('div', 'recette-entete',
      el('div', { class: 'emoji', 'aria-hidden': 'true' }, r.emoji || '🍽️'),
      el('h2', {}, r.titre), r.description ? el('p', 'sous', r.description) : null,
      el('div', 'infos', el('span', {}, '⏱ ' + r.minutes + ' min'), el('span', {}, '🔥 ' + (M.CUISSONS[r.cuisson] || r.cuisson)), el('span', {}, M.NOMS_CRENEAU[r.creneau])),
      el('div', { style: 'display:flex;justify-content:center;margin-top:6px' }, badges(r.badges))));
    if (r.astuceEnfant) conteneur.append(el('div', 'carte ambre', el('h3', {}, '💛 Pour donner envie'), el('p', {}, r.astuceEnfant)));
    conteneur.append(el('div', 'carte',
      el('div', 'carte-titre', el('h3', {}, 'Ingrédients'),
        el('div', { class: 'portions', 'aria-label': 'Nombre de portions' },
          el('button', { 'aria-label': 'Moins de portions', onclick: () => app().parametrer({ portions: Math.max(1, portions - 1) }) }, '−'),
          el('span', 'gras', portions + ' pers.'),
          el('button', { 'aria-label': 'Plus de portions', onclick: () => app().parametrer({ portions: portions + 1 }) }, '+'))),
      el('ul', 'liste ingredients', M.ingredientsRecette(r, portions).map(i => el('li', {}, el('span', {}, i.nom), el('span', 'qte', U.formaterQte(i.qte, i.unite))))),
      el('p', 'minuscule', 'Pour les lunch boxes des adultes, comptez 2 portions par jour.'),
      el('div', 'boutons', el('button', { class: 'btn principal', onclick: () => ajouterRecetteAuxCourses(r, portions) }, '🧺 Ajouter à la liste de courses'))));
    conteneur.append(el('div', 'carte', el('h3', {}, 'Préparation'), el('ol', 'etapes', r.etapes.map(e => el('li', {}, e))),
      r.conservation ? el('p', 'petit', '🧊 Conservation : ' + r.conservation) : null));
    conteneur.append(el('div', 'boutons colonne',
      el('button', { class: 'btn chaud grand', onclick: () => placerDansSemaine(r, lundi, params.retour) }, '🗓️ Placer dans la semaine'),
      r.origine === 'famille' ? el('button', { class: 'btn', onclick: () => formulaireRecette(r) }, '✏️ Modifier la recette') : el('button', { class: 'btn', onclick: () => formulaireRecette(Object.assign({}, JSON.parse(JSON.stringify(r)), { id: null, titre: r.titre + ' (notre version)', origine: 'famille' })) }, '✏️ Adapter cette recette')));
  }
  function menuRecette(r, lundi) {
    const etat = E();
    menuActions(r.titre, [
      { ico: '🧺', libelle: 'Ajouter à la liste de courses', action: () => ajouterRecetteAuxCourses(r) },
      { ico: '🗓️', libelle: 'Placer dans la semaine', action: () => placerDansSemaine(r, lundi) },
      r.origine !== 'famille' && { ico: '🙈', libelle: 'Ne plus proposer cette recette', danger: true, action: async () => { if (await confirmer('Cette recette ne sera plus proposée ni affichée dans le catalogue. Elle reste lisible dans l’historique.', { ok: 'Masquer' })) { etat.recettesMasquees.push(r.id); sauver(); app().aller('menus', { vue: 'catalogue', lundi }); } } },
      r.origine === 'famille' && { ico: '🙈', libelle: 'Retirer cette recette du catalogue', danger: true, action: async () => { if (await confirmer('Elle ne sera plus proposée ; les repas passés qui l’utilisent restent lisibles.', { ok: 'Retirer' })) { etat.recettesMasquees.push(r.id); sauver(); app().aller('menus', { vue: 'catalogue', lundi }); } } },
    ]);
  }
  function placerDansSemaine(r, lundi, retour) {
    const etat = E();
    if (retour) {
      const [date, creneau] = retour.split('|');
      const s = M.semaine(etat, U.lundiDe(date), true);
      M.placerRecette(etat, s, date, creneau, r.id); sauver();
      app().aller('menus', { lundi: U.lundiDe(date) }); toast(r.emoji + ' ' + r.titre + ' placé ' + U.nomJour(date) + ' ' + M.NOMS_CRENEAU[creneau].toLowerCase() + '.');
      return;
    }
    feuille({
      titre: 'Quel jour ?',
      contenu: (corps, fermer) => el('div', 'menu-actions', U.joursSemaine(lundi).map(j => el('button', { onclick: () => { fermer(); choisirCreneau(r, j); } }, el('span', 'ico', j === U.aujourdhui() ? '📍' : '📅'), el('span', 'pousse', U.majuscule(U.dateLongue(j)))))),
      actions: [{ libelle: 'Une autre semaine…', action: () => { app().aller('menus', { lundi: U.ajouterJours(lundi, 7) }); toast('Ouvrez la recette depuis cette semaine pour la placer.'); } }],
    });
  }
  function choisirCreneau(r, date) {
    const etat = E();
    feuille({
      titre: U.majuscule(U.dateLongue(date)),
      contenu: (corps, fermer) => el('div', 'menu-actions', M.CRENEAUX.map(c => {
        const s = M.semaine(etat, U.lundiDe(date), true);
        const actuel = s.repas[date][c];
        return el('button', { onclick: () => { M.placerRecette(etat, s, date, c, r.id); sauver(); fermer(); app().aller('menus', { lundi: U.lundiDe(date) }); toast('Placé au ' + M.NOMS_CRENEAU[c].toLowerCase() + '.'); } },
          el('span', 'ico', actuel ? actuel.emoji : '＋'), el('span', 'pousse', M.NOMS_CRENEAU[c]), el('span', 'petit tronque', actuel ? 'remplace ' + actuel.titre : 'libre'));
      })),
    });
  }

  // ---- Catalogue -------------------------------------------------------------
  const FILTRES = [
    { id: 'enfant', libelle: 'Enfant', test: r => r.badges.includes('enfant') },
    { id: 'rapide', libelle: '≤ 25 min', test: r => r.minutes <= 25 },
    { id: 'cookeo', libelle: 'Cookeo', test: r => r.cuisson === 'cookeo' },
    { id: 'airfryer', libelle: 'Air fryer', test: r => r.cuisson === 'airfryer' },
    { id: 'leger', libelle: 'Léger', test: r => r.badges.includes('leger') },
    { id: 'lunchbox', libelle: 'Lunch box', test: r => r.badges.includes('lunchbox') },
    { id: 'plaisir', libelle: 'Plaisir', test: r => r.badges.includes('plaisir') },
    { id: 'matin', libelle: 'Petit-déj', test: r => r.creneau === 'matin' },
    { id: 'famille', libelle: 'Nos recettes', test: r => r.origine === 'famille' },
  ];
  function monterCatalogue(conteneur, params) {
    const etat = E();
    const lundi = params.lundi || U.lundiDe(U.aujourdhui());
    const filtres = (params.f || '').split(',').filter(Boolean);
    const q = params.q || '';
    const pour = params.pour ? params.pour.split('|') : null;
    conteneur.append(el('div', 'entete', el('button', { class: 'btn', onclick: () => app().aller('menus', { lundi }) }, '‹ Semaine'),
      el('div', 'entete-actions', el('button', { class: 'btn principal petit-btn', onclick: () => formulaireRecette(null) }, '＋ Nouvelle recette'))));
    conteneur.append(el('h1', { style: 'margin-bottom:10px' }, pour ? 'Choisir pour ' + U.nomJour(pour[0]) + ' ' + M.NOMS_CRENEAU[pour[1]].toLowerCase() : 'Recettes'));
    const champ = el('input', { type: 'search', placeholder: 'Rechercher une recette ou un ingrédient', value: q, 'aria-label': 'Rechercher', oninput: (ev) => { clearTimeout(champ._t); champ._t = setTimeout(() => app().parametrer({ q: ev.target.value }), 250); } });
    conteneur.append(el('div', 'champ', champ));
    conteneur.append(el('div', { class: 'puces', style: 'margin-bottom:14px' }, FILTRES.map(f => el('button', { class: 'puce', 'aria-pressed': String(filtres.includes(f.id)), onclick: () => { const n = filtres.includes(f.id) ? filtres.filter(x => x !== f.id) : filtres.concat([f.id]); app().parametrer({ f: n.join(',') }); } }, f.libelle))));
    let recettes = M.toutesRecettes(etat);
    if (pour && pour[1] === 'matin' && !filtres.length) recettes = recettes.filter(r => r.creneau === 'matin');
    for (const f of filtres) { const F = FILTRES.find(x => x.id === f); if (F) recettes = recettes.filter(F.test); }
    if (q) { const n = U.normaliser(q); recettes = recettes.filter(r => U.normaliser(r.titre + ' ' + r.ingredients.map(i => i.nom).join(' ')).includes(n)); }
    recettes.sort((a, b) => a.titre.localeCompare(b.titre, 'fr'));
    if (!recettes.length) { conteneur.append(vide({ emoji: '🔍', titre: 'Aucune recette ne correspond', texte: 'Essayez avec moins de filtres, ou créez la vôtre.', action: { libelle: '＋ Nouvelle recette', action: () => formulaireRecette(null) } })); return; }
    conteneur.append(el('p', 'petit', U.pluriel(recettes.length, 'recette')));
    conteneur.append(el('div', {}, recettes.map(r => el('button', {
      class: 'repas', onclick: () => {
        if (pour) { const s = M.semaine(etat, U.lundiDe(pour[0]), true); M.placerRecette(etat, s, pour[0], pour[1], r.id); sauver(); app().aller('menus', { lundi: U.lundiDe(pour[0]) }); toast(r.emoji + ' ' + r.titre + ' placé.'); }
        else app().aller('menus', { vue: 'recette', id: r.id, lundi, depuis: 'catalogue' });
      },
    }, el('span', { class: 'emoji', 'aria-hidden': 'true' }, r.emoji || '🍽️'), el('span', 'pousse', el('div', 'titre', r.titre), el('div', 'sous-titre', (M.CUISSONS[r.cuisson] || '') + ' · ' + M.NOMS_CRENEAU[r.creneau]), badges(r.badges, 3)), el('span', 'temps', r.minutes + ' min')))));
  }

  // ---- Formulaire de recette -------------------------------------------------
  function analyserIngredients(texte) {
    return String(texte || '').split('\n').map(l => l.trim()).filter(Boolean).map(l => { const a = C.analyserSaisie(l); return { nom: U.majuscule(a.nom), qte: a.qte, unite: a.unite }; });
  }
  function formulaireRecette(recette) {
    const etat = E();
    const r = recette || { titre: '', description: '', creneau: 'soir', minutes: 20, cuisson: 'plaques', badges: [], ingredients: [], etapes: [], astuceEnfant: '', conservationJours: 2, emoji: '🍽️', origine: 'famille' };
    const champs = {};
    const champ = (nom, libelle, element, aide) => { champs[nom] = element; return el('label', 'champ', el('span', {}, libelle), element, aide ? el('div', 'aide', aide) : null); };
    const options = (liste, valeur) => Object.entries(liste).map(([v, l]) => el('option', { value: v, selected: v === valeur }, l));
    const badgesChoix = ['enfant', 'leger', 'plaisir', 'lunchbox', 'batch', 'rechauffer'];
    const cases = badgesChoix.map(b => el('label', 'case', el('input', { type: 'checkbox', value: b, checked: r.badges.includes(b) }), M.BADGES[b]));
    feuille({
      titre: recette && recette.id ? 'Modifier la recette' : 'Nouvelle recette', plein: true, focus: true,
      contenu: el('div', {},
        el('div', 'grille-2', champ('emoji', 'Emoji', el('input', { type: 'text', value: r.emoji || '', maxlength: '4' })), champ('minutes', 'Minutes', el('input', { type: 'number', value: r.minutes, min: '1', inputmode: 'numeric' }))),
        champ('titre', 'Nom du plat', el('input', { type: 'text', value: r.titre, placeholder: 'Ex. : Gratin de courgettes' })),
        champ('description', 'En une phrase', el('input', { type: 'text', value: r.description || '' })),
        el('div', 'grille-2', champ('creneau', 'Moment', el('select', {}, options(M.NOMS_CRENEAU, r.creneau))), champ('cuisson', 'Cuisson', el('select', {}, options(M.CUISSONS, r.cuisson)))),
        el('div', 'champ', el('span', {}, 'Badges'), el('div', 'grille-2', cases)),
        champ('ingredients', 'Ingrédients (un par ligne, pour ' + (r.portions || 3) + ' personnes)', el('textarea', { value: r.ingredients.map(i => [U.formaterQte(i.qte, i.unite), i.nom].filter(Boolean).join(' ')).join('\n'), placeholder: '300 g pâtes complètes\n2 courgettes\n1 c. à soupe huile d’olive' }), 'Quantité, unité, puis le nom : « 300 g pâtes complètes ».'),
        champ('etapes', 'Étapes (une par ligne)', el('textarea', { value: r.etapes.join('\n') })),
        champ('astuceEnfant', 'Astuce pour donner envie à l’enfant', el('input', { type: 'text', value: r.astuceEnfant || '', placeholder: 'Présentation, nom amusant, « à composer soi-même »…' })),
        el('div', 'grille-2', champ('conservationJours', 'Se garde (jours au frais)', el('input', { type: 'number', value: r.conservationJours != null ? r.conservationJours : 2, min: '0', inputmode: 'numeric' })), champ('conservation', 'Conservation (texte)', el('input', { type: 'text', value: r.conservation || '', placeholder: '3 jours au frais' })))),
      actions: [
        { libelle: 'Annuler' },
        { libelle: 'Enregistrer', classe: 'principal', action: () => {
          const titre = champs.titre.value.trim();
          if (!titre) { toast('Donnez un nom au plat.'); return false; }
          const ingredients = analyserIngredients(champs.ingredients.value);
          if (!ingredients.length) { toast('Ajoutez au moins un ingrédient.'); return false; }
          const nouveau = Object.assign({}, r, {
            titre, description: champs.description.value.trim(), creneau: champs.creneau.value, minutes: Math.max(1, Number(champs.minutes.value) || 20), cuisson: champs.cuisson.value,
            badges: cases.filter(c => c.firstChild.checked).map(c => c.firstChild.value), ingredients, etapes: champs.etapes.value.split('\n').map(x => x.trim()).filter(Boolean),
            astuceEnfant: champs.astuceEnfant.value.trim() || null, conservationJours: Math.max(0, Number(champs.conservationJours.value) || 0), conservation: champs.conservation.value.trim() || null,
            emoji: champs.emoji.value.trim() || '🍽️', origine: 'famille', portions: r.portions || 3,
          });
          nouveau.badges = nouveau.badges.filter(b => b !== 'cookeo' && b !== 'airfryer');
          if (nouveau.cuisson === 'cookeo') nouveau.badges.push('cookeo');
          if (nouveau.cuisson === 'airfryer') nouveau.badges.push('airfryer');
          const enr = M.enregistrerRecette(etat, nouveau);
          sauver();
          app().aller('menus', { vue: 'recette', id: enr.id, lundi: app().params.lundi });
          toast('Recette enregistrée.');
        } },
      ],
    });
  }

  // ---- Batch cooking -----------------------------------------------------------
  function monterBatch(conteneur, lundi) {
    const etat = E();
    const s = etat.semaines[lundi];
    conteneur.append(el('div', 'entete', el('button', { class: 'btn', onclick: () => app().aller('menus', { lundi }) }, '‹ Semaine'), el('div', 'entete-actions', el('button', { class: 'btn petit-btn', onclick: () => { try { window.print(); toast('Les étiquettes partent à l\u2019impression.'); } catch (e) { toast('Impression indisponible ici.'); } } }, '🖨️ Étiquettes'))));
    if (!s || !s.batch || !s.batch.preparations.length) {
      conteneur.append(vide({ emoji: '🍲', titre: 'Pas de batch cooking prévu', texte: 'Proposez une semaine : Ma Table y glisse une session de batch cooking qui prépare les lunch boxes et une base pour les dîners.', action: { libelle: '✨ Proposer ma semaine', action: () => { proposer(lundi); } } }));
      return;
    }
    const b = s.batch;
    conteneur.append(el('div', 'recette-entete', el('div', { class: 'emoji', 'aria-hidden': 'true' }, '🍲'), el('h2', {}, U.majuscule(U.nomJour(b.date)) + ' batch cooking'), el('p', 'sous', U.majuscule(U.dateLongue(b.date))),
      el('div', 'infos', el('span', {}, '⏱ ' + Math.round(b.dureeEstimee / 5) * 5 + ' min environ'), el('span', {}, U.pluriel(b.preparations.length, 'préparation')), el('span', {}, U.pluriel(b.contenants.length, 'boîte')))));
    conteneur.append(el('div', 'carte', el('h3', {}, 'Ce qu’on prépare'),
      el('ul', 'liste', b.preparations.map(p => el('li', {}, el('span', 'ico', p.emoji), el('span', 'pousse', el('div', 'gras', p.titre), el('div', 'petit', (p.role === 'lunchbox' ? 'Lunch box · ' : 'Base dîner · ') + U.pluriel(p.portions, 'portion') + ' · ' + p.jours.map(j => U.nomJour(j, true)).join(', ') + (p.congeler ? ' · congeler la fin de semaine' : '')), p.conservation ? el('div', 'minuscule', '🧊 ' + p.conservation) : null),
        el('button', { class: 'btn petit-btn', onclick: () => app().aller('menus', { vue: 'recette', id: p.recetteId, lundi, portions: p.portions }) }, 'Recette')))),
      el('div', 'boutons', el('button', { class: 'btn principal', onclick: () => {
        const ings = M.cumuler(b.preparations.flatMap(p => { const r = M.recetteParId(etat, p.recetteId); return r ? M.ingredientsRecette(r, p.portions) : []; }));
        const res = C.ajouterIngredients(etat.liste, ings, ctxCourses(), etat.gardeManger, 'batch ' + b.date); sauver();
        toast(U.pluriel(res.ajoutes.length, 'article ajouté', 'articles ajoutés') + ' pour le batch.');
      } }, '🧺 Ingrédients du batch aux courses'))));
    conteneur.append(el('div', 'carte', el('h3', {}, 'Dans l’ordre'), el('ol', 'etapes', b.etapes.map(e => el('li', {}, e.texte, e.appareil ? el('span', {}, ' ', el('span', 'badge', e.appareil)) : null)))));
    const parJour = {};
    for (const c of b.contenants) (parJour[c.jour] = parJour[c.jour] || []).push(c);
    conteneur.append(el('div', 'carte', el('h3', {}, 'Étiquettes des boîtes'), el('p', 'petit', 'Une étiquette par boîte, avec le jour où la manger.'),
      el('div', 'etiquettes', b.contenants.map(c => el('div', 'etiquette', el('b', {}, U.nomJour(c.jour) + ' ' + U.dateCourte(c.jour)), el('span', {}, c.emoji + ' ' + c.titre), el('div', 'minuscule', c.libelle), c.congeler ? el('div', 'congele', '❄️ Congeler, sortir la veille') : null)))));
  }

  MaTable.ecrans = MaTable.ecrans || {};
  MaTable.ecrans.menus = { monter, proposer, formulaireRecette, ajouterRecetteAuxCourses };
})(typeof window !== 'undefined' ? window : globalThis);
