# Déploiement du pilote sur Hostinger

Ce document couvre le pilote privé de moins de dix familles sur
`planning.bandtrack.fr`.

## 1. Avant la mise à jour

Depuis le répertoire du projet sur le VPS :

```bash
cd /docker/planningfamille
docker compose ps
tar -czf "$HOME/planning-famille-avant-migration-$(date +%F-%H%M).tar.gz" data/
```

Vérifier que l'archive existe et conserver une copie hors du VPS.

## 2. Configurer la clé opérateur

Créer ou compléter le fichier `.env` sur le VPS :

```bash
umask 077
printf 'PILOT_ADMIN_KEY=%s\n' "$(openssl rand -base64 32)" > .env
chmod 600 .env
```

Conserver cette clé dans un gestionnaire de mots de passe. Elle permet de créer
et désactiver les familles depuis `/pilot` et ne doit pas être transmise aux
familles.

## 3. Déployer

```bash
./scripts/deploy.sh
docker compose ps
docker compose logs --tail=100
curl -fsS https://planning.bandtrack.fr/api/health
```

La réponse attendue du contrôle de santé contient `"ok":true`.

## 4. Migrer le planning existant

1. Ouvrir `https://planning.bandtrack.fr/pilot`.
2. Saisir la clé `PILOT_ADMIN_KEY`.
3. Créer la première famille et définir son PIN adulte.
4. Laisser cochée l'option d'import de l'ancien planning si elle apparaît.
5. Générer une invitation pour un téléphone adulte.
6. Ouvrir le lien sur le téléphone concerné et nommer l'appareil.

L'ancien `data/state.json` n'est pas supprimé par la migration. Il reste
disponible pour un retour arrière manuel.

## 5. Ajouter une famille pilote

1. Depuis `/pilot`, créer la famille et son PIN initial.
2. Générer une invitation adulte à usage unique.
3. Transmettre le lien par un canal privé.
4. Demander à l'adulte d'appairer son téléphone dans les 24 heures.
5. Depuis les paramètres familiaux, créer l'invitation de l'écran partagé.
6. Vérifier que l'écran peut valider une tâche, mais ne peut pas modifier le
   planning ni ouvrir les paramètres.

## 6. Contrôles hebdomadaires

- vérifier `docker compose ps` et les erreurs récentes dans les logs ;
- sauvegarder l'intégralité du dossier `data/` hors du VPS ;
- révoquer les appareils perdus depuis les paramètres de la famille ;
- recueillir les incidents et demandes d'assistance du pilote ;
- ne jamais envoyer une archive `data/` par courrier électronique non chiffré.

## 7. Retour arrière

En cas de problème bloquant, conserver d'abord une copie du dossier `data/`
actuel, puis redéployer l'image ou le commit précédemment validé. Ne pas écraser
le dossier `data/` sans avoir identifié la sauvegarde exacte à restaurer.
