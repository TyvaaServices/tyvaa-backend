# Tâches Trello pour le projet Tyvaa Backend

## Module Utilisateur (user-module)

1.  **Titre:** Améliorer la validation des données d'entrée pour la création d'utilisateur
    **Description:** Revoir et renforcer les règles de validation pour les champs lors de la création d'un nouvel utilisateur.
2.  **Titre:** Mettre en place la suppression logique (soft delete) des utilisateurs
    **Description:** Modifier la fonctionnalité de suppression pour marquer les utilisateurs comme supprimés au lieu de les effacer physiquement.
3.  **Titre:** Ajouter des tests unitaires pour le service OTP
    **Description:** Écrire des tests pour couvrir la génération, l'envoi (simulé) et la vérification des OTP.
4.  **Titre:** Optimiser la requête de recherche d'utilisateur par téléphone ou email
    **Description:** Analyser et optimiser la performance de la requête `findUserByPhoneOrEmail`.
5.  **Titre:** Implémenter la révocation des tokens JWT
    **Description:** Ajouter un mécanisme pour invalider les tokens JWT (par exemple, lors d'un changement de mot de passe ou d'une déconnexion).
6.  **Titre:** Finaliser la gestion des images de profil (suppression ancien fichier)
    **Description:** S'assurer que l'ancienne image de profil est supprimée du serveur lors du téléversement d'une nouvelle.
7.  **Titre:** Ajouter la possibilité de réinitialiser le mot de passe
    **Description:** Implémenter un flux de réinitialisation de mot de passe sécurisé (via OTP email/SMS).
8.  **Titre:** Mettre en place le blocage automatique de compte après X tentatives OTP échouées
    **Description:** Sécuriser le processus OTP en bloquant temporairement un compte après plusieurs tentatives infructueuses.
9.  **Titre:** Compléter la documentation Swagger pour les endpoints admin du module utilisateur
    **Description:** Documenter tous les endpoints relatifs à la gestion des rôles et permissions pour les administrateurs.
10. **Titre:** Refactoriser la logique d'assignation des rôles pour plus de clarté
    **Description:** Revoir la fonction `assignBaseAndExtraRoles` pour améliorer sa lisibilité et sa maintenabilité.

## Module Trajet (ride-module)

11. **Titre:** Ajouter la possibilité pour un conducteur de modifier un trajet récurrent
    **Description:** Permettre aux conducteurs de mettre à jour les détails d'un modèle de trajet récurrent.
12. **Titre:** Implémenter la recherche de trajets par géolocalisation (proximité)
    **Description:** Ajouter une option pour rechercher des trajets en fonction de la proximité du point de départ.
13. **Titre:** Optimiser la génération des instances de trajets récurrents
    **Description:** Revoir le cron `generateRecurringRideInstances` pour améliorer sa performance et sa robustesse.
14. **Titre:** Ajouter des filtres à la recherche de trajets (prix, heure, etc.)
    **Description:** Permettre aux passagers de filtrer les résultats de recherche de trajets selon divers critères.
15. **Titre:** Mettre en place un système d'évaluation des conducteurs et passagers après un trajet
    **Description:** Permettre aux utilisateurs de noter et laisser des commentaires après un trajet terminé.
16. **Titre:** Gérer les conflits de réservation (surréservation)
    **Description:** Mettre en place une logique pour éviter ou gérer les cas de surréservation sur un trajet.
17. **Titre:** Ajouter des tests pour la création et la gestion des instances de trajet
    **Description:** Écrire des tests unitaires et d'intégration pour `RideInstance`.
18. **Titre:** Permettre aux conducteurs de voir l'historique de leurs trajets et revenus
    **Description:** Créer un endpoint pour que les conducteurs puissent consulter leurs trajets passés et les revenus générés.
19. **Titre:** Implémenter l'annulation de trajet par le conducteur avec notifications aux passagers
    **Description:** Gérer l'annulation d'un trajet par un conducteur et notifier automatiquement les passagers concernés.
20. **Titre:** Ajouter la fonctionnalité "trajets favoris" pour les passagers
    **Description:** Permettre aux passagers de sauvegarder des trajets pour les retrouver facilement.

## Module Réservation (booking-module)

21. **Titre:** Améliorer la gestion des statuts de réservation
    **Description:** Revoir et documenter clairement les différents statuts de réservation et leurs transitions.
22. **Titre:** Implémenter le remboursement (simulé) lors de l'annulation d'une réservation payée
    **Description:** Ajouter la logique pour simuler un remboursement si une réservation déjà payée est annulée.
23. **Titre:** Ajouter des tests pour le processus de réservation de bout en bout
    **Description:** Créer des tests d'intégration pour le flux complet de réservation d'un trajet.
24. **Titre:** Optimiser la requête de récupération des réservations d'un utilisateur
    **Description:** Améliorer la performance de la récupération de la liste des réservations pour un passager.
25. **Titre:** Permettre la modification d'une réservation (changement de nombre de sièges)
    **Description:** Ajouter la possibilité pour un passager de modifier certains détails de sa réservation avant le départ.

## Module Paiement (payment-module)

26. **Titre:** Intégrer une vraie passerelle de paiement locale (Orange Money, Wave)
    **Description:** Remplacer la simulation de paiement par une intégration réelle avec un service de paiement mobile.
27. **Titre:** Sécuriser les endpoints de paiement
    **Description:** S'assurer que toutes les communications et traitements liés au paiement sont sécurisés.
28. **Titre:** Mettre en place un système de gestion des transactions et remboursements
    **Description:** Créer des modèles et services pour tracer les transactions financières et gérer les remboursements.
29. **Titre:** Ajouter des tests pour la simulation de paiement actuelle
    **Description:** Écrire des tests pour le module de paiement même avec la simulation.
30. **Titre:** Générer des reçus de paiement (simulés)
    **Description:** Créer une fonctionnalité pour générer un reçu après un paiement réussi.

## Module Notification (notification-module)

31. **Titre:** Personnaliser les messages de notification
    **Description:** Rendre les contenus des notifications plus dynamiques et personnalisés.
32. **Titre:** Ajouter des notifications pour les nouvelles candidatures chauffeur (pour admin/superviseur)
    **Description:** Envoyer une notification aux administrateurs/superviseurs lorsqu'un utilisateur postule pour devenir chauffeur.
33. **Titre:** Mettre en place des notifications de rappel de trajet pour passagers et conducteurs
    **Description:** Envoyer des rappels automatiques avant le départ d'un trajet.
34. **Titre:** Gérer les tokens FCM invalides ou expirés
    **Description:** Mettre en place une logique pour détecter et nettoyer les tokens FCM qui ne sont plus valides.
35. **Titre:** Permettre aux utilisateurs de configurer leurs préférences de notification
    **Description:** Ajouter des options pour que les utilisateurs puissent choisir quelles notifications ils souhaitent recevoir.

## Module Chatbot (chatbot-module)

36. **Titre:** Améliorer la compréhension du langage naturel du chatbot
    **Description:** Entraîner ou configurer le modèle AI pour mieux comprendre les requêtes des utilisateurs.
37. **Titre:** Ajouter la possibilité au chatbot de consulter l'état d'une réservation
    **Description:** Permettre au chatbot de fournir des informations sur une réservation spécifique (en lecture seule).
38. **Titre:** Sauvegarder l'historique des conversations du chatbot en base de données
    **Description:** Stocker les échanges entre utilisateurs et chatbot pour analyse ou support ultérieur.
39. **Titre:** Entraîner le chatbot sur les questions fréquentes (FAQ)
    **Description:** Enrichir la base de connaissances du chatbot avec les questions les plus courantes.
40. **Titre:** Mettre en place un mécanisme de "fallback" si le chatbot ne comprend pas
    **Description:** Définir un comportement clair lorsque le chatbot ne peut pas répondre à une question (ex: proposer de contacter le support).

## Module Audit (audit-module)

41. **Titre:** Étendre le journal d'audit à plus d'actions critiques
    **Description:** Identifier et ajouter la journalisation pour d'autres actions sensibles dans l'application.
42. **Titre:** Créer une interface (ou endpoint) pour consulter le journal d'audit (pour admin)
    **Description:** Permettre aux administrateurs de visualiser et filtrer les logs d'audit.
43. **Titre:** Optimiser le stockage des logs d'audit
    **Description:** Réfléchir à des stratégies de rotation ou d'archivage des logs d'audit pour gérer la volumétrie.
44. **Titre:** Ajouter des tests pour le service d'audit
    **Description:** S'assurer que les actions sont correctement journalisées.
45. **Titre:** Journaliser les tentatives de connexion échouées
    **Description:** Ajouter un log d'audit spécifique pour les tentatives de connexion infructueuses.

## Général / Infrastructure / Sécurité

46. **Titre:** Mettre à jour les dépendances du projet
    **Description:** Vérifier et mettre à jour régulièrement les dépendances Node.js pour des raisons de sécurité et de performance.
47. **Titre:** Améliorer la couverture de tests globale du projet
    **Description:** Identifier les zones avec peu ou pas de tests et ajouter des tests unitaires/intégration. Objectif > 80%.
48. **Titre:** Mettre en place un système de backup régulier de la base de données
    **Description:** Configurer des sauvegardes automatiques et régulières de la base de données PostgreSQL.
49. **Titre:** Renforcer les politiques de sécurité (CSP, HSTS, etc.)
    **Description:** Revoir et appliquer les en-têtes de sécurité HTTP et autres bonnes pratiques.
50. **Titre:** Optimiser les requêtes lentes en base de données
    **Description:** Utiliser des outils d'analyse pour identifier et optimiser les requêtes SQL qui prennent du temps.
51. **Titre:** Documenter le processus de déploiement de A à Z
    **Description:** Rédiger une documentation claire et détaillée pour déployer l'application en production.
52. **Titre:** Mettre en place un monitoring plus avancé (métriques, alertes)
    **Description:** Intégrer des outils comme Prometheus/Grafana ou un service SaaS pour un monitoring proactif.
53. **Titre:** Effectuer un audit de sécurité externe
    **Description:** Planifier et réaliser un audit de sécurité par une société tierce.
54. **Titre:** Améliorer la gestion des erreurs et le reporting
    **Description:** Centraliser la gestion des erreurs et intégrer un service de reporting d'erreurs (Sentry, etc.).
55. **Titre:** Mettre en place le versioning sémantique pour l'API
    **Description:** Adopter et appliquer rigoureusement le versioning sémantique pour les futures versions de l'API.
56. **Titre:** Explorer les WebSockets pour des notifications en temps réel plus efficaces
    **Description:** Évaluer l'utilisation des WebSockets comme alternative ou complément à FCM pour certaines notifications.
57. **Titre:** Internationalisation (i18n) du backend pour les messages d'erreur et notifications
    **Description:** Préparer le backend pour supporter plusieurs langues, en commençant par les messages d'erreur et notifications.
58. **Titre:** Optimiser la taille de l'image Docker
    **Description:** Revoir le Dockerfile pour réduire la taille de l'image finale.
59. **Titre:** Mettre en place des tests de performance (stress tests)
    **Description:** Définir et exécuter des scénarios de tests de charge pour évaluer la robustesse de l'application.
60. **Titre:** Créer un guide de contribution détaillé pour les nouveaux développeurs
    **Description:** Étoffer le `CONTRIBUTING.md` avec des instructions claires sur le setup, les conventions de code, et le workflow de PR.

---
*Fin des tâches Trello*
