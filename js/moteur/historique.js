// Historique et mémoire : chaque semaine reste archivée, les avis pilotent les propositions,
// et l'on peut rejouer une semaine passée. Rien n'est jamais supprimé.
(function (racine) {
  const MaTable = racine.MaTable = racine.MaTable || {};
  const U = MaTable.util;
  const M = () => MaTable.Menus;
  const C = () => MaTable.Courses;

  function repasDeSemaine(s) {
    const res = [];
    for (const j of Object.keys(s.repas).sort()) for (const c of M().CRENEAUX) { const r = s.repas[j][c]; if (r) res.push({ date: j, creneau: c, repas: r }); }
    return res;
  }
  // Le dernier avis donné sur un repas (à égalité d'instant, le plus récemment enregistré).
  function avisDe(etat, date, creneau) {
    let dernier = null;
    for (const a of (etat.avis || [])) {
      if (a.date !== date || a.creneau !== creneau) continue;
      if (!dernier || (a.quand || '') >= (dernier.quand || '')) dernier = a;
    }
    return dernier;
  }
  // Noter un repas passé : « On refait », « Bof », « Jamais plus » et la réaction de l'enfant.
  function noter(etat, { date, creneau, note, enfant, commentaire }) {
    const s = etat.semaines[U.lundiDe(date)];
    const repas = s && s.repas[date] ? s.repas[date][creneau] : null;
    const precedent = avisDe(etat, date, creneau);
    const avis = {
      id: U.idUnique('avis'), date, creneau,
      recetteId: repas ? repas.recetteId : (precedent ? precedent.recetteId : null),
      titre: repas ? repas.titre : (precedent ? precedent.titre : ''),
      note: note !== undefined ? note : (precedent ? precedent.note : null),
      enfant: enfant !== undefined ? enfant : (precedent ? precedent.enfant : null),
      commentaire: commentaire !== undefined ? commentaire : (precedent ? precedent.commentaire : null),
      quand: new Date().toISOString(),
    };
    etat.avis.push(avis);
    return avis;
  }

  function depensesParMagasin(etat, lundi) {
    const fin = U.ajouterJours(lundi, 6);
    const res = {};
    for (const a of etat.achats) {
      if (a.date < lundi || a.date > fin) continue;
      res[a.magasin] = res[a.magasin] || { montant: 0, articles: 0, renseigne: false };
      if (a.montant != null) { res[a.magasin].montant += a.montant; res[a.magasin].renseigne = true; }
      res[a.magasin].articles += a.articles.length;
    }
    return res;
  }

  function resumeSemaine(etat, lundi) {
    const s = etat.semaines[lundi];
    const repas = s ? repasDeSemaine(s) : [];
    const maison = repas.filter(r => r.repas.recetteId && r.repas.type !== 'cantine');
    const plaisirs = repas.filter(r => r.repas.badges && r.repas.badges.includes('plaisir')).length;
    const lunchBoxes = repas.filter(r => r.repas.type === 'lunchbox').length;
    const avis = (etat.avis || []).filter(a => U.lundiDe(a.date) === lundi);
    const refaits = new Set(avis.filter(a => a.note === 'refait').map(a => a.date + a.creneau)).size;
    const depenses = depensesParMagasin(etat, lundi);
    const total = Object.values(depenses).reduce((t, d) => t + d.montant, 0);
    const renseigne = Object.values(depenses).some(d => d.renseigne);
    return { lundi, libelle: U.libelleSemaine(lundi), existe: !!s, repasMaison: maison.length, plaisirs, lunchBoxes, refaits, avis: avis.length, depenses, total, depensesRenseignees: renseigne, notes: s ? s.notes : '' };
  }

  // Toutes les semaines connues (menus ou achats), de la plus récente à la plus ancienne.
  function semainesConnues(etat) {
    const lundis = new Set(Object.keys(etat.semaines));
    for (const a of etat.achats) lundis.add(U.lundiDe(a.date));
    for (const a of etat.avis) lundis.add(U.lundiDe(a.date));
    return Array.from(lundis).sort().reverse();
  }

  function reutiliserSemaine(etat, lundiSource, lundiCible) {
    const src = etat.semaines[lundiSource];
    if (!src) return null;
    const cible = M().semaineVide(lundiCible);
    const joursSrc = Object.keys(src.repas).sort();
    const joursCible = U.joursSemaine(lundiCible);
    joursSrc.forEach((j, i) => {
      for (const c of M().CRENEAUX) cible.repas[joursCible[i]][c] = src.repas[j][c] ? JSON.parse(JSON.stringify(src.repas[j][c])) : null;
    });
    if (src.batch) {
      cible.batch = JSON.parse(JSON.stringify(src.batch));
      cible.batch.date = joursCible[joursSrc.indexOf(src.batch.date)] || joursCible[6];
      for (const p of cible.batch.preparations) p.jours = p.jours.map(j => joursCible[joursSrc.indexOf(j)]).filter(Boolean);
      cible.batch.soirsRechauffes = (cible.batch.soirsRechauffes || []).map(j => joursCible[joursSrc.indexOf(j)]).filter(Boolean);
      M().planBatch(cible);
    }
    cible.generee = new Date().toISOString();
    cible.copieDe = lundiSource;
    etat.semaines[lundiCible] = cible;
    return cible;
  }

  function rechercher(etat, texte) {
    const t = U.normaliser(texte);
    if (!t) return [];
    const res = [];
    for (const lundi of Object.keys(etat.semaines)) {
      for (const r of repasDeSemaine(etat.semaines[lundi])) {
        if (U.normaliser(r.repas.titre).includes(t)) res.push({ type: 'repas', date: r.date, creneau: r.creneau, titre: r.repas.titre, emoji: r.repas.emoji, lundi });
      }
    }
    for (const a of etat.achats) for (const art of a.articles) {
      if (U.normaliser(art.nom).includes(t)) res.push({ type: 'achat', date: a.date, magasin: a.magasin, titre: art.nom, lundi: U.lundiDe(a.date) });
    }
    return res.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 60);
  }

  // Statistiques sur les derniers mois.
  function statistiques(etat, mois) {
    const depuis = U.iso(new Date(Date.now() - (mois || 3) * 30.5 * 86400000));
    const freq = {};
    const maisonParSemaine = [];
    for (const lundi of Object.keys(etat.semaines).sort()) {
      if (lundi < U.lundiDe(depuis)) continue;
      const repas = repasDeSemaine(etat.semaines[lundi]);
      maisonParSemaine.push({ lundi, maison: repas.filter(r => r.repas.recetteId).length });
      for (const r of repas) { if (!r.repas.recetteId) continue; const f = freq[r.repas.titre] = freq[r.repas.titre] || { titre: r.repas.titre, emoji: r.repas.emoji, fois: 0 }; f.fois++; }
    }
    const articles = {};
    const parEnseigne = {};
    for (const a of etat.achats) {
      if (a.date < depuis) continue;
      for (const art of a.articles) { const k = U.racineMot(art.nom); articles[k] = articles[k] || { nom: art.nom, fois: 0 }; articles[k].fois++; }
      const e = parEnseigne[a.magasin] = parEnseigne[a.magasin] || { magasin: a.magasin, montant: 0, passages: 0 };
      e.passages++; if (a.montant != null) e.montant += a.montant;
    }
    const notes = { refait: 0, bof: 0, jamais: 0 };
    const reactions = { adore: 0, goute: 0, refuse: 0 };
    const vus = new Set();
    for (const a of etat.avis.slice().sort((x, y) => (y.quand || '').localeCompare(x.quand || ''))) {
      const k = a.date + a.creneau; if (vus.has(k) || a.date < depuis) continue; vus.add(k);
      if (a.note && notes[a.note] != null) notes[a.note]++;
      if (a.enfant && reactions[a.enfant] != null) reactions[a.enfant]++;
    }
    return {
      depuis,
      recettes: Object.values(freq).sort((a, b) => b.fois - a.fois).slice(0, 10),
      articles: Object.values(articles).sort((a, b) => b.fois - a.fois).slice(0, 10),
      maisonParSemaine,
      parEnseigne: Object.values(parEnseigne).sort((a, b) => b.montant - a.montant),
      notes, reactions,
    };
  }

  // Le tableau de bord bienveillant : ce qui compose la semaine, sans calories.
  function tableauDeBord(etat, lundi) {
    const s = etat.semaines[lundi];
    const vide = { legumes: 0, proteinesMaigres: 0, feculentsComplets: 0, plaisirs: 0, total: 0, repasMaison: 0, lunchBoxes: 0, enfant: 0 };
    if (!s) return Object.assign(vide, { existe: false, message: 'Pas encore de menus pour cette semaine.' });
    const r = Object.assign({}, vide, { existe: true });
    const vus = new Set();
    for (const { date, creneau, repas } of repasDeSemaine(s)) {
      if (!repas.recetteId) continue;
      const rec = M().recetteParId(etat, repas.recetteId);
      if (!rec) continue;
      r.total++; r.repasMaison++;
      if (repas.type === 'lunchbox' && !vus.has(date)) { r.lunchBoxes++; vus.add(date); }
      const texte = U.normaliser(rec.ingredients.map(i => i.nom).join(' '));
      if (/courgette|carotte|brocoli|epinard|poivron|tomate|aubergine|potimarron|poireau|champignon|salade|concombre|petits pois|chou|legume|patate douce|haricot vert/.test(texte)) r.legumes++;
      if (/poulet|dinde|saumon|cabillaud|colin|thon|oeuf|lentille|pois chiche|haricot rouge|tofu|fromage blanc|yaourt/.test(texte) || rec.badges.includes('leger')) r.proteinesMaigres++;
      if (/complet|quinoa|boulgour|avoine|sarrasin|lentille|pois chiche|patate douce/.test(texte)) r.feculentsComplets++;
      if (rec.badges.includes('plaisir')) r.plaisirs++;
      if (rec.badges.includes('enfant')) r.enfant++;
    }
    const prec = etat.semaines[U.ajouterJours(lundi, -7)];
    let tendance = null;
    if (prec) {
      const avant = repasDeSemaine(prec).filter(x => x.repas.recetteId).length;
      tendance = r.repasMaison >= avant ? 'stable ou en hausse' : 'un peu moins de maison que la semaine passée';
    }
    r.tendance = tendance;
    r.message = r.total === 0 ? 'Pas encore de menus pour cette semaine.'
      : r.legumes >= r.total * 0.6 ? 'Belle semaine, riche en légumes.'
        : r.legumes >= r.total * 0.4 ? 'Semaine équilibrée : un ou deux légumes de plus et ce sera parfait.'
          : 'Une semaine douce ; on pourra glisser plus de légumes la prochaine fois.';
    return r;
  }

  function csvLigne(vals) {
    return vals.map(v => { const s = v == null ? '' : String(v); return /[";\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }).join(';');
  }
  // Export CSV (séparateur point-virgule, BOM UTF-8 : s'ouvre directement dans Excel ou Numbers en français).
  function csv(etat) {
    const BOM = '﻿';
    const repas = [csvLigne(['Date', 'Créneau', 'Repas', 'Type', 'Minutes', 'Badges', 'Avis', 'Réaction enfant'])];
    for (const lundi of Object.keys(etat.semaines).sort()) for (const r of repasDeSemaine(etat.semaines[lundi])) {
      const a = avisDe(etat, r.date, r.creneau);
      repas.push(csvLigne([U.dateFr(r.date), M().NOMS_CRENEAU[r.creneau], r.repas.titre, r.repas.type, r.repas.minutes, (r.repas.badges || []).join(', '), a ? a.note : '', a ? a.enfant : '']));
    }
    const achats = [csvLigne(['Date', 'Magasin', 'Article', 'Quantité', 'Unité', 'Rayon', 'Montant du passage'])];
    for (const a of etat.achats.slice().sort((x, y) => x.date.localeCompare(y.date))) for (const art of a.articles) {
      achats.push(csvLigne([U.dateFr(a.date), C().nomMagasin(a.magasin), art.nom, art.qte, art.unite, art.rayon, a.montant]));
    }
    return { repas: BOM + repas.join('\n'), achats: BOM + achats.join('\n') };
  }

  MaTable.Historique = { repasDeSemaine, avisDe, noter, resumeSemaine, semainesConnues, reutiliserSemaine, rechercher, statistiques, tableauDeBord, csv, depensesParMagasin };
})(typeof window !== 'undefined' ? window : globalThis);
