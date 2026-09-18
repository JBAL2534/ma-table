// Aides d'affichage partagées : création d'éléments, feuilles (fenêtres du bas), messages, badges.
(function (racine) {
  const MaTable = racine.MaTable = racine.MaTable || {};
  const U = MaTable.util;

  function el(tag, attrs, ...enfants) {
    const e = document.createElement(tag);
    if (typeof attrs === 'string') e.className = attrs;
    else if (attrs) {
      for (const [k, v] of Object.entries(attrs)) {
        if (v == null || v === false) continue;
        if (k === 'class') e.className = v;
        else if (k === 'text') e.textContent = v;
        else if (k === 'html') e.innerHTML = v;
        else if (k === 'style') e.style.cssText = v;
        else if (k.startsWith('on')) e.addEventListener(k.slice(2).toLowerCase(), v);
        else if (k === 'dataset') Object.assign(e.dataset, v);
        else if (['value', 'checked', 'disabled', 'selected', 'readOnly', 'indeterminate'].includes(k)) e[k] = v;
        else e.setAttribute(k, v === true ? '' : v);
      }
    }
    for (const c of enfants.flat(Infinity)) {
      if (c == null || c === false) continue;
      e.append(c.nodeType ? c : document.createTextNode(String(c)));
    }
    return e;
  }

  function vibrer(ms) { try { if (navigator.vibrate) navigator.vibrate(ms || 10); } catch (e) { /* pas d'haptique ici */ } }

  let feuilles = [];
  // Ouvre une feuille depuis le bas de l'écran. Retourne { fermer, corps }.
  function feuille(options) {
    options = options || {};
    const voile = el('div', { class: 'voile', role: 'presentation' });
    const f = el('div', { class: 'feuille' + (options.plein ? ' plein' : ''), role: 'dialog', 'aria-modal': 'true', 'aria-label': options.titre || 'Fenêtre' });
    const corps = el('div', 'feuille-corps');
    const fermer = () => {
      if (!voile.parentNode) return;
      voile.remove();
      feuilles = feuilles.filter(x => x !== fermer);
      if (!feuilles.length) document.body.style.overflow = '';
      if (options.auFermer) options.auFermer();
    };
    if (!options.plein) f.append(el('div', 'poignee'));
    f.append(el('div', 'feuille-entete',
      options.retour ? el('button', { class: 'btn icone', 'aria-label': 'Retour', onclick: fermer }, '‹') : null,
      el('h2', {}, options.titre || ''),
      el('button', { class: 'btn icone', 'aria-label': 'Fermer', onclick: fermer }, '✕')));
    f.append(corps);
    if (typeof options.contenu === 'function') { const r = options.contenu(corps, fermer); if (r) corps.append(r); }
    else if (options.contenu) corps.append(options.contenu);
    if (options.actions && options.actions.length) {
      const zone = el('div', 'feuille-actions' + (options.actions.length > 2 ? ' colonne' : ''));
      for (const a of options.actions) {
        zone.append(el('button', { class: 'btn ' + (a.classe || ''), onclick: async () => { const r = a.action ? await a.action(fermer) : true; if (r !== false && !a.garder) fermer(); } }, a.libelle));
      }
      f.append(zone);
    }
    voile.addEventListener('click', (ev) => { if (ev.target === voile && options.fermable !== false) fermer(); });
    voile.append(f);
    (document.getElementById('couches') || document.body).append(voile);
    document.body.style.overflow = 'hidden';
    feuilles.push(fermer);
    const premier = corps.querySelector('input, select, textarea, button');
    if (premier && options.focus) setTimeout(() => premier.focus(), 50);
    return { fermer, corps, element: f };
  }
  function fermerTout() { feuilles.slice().forEach(f => f()); }
  document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape' && feuilles.length) feuilles[feuilles.length - 1](); });

  // Menu d'actions : liste de boutons { ico, libelle, action, danger }.
  function menuActions(titre, actions) {
    return feuille({
      titre,
      contenu: (corps, fermer) => el('div', 'menu-actions', actions.filter(Boolean).map(a =>
        el('button', { class: a.danger ? 'danger' : '', onclick: async () => { fermer(); await a.action(); } }, el('span', 'ico', a.ico || '•'), el('span', 'pousse', a.libelle), a.detail ? el('span', 'petit', a.detail) : null))),
    });
  }

  let toastCourant = null;
  // Message bref. Avec `action` ({ libelle, action }), le message propose un bouton, par exemple « Annuler ».
  function toast(message, duree, action) {
    if (toastCourant) toastCourant.remove();
    const t = el('div', { class: 'toast', role: 'status' }, message,
      action ? el('button', { class: 'toast-action', onclick: () => { t.remove(); action.action(); } }, action.libelle) : null);
    document.body.append(t);
    toastCourant = t;
    setTimeout(() => { if (t.parentNode) t.remove(); if (toastCourant === t) toastCourant = null; }, duree || (action ? 8000 : 2600));
  }

  function confirmer(message, options) {
    options = options || {};
    return new Promise(resolve => {
      let repondu = false;
      feuille({
        titre: options.titre || 'Confirmer',
        contenu: el('p', {}, message),
        auFermer: () => { if (!repondu) resolve(false); },
        actions: [
          { libelle: options.annuler || 'Annuler', action: () => { repondu = true; resolve(false); } },
          { libelle: options.ok || 'Oui', classe: options.danger ? 'danger' : 'principal', action: () => { repondu = true; resolve(true); } },
        ],
      });
    });
  }
  // Demande une valeur simple. Retourne null si annulé.
  function demander(titre, options) {
    options = options || {};
    return new Promise(resolve => {
      let repondu = false;
      const champ = el('input', { type: options.type || 'text', value: options.valeur != null ? options.valeur : '', placeholder: options.placeholder || '', inputmode: options.inputmode, autocomplete: 'off', enterkeyhint: 'done' });
      const valider = (fermer) => { repondu = true; resolve(champ.value); fermer(); };
      champ.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') { ev.preventDefault(); valider(f.fermer); } });
      const f = feuille({
        titre, focus: true,
        contenu: el('div', {}, el('label', 'champ', options.libelle ? el('span', {}, options.libelle) : null, champ, options.aide ? el('div', 'aide', options.aide) : null)),
        auFermer: () => { if (!repondu) resolve(null); },
        actions: [
          { libelle: 'Annuler', action: () => { repondu = true; resolve(null); } },
          { libelle: options.ok || 'Valider', classe: 'principal', action: (fermer) => { valider(fermer); return false; } },
        ],
      });
    });
  }

  function badge(code) {
    const M = MaTable.Menus;
    const libelle = (M.BADGES && M.BADGES[code]) || (M.CUISSONS && M.CUISSONS[code]) || U.majuscule(code);
    return el('span', 'badge ' + code, libelle);
  }
  function badges(codes, max) {
    const ordre = ['enfant', 'plaisir', 'leger', 'lunchbox', 'rechauffer', 'cookeo', 'airfryer', 'batch'];
    const liste = Array.from(new Set(codes || [])).sort((a, b) => ordre.indexOf(a) - ordre.indexOf(b)).filter(c => c !== 'batch');
    return el('div', 'badges', (max ? liste.slice(0, max) : liste).map(badge));
  }

  function vide(options) {
    return el('div', 'vide-etat',
      el('div', { class: 'illustration', 'aria-hidden': 'true' }, options.emoji || '🍽️'),
      el('h2', {}, options.titre),
      options.texte ? el('p', {}, options.texte) : null,
      options.action ? el('button', { class: 'btn principal grand', onclick: options.action.action }, options.action.libelle) : null,
      options.secondaire ? el('div', 'espace') : null,
      options.secondaire ? el('button', { class: 'btn discret', onclick: options.secondaire.action }, options.secondaire.libelle) : null);
  }

  function segments(options, actif, auChangement) {
    return el('div', { class: 'segments', role: 'tablist' }, options.map(o =>
      el('button', { role: 'tab', 'aria-selected': String(o.id === actif), onclick: () => auChangement(o.id) }, o.libelle)));
  }

  function telecharger(nomFichier, contenu, type) {
    try {
      const blob = new Blob([contenu], { type: type || 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = el('a', { href: url, download: nomFichier });
      document.body.append(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      toast('Fichier « ' + nomFichier + ' » prêt.');
    } catch (e) {
      toast('Le téléchargement n\u2019est pas possible ici.');
    }
  }
  async function partager(titre, texte, fichier) {
    try {
      if (navigator.share) {
        const donnees = { title: titre, text: texte };
        if (fichier && navigator.canShare && navigator.canShare({ files: [fichier] })) { donnees.files = [fichier]; delete donnees.text; }
        await navigator.share(donnees);
        return true;
      }
    } catch (e) { if (e && e.name === 'AbortError') return false; }
    if (navigator.clipboard && texte) { try { await navigator.clipboard.writeText(texte); toast('Copié dans le presse-papiers.'); return true; } catch (e) { /* presse-papiers refusé */ } }
    toast('Le partage n\u2019est pas disponible ici.');
    return false;
  }
  async function copier(texte) {
    try { await navigator.clipboard.writeText(texte); toast('Copié.'); return true; } catch (e) { toast('La copie n’est pas possible ici.'); return false; }
  }

  function membreNom(etat, id) { const m = (etat.famille.membres || []).find(x => x.id === id); return m ? m.nom : null; }
  function utilisateur(etat) { return etat.utilisateur || (etat.famille.membres[0] && etat.famille.membres[0].id); }

  function sauver() { MaTable.Stockage.sauver(); if (MaTable.app) MaTable.app.rafraichir(); }
  function sauverDoucement() { MaTable.Stockage.sauver(); }

  MaTable.ui = { el, vibrer, feuille, fermerTout, menuActions, toast, confirmer, demander, badge, badges, vide, segments, telecharger, partager, copier, membreNom, utilisateur, sauver, sauverDoucement };
})(typeof window !== 'undefined' ? window : globalThis);
