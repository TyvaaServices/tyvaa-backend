# Documentation API Audit - Frontend

## Endpoints disponibles

### 1. Récupérer tous les logs d'audit

**GET** `/api/v1/audit/logs`

#### Paramètres de requête (optionnels)

- `page` (number): Numéro de page (défaut: 1)
- `limit` (number): Nombre d'éléments par page (défaut: 10)
- `search` (string): Recherche par nom ou email de l'utilisateur
- `entityType` (string): Filtrer par type d'entité (User, Booking, Payment, etc.)
- `actionType` (string): Filtrer par type d'action (create, update, delete, etc.)
- `startDate` (string): Date de début (format: YYYY-MM-DD)
- `endDate` (string): Date de fin (format: YYYY-MM-DD)

#### Exemple de requête

```javascript
// Service côté frontend
export const getAuditLogs = async (params = {}) => {
  const queryParams = new URLSearchParams();
  
  if (params.page) queryParams.append('page', params.page);
  if (params.limit) queryParams.append('limit', params.limit);
  if (params.search) queryParams.append('search', params.search);
  if (params.entityType) queryParams.append('entityType', params.entityType);
  if (params.actionType) queryParams.append('actionType', params.actionType);
  if (params.startDate) queryParams.append('startDate', params.startDate);
  if (params.endDate) queryParams.append('endDate', params.endDate);
  
  const response = await axios.get(`/api/v1/audit/logs?${queryParams}`);
  return response.data;
};
```

#### Réponse

```json
{
  "success": true,
  "data": {
    "auditLogs": [
      {
        "id": 1,
        "fullName": "François Diop",
        "actionType": "UPDATE",
        "entityType": "User",
        "entityId": 12,
        "createdAt": "2025-06-16T10:00:00.000Z",
        "details": "Changed user email",
        "user": {
          "id": 1,
          "phoneNumber": "770000000",
          "fullName": "François Diop",
          "email": "francois@example.com",
          "isOnline": false,
          "sexe": "male",
          "isAdmin": true,
          "isActive": true,
          "createdAt": "2020-01-01T00:00:00.000Z",
          "updatedAt": "2025-06-16T10:00:00.000Z"
        }
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalItems": 50,
      "itemsPerPage": 10,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
}
```

### 2. Statistiques d'audit

**GET** `/api/v1/audit/stats`

#### Paramètres de requête

- `period` (string): Période (7days, 30days, 90days) - défaut: 30days

#### Exemple d'utilisation

```javascript
export const getAuditStats = async (period = '30days') => {
  const response = await axios.get(`/api/v1/audit/stats?period=${period}`);
  return response.data;
};
```

### 3. Types d'entités disponibles

**GET** `/api/v1/audit/entity-types`

```javascript
export const getEntityTypes = async () => {
  const response = await axios.get('/api/v1/audit/entity-types');
  return response.data;
};
```

### 4. Types d'actions disponibles

**GET** `/api/v1/audit/action-types`

```javascript
export const getActionTypes = async () => {
  const response = await axios.get('/api/v1/audit/action-types');
  return response.data;
};
```

## Intégration dans votre composant Vue

Voici comment modifier votre composant Vue pour utiliser les vraies API :

```javascript
<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import type { AuditLog } from '@/features/audit/auditModel.ts'
import { getAuditLogs } from '@/services/auditService' // Créez ce service

const auditLogs = ref<AuditLog[]>([])
const isLoading = ref(true)
const searchEmail = ref('')
const currentPage = ref(1)
const itemsPerPage = ref(10)
const totalPages = ref(0)
const totalItems = ref(0)

const loadAuditLogs = async () => {
  try {
    isLoading.value = true
    const params = {
      page: currentPage.value,
      limit: itemsPerPage.value,
      search: searchEmail.value
    }
    
    const response = await getAuditLogs(params)
    auditLogs.value = response.data.auditLogs
    totalPages.value = response.data.pagination.totalPages
    totalItems.value = response.data.pagination.totalItems
  } catch (error) {
    console.error('Erreur lors du chargement des logs:', error)
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  loadAuditLogs()
})

// Recharger lors du changement de recherche
watch(searchEmail, () => {
  currentPage.value = 1
  loadAuditLogs()
})

function goToPage(page: number) {
  if (page < 1 || page > totalPages.value) return
  currentPage.value = page
  loadAuditLogs()
}
</script>
```

## Service auditService.js

Créez un fichier `auditService.js` dans votre dossier services :

```javascript
import axios from 'axios'

const API_BASE_URL = 'http://localhost:3000' // Ajustez selon votre config

export const auditService = {
  async getAuditLogs(params = {}) {
    const queryParams = new URLSearchParams()
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, value.toString())
      }
    })
    
    const response = await axios.get(`${API_BASE_URL}/api/v1/audit/logs?${queryParams}`)
    return response.data
  },

  async getAuditStats(period = '30days') {
    const response = await axios.get(`${API_BASE_URL}/api/v1/audit/stats?period=${period}`)
    return response.data
  },

  async getEntityTypes() {
    const response = await axios.get(`${API_BASE_URL}/api/v1/audit/entity-types`)
    return response.data
  },

  async getActionTypes() {
    const response = await axios.get(`${API_BASE_URL}/api/v1/audit/action-types`)
    return response.data
  }
}

// Export pour compatibilité
export const getAuditLogs = auditService.getAuditLogs
export const getAuditStats = auditService.getAuditStats
export const getEntityTypes = auditService.getEntityTypes
export const getActionTypes = auditService.getActionTypes
```

## Notes importantes

1. **Aucune authentification requise** : Les endpoints sont accessibles sans token comme demandé
2. **Format des données** : Les données retournées correspondent exactement au format attendu par votre composant Vue
3. **Pagination** : Système de pagination complet avec toutes les métadonnées nécessaires
4. **Recherche et filtres** : Support complet pour la recherche et les filtres
5. **Gestion d'erreurs** : N'oubliez pas d'ajouter la gestion d'erreurs dans votre service frontend

Les endpoints sont maintenant prêts à être utilisés côté frontend !
