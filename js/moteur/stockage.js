// L'état complet de l'application, en un seul objet, enregistré à chaque changement.
// Dans le navigateur : localStorage. Dans les tests : en mémoire. Rien n'est jamais effacé :
// toute importation pose d'abord une copie de sûreté.
(function (racine) {
  const MaTable = racine.MaTable = racine.MaTable || {};
  const CLE = 'ma-table';
  const CLE_SAUVEGARDE = 'ma-table.copie-de-surete';
  const VERSION = 1;

  function etatDefaut() {
    return {
      version: VERSION,
      creeLe: new Date().toISOString(),
      famille: {
        nom: 'Ma famille',
        membres: [
          { id: 'm1', nom: 'Papa', role: 'adulte', age: null, aime: [], aimePeu: [], objectifs: ['Maintenir le poids'] },
          { id: 'm2', nom: 'Maman', role: 'adulte', age: null, aime: [], aimePeu: [], objectifs: ['Maintenir le poids'] },
          { id: 'm3', nom: 'Notre fille', role: 'enfant', age: 8, aime: [], aimePeu: [], objectifs: ['Plus de légumes'] },
        ],
      },
      reglages: {
        heureRetour: '18:45',
        tempsMaxSemaine: 25,
        jourBatch: 7,                 // 1 = lundi … 7 = dimanche
        magasins: ['supermarche', 'biocoop', 'grand_frais', 'marche'],
        budget: null,
        tolerancePlaisir: 1,          // repas plaisir par week-end
        drive: { actif: false, modeleUrl: '' },
        cuisinierSoir: 'm1',
        cuisinierWeekend: 'm2',
        voixActive: true,
        ia: { cle: '' },
      },
      recettes: [],                   // recettes ajoutées ou modifiées par la famille (les recettes de départ viennent des données)
      recettesMasquees: [],           // identifiants de recettes de départ que la famille ne veut plus voir
      semaines: {},                   // lundi ISO → semaine
      avis: [],                       // { id, date, creneau, recetteId, titre, note, enfant, quand }
      liste: [],                      // articles de la liste vivante
      preferencesMagasin: {},         // nom normalisé → { magasin, rayon }
      essentiels: null,               // null = prendre ceux des données de départ
      achats: [],                     // { id, date, magasin, articles, montant, par }
      gardeManger: [],
      produits: {},                   // code-barres → produit (Open Food Facts)
      poids: {},                      // membreId → { code, mesures: [{ date, kg }] }
      utilisateur: null,              // membreId de la personne qui utilise ce téléphone
    };
  }

  // Ajoute les champs manquants à un état ancien, sans jamais en retirer.
  function completer(etat) {
    const d = etatDefaut();
    for (const cle of Object.keys(d)) {
      if (etat[cle] === undefined) etat[cle] = d[cle];
    }
    for (const cle of Object.keys(d.reglages)) {
      if (etat.reglages[cle] === undefined) etat.reglages[cle] = d.reglages[cle];
    }
    if (!etat.famille.membres) etat.famille.membres = d.famille.membres;
    etat.version = VERSION;
    return etat;
  }

  const memoire = {};
  function support() {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(CLE + '.test', '1');
        localStorage.removeItem(CLE + '.test');
        return localStorage;
      }
    } catch (e) { /* stockage indisponible : on garde en mémoire */ }
    return { getItem: k => (k in memoire ? memoire[k] : null), setItem: (k, v) => { memoire[k] = v; }, removeItem: k => { delete memoire[k]; } };
  }

  const Stockage = {
    etat: null,
    ecouteurs: [],
    charger() {
      const brut = support().getItem(CLE);
      let etat = null;
      if (brut) {
        try { etat = JSON.parse(brut); } catch (e) { etat = null; }
      }
      if (!etat) etat = etatDefaut();
      this.etat = completer(etat);
      return this.etat;
    },
    sauver() {
      if (!this.etat) return;
      this.etat.modifieLe = new Date().toISOString();
      support().setItem(CLE, JSON.stringify(this.etat));
      this.ecouteurs.forEach(f => { try { f(this.etat); } catch (e) { /* un écran en erreur n'empêche pas l'enregistrement */ } });
    },
    ecouter(f) { this.ecouteurs.push(f); },
    // L'export ne contient jamais la clé API : elle reste sur ce téléphone.
    exporter() {
      const copie = JSON.parse(JSON.stringify(this.etat));
      if (copie.reglages && copie.reglages.ia) copie.reglages.ia = { cle: '' };
      return JSON.stringify({ application: 'Ma Table', version: VERSION, exporteLe: new Date().toISOString(), donnees: copie }, null, 1);
    },
    // Importe un fichier exporté. Une copie de sûreté de l'état actuel est posée avant tout remplacement.
    lire(texte) {
      let obj;
      try { obj = JSON.parse(texte); } catch (e) { throw new Error('Ce fichier n’est pas un export de Ma Table.'); }
      const donnees = obj && obj.application === 'Ma Table' ? obj.donnees : obj;
      if (!donnees || typeof donnees !== 'object' || !donnees.famille) throw new Error('Ce fichier n’est pas un export de Ma Table.');
      return donnees;
    },
    // Remplace tout par le contenu du fichier. Une copie de sûreté de l'état actuel est posée avant.
    importer(texte) {
      const donnees = this.lire(texte);
      const cleLocale = this.etat && this.etat.reglages && this.etat.reglages.ia ? this.etat.reglages.ia.cle : '';
      support().setItem(CLE_SAUVEGARDE, JSON.stringify({ posseLe: new Date().toISOString(), donnees: this.etat }));
      this.etat = completer(donnees);
      if (cleLocale && !this.etat.reglages.ia.cle) this.etat.reglages.ia.cle = cleLocale;
      this.sauver();
      return this.etat;
    },
    // Fusionne les données d'un autre téléphone avec celles-ci : rien n'est perdu de part et d'autre.
    fusionner(texte) {
      const autre = completer(this.lire(texte));
      const moi = this.etat;
      const U = MaTable.util;
      support().setItem(CLE_SAUVEGARDE, JSON.stringify({ posseLe: new Date().toISOString(), donnees: moi }));
      const bilan = { articles: 0, achats: 0, avis: 0, semaines: 0, gardeManger: 0, recettes: 0 };
      const cleArt = a => U.racineMot(a.nom) + '|' + (a.unite || '');
      for (const a of autre.liste || []) {
        const mien = moi.liste.find(x => cleArt(x) === cleArt(a));
        if (!mien) { moi.liste.push(a); bilan.articles++; }
        else if (a.coche && !mien.coche) { mien.coche = true; mien.cochePar = a.cochePar; mien.cocheLe = a.cocheLe; }
      }
      const unionParId = (cible, source, compteur) => { const ids = new Set(cible.map(x => x.id)); for (const x of source || []) if (!ids.has(x.id)) { cible.push(x); bilan[compteur]++; } };
      unionParId(moi.achats, autre.achats, 'achats');
      unionParId(moi.avis, autre.avis, 'avis');
      unionParId(moi.recettes, autre.recettes, 'recettes');
      for (const [lundi, s] of Object.entries(autre.semaines || {})) {
        const mienne = moi.semaines[lundi];
        if (!mienne || (s.generee || '') > (mienne.generee || '')) { moi.semaines[lundi] = s; bilan.semaines++; }
      }
      for (const g of autre.gardeManger || []) {
        if (!moi.gardeManger.some(x => U.racineMot(x.nom) === U.racineMot(g.nom))) { moi.gardeManger.push(g); bilan.gardeManger++; }
      }
      for (const [code, p] of Object.entries(autre.produits || {})) if (!moi.produits[code]) moi.produits[code] = p;
      for (const [k, v] of Object.entries(autre.preferencesMagasin || {})) if (!moi.preferencesMagasin[k]) moi.preferencesMagasin[k] = v;
      if (Array.isArray(autre.essentiels)) {
        const miens = MaTable.Courses.essentiels(moi).slice();
        const vus = new Set(miens.map(n => U.racineMot(n)));
        moi.essentiels = miens.concat(autre.essentiels.filter(n => !vus.has(U.racineMot(n))));
      }
      for (const m of autre.famille.membres || []) if (!moi.famille.membres.some(x => x.id === m.id)) moi.famille.membres.push(m);
      for (const [id, p] of Object.entries(autre.poids || {})) {
        if (!moi.poids[id]) { moi.poids[id] = p; continue; }
        const dates = new Set((moi.poids[id].mesures || []).map(x => x.date));
        moi.poids[id].mesures = (moi.poids[id].mesures || []).concat((p.mesures || []).filter(x => !dates.has(x.date)));
      }
      for (const id of autre.recettesMasquees || []) if (!moi.recettesMasquees.includes(id)) moi.recettesMasquees.push(id);
      this.sauver();
      return bilan;
    },
    copieDeSurete() {
      const brut = support().getItem(CLE_SAUVEGARDE);
      if (!brut) return null;
      try { return JSON.parse(brut); } catch (e) { return null; }
    },
    reinitialiserPourTests() { this.etat = etatDefaut(); this.ecouteurs = []; return this.etat; },
    etatDefaut,
  };

  MaTable.Stockage = Stockage;
})(typeof window !== 'undefined' ? window : globalThis);
