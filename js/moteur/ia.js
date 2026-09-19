// Intelligence artificielle, en option : si la famille saisit sa propre clé API Anthropic dans Profil,
// une photo (produit, frigo, ticket de caisse) est analysée par Claude. Sans clé, rien n'apparaît :
// l'application reste complète en saisie manuelle. La clé ne quitte jamais ce téléphone (exclue de l'export).
(function (racine) {
  const MaTable = racine.MaTable = racine.MaTable || {};
  const U = MaTable.util;
  const MODELE = 'claude-opus-5';
  const URL_API = 'https://api.anthropic.com/v1/messages';

  function cle(etat) { return (etat.reglages.ia && etat.reglages.ia.cle) || ''; }
  function active(etat) { return /^sk-ant-/.test(cle(etat)); }

  const SCHEMA_ARTICLES = {
    type: 'object', additionalProperties: false, required: ['articles', 'commentaire'],
    properties: {
      articles: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['nom', 'rayon', 'quantite', 'confiance'], properties: {
        nom: { type: 'string', description: 'Nom court du produit, en français, avec majuscule initiale (ex. « Lait demi-écrémé »).' },
        rayon: { type: 'string', enum: ['Fruits & légumes', 'Viandes & poissons', 'Crèmerie', 'Épicerie', 'Surgelés', 'Boissons', 'Hygiène & maison'] },
        quantite: { type: 'string', description: 'Quantité lisible si visible (« 6 », « 500 g », « 1 L »), sinon chaîne vide.' },
        confiance: { type: 'number', description: 'Entre 0 et 1.' },
      } } },
      commentaire: { type: 'string', description: 'Une phrase courte et chaleureuse, ou chaîne vide.' },
    },
  };
  function schemaTicket() {
    const ids = MaTable.Courses.magasins().map(m => m.id);
    return {
    type: 'object', additionalProperties: false, required: ['magasin', 'date', 'montant', 'articles'],
    properties: {
      magasin: { type: 'string', enum: ids.concat(['inconnu']), description: 'Identifiant du magasin parmi : ' + MaTable.Courses.magasins().map(m => m.id + ' = ' + m.nom).join(', ') + '. inconnu si illisible.' },
      date: { type: 'string', description: 'Date du ticket au format AAAA-MM-JJ, ou chaîne vide.' },
      montant: { type: 'number', description: 'Total payé en euros, 0 si illisible.' },
      articles: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['nom', 'prix', 'rayon', 'quantite', 'prixUnitaire'], properties: {
        nom: { type: 'string' }, prix: { type: 'number', description: 'Montant payé pour la ligne, en euros.' },
        rayon: { type: 'string', enum: ['Fruits & légumes', 'Viandes & poissons', 'Crèmerie', 'Épicerie', 'Surgelés', 'Boissons', 'Hygiène & maison'] },
        quantite: { type: 'string', description: 'Poids ou quantité tel qu’imprimé sur la ligne (« 0,245 kg », « 250 g », « 2 »), chaîne vide si absent.' },
        prixUnitaire: { type: 'number', description: 'Prix au kilo ou à l’unité s’il est imprimé (« 33,50 €/kg »), sinon 0.' },
      } } },
    },
    };
  }

  const CONSIGNES = {
    produit: 'Photo d’un ou plusieurs produits alimentaires ou ménagers, pris en magasin ou à la maison, en France. Identifie chaque produit distinct visible. Réponds en français.',
    frigo: 'Photo d’un frigo ouvert, d’un placard ou d’un plan de travail, en France. Liste les aliments identifiables, un par ligne, sans inventer ce qui n’est pas visible. Réponds en français.',
    ticket: 'Photo d’un ticket de caisse français. Extrais l’enseigne (rapprochée d’un des magasins proposés dans le schéma ; inconnu si illisible), la date, le total payé et chaque ligne d’article avec son prix, son rayon probable, le poids ou la quantité imprimés (fromager, boucher, primeur : « 0,245 kg », « 2 x ») et le prix au kilo ou à l’unité s’il figure. Ignore les remises et les lignes qui ne sont pas des articles comme « total » ou « TVA ».',
  };

  async function appeler(etat, contenu, schema, fetchImpl) {
    const f = fetchImpl || (typeof fetch !== 'undefined' ? fetch : null);
    if (!active(etat)) throw new Error('Aucune clé API enregistrée dans Profil.');
    if (!f) throw new Error('Pas de connexion possible depuis cet appareil.');
    let rep;
    try {
      rep = await f(URL_API, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': cle(etat),
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
          'anthropic-beta': 'server-side-fallback-2026-07-01',
        },
        body: JSON.stringify({
          model: MODELE, max_tokens: 4096,
          output_config: { effort: 'low', format: { type: 'json_schema', schema } },
          fallbacks: 'default',
          system: 'Tu aides une famille française à faire ses courses. Tu réponds uniquement avec le JSON demandé, sans texte autour.',
          messages: [{ role: 'user', content: contenu }],
        }),
      });
    } catch (e) { throw new Error('Pas de connexion : l’analyse a besoin d’Internet.'); }
    if (rep.status === 401 || rep.status === 403) throw new Error('La clé API est refusée. Vérifiez-la dans Profil.');
    if (rep.status === 429) throw new Error('Trop de demandes d’un coup : réessayez dans une minute.');
    if (!rep.ok) throw new Error('Le service d’analyse n’a pas répondu (code ' + rep.status + '). Réessayez plus tard.');
    const json = await rep.json();
    if (json.stop_reason === 'refusal') throw new Error('L’analyse a été refusée pour cette image.');
    const bloc = (json.content || []).find(b => b.type === 'text');
    if (!bloc) throw new Error('Réponse vide du service d’analyse.');
    try { return JSON.parse(bloc.text); } catch (e) { throw new Error('Réponse illisible du service d’analyse.'); }
  }

  // Analyse une photo (base64 JPEG) selon le mode : 'produit', 'frigo' ou 'ticket'.
  async function analyserPhoto(etat, base64, mode, fetchImpl) {
    const contenu = [
      { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: base64 } },
      { type: 'text', text: CONSIGNES[mode] || CONSIGNES.produit },
    ];
    const res = await appeler(etat, contenu, mode === 'ticket' ? schemaTicket() : SCHEMA_ARTICLES, fetchImpl);
    return nettoyer(res, mode);
  }
  // Poids lu sur la ligne → quantité, unité et prix au kilo (ou prix unitaire imprimé).
  function poidsEtPrixKilo(a) {
    const prix = Number(a.prix) || 0;
    const brut = String(a.quantite || '').trim().replace(/\s*x\s*$/i, '');
    const q = brut ? MaTable.Courses.analyserSaisie(brut + ' x') : { qte: null, unite: null, nom: '' };
    const res = { qte: null, unite: null, prixKg: null, prixUnitaire: Number(a.prixUnitaire) > 0 ? Math.round(Number(a.prixUnitaire) * 100) / 100 : null };
    if (q.qte != null) {
      res.qte = q.qte;
      res.unite = q.unite || null;
      const u = U.normaliser(res.unite || '');
      let kg = null;
      if (u === 'kg' || u === 'l') kg = q.qte; else if (u === 'g' || u === 'ml') kg = q.qte / 1000; else if (u === 'cl') kg = q.qte / 100;
      if (kg && prix) res.prixKg = Math.round((prix / kg) * 100) / 100;
    }
    if (!res.prixKg && res.prixUnitaire && res.unite && /^(kg|g|l)$/.test(U.normaliser(res.unite))) res.prixKg = res.prixUnitaire;
    return res;
  }
  function nettoyer(res, mode) {
    if (mode === 'ticket') {
      return {
        magasin: MaTable.Courses.magasins().some(m => m.id === res.magasin) ? res.magasin : (MaTable.Courses.magasins()[0] || {}).id || 'supermarche',
        date: /^\d{4}-\d{2}-\d{2}$/.test(res.date || '') ? res.date : null,
        montant: Number(res.montant) > 0 ? Math.round(Number(res.montant) * 100) / 100 : null,
        articles: (res.articles || []).filter(a => a && a.nom).map(a => Object.assign({ nom: U.majuscule(String(a.nom).trim()), prix: Number(a.prix) || null, rayon: a.rayon }, poidsEtPrixKilo(a))),
      };
    }
    return {
      commentaire: res.commentaire || '',
      articles: (res.articles || []).filter(a => a && a.nom).map(a => ({ nom: U.majuscule(String(a.nom).trim()), rayon: a.rayon, quantite: (a.quantite || '').trim() || null, confiance: Math.max(0, Math.min(1, Number(a.confiance) || 0)) })),
    };
  }

  async function verifierCle(etat, fetchImpl) {
    const res = await appeler(etat, [{ type: 'text', text: 'Réponds avec un tableau d’articles vide et le commentaire « OK ».' }], SCHEMA_ARTICLES, fetchImpl);
    return !!res;
  }

  // Réduit une photo avant l'envoi (mémoire du téléphone, coût), renvoie le base64 JPEG.
  function redimensionner(fichier, maxPx, qualite) {
    return new Promise((resoudre, rejeter) => {
      const url = URL.createObjectURL(fichier);
      const img = new Image();
      img.onload = () => {
        try {
          let { width: l, height: h } = img;
          const ratio = Math.min(1, (maxPx || 1280) / Math.max(l, h));
          l = Math.round(l * ratio); h = Math.round(h * ratio);
          const c = document.createElement('canvas'); c.width = l; c.height = h;
          c.getContext('2d').drawImage(img, 0, 0, l, h);
          const data = c.toDataURL('image/jpeg', qualite || 0.82);
          URL.revokeObjectURL(url);
          resoudre(data.split(',')[1]);
        } catch (e) { URL.revokeObjectURL(url); rejeter(new Error('La photo n’a pas pu être préparée.')); }
      };
      img.onerror = () => { URL.revokeObjectURL(url); rejeter(new Error('Ce fichier n’est pas une image lisible.')); };
      img.src = url;
    });
  }

  MaTable.IA = { MODELE, active, cle, appeler, analyserPhoto, nettoyer, verifierCle, redimensionner, SCHEMA_ARTICLES, schemaTicket, poidsEtPrixKilo };
})(typeof window !== 'undefined' ? window : globalThis);
