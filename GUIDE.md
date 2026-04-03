# TopClean+ — Guide d'utilisation

## Lien de l'application

**https://dist-theta-seven-13.vercel.app**

---

## Premiere configuration

1. Ouvrir le lien sur ton telephone (Chrome ou Safari)
2. La premiere fois, un ecran de configuration apparait:
   - Mets ton **nom**
   - Choisis un **code PIN** (4 chiffres minimum)
   - Selectionne **"Patron"** comme role
3. C'est tout — tu es dedans

## Installer l'app sur ton telephone

Pour que ca ressemble a une vraie application:

- **Android:** Menu du navigateur (3 points en haut a droite) → "Ajouter a l'ecran d'accueil"
- **iPhone:** Bouton partager (carre avec fleche) → "Sur l'ecran d'accueil"

---

## Les 4 onglets

### Accueil (Tableau de bord)
- CA facture du jour, total encaisse, depenses, net
- Repartition: especes / MoMo / cheque
- Statut de la cloture de caisse (cloturee ou non, ecarts)
- Liste des tickets et depenses en attente d'approbation
- CA par service vs objectif mensuel
- Bouton vert pour telecharger le bilan Excel de la semaine

### Tickets
- La receptionniste cree un ticket par client:
  - Nom du client
  - Service (Pressing, Lessive, Nettoyage, Canape, Desinfection)
  - Nombre de pieces
  - CA facture (montant total)
  - Avance encaissee
  - Mode de paiement (Especes, MoMo, Cheque)
  - Photo optionnelle (recu, articles)
- Quand un client revient payer le reste → ouvrir le ticket → "Ajouter un paiement"
- Le patron approuve ou signale chaque ticket depuis le tableau de bord

### Depenses
- Chaque depense avec **photo du recu obligatoire**
- Description, categorie, montant, fournisseur, mode de paiement
- Le patron approuve chaque depense

### Cloture de caisse
- A faire **chaque soir** en fin de journee:
  1. Compter les especes en caisse → entrer le montant + prendre une photo
  2. Entrer le solde MoMo du matin et du soir + capture d'ecran MoMo
  3. Soumettre
- L'app calcule automatiquement:
  - Especes attendues (tickets cash - depenses cash)
  - MoMo attendu (tickets MoMo)
  - **L'ecart** entre ce qui est attendu et ce qui est en caisse
- Si l'ecart n'est pas zero → il y a un probleme

---

## Le chat (assistant)

L'icone bleu en bas a droite ouvre le chat. Au lieu de remplir les formulaires, tape directement en francais:

| Tu ecris | L'app fait |
|----------|-----------|
| `Mme Adjovi pressing 50000 avance 25000 momo` | Cree un ticket |
| `depense 15000 transport taxi` | Cree une depense |
| `combien aujourd'hui?` | Affiche le resume du jour |
| `en attente` | Liste les approbations en attente |
| `approuve tout` | Approuve tous les tickets et depenses en attente |
| `la caisse est cloturee?` | Verifie le statut de la cloture |
| `telecharger excel` | Telecharge le bilan de la semaine |

---

## Telecharger le fichier Excel

Deux facons:
1. **Depuis le tableau de bord:** Bouton vert "Telecharger le bilan de la semaine"
2. **Depuis le chat:** Taper "telecharger excel"

Le fichier Excel contient 4 feuilles:
- **TICKETS** — Tous les tickets de la semaine
- **DEPENSES** — Toutes les depenses
- **BILAN HEBDO** — Totaux par jour, CA par service vs objectifs, repartition par mode de paiement
- **CLOTURES** — Donnees de cloture avec ecarts especes et MoMo

---

## Informations importantes

- **Pas besoin d'internet** — Les donnees restent sur le telephone. L'app fonctionne meme sans connexion.
- **Un seul telephone** — La receptionniste et le patron utilisent le meme telephone pour l'instant. Les donnees sont stockees localement.
- **Le code PIN** — Protege l'acces a l'application. Ne pas le partager.
- **Les photos** — Elles sont stockees sur le telephone. C'est la preuve independante que l'argent a ete manipule.

## Pour tester

1. Cree 2-3 tickets fictifs (via le formulaire ou le chat)
2. Ajoute une depense avec une photo
3. Fais une cloture de caisse
4. Regarde le tableau de bord — tout est calcule automatiquement
5. Telecharge le fichier Excel pour voir le resultat

---

## Support

Pour toute question ou probleme, contacte Emile.
