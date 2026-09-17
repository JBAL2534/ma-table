// Écran Profil : la famille, l'organisation, les magasins, l'option Drive, le suivi du poids privé et les données.
(function (racine) {
  const MaTable = racine.MaTable;
  const U = MaTable.util, C = MaTable.Courses;
  const { el, feuille, menuActions, toast, confirmer, demander, sauver, sauverDoucement, telecharger, partager } = MaTable.ui;
  const E = () => MaTable.Stockage.etat;
  const app = () => MaTable.app;
  const OBJECTIFS = ['Maintenir le poids', 'Plus de légumes', 'Manger varié', 'Moins de sucre', 'Découvrir de nouveaux plats'];

  function monter(conteneur, params) {
    const etat = E();
    conteneur.append(el('div', 'entete', el('div', {}, el('div', 'sur-titre', 'Ma Table'), el('h1', {}, 'Profil'))));
    conteneur.append(carteFamille(etat));
    conteneur.append(carteOrganisation(etat));
    conteneur.append(carteMagasins(etat));
    conteneur.append(carteDrive(etat));
    conteneur.append(carteSynchro(etat));
    conteneur.append(carteIA(etat));
    conteneur.append(cartePoids(etat));
    conteneur.append(carteDonnees(etat));
    conteneur.append(carteAide());
  }

  const toucherReglages = () => { E().reglages.modifieLe = new Date().toISOString(); };
  const champTexte = (libelle, valeur, auChangement, attrs) => el('label', 'champ', el('span', {}, libelle), el('input', Object.assign({ type: 'text', value: valeur == null ? '' : valeur, onchange: ev => auChangement(ev.target.value) }, attrs || {})));
  const champSelect = (libelle, options, valeur, auChangement) => el('label', 'champ', el('span', {}, libelle), el('select', { onchange: ev => auChangement(ev.target.value) }, options.map(([v, l]) => el('option', { value: v, selected: String(v) === String(valeur) }, l))));

  function carteFamille(etat) {
    const utilisateur = etat.utilisateur;
    return el('div', 'carte', el('h2', {}, '👪 ' + etat.famille.nom),
      champTexte('Nom de la famille', etat.famille.nom, v => { etat.famille.nom = v.trim() || 'Ma famille'; etat.famille.modifieLe = new Date().toISOString(); sauver(); }),
      el('ul', 'liste', etat.famille.membres.map(m => el('li', {}, el('span', 'ico', m.role === 'enfant' ? '🧒' : '🧑'), el('button', { class: 'pousse', style: 'text-align:left;background:none;border:0;padding:0;min-height:44px', onclick: () => formulaireMembre(m) }, el('div', 'gras', m.nom + (m.id === utilisateur ? ' · ce téléphone' : '')), el('div', 'petit', [m.role === 'enfant' ? 'enfant' : 'adulte', m.age ? m.age + ' ans' : null, m.aimePeu.length ? 'aime peu : ' + m.aimePeu.slice(0, 3).join(', ') : null].filter(Boolean).join(' · '))), el('span', 'petit', '›')))),
      el('div', 'boutons', el('button', { class: 'btn', onclick: () => formulaireMembre(null) }, '＋ Ajouter un membre')),
      champSelect('Qui utilise ce téléphone ?', etat.famille.membres.map(m => [m.id, m.nom]), utilisateur, v => { etat.utilisateur = v; sauver(); }));
  }
  function formulaireMembre(m) {
    const etat = E();
    const membre = m || { id: null, nom: '', role: 'adulte', age: null, aime: [], aimePeu: [], objectifs: [] };
    const nom = el('input', { type: 'text', value: membre.nom, placeholder: 'Prénom' });
    const role = el('select', {}, [['adulte', 'Adulte'], ['enfant', 'Enfant']].map(([v, l]) => el('option', { value: v, selected: v === membre.role }, l)));
    const age = el('input', { type: 'number', value: membre.age || '', min: '0', inputmode: 'numeric' });
    const aime = el('input', { type: 'text', value: membre.aime.join(', '), placeholder: 'pâtes, saumon, fraises' });
    const aimePeu = el('input', { type: 'text', value: membre.aimePeu.join(', '), placeholder: 'épinards, poisson' });
    const cases = OBJECTIFS.map(o => el('label', 'case', el('input', { type: 'checkbox', value: o, checked: membre.objectifs.includes(o) }), o));
    const liste = v => v.split(/[,;]/).map(x => x.trim()).filter(Boolean);
    feuille({ titre: m ? m.nom : 'Nouveau membre', focus: true,
      contenu: el('div', {}, el('label', 'champ', el('span', {}, 'Prénom'), nom), el('div', 'grille-2', el('label', 'champ', el('span', {}, 'Rôle'), role), el('label', 'champ', el('span', {}, 'Âge'), age)),
        el('label', 'champ', el('span', {}, 'Aime bien'), aime, el('div', 'aide', 'Séparés par des virgules. Ces plats reviendront un peu plus souvent.')),
        el('label', 'champ', el('span', {}, 'Aime peu'), aimePeu, el('div', 'aide', 'Ces ingrédients seront proposés plus rarement.')),
        el('div', 'champ', el('span', {}, 'Objectifs'), cases),
        m && etat.famille.membres.length > 1 ? el('button', { class: 'btn danger large', onclick: async () => { if (await confirmer(m.nom + ' ne fera plus partie de la famille dans l’application. Ses avis et mesures restent enregistrés.', { ok: 'Retirer', danger: true })) { etat.famille.membres = etat.famille.membres.filter(x => x.id !== m.id); if (etat.utilisateur === m.id) etat.utilisateur = etat.famille.membres[0].id; MaTable.ui.fermerTout(); sauver(); } } }, 'Retirer ce membre') : null),
      actions: [{ libelle: 'Annuler' }, { libelle: 'Enregistrer', classe: 'principal', action: () => {
        if (!nom.value.trim()) { toast('Indiquez un prénom.'); return false; }
        Object.assign(membre, { nom: nom.value.trim(), role: role.value, age: age.value ? Number(age.value) : null, aime: liste(aime.value), aimePeu: liste(aimePeu.value), objectifs: cases.filter(c => c.firstChild.checked).map(c => c.firstChild.value) });
        membre.modifieLe = new Date().toISOString();
        if (!membre.id) { membre.id = U.idUnique('m'); etat.famille.membres.push(membre); }
        sauver();
      } }] });
  }

  function carteOrganisation(etat) {
    const r = etat.reglages;
    const adultes = etat.famille.membres.filter(m => m.role === 'adulte');
    return el('div', 'carte', el('h2', {}, '🗓️ Organisation'),
      el('div', 'grille-2',
        champTexte('Retour à la maison le soir', r.heureRetour, v => { r.heureRetour = v; toucherReglages(); sauverDoucement(); }, { type: 'time' }),
        champTexte('Temps max en semaine (min)', r.tempsMaxSemaine, v => { r.tempsMaxSemaine = Math.max(10, Number(v) || 25); toucherReglages(); sauver(); }, { type: 'number', inputmode: 'numeric', min: '10' })),
      champSelect('Jour du batch cooking', U.JOURS.slice(1).concat([U.JOURS[0]]).map((j, i) => [i + 1, U.majuscule(j)]), r.jourBatch, v => { r.jourBatch = Number(v); toucherReglages(); sauver(); }),
      el('div', 'grille-2',
        champSelect('Qui cuisine le soir en semaine ?', adultes.map(m => [m.id, m.nom]), r.cuisinierSoir, v => { r.cuisinierSoir = v; toucherReglages(); sauverDoucement(); }),
        champSelect('Qui cuisine le week-end ?', adultes.map(m => [m.id, m.nom]), r.cuisinierWeekend, v => { r.cuisinierWeekend = v; toucherReglages(); sauverDoucement(); })),
      el('div', 'grille-2',
        champSelect('Repas plaisir par week-end', [[0, 'Aucun'], [1, 'Un'], [2, 'Deux']], r.tolerancePlaisir, v => { r.tolerancePlaisir = Number(v); toucherReglages(); sauver(); }),
        champTexte('Budget courses indicatif (€/semaine)', r.budget, v => { r.budget = v ? Number(String(v).replace(',', '.')) : null; toucherReglages(); sauverDoucement(); }, { inputmode: 'decimal', placeholder: 'facultatif' })),
      el('label', 'interrupteur', el('span', {}, el('div', 'gras', 'Dictée vocale dans la liste'), el('div', 'petit', 'Le micro apparaît si l’appareil le permet.')), el('input', { type: 'checkbox', checked: r.voixActive !== false, onchange: ev => { r.voixActive = ev.target.checked; sauver(); } })));
  }

  function carteMagasins(etat) {
    const r = etat.reglages;
    return el('div', 'carte', el('h2', {}, '🛒 Magasins fréquentés'), el('p', 'petit', 'Les articles sont répartis entre ces magasins. Changer le magasin d’un article dans la liste apprend votre habitude.'),
      C.MAGASINS.map(m => el('label', 'case', el('input', { type: 'checkbox', checked: r.magasins.includes(m.id), onchange: ev => { if (ev.target.checked) { if (!r.magasins.includes(m.id)) r.magasins.push(m.id); } else if (r.magasins.length > 1) r.magasins = r.magasins.filter(x => x !== m.id); else { ev.target.checked = true; toast('Gardez au moins un magasin.'); return; } toucherReglages(); sauver(); } }), m.emoji + ' ' + m.nom)),
      Object.keys(etat.preferencesMagasin).length ? el('p', 'minuscule', U.pluriel(Object.keys(etat.preferencesMagasin).length, 'habitude apprise', 'habitudes apprises') + '.') : null);
  }

  function carteDrive(etat) {
    const d = etat.reglages.drive;
    return el('div', 'carte', el('h2', {}, '🚗 Option Drive'),
      el('label', 'interrupteur', el('span', {}, el('div', 'gras', 'Préparer la liste du supermarché pour un drive'), el('div', 'petit', 'Texte prêt à coller, et liens de recherche par article.')), el('input', { type: 'checkbox', checked: d.actif, onchange: ev => { d.actif = ev.target.checked; toucherReglages(); sauver(); } })),
      d.actif ? champTexte('Adresse de recherche du drive (facultatif)', d.modeleUrl, v => { d.modeleUrl = v.trim(); toucherReglages(); sauver(); }, { type: 'url', placeholder: 'https://…/recherche?q=%s' }) : null,
      d.actif ? el('p', 'aide petit', 'Sur le site de votre drive, cherchez un mot, copiez l’adresse de la page et remplacez le mot par %s. Ma Table pourra alors ouvrir la recherche de chaque article.') : null);
  }

  function carteSynchro(etat) {
    const Sy = MaTable.Synchro;
    const actif = Sy.actif(etat);
    const st = Sy.statut(etat);
    const champ = el('input', { type: 'password', placeholder: 'ghp_…', autocomplete: 'off', 'aria-label': 'Jeton GitHub' });
    return el('div', 'carte', el('h2', {}, '☁️ Synchronisation entre appareils'),
      actif
        ? el('div', {},
          el('p', { class: st.erreur ? 'erreur' : 'sous' }, (st.erreur ? '⚠️ ' : '✓ ') + st.texte),
          el('p', 'petit', 'Mac, iPhones : ce que l\u2019un change, les autres le voient en moins d\u2019une minute quand l\u2019application est ouverte. Les données transitent par un fichier privé sur votre compte GitHub.'),
          el('div', 'boutons',
            el('button', { class: 'btn principal', onclick: async () => { toast('Synchronisation…', 1200); const r = await Sy.cycle(etat, { force: true }); if (r && r.erreur) toast(r.erreur, 4000); else { toast(r && r.recu ? r.recu + ' changements reçus.' : 'Tout est à jour.'); } app().rafraichir(); } }, '🔄 Synchroniser maintenant'),
            el('button', { class: 'btn danger', onclick: async () => { if (await confirmer('La synchronisation s\u2019arrête sur cet appareil. Vos données restent, le fichier partagé aussi.', { ok: 'Désactiver', danger: true })) { Sy.desactiver(etat); app().rafraichir(); } } }, 'Désactiver')))
        : el('div', {},
          el('p', 'petit', 'Pour retrouver la même liste et les mêmes menus sur le Mac et les deux iPhones. Il faut un « jeton » GitHub, à créer une fois et à coller sur chaque appareil.'),
          el('details', {}, el('summary', 'gras', 'Comment créer le jeton (2 minutes)'),
            el('ol', { class: 'petit', style: 'padding-left:18px' },
              el('li', {}, 'Sur github.com, connecté à votre compte : photo de profil → Settings → tout en bas, Developer settings.'),
              el('li', {}, 'Personal access tokens → Tokens (classic) → Generate new token (classic).'),
              el('li', {}, 'Note : « Ma Table ». Expiration : No expiration. Cochez uniquement la case « gist ».'),
              el('li', {}, 'Generate token, puis copiez la suite de caractères qui commence par ghp_ : elle ne sera plus affichée.'),
              el('li', {}, 'Collez-la ci-dessous, sur chaque appareil. En cas de perte d\u2019un téléphone, supprimez le jeton sur GitHub.'))),
          el('div', 'espace'),
          el('label', 'champ', el('span', {}, 'Jeton GitHub'), champ),
          el('div', 'boutons', el('button', { class: 'btn principal', onclick: async () => { const v = champ.value.trim(); if (!v) { toast('Collez d\u2019abord le jeton.'); return; } toast('Connexion à GitHub…', 1500); try { const r = await Sy.configurer(etat, v); if (r && r.erreur) throw new Error(r.erreur); toast('✓ Synchronisation activée.' + (r && r.recu ? ' ' + r.recu + ' changements reçus.' : '')); app().rafraichir(); } catch (e) { toast(e.message, 4500); Sy.desactiver(etat); } } }, 'Activer la synchronisation'))));
  }

  function carteIA(etat) {
    const IA = MaTable.IA;
    const r = etat.reglages.ia = etat.reglages.ia || { cle: '' };
    const champ = el('input', { type: 'password', value: r.cle, placeholder: 'sk-ant-…', autocomplete: 'off', 'aria-label': 'Clé API' });
    return el('div', 'carte', el('h2', {}, '🤖 Reconnaissance de photos (option)'),
      el('p', 'petit', 'Avec une clé API Anthropic, l\u2019onglet Scanner reconnaît un produit, le contenu du frigo ou un ticket de caisse en photo. Les photos sont envoyées à Anthropic pour analyse ; l\u2019usage est facturé sur votre compte Anthropic. Sans clé, tout le reste fonctionne.'),
      el('label', 'champ', el('span', {}, 'Clé API Anthropic'), champ, el('div', 'aide', 'La clé reste sur ce téléphone : elle n\u2019est jamais incluse dans l\u2019export ni partagée.')),
      el('div', 'boutons',
        el('button', { class: 'btn principal', onclick: async () => { const v = champ.value.trim(); if (!v) { toast('Collez d\u2019abord la clé.'); return; } r.cle = v; sauverDoucement(); toast('Vérification…', 1500); try { await IA.verifierCle(etat); toast('✓ Clé valide : la photo est active dans Scanner.'); sauver(); } catch (e) { toast(e.message); } } }, 'Vérifier et enregistrer'),
        r.cle ? el('button', { class: 'btn danger', onclick: async () => { if (await confirmer('La reconnaissance de photos sera désactivée.', { ok: 'Effacer la clé', danger: true })) { r.cle = ''; sauver(); } } }, 'Effacer la clé') : null),
      IA.active(etat) ? el('p', 'petit', '✓ Active. Modèle : ' + IA.MODELE + '.') : null);
  }

  // ---- Suivi du poids, privé ---------------------------------------------------
  function cartePoids(etat) {
    const adultes = etat.famille.membres.filter(m => m.role === 'adulte');
    return el('div', 'carte', el('h2', {}, '🔒 Suivi du poids (privé)'),
      el('p', 'petit', 'Désactivé par défaut. Chaque adulte peut l’activer pour lui seul, protégé par un code à 4 chiffres. Rien n’apparaît ailleurs dans l’application.'),
      el('ul', 'liste', adultes.map(m => { const p = etat.poids[m.id]; const actif = p && p.actif !== false && p.code; return el('li', {}, el('span', 'ico', actif ? '🔐' : '⚪'), el('span', 'pousse', el('div', 'gras', m.nom), el('div', 'petit', actif ? U.pluriel((p.mesures || []).length, 'pesée') : 'non activé')),
        actif ? el('button', { class: 'btn petit-btn principal', onclick: () => ouvrirPoids(m) }, 'Ouvrir') : el('button', { class: 'btn petit-btn', onclick: () => activerPoids(m) }, 'Activer')); })));
  }
  async function activerPoids(m) {
    const etat = E();
    const code = await demander('Choisissez un code à 4 chiffres', { type: 'password', inputmode: 'numeric', libelle: 'Code pour ' + m.nom, aide: 'Ce code protège l’espace de ' + m.nom + ' sur ce téléphone. Notez-le quelque part : il ne peut pas être retrouvé.' });
    if (code === null) return;
    if (!/^\d{4}$/.test(code)) { toast('Le code doit faire exactement 4 chiffres.'); return; }
    etat.poids[m.id] = Object.assign({ mesures: [] }, etat.poids[m.id] || {}, { code, actif: true });
    sauver(); ouvrirPoids(m, true);
  }
  async function ouvrirPoids(m, dejaVerifie) {
    const etat = E();
    const p = etat.poids[m.id];
    if (!dejaVerifie) {
      const code = await demander('Code de ' + m.nom, { type: 'password', inputmode: 'numeric' });
      if (code === null) return;
      if (code !== p.code) { toast('Code incorrect.'); return; }
    }
    const f = feuille({ titre: '🔒 ' + m.nom + ' · suivi du poids', plein: true,
      contenu: (corps) => { const zone = el('div', {}); const rendre = () => { zone.innerHTML = ''; zone.append(contenuPoids(m, p, rendre)); }; rendre(); return zone; } });
  }
  function contenuPoids(m, p, rendre) {
    const etat = E();
    const mesures = (p.mesures || []).slice().sort((a, b) => a.date.localeCompare(b.date));
    const date = el('input', { type: 'date', value: U.aujourdhui() });
    const kg = el('input', { type: 'text', inputmode: 'decimal', placeholder: '72,4' });
    const ajouter = () => { const v = Number(kg.value.replace(',', '.')); if (!v || v < 20 || v > 300) { toast('Indiquez un poids en kg, par exemple 72,4.'); return; } p.mesures = p.mesures || []; const ex = p.mesures.find(x => x.date === date.value); if (ex) ex.kg = v; else p.mesures.push({ date: date.value, kg: v }); sauverDoucement(); kg.value = ''; rendre(); };
    kg.addEventListener('keydown', ev => { if (ev.key === 'Enter') { ev.preventDefault(); ajouter(); } });
    const dernier = mesures[mesures.length - 1], premier = mesures[0];
    return el('div', {},
      el('p', 'petit', 'Une pesée par semaine suffit. Ici, on regarde la tendance, pas le chiffre du jour.'),
      el('div', 'carte douce', el('div', 'grille-2', el('label', 'champ', el('span', {}, 'Date'), date), el('label', 'champ', el('span', {}, 'Poids (kg)'), kg)), el('button', { class: 'btn principal large', onclick: ajouter }, '＋ Enregistrer la pesée')),
      mesures.length >= 2 ? el('div', 'carte', el('h3', {}, 'Courbe'), courbe(mesures), el('p', 'petit', 'Du ' + U.dateFr(premier.date) + ' au ' + U.dateFr(dernier.date) + ' : ' + (dernier.kg - premier.kg > 0 ? '+' : '') + (Math.round((dernier.kg - premier.kg) * 10) / 10).toString().replace('.', ',') + ' kg')) : null,
      mesures.length ? el('div', 'carte', el('h3', {}, 'Pesées'), el('ul', 'liste', mesures.slice().reverse().map(x => el('li', {}, el('span', 'pousse', U.dateLongue(x.date)), el('span', 'gras', String(x.kg).replace('.', ',') + ' kg'), el('button', { class: 'btn petit-btn', 'aria-label': 'Retirer', onclick: async () => { if (await confirmer('Retirer la pesée du ' + U.dateFr(x.date) + ' ?', { ok: 'Retirer' })) { p.mesures = p.mesures.filter(y => y !== x); sauverDoucement(); rendre(); } } }, '✕'))))) : null,
      el('div', 'boutons colonne',
        el('button', { class: 'btn', onclick: async () => { const c = await demander('Nouveau code à 4 chiffres', { type: 'password', inputmode: 'numeric' }); if (c === null) return; if (!/^\d{4}$/.test(c)) { toast('4 chiffres exactement.'); return; } p.code = c; sauverDoucement(); toast('Code changé.'); } }, 'Changer le code'),
        el('button', { class: 'btn danger', onclick: async () => { if (await confirmer('Le suivi sera masqué pour ' + m.nom + '. Les pesées restent enregistrées et réapparaîtront si vous le réactivez avec le même code.', { ok: 'Désactiver', danger: true })) { p.actif = false; MaTable.ui.fermerTout(); sauver(); } } }, 'Désactiver le suivi')));
  }
  function courbe(mesures) {
    const L = 320, Hh = 140, m = 24;
    const xs = mesures.map((x, i) => m + (L - 2 * m) * (mesures.length === 1 ? 0.5 : i / (mesures.length - 1)));
    const min = Math.min(...mesures.map(x => x.kg)) - 0.5, max = Math.max(...mesures.map(x => x.kg)) + 0.5;
    const y = v => Hh - m - (Hh - 2 * m) * ((v - min) / (max - min || 1));
    const d = mesures.map((x, i) => (i ? 'L' : 'M') + xs[i].toFixed(1) + ' ' + y(x.kg).toFixed(1)).join(' ');
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 ' + L + ' ' + Hh); svg.setAttribute('class', 'courbe'); svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', 'Courbe du poids');
    svg.innerHTML = '<path d="' + d + '"/>' + mesures.map((x, i) => '<circle cx="' + xs[i].toFixed(1) + '" cy="' + y(x.kg).toFixed(1) + '" r="4"/>').join('') +
      '<text x="' + m + '" y="' + (Hh - 6) + '">' + U.dateCourte(mesures[0].date) + '</text><text x="' + (L - m) + '" y="' + (Hh - 6) + '" text-anchor="end">' + U.dateCourte(mesures[mesures.length - 1].date) + '</text>' +
      '<text x="2" y="' + (y(max - 0.5) + 4) + '">' + String(Math.round((max - 0.5) * 10) / 10).replace('.', ',') + '</text><text x="2" y="' + (y(min + 0.5) + 4) + '">' + String(Math.round((min + 0.5) * 10) / 10).replace('.', ',') + '</text>';
    return svg;
  }

  // ---- Données -------------------------------------------------------------------
  function carteDonnees(etat) {
    const St = MaTable.Stockage;
    const copie = St.copieDeSurete();
    const fichier = el('input', { type: 'file', accept: '.json,application/json', hidden: true, onchange: async ev => {
      const f = ev.target.files[0]; if (!f) return;
      const texte = await f.text();
      ev.target.value = '';
      try { St.lire(texte); } catch (e) { toast(e.message); return; }
      feuille({ titre: 'Importer « ' + f.name + ' »',
        contenu: el('div', {}, el('p', 'sous', 'Fusionner combine les deux téléphones sans rien perdre : articles, achats, avis, semaines, garde-manger. Remplacer efface ce téléphone au profit du fichier (une copie de sûreté est gardée).')),
        actions: [
          { libelle: 'Remplacer tout', classe: 'danger', action: async () => { if (!(await confirmer('Les données de ce téléphone seront remplacées par celles du fichier. Une copie de l’état actuel est conservée.', { ok: 'Remplacer', danger: true }))) return false; try { St.importer(texte); toast('Données remplacées.'); app().rafraichir(); } catch (e) { toast(e.message); } } },
          { libelle: '🤝 Fusionner (recommandé)', classe: 'principal', action: () => { try { const b = St.fusionner(texte); toast('Fusion faite : ' + U.pluriel(b.articles, 'article') + ', ' + U.pluriel(b.achats, 'passage') + ', ' + U.pluriel(b.avis, 'avis') + ', ' + U.pluriel(b.semaines, 'semaine') + ' ajoutés.', 4000); app().rafraichir(); } catch (e) { toast(e.message); } } },
        ] });
    } });
    const nomFichier = () => 'ma-table-' + U.aujourdhui() + '.json';
    return el('div', 'carte', el('h2', {}, '💾 Vos données'),
      el('p', 'petit', 'Tout est enregistré sur ce téléphone : ' + U.pluriel(Object.keys(etat.semaines).length, 'semaine') + ', ' + U.pluriel(etat.achats.length, 'passage en magasin', 'passages en magasin') + ', ' + U.pluriel(etat.recettes.length, 'recette à vous', 'recettes à vous') + ', ' + U.pluriel(etat.avis.length, 'avis') + '.'),
      el('p', 'petit', 'Pour partager avec l’autre parent : exportez d’un téléphone, envoyez le fichier (AirDrop, Messages…), importez sur l’autre. La liste cochée par l’un apparaît alors chez l’autre, avec le nom de qui a coché.'),
      el('div', 'boutons',
        el('button', { class: 'btn principal', onclick: () => telecharger(nomFichier(), St.exporter(), 'application/json') }, '⬇️ Exporter'),
        el('button', { class: 'btn', onclick: async () => { const contenu = St.exporter(); let f = null; try { f = new File([contenu], nomFichier(), { type: 'application/json' }); } catch (e) { f = null; } const ok = await partager('Ma Table — données', f ? undefined : contenu, f); if (!ok) telecharger(nomFichier(), contenu, 'application/json'); } }, '📤 Partager'),
        el('button', { class: 'btn', onclick: () => { toast('Choisissez le fichier exporté depuis l\u2019autre téléphone.', 1800); fichier.click(); } }, '⬆️ Importer'), fichier),
      copie ? el('button', { class: 'btn discret large', onclick: async () => { if (await confirmer('Revenir aux données d’avant la dernière importation (' + U.dateFr(copie.posseLe.slice(0, 10)) + ') ?', { ok: 'Restaurer' })) { St.importer(JSON.stringify({ application: 'Ma Table', donnees: copie.donnees })); toast('Copie restaurée.'); app().rafraichir(); } } }, 'Restaurer la copie d’avant import (' + U.dateFr(copie.posseLe.slice(0, 10)) + ')') : null);
  }

  function carteAide() {
    return el('div', 'carte douce', el('h2', {}, '📱 Installer et comprendre'),
      el('p', 'gras', 'Sur iPhone'), el('p', 'petit', 'Dans Safari, touchez le bouton Partager (le carré avec la flèche), puis « Sur l’écran d’accueil ». Ma Table s’ouvre ensuite comme une application, même sans réseau.'),
      el('div', 'espace'),
      el('p', 'gras', 'Comment Ma Table propose une semaine'), el('p', 'petit', 'Des règles simples, pas de boîte noire : dîners de semaine en 25 minutes ou réchauffés, lunch boxes préparées le jour du batch, au moins deux dîners approuvés enfant, un repas plaisir le week-end, protéines variées. Vos avis « On refait » et « Jamais plus » comptent, ainsi que les aliments que chacun aime peu.'),
      el('div', 'espace'),
      el('p', 'gras', 'Ce que l’application ne fait pas'), el('p', 'petit', 'Pas de calories, pas de compte à créer, pas de serveur : vos données restent sur le téléphone. La synchronisation entre deux téléphones passe par le fichier d’export. Le scanner reconnaît les codes-barres via Open Food Facts ; il ne lit pas les photos de frigo ni les tickets de caisse.'),
      el('div', 'espace'), el('p', 'minuscule', 'Ma Table · version 1.0 · données produits : Open Food Facts (licence ouverte).'));
  }

  MaTable.ecrans = MaTable.ecrans || {};
  MaTable.ecrans.profil = { monter };
})(typeof window !== 'undefined' ? window : globalThis);
