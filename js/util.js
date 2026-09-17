// Fonctions partagées : dates françaises, texte, identifiants. Sans dépendance, utilisable dans Node.
(function (racine) {
  const MaTable = racine.MaTable = racine.MaTable || {};

  const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  const JOURS_COURTS = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];
  const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

  function pad(n) { return String(n).padStart(2, '0'); }

  // 'YYYY-MM-DD' en heure locale (jamais toISOString : décale d'un jour le soir).
  function iso(d) {
    if (typeof d === 'string') return d;
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }
  function deIso(s) {
    const [a, m, j] = s.split('-').map(Number);
    return new Date(a, m - 1, j);
  }
  function ajouterJours(s, n) {
    const d = deIso(s);
    d.setDate(d.getDate() + n);
    return iso(d);
  }
  function aujourdhui() { return iso(new Date()); }
  // Lundi de la semaine contenant la date.
  function lundiDe(s) {
    const d = deIso(iso(s));
    const decal = (d.getDay() + 6) % 7;
    d.setDate(d.getDate() - decal);
    return iso(d);
  }
  function joursSemaine(lundi) {
    return Array.from({ length: 7 }, (_, i) => ajouterJours(lundi, i));
  }
  function estWeekend(s) { const j = deIso(s).getDay(); return j === 0 || j === 6; }
  function nomJour(s, court) { const j = deIso(s).getDay(); return court ? JOURS_COURTS[j] : JOURS[j]; }
  function dateLongue(s) { const d = deIso(s); return JOURS[d.getDay()] + ' ' + d.getDate() + ' ' + MOIS[d.getMonth()]; }
  function dateCourte(s) { const d = deIso(s); return d.getDate() + ' ' + MOIS[d.getMonth()].slice(0, 4) + (MOIS[d.getMonth()].length > 4 ? '.' : ''); }
  function dateFr(s) { const d = deIso(s); return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear(); }
  function libelleSemaine(lundi) {
    const dim = ajouterJours(lundi, 6);
    const d1 = deIso(lundi), d2 = deIso(dim);
    if (d1.getMonth() === d2.getMonth()) return 'du ' + d1.getDate() + ' au ' + d2.getDate() + ' ' + MOIS[d2.getMonth()];
    return 'du ' + d1.getDate() + ' ' + MOIS[d1.getMonth()] + ' au ' + d2.getDate() + ' ' + MOIS[d2.getMonth()];
  }
  function joursEntre(a, b) { return Math.round((deIso(b) - deIso(a)) / 86400000); }

  // Texte sans accents ni majuscules, pour comparer des noms d'articles.
  function normaliser(s) {
    return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/œ/g, 'oe').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
  }
  // Singulier grossier pour rapprocher « tomates » et « tomate ».
  function racineMot(s) {
    return normaliser(s).split(' ').map(m => m.length > 3 ? m.replace(/(aux|x|s)$/, '') : m).join(' ');
  }
  function majuscule(s) { s = String(s || ''); return s.charAt(0).toUpperCase() + s.slice(1); }
  function pluriel(n, un, plusieurs) { return n + ' ' + (n > 1 ? (plusieurs || un + 's') : un); }

  let compteur = 0;
  function idUnique(prefixe) {
    compteur += 1;
    return (prefixe || 'id') + '-' + Date.now().toString(36) + '-' + compteur.toString(36) + '-' + Math.floor(Math.random() * 1e6).toString(36);
  }

  // Générateur pseudo-aléatoire à graine : « Autre idée » donne une idée différente, et les tests sont reproductibles.
  function alea(graine) {
    let g = (Number(graine) || Date.now()) >>> 0;
    return function () {
      g = (g + 0x6D2B79F5) >>> 0;
      let t = g;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  // Tirage pondéré : chaque élément a un poids > 0.
  function tirer(elements, poids, hasard) {
    const total = poids.reduce((s, p) => s + p, 0);
    if (total <= 0) return null;
    let r = hasard() * total;
    for (let i = 0; i < elements.length; i++) {
      r -= poids[i];
      if (r <= 0) return elements[i];
    }
    return elements[elements.length - 1];
  }

  function formaterQte(qte, unite) {
    if (qte == null || qte === '') return unite || '';
    const n = Number(qte);
    const q = Number.isInteger(n) ? String(n) : String(Math.round(n * 10) / 10).replace('.', ',');
    return unite ? q + ' ' + unite : q;
  }
  function euros(n) {
    if (n == null || n === '') return '';
    return Number(n).toFixed(2).replace('.', ',') + ' €';
  }
  function echapper(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  MaTable.util = {
    JOURS, MOIS, iso, deIso, ajouterJours, aujourdhui, lundiDe, joursSemaine, estWeekend, nomJour, dateLongue, dateCourte, dateFr,
    libelleSemaine, joursEntre, normaliser, racineMot, majuscule, pluriel, idUnique, alea, tirer, formaterQte, euros, echapper, pad,
  };
})(typeof window !== 'undefined' ? window : globalThis);
