// Écran Historique : les semaines archivées, la notation des repas, le tableau de bord et les statistiques.
(function (racine) {
  const MaTable = racine.MaTable;
  const U = MaTable.util, H = MaTable.Historique, M = MaTable.Menus, C = MaTable.Courses;
  const { el, feuille, toast, confirmer, vide, segments, sauver, sauverDoucement, vibrer, telecharger } = MaTable.ui;
  const E = () => MaTable.Stockage.etat;
  const app = () => MaTable.app;
  const NOTES = [['refait', '👍 On refait'], ['bof', '😐 Bof'], ['jamais', '🚫 Jamais plus']];
  const REACTIONS = [['adore', '😍 A adoré'], ['goute', '🙂 A goûté'], ['refuse', '🙅 A refusé']];

  function monter(conteneur, params) {
    const onglet = params.onglet || 'semaines';
    conteneur.append(el('div', 'entete', el('div', {}, el('div', 'sur-titre', 'Ma Table'), el('h1', {}, 'Historique'))));
    if (onglet === 'semaines' && params.lundi) return monterSemaine(conteneur, params.lundi);
    conteneur.append(segments([{ id: 'semaines', libelle: 'Semaines' }, { id: 'tableau', libelle: 'Tableau de bord' }, { id: 'stats', libelle: 'Statistiques' }], onglet, id => app().aller('historique', { onglet: id })));
    if (onglet === 'tableau') return monterTableau(conteneur, params);
    if (onglet === 'stats') return monterStats(conteneur, params);
    monterListe(conteneur, params);
  }

  function monterListe(conteneur, params) {
    const etat = E();
    const champ = el('input', { type: 'search', placeholder: 'Rechercher un plat, un article…', value: params.q || '', 'aria-label': 'Rechercher dans l’historique', oninput: ev => { clearTimeout(champ._t); champ._t = setTimeout(() => app().parametrer({ q: ev.target.value }), 250); } });
    conteneur.append(el('div', 'champ', champ));
    if (params.q) {
      const res = H.rechercher(etat, params.q);
      if (!res.length) conteneur.append(el('p', 'sous centre', 'Rien trouvé pour « ' + params.q + ' ».'));
      else conteneur.append(el('div', 'carte', el('ul', 'liste', res.map(r => el('li', {}, el('span', 'ico', r.type === 'repas' ? (r.emoji || '🍽️') : '🧺'), el('button', { class: 'pousse', style: 'text-align:left;background:none;border:0;padding:0;min-height:44px', onclick: () => app().aller('historique', { onglet: 'semaines', lundi: r.lundi }) }, el('div', 'gras', r.titre), el('div', 'petit', U.dateLongue(r.date) + (r.type === 'repas' ? ' · ' + M.NOMS_CRENEAU[r.creneau] : ' · ' + C.nomMagasin(r.magasin)))))))));
      return;
    }
    const courant = U.lundiDe(U.aujourdhui());
    const lundis = H.semainesConnues(etat);
    if (!lundis.includes(courant)) lundis.unshift(courant);
    lundis.sort().reverse();
    if (lundis.length === 1 && !etat.semaines[courant]) {
      conteneur.append(vide({ emoji: '📖', titre: 'L’histoire commence', texte: 'Chaque semaine s’archive toute seule : menus, listes, achats, notes. Vous pourrez noter les repas et rejouer une bonne semaine.', action: { libelle: 'Proposer ma semaine', action: () => app().aller('menus', {}) } }));
      return;
    }
    for (const l of lundis) {
      const r = H.resumeSemaine(etat, l);
      conteneur.append(el('button', { class: 'carte', style: 'width:100%;text-align:left;border:0;display:block', onclick: () => app().aller('historique', { onglet: 'semaines', lundi: l }) },
        el('div', 'carte-titre', el('h3', {}, U.majuscule(U.libelleSemaine(l))), el('span', 'petit', l === courant ? 'en cours' : '')),
        el('div', 'chiffres', el('div', 'chiffre', el('b', {}, r.repasMaison), el('span', {}, 'repas maison')), el('div', 'chiffre', el('b', {}, r.lunchBoxes), el('span', {}, 'lunch boxes')), el('div', 'chiffre', el('b', {}, r.depensesRenseignees ? U.euros(r.total) : (Object.keys(r.depenses).length ? Object.keys(r.depenses).length : '–')), el('span', {}, r.depensesRenseignees ? 'dépensés' : 'passages'))),
        el('div', 'petit', [r.plaisirs ? U.pluriel(r.plaisirs, 'repas plaisir', 'repas plaisir') : null, r.refaits ? r.refaits + ' « on refait »' : null, Object.keys(r.depenses).map(m => C.emojiMagasin(m) + ' ' + C.nomMagasin(m) + (r.depenses[m].renseigne ? ' ' + U.euros(r.depenses[m].montant) : '')).join(' · ')].filter(Boolean).join(' · '))));
    }
  }

  function boutonsAvis(date, creneau, apresChangement) {
    const etat = E();
    const a = H.avisDe(etat, date, creneau);
    const enfant = M.nomEnfant(etat);
    const groupe = (liste, cle) => el('div', 'avis-boutons', liste.map(([v, l]) => el('button', { class: 'puce', 'aria-pressed': String(!!a && a[cle] === v), onclick: () => { const val = a && a[cle] === v ? null : v; H.noter(etat, Object.assign({ date, creneau }, { [cle]: val })); sauverDoucement(); vibrer(); if (apresChangement) apresChangement(); } }, l)));
    return el('div', {}, groupe(NOTES, 'note'), el('div', 'minuscule', { style: 'margin-top:6px' }, (enfant || 'L’enfant') + ' :'), groupe(REACTIONS, 'enfant'));
  }

  function noter(date, creneau) {
    const etat = E();
    const s = etat.semaines[U.lundiDe(date)];
    const rep = s && s.repas[date] ? s.repas[date][creneau] : null;
    const f = feuille({ titre: rep ? rep.emoji + ' ' + rep.titre : 'Noter ce repas',
      contenu: (corps) => { const zone = el('div', {}); const rendre = () => { zone.innerHTML = ''; zone.append(el('p', 'petit', U.majuscule(U.dateLongue(date)) + ' · ' + M.NOMS_CRENEAU[creneau]), el('div', 'espace'), boutonsAvis(date, creneau, rendre)); }; rendre(); return zone; },
      actions: [{ libelle: 'Fermer', classe: 'principal', action: () => { if (app()) app().rafraichir(); } }] });
    return f;
  }

  function monterSemaine(conteneur, lundi) {
    const etat = E();
    const s = etat.semaines[lundi];
    const courant = U.lundiDe(U.aujourdhui());
    const r = H.resumeSemaine(etat, lundi);
    conteneur.prepend(el('div', 'ligne', el('button', { class: 'btn', onclick: () => app().aller('historique', { onglet: 'semaines' }) }, '‹ Semaines')));
    conteneur.append(el('h2', { style: 'margin:8px 0' }, U.majuscule(U.libelleSemaine(lundi))));
    conteneur.append(el('div', 'chiffres', el('div', 'chiffre', el('b', {}, r.repasMaison), el('span', {}, 'repas maison')), el('div', 'chiffre', el('b', {}, r.lunchBoxes), el('span', {}, 'lunch boxes')), el('div', 'chiffre', el('b', {}, r.plaisirs), el('span', {}, 'plaisirs'))));
    conteneur.append(el('div', 'boutons',
      el('button', { class: 'btn principal', onclick: () => app().aller('menus', { lundi }) }, '🗓️ Voir dans Menus'),
      s && lundi !== courant ? el('button', { class: 'btn chaud', onclick: async () => {
        const c = etat.semaines[courant];
        const occupe = c && Object.values(c.repas).some(j => j.matin || j.midi || j.soir);
        if (occupe && !(await confirmer('Les menus de la semaine en cours seront remplacés par cette semaine-là. Voulez-vous continuer ?', { ok: 'Réutiliser' }))) return;
        H.reutiliserSemaine(etat, lundi, courant);
        const ings = M.ingredientsSemaine(etat, etat.semaines[courant]);
        const res = C.ajouterIngredients(etat.liste, ings, { preferencesMagasin: etat.preferencesMagasin, magasins: etat.reglages.magasins }, etat.gardeManger, 'semaine ' + courant);
        sauverDoucement(); app().aller('menus', {}); toast('Semaine recopiée · ' + U.pluriel(res.ajoutes.length, 'article ajouté', 'articles ajoutés') + ' à la liste.');
      } }, '🔁 Réutiliser cette semaine') : null));
    if (s) {
      const zoneRepas = el('div', {});
      const rendre = () => {
        zoneRepas.innerHTML = '';
        for (const j of Object.keys(s.repas).sort()) {
          const repasJour = M.CRENEAUX.filter(c => s.repas[j][c]);
          if (!repasJour.length) continue;
          zoneRepas.append(el('section', 'carte', el('h3', { style: 'text-transform:capitalize' }, U.dateLongue(j)),
            repasJour.map(c => { const rep = s.repas[j][c]; return el('div', { style: 'padding:8px 0;border-top:1px solid var(--bordure)' }, el('div', 'ligne', el('span', 'ico', rep.emoji || '🍽️'), el('div', 'pousse', el('div', 'gras', rep.titre), el('div', 'petit', M.NOMS_CRENEAU[c] + (rep.sousTitre ? ' · ' + rep.sousTitre : ''))), rep.recetteId ? el('button', { class: 'btn petit-btn', onclick: () => app().aller('menus', { vue: 'recette', id: rep.recetteId, lundi }) }, 'Recette') : null),
                rep.recetteId && j <= U.aujourdhui() ? boutonsAvis(j, c, rendre) : null); })));
        }
      };
      rendre();
      conteneur.append(zoneRepas);
      const notes = el('textarea', { value: s.notes || '', placeholder: 'Notes de la semaine : ce qui a marché, ce qu’on change…', 'aria-label': 'Notes', oninput: ev => { s.notes = ev.target.value; M.toucherSemaine(s); clearTimeout(notes._t); notes._t = setTimeout(sauverDoucement, 400); } });
      conteneur.append(el('div', 'carte', el('h3', {}, '📝 Notes'), notes));
    } else conteneur.append(el('div', 'carte', el('p', 'sous', 'Pas de menus enregistrés cette semaine-là.')));
    const achats = etat.achats.filter(a => U.lundiDe(a.date) === lundi).sort((a, b) => a.date.localeCompare(b.date));
    conteneur.append(el('div', 'carte', el('h3', {}, '🧺 Courses de la semaine'), !achats.length ? el('p', 'sous', 'Aucun passage en magasin terminé cette semaine-là.') :
      el('ul', 'liste', achats.map(a => el('li', {}, el('span', 'ico', C.emojiMagasin(a.magasin)), el('button', { class: 'pousse', style: 'text-align:left;background:none;border:0;padding:0;min-height:44px', onclick: () => feuille({ titre: C.nomMagasin(a.magasin) + ' · ' + U.dateFr(a.date), contenu: el('ul', 'liste', a.articles.map(x => el('li', {}, el('span', 'pousse', x.nom), el('span', 'petit', U.formaterQte(x.qte, x.unite))))) }) }, el('div', 'gras', C.nomMagasin(a.magasin) + ' · ' + U.nomJour(a.date)), el('div', 'petit', U.pluriel(a.articles.length, 'article') + (a.montant != null ? ' · ' + U.euros(a.montant) : ''))),
        el('button', { class: 'btn petit-btn', 'aria-label': 'Renseigner le montant', onclick: async () => { const v = await MaTable.ui.demander('Montant du ticket', { valeur: a.montant != null ? String(a.montant).replace('.', ',') : '', inputmode: 'decimal', placeholder: '64,50' }); if (v === null) return; const n = v.replace(/\s/g, '').replace(',', '.'); if (n && isNaN(Number(n))) { toast('Le montant doit être un nombre.'); return; } a.montant = n ? Number(n) : null; sauver(); } }, a.montant != null ? '✏️' : '€'))))));
  }

  function monterTableau(conteneur, params) {
    const etat = E();
    const lundi = params.lundi || U.lundiDe(U.aujourdhui());
    const t = H.tableauDeBord(etat, lundi);
    conteneur.append(el('div', 'semaine-nav',
      el('button', { class: 'btn icone', 'aria-label': 'Semaine précédente', onclick: () => app().parametrer({ lundi: U.ajouterJours(lundi, -7) }) }, '‹'),
      el('div', 'titre', U.majuscule(U.libelleSemaine(lundi))),
      el('button', { class: 'btn icone', 'aria-label': 'Semaine suivante', onclick: () => app().parametrer({ lundi: U.ajouterJours(lundi, 7) }) }, '›')));
    if (!t.existe || !t.total) { conteneur.append(vide({ emoji: '🌱', titre: 'Rien à mesurer encore', texte: t.message, action: { libelle: 'Proposer ma semaine', action: () => app().aller('menus', { lundi }) } })); return; }
    const barre = (libelle, n, classe) => el('div', {}, el('div', 'ligne entre', el('span', 'gras', libelle), el('span', 'petit', n + ' / ' + t.total)), el('div', 'barre ' + (classe || ''), el('span', { style: 'width:' + Math.round(100 * n / t.total) + '%' })));
    conteneur.append(el('div', 'carte douce', el('h3', {}, t.message), t.tendance ? el('p', 'petit', 'Tendance : ' + t.tendance + '.') : null));
    conteneur.append(el('div', 'chiffres', el('div', 'chiffre', el('b', {}, t.repasMaison), el('span', {}, 'repas maison')), el('div', 'chiffre', el('b', {}, t.lunchBoxes), el('span', {}, 'lunch boxes')), el('div', 'chiffre', el('b', {}, t.enfant), el('span', {}, 'approuvés enfant'))));
    conteneur.append(el('div', 'carte', el('h3', {}, 'De quoi est faite la semaine'),
      barre('🥦 Repas avec légumes', t.legumes), barre('🐟 Protéines maigres', t.proteinesMaigres), barre('🌾 Féculents complets', t.feculentsComplets, 'ambre'), barre('🍰 Plaisirs', t.plaisirs, 'terracotta'),
      el('p', 'minuscule', 'Aucune calorie ici, volontairement. L’équilibre se joue sur la semaine, pas sur un repas.')));
  }

  function monterStats(conteneur, params) {
    const etat = E();
    const mois = Number(params.mois) || 3;
    const st = H.statistiques(etat, mois);
    conteneur.append(el('div', { class: 'puces', style: 'margin-bottom:14px' }, [1, 3, 6, 12].map(m => el('button', { class: 'puce', 'aria-pressed': String(m === mois), onclick: () => app().parametrer({ mois: m }) }, m === 12 ? '1 an' : m + ' mois'))));
    if (!st.recettes.length && !st.articles.length) { conteneur.append(vide({ emoji: '📊', titre: 'Pas encore de statistiques', texte: 'Elles apparaîtront après quelques semaines de menus et de courses.' })); return; }
    if (st.maisonParSemaine.length) conteneur.append(el('div', 'carte', el('h3', {}, 'Repas maison par semaine'),
      el('div', 'histo', st.maisonParSemaine.slice(-12).map(x => { const max = Math.max(...st.maisonParSemaine.map(y => y.maison), 1); return el('div', { style: 'height:' + Math.round(100 * x.maison / max) + '%', title: U.libelleSemaine(x.lundi) + ' : ' + x.maison }, el('span', {}, U.dateCourte(x.lundi).split(' ')[0])); })), el('div', 'histo-legende')));
    if (st.recettes.length) conteneur.append(el('div', 'carte', el('h3', {}, 'Recettes les plus servies'), el('ul', 'liste', st.recettes.map(r => el('li', {}, el('span', 'ico', r.emoji || '🍽️'), el('span', 'pousse', r.titre), el('span', 'badge', U.pluriel(r.fois, 'fois', 'fois')))))));
    if (st.articles.length) conteneur.append(el('div', 'carte', el('h3', {}, 'Articles les plus achetés'), el('ul', 'liste', st.articles.map(a => el('li', {}, el('span', 'ico', '🧺'), el('span', 'pousse', a.nom), el('span', 'badge', U.pluriel(a.fois, 'fois', 'fois')))))));
    if (st.parEnseigne.length) conteneur.append(el('div', 'carte', el('h3', {}, 'Dépenses par enseigne'), el('ul', 'liste', st.parEnseigne.map(e => el('li', {}, el('span', 'ico', C.emojiMagasin(e.magasin)), el('span', 'pousse', C.nomMagasin(e.magasin), el('div', 'petit', U.pluriel(e.passages, 'passage'))), el('span', 'gras', e.montant ? U.euros(e.montant) : 'montants non renseignés'))))));
    const variations = H.variationsPrix(etat, mois);
    if (variations.length) conteneur.append(el('div', 'carte', el('h3', {}, 'Prix qui ont bougé'), el('p', 'petit', 'D\u2019après vos tickets photographiés.'), el('ul', 'liste', variations.map(v => el('li', {}, el('span', 'ico', v.ecart > 0 ? '📈' : '📉'), el('span', 'pousse', v.nom, el('div', 'petit', U.euros(v.avant) + ' → ' + U.euros(v.apres) + ' · ' + C.nomMagasin(v.magasin))), el('span', { class: 'gras', style: v.ecart > 0 ? 'color:var(--terracotta-fonce)' : 'color:var(--sauge-fonce)' }, (v.ecart > 0 ? '+' : '') + U.euros(v.ecart)))))));
    const total = st.notes.refait + st.notes.bof + st.notes.jamais;
    if (total) conteneur.append(el('div', 'carte', el('h3', {}, 'Vos avis'), el('p', 'sous', st.notes.refait + ' « on refait » · ' + st.notes.bof + ' « bof » · ' + st.notes.jamais + ' « jamais plus »'), el('p', 'sous', (M.nomEnfant(etat) || 'L’enfant') + ' : ' + st.reactions.adore + ' adorés · ' + st.reactions.goute + ' goûtés · ' + st.reactions.refuse + ' refusés')));
    conteneur.append(el('div', 'carte', el('h3', {}, 'Exporter'), el('p', 'petit', 'Deux fichiers CSV, lisibles dans Excel, Numbers ou Google Sheets.'),
      el('div', 'boutons', el('button', { class: 'btn', onclick: () => { const c = H.csv(etat); telecharger('ma-table-repas.csv', c.repas, 'text/csv;charset=utf-8'); } }, 'Repas (CSV)'), el('button', { class: 'btn', onclick: () => { const c = H.csv(etat); telecharger('ma-table-achats.csv', c.achats, 'text/csv;charset=utf-8'); } }, 'Achats (CSV)'))));
  }

  MaTable.ecrans = MaTable.ecrans || {};
  MaTable.ecrans.historique = { monter, noter };
})(typeof window !== 'undefined' ? window : globalThis);
