// Données de départ de « Ma Table » — engendrées depuis le contenu de départ ; modifiables.
// Aucune donnée personnelle ici : les prénoms et goûts de la famille se saisissent dans Profil.
(function (racine) {
  racine.MaTable = racine.MaTable || {};
  racine.MaTable.RECETTES_DEPART = [
 {
  "id": "r1",
  "titre": "Croque-monsieur à l'air fryer",
  "description": "Doré dehors, fondant dedans.",
  "creneau": "matin",
  "minutes": 12,
  "cuisson": "airfryer",
  "portions": 3,
  "ingredients": [
   {
    "nom": "Pain de mie complet",
    "qte": 6,
    "unite": "tranches"
   },
   {
    "nom": "Jambon blanc",
    "qte": 3,
    "unite": "tranches"
   },
   {
    "nom": "Emmental râpé",
    "qte": 90,
    "unite": "g"
   },
   {
    "nom": "Beurre",
    "qte": 15,
    "unite": "g"
   }
  ],
  "etapes": [
   "Beurrer légèrement les tranches de pain.",
   "Garnir de jambon et de fromage, refermer.",
   "Air fryer 180°C, 8 min, retourner à mi-cuisson."
  ],
  "badges": [
   "enfant",
   "airfryer"
  ],
  "astuceEnfant": "Découpe-les en triangles : « les voiles de bateau ».",
  "conservation": "À déguster aussitôt.",
  "conservationJours": 0,
  "proteine": "charcuterie",
  "emoji": "🥪",
  "origine": "depart"
 },
 {
  "id": "r2",
  "titre": "Œufs brouillés crémeux",
  "description": "Doux et protéinés pour bien démarrer.",
  "creneau": "matin",
  "minutes": 8,
  "cuisson": "plaques",
  "portions": 3,
  "ingredients": [
   {
    "nom": "Œufs",
    "qte": 5,
    "unite": "pièces"
   },
   {
    "nom": "Lait",
    "qte": 3,
    "unite": "c. à soupe"
   },
   {
    "nom": "Beurre",
    "qte": 10,
    "unite": "g"
   },
   {
    "nom": "Ciboulette",
    "qte": 1,
    "unite": "botte"
   }
  ],
  "etapes": [
   "Battre les œufs avec le lait.",
   "Cuire à feu doux en remuant sans cesse.",
   "Retirer encore baveux, parsemer de ciboulette."
  ],
  "badges": [
   "leger"
  ],
  "astuceEnfant": null,
  "conservation": "Consommer immédiatement.",
  "conservationJours": 0,
  "proteine": "œufs",
  "emoji": "🍳",
  "origine": "depart"
 },
 {
  "id": "r3",
  "titre": "Œuf au plat & pain complet",
  "description": "Le classique du matin.",
  "creneau": "matin",
  "minutes": 7,
  "cuisson": "plaques",
  "portions": 3,
  "ingredients": [
   {
    "nom": "Œufs",
    "qte": 3,
    "unite": "pièces"
   },
   {
    "nom": "Pain complet",
    "qte": 3,
    "unite": "tranches"
   },
   {
    "nom": "Huile d'olive",
    "qte": 1,
    "unite": "c. à soupe"
   }
  ],
  "etapes": [
   "Chauffer un filet d'huile.",
   "Casser l'œuf, cuire 3 min à couvert.",
   "Servir avec le pain grillé."
  ],
  "badges": [
   "enfant",
   "leger"
  ],
  "astuceEnfant": "Un « œuf soleil » posé sur le toast.",
  "conservation": "Immédiat.",
  "conservationJours": 0,
  "proteine": "œufs",
  "emoji": "🍳",
  "origine": "depart"
 },
 {
  "id": "r4",
  "titre": "Porridge avoine & banane",
  "description": "Réconfortant et rassasiant.",
  "creneau": "matin",
  "minutes": 10,
  "cuisson": "plaques",
  "portions": 3,
  "ingredients": [
   {
    "nom": "Flocons d'avoine",
    "qte": 120,
    "unite": "g"
   },
   {
    "nom": "Lait",
    "qte": 400,
    "unite": "ml"
   },
   {
    "nom": "Banane",
    "qte": 2,
    "unite": "pièces"
   },
   {
    "nom": "Cannelle",
    "qte": 1,
    "unite": "pincée"
   }
  ],
  "etapes": [
   "Chauffer le lait avec l'avoine 5 min.",
   "Écraser une banane dans le porridge.",
   "Garnir de rondelles et de cannelle."
  ],
  "badges": [
   "enfant"
  ],
  "astuceEnfant": "Laisse-la dessiner un visage avec les rondelles.",
  "conservation": "Se garde 2 jours au frais.",
  "conservationJours": 2,
  "proteine": "végétal",
  "emoji": "🥣",
  "origine": "depart"
 },
 {
  "id": "r5",
  "titre": "Fromage blanc, fruits & granola",
  "description": "Zéro cuisson, riche en protéines.",
  "creneau": "matin",
  "minutes": 5,
  "cuisson": "aucun",
  "portions": 3,
  "ingredients": [
   {
    "nom": "Fromage blanc",
    "qte": 500,
    "unite": "g"
   },
   {
    "nom": "Fruits frais",
    "qte": 300,
    "unite": "g"
   },
   {
    "nom": "Granola",
    "qte": 90,
    "unite": "g"
   },
   {
    "nom": "Miel",
    "qte": 2,
    "unite": "c. à café"
   }
  ],
  "etapes": [
   "Répartir le fromage blanc dans 3 bols.",
   "Ajouter les fruits coupés.",
   "Parsemer de granola et d'un filet de miel."
  ],
  "badges": [
   "enfant",
   "leger"
  ],
  "astuceEnfant": "Laisse-la composer son bol elle-même.",
  "conservation": "Fruits coupés : 24 h au frais.",
  "conservationJours": 1,
  "proteine": "fromage",
  "emoji": "🍓",
  "origine": "depart"
 },
 {
  "id": "r6",
  "titre": "Omelette aux herbes & tomates",
  "description": "Légère et parfumée.",
  "creneau": "matin",
  "minutes": 10,
  "cuisson": "plaques",
  "portions": 3,
  "ingredients": [
   {
    "nom": "Œufs",
    "qte": 5,
    "unite": "pièces"
   },
   {
    "nom": "Tomates cerises",
    "qte": 150,
    "unite": "g"
   },
   {
    "nom": "Persil",
    "qte": 1,
    "unite": "botte"
   },
   {
    "nom": "Huile d'olive",
    "qte": 1,
    "unite": "c. à soupe"
   }
  ],
  "etapes": [
   "Battre les œufs avec les herbes.",
   "Saisir les tomates coupées 2 min.",
   "Verser les œufs, cuire 4 min."
  ],
  "badges": [
   "leger"
  ],
  "astuceEnfant": null,
  "conservation": "Immédiat.",
  "conservationJours": 0,
  "proteine": "œufs",
  "emoji": "🍅",
  "origine": "depart"
 },
 {
  "id": "r7",
  "titre": "Poêlée de gnocchis, épinards & ricotta",
  "description": "Une poêlée douce prête en 20 min.",
  "creneau": "soir",
  "minutes": 20,
  "cuisson": "plaques",
  "portions": 3,
  "ingredients": [
   {
    "nom": "Gnocchis",
    "qte": 500,
    "unite": "g"
   },
   {
    "nom": "Épinards frais",
    "qte": 300,
    "unite": "g"
   },
   {
    "nom": "Ricotta",
    "qte": 200,
    "unite": "g"
   },
   {
    "nom": "Parmesan",
    "qte": 40,
    "unite": "g"
   }
  ],
  "etapes": [
   "Poêler les gnocchis 8 min pour les dorer.",
   "Ajouter les épinards, laisser tomber 3 min.",
   "Mélanger la ricotta hors du feu, parmesan."
  ],
  "badges": [
   "enfant",
   "rechauffer"
  ],
  "astuceEnfant": "Appelle-les « petits oreillers ».",
  "conservation": "2 jours au frais.",
  "conservationJours": 2,
  "proteine": "fromage",
  "emoji": "🥔",
  "origine": "depart"
 },
 {
  "id": "r8",
  "titre": "Saumon air fryer & brocolis",
  "description": "Croustillant dehors, fondant dedans.",
  "creneau": "soir",
  "minutes": 18,
  "cuisson": "airfryer",
  "portions": 3,
  "ingredients": [
   {
    "nom": "Pavés de saumon",
    "qte": 3,
    "unite": "pièces"
   },
   {
    "nom": "Brocolis",
    "qte": 500,
    "unite": "g"
   },
   {
    "nom": "Citron",
    "qte": 1,
    "unite": "pièce"
   },
   {
    "nom": "Huile d'olive",
    "qte": 1,
    "unite": "c. à soupe"
   }
  ],
  "etapes": [
   "Air fryer 200°C : brocolis huilés 10 min.",
   "Ajouter le saumon 8 min.",
   "Arroser de citron avant de servir."
  ],
  "badges": [
   "leger",
   "airfryer"
  ],
  "astuceEnfant": "Les « petits arbres » à croquer avec les doigts.",
  "conservation": "2 jours au frais.",
  "conservationJours": 2,
  "proteine": "poisson",
  "emoji": "🐟",
  "origine": "depart"
 },
 {
  "id": "r9",
  "titre": "Wok de dinde aux légumes croquants",
  "description": "Rapide, coloré, léger.",
  "creneau": "soir",
  "minutes": 20,
  "cuisson": "plaques",
  "portions": 3,
  "ingredients": [
   {
    "nom": "Escalopes de dinde",
    "qte": 450,
    "unite": "g"
   },
   {
    "nom": "Poivrons",
    "qte": 2,
    "unite": "pièces"
   },
   {
    "nom": "Carottes",
    "qte": 2,
    "unite": "pièces"
   },
   {
    "nom": "Sauce soja",
    "qte": 2,
    "unite": "c. à soupe"
   }
  ],
  "etapes": [
   "Saisir la dinde en lamelles 5 min.",
   "Ajouter les légumes en bâtonnets, 7 min.",
   "Déglacer à la sauce soja."
  ],
  "badges": [
   "leger",
   "rechauffer"
  ],
  "astuceEnfant": null,
  "conservation": "2 jours au frais.",
  "conservationJours": 2,
  "proteine": "volaille",
  "emoji": "🥢",
  "origine": "depart"
 },
 {
  "id": "r10",
  "titre": "Galettes de sarrasin œuf-jambon",
  "description": "Complètes et ludiques.",
  "creneau": "soir",
  "minutes": 20,
  "cuisson": "plaques",
  "portions": 3,
  "ingredients": [
   {
    "nom": "Galettes de sarrasin",
    "qte": 3,
    "unite": "pièces"
   },
   {
    "nom": "Œufs",
    "qte": 3,
    "unite": "pièces"
   },
   {
    "nom": "Jambon blanc",
    "qte": 3,
    "unite": "tranches"
   },
   {
    "nom": "Emmental râpé",
    "qte": 80,
    "unite": "g"
   }
  ],
  "etapes": [
   "Chauffer la galette à la poêle.",
   "Casser un œuf au centre, ajouter jambon et fromage.",
   "Replier les bords, couvrir 4 min."
  ],
  "badges": [
   "enfant"
  ],
  "astuceEnfant": "La « galette enveloppe » à plier ensemble.",
  "conservation": "Immédiat.",
  "conservationJours": 0,
  "proteine": "œufs",
  "emoji": "🥞",
  "origine": "depart"
 },
 {
  "id": "r11",
  "titre": "Soupe minute courgette-chèvre",
  "description": "Velouté express.",
  "creneau": "soir",
  "minutes": 20,
  "cuisson": "cookeo",
  "portions": 3,
  "ingredients": [
   {
    "nom": "Courgettes",
    "qte": 800,
    "unite": "g"
   },
   {
    "nom": "Fromage de chèvre frais",
    "qte": 100,
    "unite": "g"
   },
   {
    "nom": "Oignon",
    "qte": 1,
    "unite": "pièce"
   },
   {
    "nom": "Bouillon de légumes",
    "qte": 700,
    "unite": "ml"
   }
  ],
  "etapes": [
   "Cookeo : rissoler l'oignon 3 min.",
   "Ajouter courgettes et bouillon, cuisson rapide 8 min.",
   "Mixer avec le chèvre."
  ],
  "badges": [
   "leger",
   "cookeo",
   "rechauffer"
  ],
  "astuceEnfant": "Sers-la en tasse, comme un chocolat chaud salé.",
  "conservation": "3 jours au frais, 3 mois congelée.",
  "conservationJours": 3,
  "proteine": "fromage",
  "emoji": "🥣",
  "origine": "depart"
 },
 {
  "id": "r12",
  "titre": "Tacos maison de poulet mariné",
  "description": "Le repas plaisir du week-end.",
  "creneau": "soir",
  "minutes": 25,
  "cuisson": "plaques",
  "portions": 3,
  "ingredients": [
   {
    "nom": "Filets de poulet",
    "qte": 450,
    "unite": "g"
   },
   {
    "nom": "Tortillas",
    "qte": 6,
    "unite": "pièces"
   },
   {
    "nom": "Maïs",
    "qte": 150,
    "unite": "g"
   },
   {
    "nom": "Yaourt nature",
    "qte": 150,
    "unite": "g"
   },
   {
    "nom": "Paprika fumé",
    "qte": 2,
    "unite": "c. à café"
   }
  ],
  "etapes": [
   "Mariner le poulet au paprika 10 min.",
   "Saisir 8 min, effilocher.",
   "Chauffer les tortillas et garnir à table."
  ],
  "badges": [
   "enfant",
   "plaisir"
  ],
  "astuceEnfant": "Chacun compose son taco : elle adore choisir.",
  "conservation": "Garnitures : 2 jours au frais.",
  "conservationJours": 2,
  "proteine": "volaille",
  "emoji": "🌮",
  "origine": "depart"
 },
 {
  "id": "r13",
  "titre": "Papillote de cabillaud au citron",
  "description": "Cuisson douce, zéro vaisselle.",
  "creneau": "soir",
  "minutes": 22,
  "cuisson": "four",
  "portions": 3,
  "ingredients": [
   {
    "nom": "Filets de cabillaud",
    "qte": 3,
    "unite": "pièces"
   },
   {
    "nom": "Courgette",
    "qte": 1,
    "unite": "pièce"
   },
   {
    "nom": "Citron",
    "qte": 1,
    "unite": "pièce"
   },
   {
    "nom": "Aneth",
    "qte": 1,
    "unite": "botte"
   }
  ],
  "etapes": [
   "Préchauffer le four à 200°C.",
   "Disposer poisson, légumes, citron dans du papier cuisson.",
   "Fermer et cuire 15 min."
  ],
  "badges": [
   "leger"
  ],
  "astuceEnfant": "Ouvrir la papillote à table : effet surprise.",
  "conservation": "24 h au frais.",
  "conservationJours": 1,
  "proteine": "poisson",
  "emoji": "🐟",
  "origine": "depart"
 },
 {
  "id": "r14",
  "titre": "Pâtes complètes pesto & petits pois",
  "description": "Vert, doux, rapide.",
  "creneau": "soir",
  "minutes": 18,
  "cuisson": "plaques",
  "portions": 3,
  "ingredients": [
   {
    "nom": "Pâtes complètes",
    "qte": 300,
    "unite": "g"
   },
   {
    "nom": "Petits pois surgelés",
    "qte": 250,
    "unite": "g"
   },
   {
    "nom": "Pesto",
    "qte": 3,
    "unite": "c. à soupe"
   },
   {
    "nom": "Parmesan",
    "qte": 40,
    "unite": "g"
   }
  ],
  "etapes": [
   "Cuire les pâtes, ajouter les petits pois 4 min avant la fin.",
   "Égoutter, mélanger au pesto.",
   "Parsemer de parmesan."
  ],
  "badges": [
   "enfant",
   "rechauffer"
  ],
  "astuceEnfant": "Le « plat de la forêt » tout vert.",
  "conservation": "2 jours au frais.",
  "conservationJours": 2,
  "proteine": "végétal",
  "emoji": "🍝",
  "origine": "depart"
 },
 {
  "id": "r15",
  "titre": "Salade tiède lentilles & œuf mollet",
  "description": "Protéines végétales et gourmandise.",
  "creneau": "soir",
  "minutes": 20,
  "cuisson": "plaques",
  "portions": 3,
  "ingredients": [
   {
    "nom": "Lentilles vertes",
    "qte": 200,
    "unite": "g"
   },
   {
    "nom": "Œufs",
    "qte": 3,
    "unite": "pièces"
   },
   {
    "nom": "Échalote",
    "qte": 1,
    "unite": "pièce"
   },
   {
    "nom": "Moutarde",
    "qte": 1,
    "unite": "c. à café"
   }
  ],
  "etapes": [
   "Cuire les lentilles 18 min.",
   "Œufs mollets 6 min.",
   "Assaisonner moutarde-échalote, poser les œufs."
  ],
  "badges": [
   "leger",
   "lunchbox"
  ],
  "astuceEnfant": null,
  "conservation": "3 jours au frais.",
  "conservationJours": 3,
  "proteine": "légumineuses",
  "emoji": "🥗",
  "origine": "depart"
 },
 {
  "id": "r16",
  "titre": "Croquettes de légumes à l'air fryer",
  "description": "Pour faire aimer les légumes.",
  "creneau": "soir",
  "minutes": 22,
  "cuisson": "airfryer",
  "portions": 3,
  "ingredients": [
   {
    "nom": "Carottes",
    "qte": 300,
    "unite": "g"
   },
   {
    "nom": "Pomme de terre",
    "qte": 300,
    "unite": "g"
   },
   {
    "nom": "Chapelure",
    "qte": 80,
    "unite": "g"
   },
   {
    "nom": "Œuf",
    "qte": 1,
    "unite": "pièce"
   }
  ],
  "etapes": [
   "Râper les légumes, mélanger œuf et chapelure.",
   "Former des croquettes.",
   "Air fryer 190°C, 14 min."
  ],
  "badges": [
   "enfant",
   "airfryer",
   "rechauffer"
  ],
  "astuceEnfant": "Elles ressemblent à des nuggets : succès garanti.",
  "conservation": "2 jours au frais.",
  "conservationJours": 2,
  "proteine": "œufs",
  "emoji": "🥕",
  "origine": "depart"
 },
 {
  "id": "r17",
  "titre": "Omelette espagnole express",
  "description": "Un plat unique généreux.",
  "creneau": "soir",
  "minutes": 25,
  "cuisson": "plaques",
  "portions": 3,
  "ingredients": [
   {
    "nom": "Pommes de terre",
    "qte": 500,
    "unite": "g"
   },
   {
    "nom": "Œufs",
    "qte": 6,
    "unite": "pièces"
   },
   {
    "nom": "Oignon",
    "qte": 1,
    "unite": "pièce"
   },
   {
    "nom": "Huile d'olive",
    "qte": 2,
    "unite": "c. à soupe"
   }
  ],
  "etapes": [
   "Poêler pommes de terre et oignon 12 min.",
   "Verser les œufs battus.",
   "Cuire 8 min à couvert, retourner."
  ],
  "badges": [
   "rechauffer",
   "lunchbox"
  ],
  "astuceEnfant": null,
  "conservation": "3 jours au frais, se mange froid.",
  "conservationJours": 3,
  "proteine": "œufs",
  "emoji": "🥘",
  "origine": "depart"
 },
 {
  "id": "r18",
  "titre": "Bowl de riz complet, thon & avocat",
  "description": "Assemblage sans cuisson si le riz est prêt.",
  "creneau": "soir",
  "minutes": 15,
  "cuisson": "aucun",
  "portions": 3,
  "ingredients": [
   {
    "nom": "Riz complet cuit",
    "qte": 400,
    "unite": "g"
   },
   {
    "nom": "Thon au naturel",
    "qte": 2,
    "unite": "boîtes"
   },
   {
    "nom": "Avocat",
    "qte": 1,
    "unite": "pièce"
   },
   {
    "nom": "Concombre",
    "qte": 1,
    "unite": "pièce"
   }
  ],
  "etapes": [
   "Répartir le riz dans les bols.",
   "Ajouter thon, avocat, concombre.",
   "Assaisonner citron-huile d'olive."
  ],
  "badges": [
   "leger",
   "lunchbox",
   "rechauffer"
  ],
  "astuceEnfant": null,
  "conservation": "24 h au frais.",
  "conservationJours": 1,
  "proteine": "poisson",
  "emoji": "🍚",
  "origine": "depart"
 },
 {
  "id": "r19",
  "titre": "Risotto crémeux aux champignons",
  "description": "Onctueux au Cookeo, sans remuer.",
  "creneau": "soir",
  "minutes": 25,
  "cuisson": "cookeo",
  "portions": 3,
  "ingredients": [
   {
    "nom": "Riz à risotto",
    "qte": 300,
    "unite": "g"
   },
   {
    "nom": "Champignons de Paris",
    "qte": 400,
    "unite": "g"
   },
   {
    "nom": "Bouillon de légumes",
    "qte": 700,
    "unite": "ml"
   },
   {
    "nom": "Parmesan",
    "qte": 60,
    "unite": "g"
   }
  ],
  "etapes": [
   "Cookeo : rissoler champignons et oignon 5 min.",
   "Ajouter riz et bouillon, cuisson sous pression 7 min.",
   "Mélanger le parmesan."
  ],
  "badges": [
   "cookeo",
   "rechauffer"
  ],
  "astuceEnfant": null,
  "conservation": "2 jours au frais.",
  "conservationJours": 2,
  "proteine": "végétal",
  "emoji": "🍄",
  "origine": "depart"
 },
 {
  "id": "r20",
  "titre": "Curry de pois chiches au lait de coco",
  "description": "Végétal, doux, parfumé.",
  "creneau": "soir",
  "minutes": 25,
  "cuisson": "cookeo",
  "portions": 3,
  "ingredients": [
   {
    "nom": "Pois chiches",
    "qte": 500,
    "unite": "g"
   },
   {
    "nom": "Lait de coco",
    "qte": 400,
    "unite": "ml"
   },
   {
    "nom": "Tomates concassées",
    "qte": 400,
    "unite": "g"
   },
   {
    "nom": "Curry doux",
    "qte": 2,
    "unite": "c. à café"
   }
  ],
  "etapes": [
   "Cookeo : rissoler oignon et curry 3 min.",
   "Ajouter pois chiches, tomates, coco.",
   "Cuisson sous pression 8 min."
  ],
  "badges": [
   "leger",
   "cookeo",
   "batch",
   "lunchbox"
  ],
  "astuceEnfant": "Curry très doux et un peu de riz blanc à côté.",
  "conservation": "4 jours au frais, 3 mois congelé.",
  "conservationJours": 4,
  "proteine": "légumineuses",
  "emoji": "🍛",
  "origine": "depart"
 },
 {
  "id": "r21",
  "titre": "Blanquette de dinde légère",
  "description": "Version allégée d'un grand classique.",
  "creneau": "soir",
  "minutes": 35,
  "cuisson": "cookeo",
  "portions": 3,
  "ingredients": [
   {
    "nom": "Escalopes de dinde",
    "qte": 600,
    "unite": "g"
   },
   {
    "nom": "Carottes",
    "qte": 4,
    "unite": "pièces"
   },
   {
    "nom": "Champignons",
    "qte": 300,
    "unite": "g"
   },
   {
    "nom": "Crème légère",
    "qte": 150,
    "unite": "ml"
   }
  ],
  "etapes": [
   "Cookeo : dorer la dinde 5 min.",
   "Ajouter légumes et bouillon, sous pression 15 min.",
   "Incorporer la crème en fin de cuisson."
  ],
  "badges": [
   "cookeo",
   "rechauffer"
  ],
  "astuceEnfant": null,
  "conservation": "3 jours au frais.",
  "conservationJours": 3,
  "proteine": "volaille",
  "emoji": "🍲",
  "origine": "depart"
 },
 {
  "id": "r22",
  "titre": "Chili sin carne",
  "description": "Base parfaite pour les lunch boxes.",
  "creneau": "soir",
  "minutes": 30,
  "cuisson": "cookeo",
  "portions": 3,
  "ingredients": [
   {
    "nom": "Haricots rouges",
    "qte": 500,
    "unite": "g"
   },
   {
    "nom": "Tomates concassées",
    "qte": 800,
    "unite": "g"
   },
   {
    "nom": "Poivrons",
    "qte": 2,
    "unite": "pièces"
   },
   {
    "nom": "Maïs",
    "qte": 200,
    "unite": "g"
   },
   {
    "nom": "Cumin",
    "qte": 2,
    "unite": "c. à café"
   }
  ],
  "etapes": [
   "Cookeo : rissoler légumes et épices 5 min.",
   "Ajouter haricots et tomates.",
   "Sous pression 12 min."
  ],
  "badges": [
   "batch",
   "lunchbox",
   "leger",
   "cookeo",
   "rechauffer"
  ],
  "astuceEnfant": "Sers-le avec du fromage râpé à saupoudrer.",
  "conservation": "4 jours au frais, 3 mois congelé.",
  "conservationJours": 4,
  "proteine": "légumineuses",
  "emoji": "🌶️",
  "origine": "depart"
 },
 {
  "id": "r23",
  "titre": "Velouté de potimarron",
  "description": "Doux et velouté, sans crème.",
  "creneau": "soir",
  "minutes": 20,
  "cuisson": "cookeo",
  "portions": 3,
  "ingredients": [
   {
    "nom": "Potimarron",
    "qte": 900,
    "unite": "g"
   },
   {
    "nom": "Oignon",
    "qte": 1,
    "unite": "pièce"
   },
   {
    "nom": "Bouillon de légumes",
    "qte": 700,
    "unite": "ml"
   },
   {
    "nom": "Noisettes",
    "qte": 30,
    "unite": "g"
   }
  ],
  "etapes": [
   "Cookeo : rissoler l'oignon 3 min.",
   "Ajouter potimarron et bouillon, sous pression 8 min.",
   "Mixer, parsemer de noisettes."
  ],
  "badges": [
   "leger",
   "cookeo",
   "batch",
   "rechauffer"
  ],
  "astuceEnfant": "Un tourbillon de crème dessine une fleur.",
  "conservation": "4 jours au frais, 3 mois congelé.",
  "conservationJours": 4,
  "proteine": "végétal",
  "emoji": "🎃",
  "origine": "depart"
 },
 {
  "id": "r24",
  "titre": "Poulet basquaise",
  "description": "Mijoté ensoleillé.",
  "creneau": "soir",
  "minutes": 30,
  "cuisson": "cookeo",
  "portions": 3,
  "ingredients": [
   {
    "nom": "Cuisses de poulet",
    "qte": 3,
    "unite": "pièces"
   },
   {
    "nom": "Poivrons",
    "qte": 3,
    "unite": "pièces"
   },
   {
    "nom": "Tomates",
    "qte": 500,
    "unite": "g"
   },
   {
    "nom": "Riz complet",
    "qte": 250,
    "unite": "g"
   }
  ],
  "etapes": [
   "Cookeo : dorer le poulet 6 min.",
   "Ajouter poivrons et tomates, sous pression 15 min.",
   "Servir avec le riz complet."
  ],
  "badges": [
   "cookeo",
   "rechauffer"
  ],
  "astuceEnfant": null,
  "conservation": "3 jours au frais.",
  "conservationJours": 3,
  "proteine": "volaille",
  "emoji": "🍗",
  "origine": "depart"
 },
 {
  "id": "r25",
  "titre": "Bœuf carottes façon grand-mère",
  "description": "Le plat plaisir du dimanche.",
  "creneau": "soir",
  "minutes": 45,
  "cuisson": "cookeo",
  "portions": 3,
  "ingredients": [
   {
    "nom": "Bœuf à braiser",
    "qte": 700,
    "unite": "g"
   },
   {
    "nom": "Carottes",
    "qte": 6,
    "unite": "pièces"
   },
   {
    "nom": "Oignons",
    "qte": 2,
    "unite": "pièces"
   },
   {
    "nom": "Bouquet garni",
    "qte": 1,
    "unite": "pièce"
   }
  ],
  "etapes": [
   "Cookeo : saisir la viande 8 min.",
   "Ajouter légumes, bouillon, bouquet garni.",
   "Sous pression 30 min."
  ],
  "badges": [
   "plaisir",
   "cookeo",
   "batch",
   "rechauffer"
  ],
  "astuceEnfant": null,
  "conservation": "4 jours au frais, 3 mois congelé.",
  "conservationJours": 4,
  "proteine": "viande rouge",
  "emoji": "🥩",
  "origine": "depart"
 },
 {
  "id": "r26",
  "titre": "Dahl de lentilles corail",
  "description": "Très doux, très aimé des enfants.",
  "creneau": "soir",
  "minutes": 25,
  "cuisson": "cookeo",
  "portions": 3,
  "ingredients": [
   {
    "nom": "Lentilles corail",
    "qte": 300,
    "unite": "g"
   },
   {
    "nom": "Lait de coco",
    "qte": 200,
    "unite": "ml"
   },
   {
    "nom": "Tomates concassées",
    "qte": 400,
    "unite": "g"
   },
   {
    "nom": "Curcuma",
    "qte": 1,
    "unite": "c. à café"
   }
  ],
  "etapes": [
   "Cookeo : rissoler oignon et épices 3 min.",
   "Ajouter lentilles, tomates, coco et eau.",
   "Sous pression 8 min."
  ],
  "badges": [
   "enfant",
   "leger",
   "cookeo",
   "batch",
   "lunchbox",
   "rechauffer"
  ],
  "astuceEnfant": "Sa couleur orange « soleil » plaît beaucoup.",
  "conservation": "4 jours au frais, 3 mois congelé.",
  "conservationJours": 4,
  "proteine": "légumineuses",
  "emoji": "🍛",
  "origine": "depart"
 },
 {
  "id": "r27",
  "titre": "Ratatouille fondante",
  "description": "La base légumes de la semaine.",
  "creneau": "soir",
  "minutes": 30,
  "cuisson": "cookeo",
  "portions": 3,
  "ingredients": [
   {
    "nom": "Aubergine",
    "qte": 1,
    "unite": "pièce"
   },
   {
    "nom": "Courgettes",
    "qte": 2,
    "unite": "pièces"
   },
   {
    "nom": "Poivrons",
    "qte": 2,
    "unite": "pièces"
   },
   {
    "nom": "Tomates",
    "qte": 600,
    "unite": "g"
   }
  ],
  "etapes": [
   "Cookeo : rissoler les légumes 8 min.",
   "Ajouter tomates et herbes.",
   "Mijotage 15 min."
  ],
  "badges": [
   "leger",
   "cookeo",
   "batch",
   "rechauffer"
  ],
  "astuceEnfant": "Coupe les légumes en tout petits dés « confettis ».",
  "conservation": "4 jours au frais, 3 mois congelée.",
  "conservationJours": 4,
  "proteine": "végétal",
  "emoji": "🍆",
  "origine": "depart"
 },
 {
  "id": "r28",
  "titre": "Riz pilaf aux petits légumes",
  "description": "Base neutre pour les lunch boxes.",
  "creneau": "soir",
  "minutes": 20,
  "cuisson": "cookeo",
  "portions": 3,
  "ingredients": [
   {
    "nom": "Riz complet",
    "qte": 400,
    "unite": "g"
   },
   {
    "nom": "Petits pois surgelés",
    "qte": 200,
    "unite": "g"
   },
   {
    "nom": "Carottes",
    "qte": 2,
    "unite": "pièces"
   },
   {
    "nom": "Bouillon de légumes",
    "qte": 600,
    "unite": "ml"
   }
  ],
  "etapes": [
   "Cookeo : rissoler carottes et riz 3 min.",
   "Ajouter bouillon, sous pression 10 min.",
   "Incorporer les petits pois."
  ],
  "badges": [
   "batch",
   "lunchbox",
   "cookeo",
   "rechauffer"
  ],
  "astuceEnfant": null,
  "conservation": "4 jours au frais.",
  "conservationJours": 4,
  "proteine": "végétal",
  "emoji": "🍚",
  "origine": "depart"
 },
 {
  "id": "r29",
  "titre": "Poulet croustillant panko à l'air fryer",
  "description": "Croustillant sans friture.",
  "creneau": "soir",
  "minutes": 22,
  "cuisson": "airfryer",
  "portions": 3,
  "ingredients": [
   {
    "nom": "Filets de poulet",
    "qte": 500,
    "unite": "g"
   },
   {
    "nom": "Chapelure panko",
    "qte": 100,
    "unite": "g"
   },
   {
    "nom": "Œuf",
    "qte": 1,
    "unite": "pièce"
   },
   {
    "nom": "Paprika",
    "qte": 1,
    "unite": "c. à café"
   }
  ],
  "etapes": [
   "Paner le poulet œuf puis panko.",
   "Air fryer 200°C, 16 min en retournant.",
   "Servir avec une salade."
  ],
  "badges": [
   "enfant",
   "airfryer",
   "lunchbox"
  ],
  "astuceEnfant": "Des « bâtonnets dorés » à tremper dans un yaourt-citron.",
  "conservation": "2 jours au frais.",
  "conservationJours": 2,
  "proteine": "volaille",
  "emoji": "🍗",
  "origine": "depart"
 },
 {
  "id": "r30",
  "titre": "Frites de patate douce",
  "description": "Sucrées-salées, irrésistibles.",
  "creneau": "soir",
  "minutes": 20,
  "cuisson": "airfryer",
  "portions": 3,
  "ingredients": [
   {
    "nom": "Patates douces",
    "qte": 700,
    "unite": "g"
   },
   {
    "nom": "Huile d'olive",
    "qte": 1,
    "unite": "c. à soupe"
   },
   {
    "nom": "Paprika fumé",
    "qte": 1,
    "unite": "c. à café"
   }
  ],
  "etapes": [
   "Couper en bâtonnets réguliers.",
   "Mélanger huile et épices.",
   "Air fryer 190°C, 16 min."
  ],
  "badges": [
   "enfant",
   "airfryer"
  ],
  "astuceEnfant": "Les « frites orange » : elle en redemande.",
  "conservation": "24 h au frais.",
  "conservationJours": 1,
  "proteine": "végétal",
  "emoji": "🍠",
  "origine": "depart"
 },
 {
  "id": "r31",
  "titre": "Nuggets maison de poulet",
  "description": "Bien meilleurs que les industriels.",
  "creneau": "soir",
  "minutes": 18,
  "cuisson": "airfryer",
  "portions": 3,
  "ingredients": [
   {
    "nom": "Filets de poulet",
    "qte": 450,
    "unite": "g"
   },
   {
    "nom": "Chapelure",
    "qte": 80,
    "unite": "g"
   },
   {
    "nom": "Œuf",
    "qte": 1,
    "unite": "pièce"
   },
   {
    "nom": "Parmesan",
    "qte": 30,
    "unite": "g"
   }
  ],
  "etapes": [
   "Couper le poulet en cubes.",
   "Paner œuf, chapelure et parmesan.",
   "Air fryer 200°C, 12 min."
  ],
  "badges": [
   "enfant",
   "airfryer",
   "lunchbox"
  ],
  "astuceEnfant": "Laisse-la aider à la panure : elle mange ce qu'elle prépare.",
  "conservation": "2 jours au frais, 2 mois congelés.",
  "conservationJours": 2,
  "proteine": "volaille",
  "emoji": "🍤",
  "origine": "depart"
 },
 {
  "id": "r32",
  "titre": "Légumes rôtis au paprika",
  "description": "Un plateau de légumes qui part vite.",
  "creneau": "soir",
  "minutes": 20,
  "cuisson": "airfryer",
  "portions": 3,
  "ingredients": [
   {
    "nom": "Courgette",
    "qte": 1,
    "unite": "pièce"
   },
   {
    "nom": "Poivron",
    "qte": 1,
    "unite": "pièce"
   },
   {
    "nom": "Carottes",
    "qte": 3,
    "unite": "pièces"
   },
   {
    "nom": "Huile d'olive",
    "qte": 1,
    "unite": "c. à soupe"
   }
  ],
  "etapes": [
   "Couper les légumes en morceaux égaux.",
   "Assaisonner.",
   "Air fryer 190°C, 16 min en secouant."
  ],
  "badges": [
   "leger",
   "airfryer",
   "batch"
  ],
  "astuceEnfant": null,
  "conservation": "3 jours au frais.",
  "conservationJours": 3,
  "proteine": "végétal",
  "emoji": "🫑",
  "origine": "depart"
 },
 {
  "id": "r33",
  "titre": "Falafels maison",
  "description": "Parfaits en lunch box.",
  "creneau": "soir",
  "minutes": 25,
  "cuisson": "airfryer",
  "portions": 3,
  "ingredients": [
   {
    "nom": "Pois chiches",
    "qte": 400,
    "unite": "g"
   },
   {
    "nom": "Persil",
    "qte": 1,
    "unite": "botte"
   },
   {
    "nom": "Ail",
    "qte": 2,
    "unite": "gousses"
   },
   {
    "nom": "Cumin",
    "qte": 1,
    "unite": "c. à café"
   }
  ],
  "etapes": [
   "Mixer tous les ingrédients.",
   "Former des boulettes.",
   "Air fryer 190°C, 15 min."
  ],
  "badges": [
   "airfryer",
   "batch",
   "lunchbox",
   "leger"
  ],
  "astuceEnfant": null,
  "conservation": "3 jours au frais, 2 mois congelés.",
  "conservationJours": 3,
  "proteine": "légumineuses",
  "emoji": "🧆",
  "origine": "depart"
 },
 {
  "id": "r34",
  "titre": "Filet de poisson pané léger",
  "description": "Croustillant, sans matière grasse ajoutée.",
  "creneau": "soir",
  "minutes": 15,
  "cuisson": "airfryer",
  "portions": 3,
  "ingredients": [
   {
    "nom": "Filets de colin",
    "qte": 3,
    "unite": "pièces"
   },
   {
    "nom": "Chapelure",
    "qte": 70,
    "unite": "g"
   },
   {
    "nom": "Citron",
    "qte": 1,
    "unite": "pièce"
   },
   {
    "nom": "Œuf",
    "qte": 1,
    "unite": "pièce"
   }
  ],
  "etapes": [
   "Paner les filets.",
   "Air fryer 190°C, 12 min.",
   "Servir avec un quartier de citron."
  ],
  "badges": [
   "leger",
   "airfryer",
   "enfant"
  ],
  "astuceEnfant": "Un « poisson pané maison » à comparer avec celui du magasin.",
  "conservation": "24 h au frais.",
  "conservationJours": 1,
  "proteine": "poisson",
  "emoji": "🐟",
  "origine": "depart"
 },
 {
  "id": "r35",
  "titre": "Camembert rôti & pain grillé",
  "description": "Le petit plaisir du samedi soir.",
  "creneau": "soir",
  "minutes": 12,
  "cuisson": "airfryer",
  "portions": 3,
  "ingredients": [
   {
    "nom": "Camembert",
    "qte": 1,
    "unite": "pièce"
   },
   {
    "nom": "Pain complet",
    "qte": 1,
    "unite": "pièce"
   },
   {
    "nom": "Miel",
    "qte": 1,
    "unite": "c. à café"
   },
   {
    "nom": "Noix",
    "qte": 30,
    "unite": "g"
   }
  ],
  "etapes": [
   "Inciser le camembert, ajouter miel et noix.",
   "Air fryer 180°C, 8 min.",
   "Tremper les mouillettes de pain."
  ],
  "badges": [
   "plaisir",
   "airfryer"
  ],
  "astuceEnfant": "Les mouillettes à tremper : un jeu à table.",
  "conservation": "Immédiat.",
  "conservationJours": 0,
  "proteine": "fromage",
  "emoji": "🧀",
  "origine": "depart"
 },
 {
  "id": "r36",
  "titre": "Buddha bowl quinoa-poulet",
  "description": "La lunch box équilibrée par excellence.",
  "creneau": "midi",
  "minutes": 30,
  "cuisson": "plaques",
  "portions": 3,
  "ingredients": [
   {
    "nom": "Quinoa",
    "qte": 300,
    "unite": "g"
   },
   {
    "nom": "Filets de poulet",
    "qte": 500,
    "unite": "g"
   },
   {
    "nom": "Carottes",
    "qte": 3,
    "unite": "pièces"
   },
   {
    "nom": "Pois chiches",
    "qte": 250,
    "unite": "g"
   },
   {
    "nom": "Citron",
    "qte": 1,
    "unite": "pièce"
   }
  ],
  "etapes": [
   "Cuire le quinoa 12 min.",
   "Poêler le poulet en dés.",
   "Répartir en boîtes avec légumes râpés et pois chiches."
  ],
  "badges": [
   "batch",
   "lunchbox",
   "leger"
  ],
  "astuceEnfant": null,
  "conservation": "4 jours au frais.",
  "conservationJours": 4,
  "proteine": "volaille",
  "emoji": "🥙",
  "origine": "depart"
 },
 {
  "id": "r37",
  "titre": "Salade de lentilles, feta & tomates",
  "description": "Fraîche et rassasiante, se mange froide.",
  "creneau": "midi",
  "minutes": 25,
  "cuisson": "plaques",
  "portions": 3,
  "ingredients": [
   {
    "nom": "Lentilles vertes",
    "qte": 300,
    "unite": "g"
   },
   {
    "nom": "Feta",
    "qte": 150,
    "unite": "g"
   },
   {
    "nom": "Tomates cerises",
    "qte": 300,
    "unite": "g"
   },
   {
    "nom": "Huile d'olive",
    "qte": 3,
    "unite": "c. à soupe"
   }
  ],
  "etapes": [
   "Cuire les lentilles 18 min, refroidir.",
   "Ajouter feta et tomates.",
   "Assaisonner et répartir en boîtes."
  ],
  "badges": [
   "batch",
   "lunchbox",
   "leger"
  ],
  "astuceEnfant": null,
  "conservation": "4 jours au frais.",
  "conservationJours": 4,
  "proteine": "légumineuses",
  "emoji": "🥗",
  "origine": "depart"
 },
 {
  "id": "r38",
  "titre": "Boulettes de dinde & boulgour",
  "description": "Boulettes moelleuses à décliner.",
  "creneau": "midi",
  "minutes": 35,
  "cuisson": "four",
  "portions": 3,
  "ingredients": [
   {
    "nom": "Dinde hachée",
    "qte": 600,
    "unite": "g"
   },
   {
    "nom": "Boulgour",
    "qte": 300,
    "unite": "g"
   },
   {
    "nom": "Menthe",
    "qte": 1,
    "unite": "botte"
   },
   {
    "nom": "Oignon",
    "qte": 1,
    "unite": "pièce"
   }
  ],
  "etapes": [
   "Mélanger dinde, oignon et menthe, former des boulettes.",
   "Four 200°C, 20 min.",
   "Cuire le boulgour et répartir en boîtes."
  ],
  "badges": [
   "batch",
   "lunchbox",
   "enfant",
   "rechauffer"
  ],
  "astuceEnfant": "Les boulettes se mangent avec les doigts, comme des billes.",
  "conservation": "4 jours au frais, 2 mois congelées.",
  "conservationJours": 4,
  "proteine": "volaille",
  "emoji": "🍡",
  "origine": "depart"
 },
 {
  "id": "r39",
  "titre": "Gratin de légumes d'hiver",
  "description": "Se réchauffe parfaitement en semaine.",
  "creneau": "soir",
  "minutes": 45,
  "cuisson": "four",
  "portions": 3,
  "ingredients": [
   {
    "nom": "Pommes de terre",
    "qte": 700,
    "unite": "g"
   },
   {
    "nom": "Poireaux",
    "qte": 2,
    "unite": "pièces"
   },
   {
    "nom": "Crème légère",
    "qte": 200,
    "unite": "ml"
   },
   {
    "nom": "Emmental râpé",
    "qte": 100,
    "unite": "g"
   }
  ],
  "etapes": [
   "Émincer les légumes, précuire 10 min.",
   "Disposer en plat, crème et fromage.",
   "Four 190°C, 30 min."
  ],
  "badges": [
   "enfant",
   "batch",
   "rechauffer"
  ],
  "astuceEnfant": "Le fromage gratiné convainc même les jours difficiles.",
  "conservation": "3 jours au frais, 2 mois congelé.",
  "conservationJours": 3,
  "proteine": "végétal",
  "emoji": "🧅",
  "origine": "depart"
 },
 {
  "id": "r40",
  "titre": "Cake salé courgette-jambon",
  "description": "Se glisse dans toutes les lunch boxes.",
  "creneau": "midi",
  "minutes": 45,
  "cuisson": "four",
  "portions": 3,
  "ingredients": [
   {
    "nom": "Farine",
    "qte": 200,
    "unite": "g"
   },
   {
    "nom": "Œufs",
    "qte": 3,
    "unite": "pièces"
   },
   {
    "nom": "Courgette",
    "qte": 1,
    "unite": "pièce"
   },
   {
    "nom": "Jambon blanc",
    "qte": 150,
    "unite": "g"
   },
   {
    "nom": "Emmental râpé",
    "qte": 80,
    "unite": "g"
   }
  ],
  "etapes": [
   "Mélanger farine, œufs, lait et huile.",
   "Ajouter courgette râpée, jambon, fromage.",
   "Four 180°C, 35 min."
  ],
  "badges": [
   "enfant",
   "batch",
   "lunchbox"
  ],
  "astuceEnfant": "Une tranche de cake dans la boîte : ça se mange comme un gâteau.",
  "conservation": "3 jours au frais, 2 mois congelé.",
  "conservationJours": 3,
  "proteine": "œufs",
  "emoji": "🍰",
  "origine": "depart"
 },
 {
  "id": "r41",
  "titre": "Poêlée de quinoa aux légumes rôtis",
  "description": "Base végétale colorée.",
  "creneau": "midi",
  "minutes": 30,
  "cuisson": "four",
  "portions": 3,
  "ingredients": [
   {
    "nom": "Quinoa",
    "qte": 300,
    "unite": "g"
   },
   {
    "nom": "Courgette",
    "qte": 1,
    "unite": "pièce"
   },
   {
    "nom": "Poivron",
    "qte": 1,
    "unite": "pièce"
   },
   {
    "nom": "Feta",
    "qte": 100,
    "unite": "g"
   }
  ],
  "etapes": [
   "Rôtir les légumes 20 min au four.",
   "Cuire le quinoa.",
   "Mélanger, ajouter la feta, répartir en boîtes."
  ],
  "badges": [
   "batch",
   "lunchbox",
   "leger"
  ],
  "astuceEnfant": null,
  "conservation": "4 jours au frais.",
  "conservationJours": 4,
  "proteine": "fromage",
  "emoji": "🥗",
  "origine": "depart"
 },
 {
  "id": "r42",
  "titre": "Curry de patate douce & épinards",
  "description": "Végétal et réconfortant.",
  "creneau": "midi",
  "minutes": 30,
  "cuisson": "cookeo",
  "portions": 3,
  "ingredients": [
   {
    "nom": "Patates douces",
    "qte": 700,
    "unite": "g"
   },
   {
    "nom": "Épinards frais",
    "qte": 300,
    "unite": "g"
   },
   {
    "nom": "Lait de coco",
    "qte": 400,
    "unite": "ml"
   },
   {
    "nom": "Curry doux",
    "qte": 2,
    "unite": "c. à café"
   }
  ],
  "etapes": [
   "Cookeo : rissoler oignon et curry 3 min.",
   "Ajouter patates douces et coco, sous pression 10 min.",
   "Incorporer les épinards."
  ],
  "badges": [
   "batch",
   "lunchbox",
   "leger",
   "cookeo",
   "rechauffer"
  ],
  "astuceEnfant": null,
  "conservation": "4 jours au frais, 3 mois congelé.",
  "conservationJours": 4,
  "proteine": "végétal",
  "emoji": "🍛",
  "origine": "depart"
 }
];
})(typeof window !== 'undefined' ? window : globalThis);
