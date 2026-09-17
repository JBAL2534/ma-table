// Le planificateur : compose une semaine qui respecte l'organisation de la famille,
// à partir des recettes, des avis passés et des goûts de chacun. Sans serveur ni IA distante :
// des règles claires et un tirage pondéré, reproductible grâce à une graine.
(function (racine) {
  const MaTable = racine.MaTable = racine.MaTable || {};
  const U = MaTable.util;
  const CRENEAUX = ['matin', 'midi', 'soir'];
  const NOMS_CRENEAU = { matin: 'Petit-déjeuner', midi: 'Déjeuner', soir: 'Dîner' };
  const CUISSONS = { cookeo: 'Cookeo', airfryer: 'Air fryer', four: 'Four', plaques: 'Plaques', aucun: 'Sans cuisson' };
  const BADGES = {
    enfant: 'Enfant-friendly', leger: 'Léger', cookeo: 'Cookeo', airfryer: 'Air fryer', rechauffer: 'Réchauffer',
    lunchbox: 'Lunch box', batch: 'Batch cooking', plaisir: 'Plaisir',
  };

  function toutesRecettes(etat) {
    const masquees = new Set(etat.recettesMasquees || []);
    const perso = etat.recettes || [];
    const remplacees = new Set(perso.map(r => r.id));
    const depart = (MaTable.RECETTES_DEPART || []).filter(r => !masquees.has(r.id) && !remplacees.has(r.id));
    return depart.concat(perso.filter(r => !masquees.has(r.id)));
  }
  function recetteParId(etat, id) {
    return (etat.recettes || []).find(r => r.id === id) || (MaTable.RECETTES_DEPART || []).find(r => r.id === id) || null;
  }
  function enregistrerRecette(etat, recette) {
    if (!recette.id) recette.id = U.idUnique('rp');
    recette.portions = recette.portions || 3;
    recette.badges = recette.badges || [];
    recette.ingredients = recette.ingredients || [];
    recette.etapes = recette.etapes || [];
    recette.conservationJours = recette.conservationJours != null ? recette.conservationJours : 2;
    recette.origine = recette.origine || 'famille';
    if (recette.badges.includes('cookeo') === false && recette.cuisson === 'cookeo') recette.badges.push('cookeo');
    if (recette.badges.includes('airfryer') === false && recette.cuisson === 'airfryer') recette.badges.push('airfryer');
    const i = etat.recettes.findIndex(r => r.id === recette.id);
    recette.modifieLe = new Date().toISOString();
    if (i === -1) etat.recettes.push(recette); else etat.recettes[i] = recette;
    return recette;
  }

  function semaineVide(lundi) {
    const repas = {};
    for (const j of U.joursSemaine(lundi)) repas[j] = { matin: null, midi: null, soir: null };
    return { lundi, repas, batch: null, generee: null, notes: '' };
  }
  function toucherSemaine(s) { if (s) s.modifieLe = new Date().toISOString(); return s; }
  function semaine(etat, lundi, creer) {
    if (!etat.semaines[lundi] && creer) etat.semaines[lundi] = semaineVide(lundi);
    return etat.semaines[lundi] || null;
  }

  // Les avis déjà donnés sur une recette, du plus récent au plus ancien.
  function avisPour(etat, recetteId) {
    return (etat.avis || []).filter(a => a.recetteId === recetteId).sort((a, b) => (b.quand || '').localeCompare(a.quand || ''));
  }
  function ingredientsContiennent(recette, mots) {
    if (!mots || !mots.length) return false;
    const texte = U.normaliser(recette.titre + ' ' + recette.ingredients.map(i => i.nom).join(' '));
    return mots.some(m => m && texte.includes(U.normaliser(m)));
  }
  function recentes(etat, lundi, nbSemaines) {
    const ids = new Set();
    for (let k = 1; k <= nbSemaines; k++) {
      const s = etat.semaines[U.ajouterJours(lundi, -7 * k)];
      if (!s) continue;
      for (const j of Object.keys(s.repas)) for (const c of CRENEAUX) { const r = s.repas[j][c]; if (r && r.recetteId) ids.add(r.recetteId); }
    }
    return ids;
  }

  // Poids d'une recette dans le tirage : 0 = jamais, > 1 = favorite.
  function poids(etat, recette, ctx) {
    let p = 1;
    const avis = avisPour(etat, recette.id);
    if (avis.length) {
      const dernier = avis[0];
      if (dernier.note === 'jamais') return 0;
      if (dernier.note === 'refait') p *= 3;
      if (dernier.note === 'bof') p *= 0.4;
      if (dernier.enfant === 'adore') p *= 1.5;
      if (dernier.enfant === 'refuse' && ctx && ctx.lundi && U.joursEntre(dernier.date || dernier.quand.slice(0, 10), ctx.lundi) <= 28) p *= 0.25;
    }
    for (const m of (etat.famille.membres || [])) {
      if (ingredientsContiennent(recette, m.aimePeu)) p *= m.role === 'enfant' ? 0.35 : 0.2;
      if (ingredientsContiennent(recette, m.aime)) p *= 1.3;
    }
    if (ctx && ctx.recentes && ctx.recentes.has(recette.id)) p *= 0.5;
    return p;
  }

  function repasDepuis(recette, type, extra) {
    return Object.assign({
      type: type || 'recette', recetteId: recette.id, titre: recette.titre, emoji: recette.emoji, minutes: recette.minutes,
      badges: recette.badges.slice(), cuisson: recette.cuisson, sousTitre: null,
    }, extra || {});
  }

  function tirerRecette(etat, candidats, ctx, hasard, exclure) {
    const restants = candidats.filter(r => !exclure.has(r.id));
    const ps = restants.map(r => poids(etat, r, ctx));
    if (!ps.some(p => p > 0)) return null;
    return U.tirer(restants, ps, hasard);
  }

  function nomEnfant(etat) {
    const e = (etat.famille.membres || []).find(m => m.role === 'enfant');
    return e ? e.nom : null;
  }
  function sousTitreLunchBox(etat) {
    const e = nomEnfant(etat);
    return (e ? 'Cantine pour ' + e : 'Cantine') + ' · lunch box pour les adultes';
  }

  // Répartit les préparations du dimanche sur les déjeuners de la semaine, dans la limite de leur conservation.
  function repartirLunchBoxes(preparations, joursOuvres) {
    const preps = preparations.slice().sort((a, b) => a.conservationJours - b.conservationJours);
    const restants = joursOuvres.slice();
    for (let i = 0; i < preps.length; i++) {
      const p = preps[i];
      const part = Math.ceil(restants.length / (preps.length - i));
      p.jours = [];
      for (let k = 0; k < part && restants.length; k++) {
        const jour = restants[0];
        const rang = joursOuvres.indexOf(jour) + 1; // lundi = 1 jour après le dimanche
        if (rang > p.conservationJours && p.conservationJours > 0 && p.jours.length) break;
        p.jours.push(restants.shift());
        if (rang > p.conservationJours) p.congeler = true;
      }
    }
    // Si des jours restent, la préparation la plus robuste les prend (à congeler si besoin).
    if (restants.length) {
      const robuste = preps[preps.length - 1];
      for (const j of restants) { robuste.jours.push(j); robuste.congeler = true; }
    }
    return preps;
  }

  function genererSemaine(etat, lundi, graine) {
    const hasard = U.alea(graine);
    const reglages = etat.reglages;
    const recettes = toutesRecettes(etat);
    const jours = U.joursSemaine(lundi);
    const ctx = { lundi, recentes: recentes(etat, lundi, 2) };
    const utilises = new Set();
    const s = semaineVide(lundi);
    s.generee = new Date().toISOString();
    s.graine = graine;
    const jourBatch = jours[(reglages.jourBatch || 7) - 1];
    const joursOuvres = jours.filter(j => !U.estWeekend(j));
    const tempsMax = reglages.tempsMaxSemaine || 25;

    // 1. Petits-déjeuners : une rotation qui ne répète jamais la veille.
    const matins = recettes.filter(r => r.creneau === 'matin');
    let precedent = null;
    for (const j of jours) {
      const exclure = new Set(precedent ? [precedent] : []);
      const r = tirerRecette(etat, matins, ctx, hasard, exclure) || matins[0];
      if (r) { s.repas[j].matin = repasDepuis(r); precedent = r.id; }
    }

    // 2. Batch cooking : 3 à 4 préparations pour les lunch boxes, protéines variées.
    const lunchables = recettes.filter(r => r.badges.includes('lunchbox') && r.creneau !== 'matin');
    const preparations = [];
    const proteinesPrises = new Set();
    const nbPreps = lunchables.length >= 4 ? 3 + (hasard() < 0.5 ? 1 : 0) : Math.min(3, lunchables.length);
    for (let i = 0; i < nbPreps; i++) {
      let cands = lunchables.filter(r => !proteinesPrises.has(r.proteine));
      if (!cands.length) cands = lunchables;
      const r = tirerRecette(etat, cands, ctx, hasard, utilises);
      if (!r) break;
      utilises.add(r.id); proteinesPrises.add(r.proteine);
      preparations.push({ recetteId: r.id, titre: r.titre, emoji: r.emoji, role: 'lunchbox', minutes: r.minutes, cuisson: r.cuisson, conservationJours: r.conservationJours || 2, conservation: r.conservation, jours: [] });
    }
    repartirLunchBoxes(preparations, joursOuvres);
    for (const p of preparations) {
      const r = recetteParId(etat, p.recetteId);
      p.portions = 2 * p.jours.length;
      for (const j of p.jours) {
        s.repas[j].midi = repasDepuis(r, 'lunchbox', { sousTitre: sousTitreLunchBox(etat), enfant: 'cantine', badges: Array.from(new Set(r.badges.concat(['lunchbox']))), congele: !!p.congeler });
      }
    }

    // 3. Une base pour les dîners, cuisinée aussi le dimanche et réchauffée 1 à 2 soirs.
    const bases = recettes.filter(r => r.creneau === 'soir' && r.badges.includes('batch') && r.badges.includes('rechauffer') && !r.badges.includes('plaisir'));
    const base = tirerRecette(etat, bases, ctx, hasard, utilises);
    const soirsRechauffes = [];
    if (base) {
      utilises.add(base.id);
      const nb = hasard() < 0.5 ? 1 : 2;
      const possibles = joursOuvres.filter((j, i) => i + 1 <= (base.conservationJours || 2));
      const choisis = possibles.length ? [possibles[Math.min(1, possibles.length - 1)]] : [];
      if (nb === 2 && possibles.length > 2) choisis.push(possibles[possibles.length - 1]);
      for (const j of choisis) {
        soirsRechauffes.push(j);
        s.repas[j].soir = repasDepuis(base, 'rechauffer', { sousTitre: 'Préparé le dimanche · à réchauffer', minutes: 10, badges: Array.from(new Set(base.badges.concat(['rechauffer']))) });
      }
      preparations.push({ recetteId: base.id, titre: base.titre, emoji: base.emoji, role: 'diner', minutes: base.minutes, cuisson: base.cuisson, conservationJours: base.conservationJours || 2, conservation: base.conservation, jours: choisis, portions: 3 * Math.max(1, choisis.length) });
    }

    // 4. Dîners rapides en semaine : ≤ temps max, protéines variées, au moins 2 approuvés enfant.
    const rapides = recettes.filter(r => r.creneau === 'soir' && r.minutes <= tempsMax && !r.badges.includes('plaisir'));
    let derniereProteine = null;
    let enfantOk = 0;
    for (const j of joursOuvres) {
      if (s.repas[j].soir) { derniereProteine = base ? base.proteine : null; if (base && base.badges.includes('enfant')) enfantOk++; continue; }
      let cands = rapides.filter(r => r.proteine !== derniereProteine);
      const restantsSansSoir = joursOuvres.filter(x => x >= j && !s.repas[x].soir).length;
      if (enfantOk < 2 && restantsSansSoir <= 2 - enfantOk) cands = cands.filter(r => r.badges.includes('enfant'));
      if (!cands.filter(r => !utilises.has(r.id)).length) cands = rapides;
      const r = tirerRecette(etat, cands, ctx, hasard, utilises) || tirerRecette(etat, rapides, ctx, hasard, new Set());
      if (!r) continue;
      utilises.add(r.id); derniereProteine = r.proteine;
      if (r.badges.includes('enfant')) enfantOk++;
      s.repas[j].soir = repasDepuis(r);
    }

    // 5. Week-end : quatre repas familiaux, plus élaborés, avec un repas plaisir.
    const weekend = jours.filter(j => U.estWeekend(j));
    const creneauxWE = [];
    for (const j of weekend) { creneauxWE.push([j, 'midi']); creneauxWE.push([j, 'soir']); }
    const elabores = recettes.filter(r => r.creneau !== 'matin' && r.minutes <= 60);
    const plaisirs = elabores.filter(r => r.badges.includes('plaisir'));
    const nbPlaisirs = Math.max(0, Math.min(reglages.tolerancePlaisir != null ? reglages.tolerancePlaisir : 1, creneauxWE.length));
    const indexPlaisir = new Set();
    while (indexPlaisir.size < nbPlaisirs && plaisirs.length) {
      indexPlaisir.add(Math.floor(hasard() * creneauxWE.length));
    }
    creneauxWE.forEach(([j, c], i) => {
      let r;
      if (indexPlaisir.has(i)) r = tirerRecette(etat, plaisirs, ctx, hasard, utilises) || tirerRecette(etat, plaisirs, ctx, hasard, new Set());
      if (!r) {
        let cands = elabores.filter(x => !x.badges.includes('plaisir') && x.proteine !== derniereProteine);
        if (j === jourBatch) cands = cands.filter(x => x.minutes <= 30); // le jour du batch, on garde les repas simples
        r = tirerRecette(etat, cands, ctx, hasard, utilises) || tirerRecette(etat, elabores.filter(x => !x.badges.includes('plaisir')), ctx, hasard, utilises);
      }
      if (!r) return;
      utilises.add(r.id); derniereProteine = r.proteine;
      s.repas[j][c] = repasDepuis(r, 'recette', r.badges.includes('plaisir') ? { sousTitre: 'Repas plaisir' } : {});
    });

    // 6. La session de batch cooking.
    s.batch = { date: jourBatch, preparations, soirsRechauffes };
    planBatch(s);
    s.modifieLe = s.generee;
    return s;
  }

  // Ordonne la production du dimanche : le Cookeo et l'air fryer tournent en parallèle, le four ensuite.
  function planBatch(s) {
    if (!s.batch) return null;
    const preps = s.batch.preparations;
    const ordre = ['cookeo', 'airfryer', 'four', 'plaques', 'aucun'];
    const parMode = {};
    for (const p of preps) (parMode[p.cuisson] = parMode[p.cuisson] || []).push(p);
    for (const m of Object.keys(parMode)) parMode[m].sort((a, b) => b.minutes - a.minutes);
    const etapes = [];
    let numero = 1;
    etapes.push({ numero: numero++, texte: 'Sortir les contenants, préparer et laver les légumes de toutes les préparations.', duree: 15 });
    const files = ordre.filter(m => parMode[m]);
    let premier = true;
    const maxTours = Math.max(...files.map(m => parMode[m].length), 0);
    for (let tour = 0; tour < maxTours; tour++) {
      for (const mode of files) {
        const p = parMode[mode][tour];
        if (!p) continue;
        const appareil = CUISSONS[mode] || mode;
        const debut = premier ? 'Lancer' : tour > 0 ? 'Dès que ' + (mode === 'four' ? 'le four' : mode === 'plaques' ? 'une plaque' : 'l\u2019appareil') + ' est libre, lancer' : 'Pendant ce temps, lancer';
        const texte = mode === 'aucun'
          ? 'Assembler ' + p.titre + ' (' + p.minutes + ' min, sans cuisson).'
          : debut + ' ' + p.titre + ' — ' + appareil + ', ' + p.minutes + ' min.';
        etapes.push({ numero: numero++, texte, duree: p.minutes, recetteId: p.recetteId, appareil });
        premier = false;
      }
    }
    etapes.push({ numero: numero++, texte: 'Laisser refroidir 20 min, répartir dans les boîtes, coller les étiquettes.', duree: 20 });
    const congeler = preps.filter(p => p.congeler);
    if (congeler.length) etapes.push({ numero: numero++, texte: 'Congeler les boîtes de fin de semaine (' + congeler.map(p => p.titre).join(', ') + ') ; les sortir la veille au soir.', duree: 5 });
    const contenants = [];
    for (const p of preps) {
      for (const j of p.jours) {
        contenants.push({
          jour: j, titre: p.titre, emoji: p.emoji,
          nombre: p.role === 'lunchbox' ? 2 : 1,
          libelle: p.role === 'lunchbox' ? '2 boîtes individuelles (adultes)' : '1 plat familial',
          etiquette: U.majuscule(U.nomJour(j)) + ' · ' + p.titre + (p.role === 'lunchbox' ? ' · lunch box' : ' · dîner'),
          congeler: !!p.congeler && (U.joursEntre(s.batch.date, j) > p.conservationJours),
        });
      }
    }
    contenants.sort((a, b) => a.jour.localeCompare(b.jour));
    const dureeParallele = Math.max(0, ...files.map(m => parMode[m].reduce((t, p) => t + p.minutes, 0)));
    s.batch.etapes = etapes;
    s.batch.contenants = contenants;
    s.batch.dureeEstimee = 15 + dureeParallele + 20;
    return s.batch;
  }

  // Remplace un repas par une autre idée compatible avec le créneau.
  function autreIdee(etat, s, date, creneau, graine) {
    const hasard = U.alea(graine);
    const recettes = toutesRecettes(etat);
    const ctx = { lundi: s.lundi, recentes: recentes(etat, s.lundi, 2) };
    const actuel = s.repas[date][creneau];
    const utilises = new Set();
    for (const j of Object.keys(s.repas)) for (const c of CRENEAUX) { const r = s.repas[j][c]; if (r && r.recetteId) utilises.add(r.recetteId); }
    let cands;
    if (creneau === 'matin') cands = recettes.filter(r => r.creneau === 'matin');
    else if (actuel && actuel.type === 'lunchbox') cands = recettes.filter(r => r.badges.includes('lunchbox') && r.creneau !== 'matin');
    else if (!U.estWeekend(date) && creneau === 'soir') cands = recettes.filter(r => r.creneau === 'soir' && r.minutes <= (etat.reglages.tempsMaxSemaine || 25) && !r.badges.includes('plaisir'));
    else cands = recettes.filter(r => r.creneau !== 'matin' && r.minutes <= 60);
    let r = tirerRecette(etat, cands, ctx, hasard, utilises);
    if (!r) r = tirerRecette(etat, cands, ctx, hasard, new Set(actuel ? [actuel.recetteId] : []));
    if (!r) return null;
    if (actuel && actuel.type === 'lunchbox') {
      // La nouvelle préparation rejoint le batch du dimanche pour ce jour-là.
      s.repas[date][creneau] = repasDepuis(r, 'lunchbox', { sousTitre: sousTitreLunchBox(etat), enfant: 'cantine', badges: Array.from(new Set(r.badges.concat(['lunchbox']))) });
      if (s.batch) {
        for (const p of s.batch.preparations) p.jours = p.jours.filter(j => j !== date);
        s.batch.preparations = s.batch.preparations.filter(p => p.jours.length);
        let p = s.batch.preparations.find(x => x.recetteId === r.id);
        if (!p) { p = { recetteId: r.id, titre: r.titre, emoji: r.emoji, role: 'lunchbox', minutes: r.minutes, cuisson: r.cuisson, conservationJours: r.conservationJours || 2, conservation: r.conservation, jours: [] }; s.batch.preparations.push(p); }
        p.jours.push(date); p.jours.sort();
        for (const q of s.batch.preparations) q.portions = q.role === 'lunchbox' ? 2 * q.jours.length : 3 * q.jours.length;
        planBatch(s);
      }
    } else {
      if (actuel && actuel.type === 'rechauffer' && s.batch) {
        const p = s.batch.preparations.find(x => x.role === 'diner' && x.recetteId === actuel.recetteId);
        if (p) { p.jours = p.jours.filter(j => j !== date); if (!p.jours.length) s.batch.preparations = s.batch.preparations.filter(x => x !== p); else p.portions = 3 * p.jours.length; planBatch(s); }
      }
      s.repas[date][creneau] = repasDepuis(r, 'recette', r.badges.includes('plaisir') ? { sousTitre: 'Repas plaisir' } : {});
    }
    toucherSemaine(s);
    return s.repas[date][creneau];
  }

  function placerRecette(etat, s, date, creneau, recetteId) {
    const r = recetteParId(etat, recetteId);
    if (!r) return null;
    s.repas[date][creneau] = repasDepuis(r);
    toucherSemaine(s);
    return s.repas[date][creneau];
  }

  // Échange deux repas du même créneau entre deux jours.
  function deplacerRepas(s, dateA, creneau, dateB) {
    const a = s.repas[dateA][creneau], b = s.repas[dateB][creneau];
    s.repas[dateA][creneau] = b;
    s.repas[dateB][creneau] = a;
    if (s.batch) {
      for (const p of s.batch.preparations) p.jours = p.jours.map(j => j === dateA ? '__' : j === dateB ? dateA : j).map(j => j === '__' ? dateB : j).sort();
      planBatch(s);
    }
    toucherSemaine(s);
  }

  function ingredientsRecette(recette, portions) {
    const facteur = (portions || recette.portions || 3) / (recette.portions || 3);
    return recette.ingredients.map(i => ({ nom: i.nom, qte: i.qte != null ? Math.round(i.qte * facteur * 100) / 100 : null, unite: i.unite }));
  }
  function cumuler(liste) {
    const res = [];
    for (const ing of liste) {
      const cle = U.racineMot(ing.nom) + '|' + (ing.unite || '');
      const e = res.find(x => x.cle === cle);
      if (e) { if (ing.qte != null) e.qte = (e.qte || 0) + ing.qte; }
      else res.push({ cle, nom: ing.nom, qte: ing.qte, unite: ing.unite });
    }
    return res.map(({ nom, qte, unite }) => ({ nom, qte: arrondir(qte, unite), unite }));
  }
  // Quantités lisibles en magasin : grammes et millilitres à la dizaine, pièces entières, cuillères à la demi.
  function arrondir(qte, unite) {
    if (qte == null) return null;
    const u = U.normaliser(unite || '');
    if (u === 'g' || u === 'ml') return qte <= 50 ? Math.ceil(qte / 5) * 5 : Math.ceil(qte / 10) * 10;
    if (/piece|tranche|boite|botte|gousse|sachet|pot|bouteille/.test(u) || !u) return Math.ceil(qte - 0.001);
    if (/c a soupe|c a cafe|cuillere|pincee/.test(u)) return Math.ceil(qte * 2) / 2;
    return Math.round(qte * 100) / 100;
  }
  // Tous les ingrédients de la semaine, aux bonnes quantités (3 personnes, lunch boxes pour 2 adultes par jour).
  function ingredientsSemaine(etat, s) {
    const tout = [];
    const dejaBatch = new Set();
    if (s.batch) for (const p of s.batch.preparations) {
      const r = recetteParId(etat, p.recetteId);
      if (r) { tout.push(...ingredientsRecette(r, p.portions || 3)); dejaBatch.add(p.recetteId); }
    }
    for (const j of Object.keys(s.repas)) for (const c of CRENEAUX) {
      const rep = s.repas[j][c];
      if (!rep || !rep.recetteId) continue;
      if ((rep.type === 'lunchbox' || rep.type === 'rechauffer') && dejaBatch.has(rep.recetteId)) continue;
      const r = recetteParId(etat, rep.recetteId);
      if (r) tout.push(...ingredientsRecette(r, 3));
    }
    return cumuler(tout);
  }

  MaTable.Menus = {
    CRENEAUX, NOMS_CRENEAU, CUISSONS, BADGES, toutesRecettes, recetteParId, enregistrerRecette, semaineVide, semaine, poids, avisPour,
    genererSemaine, planBatch, autreIdee, toucherSemaine, placerRecette, deplacerRepas, ingredientsRecette, ingredientsSemaine, cumuler, arrondir, repartirLunchBoxes, nomEnfant,
  };
})(typeof window !== 'undefined' ? window : globalThis);
