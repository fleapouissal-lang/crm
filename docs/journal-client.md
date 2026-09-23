# Journal client

Documentation de la fonctionnalité **Journal client** dans Fusion Leap CRM.

Le journal client est un dossier PDF généré par l’application. Il résume le compte d’un client et les pièces commerciales qui lui sont rattachées (devis et factures).

## À quoi ça sert

Le PDF sert à :

- présenter un client à un collègue, un manager ou un partenaire
- garder une trace écrite du dossier (identité, statut, valeur)
- voir d’un coup d’œil les devis et factures liés au même nom de client
- exporter / imprimer / envoyer le dossier hors du CRM

## Qui peut l’utiliser

1. Se connecter au CRM (compte rattaché à une organisation).
2. Avoir le droit d’accès au module **Clients**.
3. Ouvrir la page **Clients** : `/clients`.

Sans ces droits, la page Clients redirige vers le tableau de bord.

## Comment générer le journal

### Depuis la liste

1. Aller dans **Clients**.
2. Trouver le client (recherche, marché, statut).
3. Ouvrir le menu d’actions de la ligne (`⋯`).
4. Cliquer sur **Journal client**.
5. Attendre la génération.
6. Vérifier l’aperçu, puis cliquer sur **Exporter PDF**.

### Depuis la fiche client

1. Aller dans **Clients**.
2. Ouvrir **Voir les détails**.
3. Cliquer sur **Journal client**.
4. Exporter le PDF.

Le fichier téléchargé a un nom du type :

```text
journal-client-ilm-voyages.pdf
```

## Contenu du PDF

| Section | Contenu |
|---|---|
| En-tête | Nom de la société, titre `JOURNAL CLIENT`, date d’édition |
| Fiche compte | Nom, description, contact, marché, mission, valeur client, statut |
| Synthèse | Nombre de devis, nombre de factures, total facturé, total impayé |
| Devis | Référence, date, prestation, montant, statut |
| Factures | Référence, date, échéance, montant, statut |
| Pied de page | Société + numéro de page |

Si aucun devis ou aucune facture n’est lié au client, le journal l’indique clairement. La fiche compte est toujours générée.

## Comment les documents sont rattachés

Le CRM relie les devis et factures au client par **le nom du client**, sans tenir compte des majuscules ni des espaces en trop.

Exemples qui matchent :

- client `ILM Voyages`
- devis / facture au nom `ILM Voyages` ou `ilm voyages`

Exemples qui ne matchent pas :

- `ILM Voyage` (singulier)
- `ILM Voyages Marrakech` (nom différent)

Pour un journal complet, utilisez **exactement le même nom** sur le client, les devis et les factures.

Les totaux :

- **Facturé** = somme de toutes les factures du client
- **Impayé** = somme des factures `En attente` et `En retard`

## Langue

L’interface suit la langue du CRM (FR / EN / AR).

Le contenu du PDF suit aussi la langue active. Le français est la langue par défaut.

## Fichiers de l’application

| Fichier | Rôle |
|---|---|
| `app/(dashboard)/clients/page.tsx` | Page Clients |
| `components/clients/clients-page-client.tsx` | Liste, actions, ouverture du journal |
| `components/clients/client-detail-dialog.tsx` | Bouton Journal depuis la fiche |
| `components/clients/client-journal-pdf-dialog.tsx` | Aperçu + export PDF |
| `lib/clients/journal.ts` | Lien client ↔ devis / factures, nom du fichier |
| `lib/clients/pdf/build-client-journal-pdf.ts` | Génération du PDF |
| `lib/clients/pdf/journal-labels.ts` | Textes FR / EN / AR du PDF |
| `lib/actions/clients.ts` | Lecture des clients |
| `lib/actions/finance-docs.ts` | Lecture des devis et factures |

## Parcours utilisateur

```text
Connexion
    → Clients
        → Choisir un client
            → Journal client
                → Aperçu PDF
                    → Exporter PDF
```

## Points à vérifier

- [ ] Un utilisateur autorisé voit **Journal client** dans le menu et dans la fiche.
- [ ] L’aperçu s’ouvre sans erreur.
- [ ] Le PDF contient la fiche du bon client.
- [ ] Les devis / factures au même nom apparaissent dans les tableaux.
- [ ] Un client sans pièce commerciale a quand même un journal (avec message « aucun document »).
- [ ] Le bouton **Exporter PDF** télécharge `journal-client-….pdf`.
- [ ] Changer la langue du CRM change les libellés du journal.
