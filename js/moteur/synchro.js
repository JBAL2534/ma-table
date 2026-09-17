// Synchronisation entre appareils, sans serveur à gérer : les données partagées vivent dans un petit
// fichier privé chez GitHub (un « gist »), lu et réécrit par chaque appareil. Avant d'écrire, on fusionne
// toujours : la règle « la version la plus récente gagne, rien n'est supprimé » évite les conflits.
(function (racine) {
  const MaTable = racine.MaTable = racine.MaTable || {};
  const API = 'https://api.github.com';
  const DESCRIPTION = 'Ma Table — synchronisation familiale';
  const FICHIER = 'ma-table.json';
  const INTERVALLE = 30000;

  let enCours = false, minuterie = null, attente = null;
  const Synchro = {
    fetchImpl: null,
    document: typeof document !== 'undefined' ? document : null,
    actif(etat) { return !!(etat.synchro && etat.synchro.actif && etat.synchro.jeton && etat.synchro.gistId); },

    entetes(etat, extra) {
      return Object.assign({ Authorization: 'Bearer ' + etat.synchro.jeton, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' }, extra || {});
    },
    async appel(etat, methode, chemin, corps, extra) {
      const f = this.fetchImpl || (typeof fetch !== 'undefined' ? fetch : null);
      if (!f) throw new Error('Pas de connexion possible depuis cet appareil.');
      let rep;
      try { rep = await f(API + chemin, { method: methode, headers: this.entetes(etat, Object.assign({}, corps ? { 'Content-Type': 'application/json' } : {}, extra)), body: corps ? JSON.stringify(corps) : undefined }); }
      catch (e) { const err = new Error('Hors ligne : la synchronisation reprendra toute seule.'); err.horsLigne = true; throw err; }
      if (rep.status === 304) return { statut: 304 };
      if (rep.status === 401) throw new Error('GitHub refuse le jeton. Vérifiez-le dans Profil (il doit avoir le droit « gist »).');
      if (rep.status === 403) throw new Error('GitHub limite les appels pour le moment. La synchronisation reprendra dans quelques minutes.');
      if (rep.status === 404) throw new Error('Le fichier partagé n’a pas été trouvé chez GitHub. Désactivez puis réactivez la synchronisation.');
      if (!rep.ok) throw new Error('GitHub n’a pas répondu (code ' + rep.status + ').');
      const etag = rep.headers && rep.headers.get ? rep.headers.get('ETag') : null;
      if (rep.status === 204) return { statut: 204, etag, json: null };
      let json = null;
      try { json = await rep.json(); } catch (e) { json = null; }
      return { statut: rep.status, etag, json };
    },

    // Retrouve le fichier partagé de la famille, ou le crée. Chaque appareil n'a besoin que du jeton.
    async trouverOuCreerGist(etat) {
      const liste = await this.appel(etat, 'GET', '/gists?per_page=100');
      const existant = (liste.json || []).find(g => g.description === DESCRIPTION && g.files && g.files[FICHIER]);
      if (existant) return existant.id;
      const cree = await this.appel(etat, 'POST', '/gists', { description: DESCRIPTION, public: false, files: { [FICHIER]: { content: MaTable.Stockage.pourSynchro() } } });
      return cree.json.id;
    },
    async configurer(etat, jeton) {
      jeton = String(jeton || '').trim();
      if (!jeton) throw new Error('Collez d’abord le jeton GitHub.');
      etat.synchro = Object.assign({}, etat.synchro || {}, { jeton, actif: false, gistId: null, etag: null, erreur: null, dernierEnvoi: null, derniereReception: null });
      const gistId = await this.trouverOuCreerGist(etat);
      etat.synchro.gistId = gistId; etat.synchro.actif = true;
      MaTable.Stockage.sauverSilencieux();
      return this.cycle(etat, { force: true });
    },
    desactiver(etat) {
      etat.synchro = { actif: false, jeton: '', gistId: null, dernierEnvoi: null, derniereReception: null, etag: null, erreur: null };
      MaTable.Stockage.sauverSilencieux();
    },

    async recevoir(etat) {
      const r = await this.appel(etat, 'GET', '/gists/' + etat.synchro.gistId, null, etat.synchro.etag ? { 'If-None-Match': etat.synchro.etag } : {});
      etat.synchro.derniereReception = new Date().toISOString();
      if (r.statut === 304) return { changements: 0 };
      if (r.etag) etat.synchro.etag = r.etag;
      const fichier = r.json && r.json.files && r.json.files[FICHIER];
      if (!fichier) return { changements: 0 };
      let texte = fichier.content;
      if (fichier.truncated && fichier.raw_url) {
        const f = this.fetchImpl || fetch;
        texte = await (await f(fichier.raw_url)).text();
      }
      let donnees;
      try { donnees = MaTable.Stockage.lire(texte); } catch (e) { return { changements: 0 }; }
      const bilan = MaTable.Stockage.fusionnerEtat(etat, MaTable.Stockage.completer(donnees));
      if (bilan.total > 0) MaTable.Stockage.sauver();
      return { changements: bilan.total, bilan };
    },
    aEnvoyer(etat) { return !etat.synchro.dernierEnvoi || (etat.modifieLe || '') > etat.synchro.dernierEnvoi; },
    async envoyer(etat) {
      const marque = etat.modifieLe || new Date().toISOString();
      const r = await this.appel(etat, 'PATCH', '/gists/' + etat.synchro.gistId, { files: { [FICHIER]: { content: MaTable.Stockage.pourSynchro() } } });
      etat.synchro.dernierEnvoi = marque;
      if (r.etag) etat.synchro.etag = r.etag;
      return true;
    },

    // Un cycle : recevoir et fusionner, puis envoyer si quelque chose a changé ici.
    async cycle(etat, options) {
      options = options || {};
      if (!this.actif(etat) || enCours) return null;
      enCours = true;
      const res = { recu: 0, envoye: false };
      try {
        const rec = await this.recevoir(etat);
        res.recu = rec.changements;
        if (options.force || this.aEnvoyer(etat)) { await this.envoyer(etat); res.envoye = true; }
        etat.synchro.erreur = null;
      } catch (e) {
        etat.synchro.erreur = e.message;
        res.erreur = e.message;
      } finally {
        enCours = false;
        MaTable.Stockage.sauverSilencieux();
      }
      return res;
    },

    visible() { return !this.document || this.document.visibilityState !== 'hidden'; },
    planifier(delai) {
      clearTimeout(attente);
      attente = setTimeout(() => { const etat = MaTable.Stockage.etat; if (etat && this.actif(etat) && this.visible()) this.cycle(etat); }, delai);
    },
    // Toutes les 30 s quand l'application est visible, à chaque retour au premier plan, et 3 s après une modification.
    demarrer() {
      if (minuterie) return;
      MaTable.Stockage.ecouter(() => this.planifier(3000));
      minuterie = setInterval(() => { const etat = MaTable.Stockage.etat; if (etat && this.actif(etat) && this.visible() && this.aEnvoyerOuLire(etat)) this.cycle(etat); }, INTERVALLE);
      if (this.document) this.document.addEventListener('visibilitychange', () => { if (this.visible()) this.planifier(500); });
      this.planifier(1500);
    },
    aEnvoyerOuLire() { return true; },
    arreter() { clearInterval(minuterie); minuterie = null; clearTimeout(attente); },

    statut(etat) {
      const s = etat.synchro || {};
      if (!this.actif(etat)) return { texte: 'Désactivée', ok: false };
      if (s.erreur) return { texte: s.erreur, ok: false, erreur: true };
      if (!s.derniereReception) return { texte: 'Activée, première synchronisation en cours…', ok: true };
      const sec = Math.max(0, Math.round((Date.now() - new Date(s.derniereReception).getTime()) / 1000));
      const quand = sec < 60 ? 'il y a ' + sec + ' s' : sec < 3600 ? 'il y a ' + Math.round(sec / 60) + ' min' : 'il y a ' + Math.round(sec / 3600) + ' h';
      return { texte: 'À jour · dernière vérification ' + quand + (this.aEnvoyer(etat) ? ' · envoi en attente' : ''), ok: true };
    },
  };
  MaTable.Synchro = Synchro;
})(typeof window !== 'undefined' ? window : globalThis);
