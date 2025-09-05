# 📊 API Documentation - Dashboard Endpoints

## Base URL

```
http://localhost:3000/api
```

## Authentication

Tous les endpoints du dashboard nécessitent une authentification admin avec un token JWT.

**Header requis :**

```
Authorization: Bearer <your_jwt_token>
```

**Permission requise :** `voir_dashboard`

---

## 📈 Endpoints Disponibles

### 1. Statistiques Générales

**GET** `/dashboard/stats`

Récupère les statistiques générales du tableau de bord.

**Exemple de requête :**

```javascript
const response = await fetch('http://localhost:3000/api/dashboard/stats', {
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    }
});
const data = await response.json();
```

**Réponse :**

```json
{
  "totalUsers": 156,
  "totalOrders": 423,
  "totalRevenue": 125750.50,
  "growthRate": 12.5
}
```

---

### 2. Activités Récentes

**GET** `/dashboard/activities`

Récupère la liste des activités récentes sur la plateforme.

**Paramètres de requête (optionnels) :**

- `limit` : Nombre d'activités à retourner (défaut: 10, max: 50)

**Exemple de requête :**

```javascript
const response = await fetch('http://localhost:3000/api/dashboard/activities?limit=15', {
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    }
});
const data = await response.json();
```

**Réponse :**

```json
{
  "activities": [
    {
      "id": "123",
      "type": "user_registered",
      "description": "Nouvel utilisateur enregistré",
      "timestamp": "2025-09-04T10:30:00.000Z",
      "user": {
        "id": "456",
        "name": "Cheikh Traore",
        "avatar": "/default-avatar.png"
      }
    },
    {
      "id": "124",
      "type": "order_created",
      "description": "Nouvelle réservation créée",
      "timestamp": "2025-09-04T10:25:00.000Z",
      "user": {
        "id": "789",
        "name": "Ouly Diallo",
        "avatar": "/default-avatar.png"
      }
    }
  ]
}
```

---

### 3. Données du Graphique des Ventes

**GET** `/dashboard/sales-chart`

Récupère les données pour afficher un graphique des ventes par période.

**Paramètres de requête :**

- `period` : Période à analyser (`7days`, `30days`, `90days`) - défaut: `30days`

**Exemple de requête :**

```javascript
const response = await fetch('http://localhost:3000/api/dashboard/sales-chart?period=7days', {
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    }
});
const data = await response.json();
```

**Réponse :**

```json
{
  "data": [
    {
      "date": "2025-08-28",
      "sales": 15750.00,
      "orders": 23
    },
    {
      "date": "2025-08-29",
      "sales": 18200.50,
      "orders": 31
    },
    {
      "date": "2025-08-30",
      "sales": 12300.00,
      "orders": 18
    }
  ]
}
```

---

### 4. Trajets les Plus Populaires

**GET** `/dashboard/top-products`

Récupère les trajets (routes) les plus populaires de la plateforme.

**Paramètres de requête (optionnels) :**

- `limit` : Nombre de trajets à retourner (défaut: 5, max: 20)

**Exemple de requête :**

```javascript
const response = await fetch('http://localhost:3000/api/dashboard/top-products?limit=10', {
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    }
});
const data = await response.json();
```

**Réponse :**

```json
{
  "products": [
    {
      "id": "1",
      "name": "Dakar → Thiès",
      "sales": 45,
      "revenue": 112500.00,
      "image": "/ride-placeholder.png"
    },
    {
      "id": "2",
      "name": "Rufisque → Dakar",
      "sales": 38,
      "revenue": 95000.00,
      "image": "/ride-placeholder.png"
    }
  ]
}
```

---

### 5. Croissance des Utilisateurs

**GET** `/dashboard/user-growth`

Récupère les données de croissance des utilisateurs par période.

**Paramètres de requête :**

- `period` : Période à analyser (`7days`, `30days`, `90days`) - défaut: `30days`

**Exemple de requête :**

```javascript
const response = await fetch('http://localhost:3000/api/dashboard/user-growth?period=30days', {
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    }
});
const data = await response.json();
```

**Réponse :**

```json
{
  "data": [
    {
      "date": "2025-08-05",
      "newUsers": 12,
      "totalUsers": 143
    },
    {
      "date": "2025-08-06",
      "newUsers": 8,
      "totalUsers": 151
    },
    {
      "date": "2025-08-07",
      "newUsers": 15,
      "totalUsers": 166
    }
  ]
}
```

---

### 6. Métriques de Performance

**GET** `/dashboard/performance`

Récupère les métriques de performance de la plateforme.

**Exemple de requête :**

```javascript
const response = await fetch('http://localhost:3000/api/dashboard/performance', {
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    }
});
const data = await response.json();
```

**Réponse :**

```json
{
  "metrics": {
    "conversionRate": 85.7,
    "averageOrderValue": 2500.75,
    "customerRetentionRate": 78.3,
    "pageLoadTime": 1.2
  }
}
```

---

### 7. Total des Utilisateurs

**GET** `/dashboard/total-users`

Récupère simplement le nombre total d'utilisateurs actifs.

**Exemple de requête :**

```javascript
const response = await fetch('http://localhost:3000/api/dashboard/total-users', {
  headers: {
    'Content-Type': 'application/json'
  }
});
const data = await response.json();
```

**Réponse :**

```json
{
  "totalUsers": 156
}
```

---

### 8. Résumé Mensuel

**GET** `/dashboard/monthly-summary`

Récupère le nombre de trajets du mois courant et le total des candidatures chauffeur.

**Exemple de requête :**

```javascript
const response = await fetch('http://localhost:3000/api/dashboard/monthly-summary', {
  headers: {
    'Content-Type': 'application/json'
  }
});
const data = await response.json();
```

**Réponse :**

```json
{
  "monthlyRides": 45,
  "totalDriverApplications": 23,
  "month": "septembre 2025"
}
```

**Description des champs :**

- `monthlyRides` : Nombre de trajets créés depuis le début du mois courant
- `totalDriverApplications` : Nombre total de candidatures chauffeur (toutes périodes)
- `month` : Nom du mois courant en français

---

## 🔧 Exemples d'Utilisation Frontend Mis à Jour

### React/Vue.js avec Axios

```javascript
import axios from 'axios';

const apiClient = axios.create({
    baseURL: 'http://localhost:3000/api',
    headers: {
        'Content-Type': 'application/json'
    }
});

// Récupérer le total des utilisateurs
const getTotalUsers = async () => {
    try {
        const response = await apiClient.get('/dashboard/total-users');
        return response.data.totalUsers;
    } catch (error) {
        console.error('Erreur lors du chargement du total utilisateurs:', error);
        throw error;
    }
};

// Récupérer le résumé mensuel
const getMonthlySummary = async () => {
    try {
        const response = await apiClient.get('/dashboard/monthly-summary');
        return response.data;
    } catch (error) {
        console.error('Erreur lors du chargement du résumé mensuel:', error);
        throw error;
    }
};

// Récupérer les statistiques
const getStats = async () => {
    try {
        const response = await apiClient.get('/dashboard/stats');
        return response.data;
    } catch (error) {
        console.error('Erreur lors du chargement des stats:', error);
        throw error;
    }
};
```

### Service/API Helper Complet

```javascript
// services/dashboardApi.js
export class DashboardAPI {
  constructor(baseURL = 'http://localhost:3000/api') {
    this.baseURL = baseURL;
  }

  async makeRequest(endpoint) {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  }

  // Nouveaux endpoints
  async getTotalUsers() {
    const data = await this.makeRequest('/dashboard/total-users');
    return data.totalUsers;
  }

  async getMonthlySummary() {
    return await this.makeRequest('/dashboard/monthly-summary');
  }

  // Endpoints existants
  async getStats() {
    return await this.makeRequest('/dashboard/stats');
  }

  async getActivities(limit = 10) {
    const data = await this.makeRequest(`/dashboard/activities?limit=${limit}`);
    return data.activities;
  }

  async getSalesChart(period = '30days') {
    const data = await this.makeRequest(`/dashboard/sales-chart?period=${period}`);
    return data.data;
  }

  async getTopProducts(limit = 5) {
    const data = await this.makeRequest(`/dashboard/top-products?limit=${limit}`);
    return data.products;
  }

  async getUserGrowth(period = '30days') {
    const data = await this.makeRequest(`/dashboard/user-growth?period=${period}`);
    return data.data;
  }

  async getPerformanceMetrics() {
    const data = await this.makeRequest('/dashboard/performance');
    return data.metrics;
  }
}

// Utilisation
const api = new DashboardAPI();

// Charger toutes les données du dashboard
async function loadDashboard() {
  try {
    const [
      totalUsers, 
      monthlySummary, 
      stats, 
      activities, 
      salesData, 
      topProducts, 
      userGrowth, 
      performance
    ] = await Promise.all([
      api.getTotalUsers(),
      api.getMonthlySummary(),
      api.getStats(),
      api.getActivities(10),
      api.getSalesChart('30days'),
      api.getTopProducts(5),
      api.getUserGrowth('30days'),
      api.getPerformanceMetrics()
    ]);

    // Utiliser les données pour mettre à jour l'interface
    updateUserCounter(totalUsers);
    updateMonthlySummary(monthlySummary);
    updateStatsCards(stats);
    updateActivitiesList(activities);
    updateSalesChart(salesData);
    updateTopProductsList(topProducts);
    updateUserGrowthChart(userGrowth);
    updatePerformanceMetrics(performance);
  } catch (error) {
    console.error('Erreur lors du chargement du dashboard:', error);
  }
}
```

### Exemples React Components

#### Composant Total Utilisateurs

```jsx
import { useState, useEffect } from 'react';

function UserCounter() {
  const [totalUsers, setTotalUsers] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch('/api/dashboard/total-users');
        const data = await response.json();
        setTotalUsers(data.totalUsers);
      } catch (error) {
        console.error('Erreur:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  if (loading) return <div className="loading">Chargement...</div>;

  return (
    <div className="stat-card">
      <h3>Utilisateurs Actifs</h3>
      <div className="stat-value">{totalUsers.toLocaleString()}</div>
    </div>
  );
}
```

#### Composant Résumé Mensuel

```jsx
import { useState, useEffect } from 'react';

function MonthlySummary() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const response = await fetch('/api/dashboard/monthly-summary');
        const data = await response.json();
        setSummary(data);
      } catch (error) {
        console.error('Erreur:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, []);

  if (loading) return <div className="loading">Chargement...</div>;
  if (!summary) return <div className="error">Erreur de chargement</div>;

  return (
    <div className="monthly-summary-card">
      <h3>Résumé {summary.month}</h3>
      <div className="summary-stats">
        <div className="summary-stat">
          <span className="label">Trajets ce mois</span>
          <span className="value">{summary.monthlyRides}</span>
        </div>
        <div className="summary-stat">
          <span className="label">Candidatures chauffeur</span>
          <span className="value">{summary.totalDriverApplications}</span>
        </div>
      </div>
    </div>
  );
}
```

### Vue.js avec Composition API

```vue

<template>
    <div class="dashboard-stats">
        <!-- Total Utilisateurs -->
        <div class="stat-card">
            <h3>Utilisateurs Actifs</h3>
            <div v-if="loadingUsers" class="loading">Chargement...</div>
            <div v-else class="stat-value">{{ totalUsers.toLocaleString() }}</div>
        </div>

        <!-- Résumé Mensuel -->
        <div class="stat-card">
            <h3>Résumé {{ monthlySummary?.month || 'du mois' }}</h3>
            <div v-if="loadingSummary" class="loading">Chargement...</div>
            <div v-else-if="monthlySummary" class="summary-stats">
                <div class="summary-item">
                    <span>Trajets: {{ monthlySummary.monthlyRides }}</span>
                </div>
                <div class="summary-item">
                    <span>Candidatures: {{ monthlySummary.totalDriverApplications }}</span>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
    import { ref, onMounted } from 'vue';

    const totalUsers = ref(0);
    const monthlySummary = ref(null);
    const loadingUsers = ref(true);
    const loadingSummary = ref(true);

    const fetchTotalUsers = async () => {
        try {
            const response = await fetch('/api/dashboard/total-users');
            const data = await response.json();
            totalUsers.value = data.totalUsers;
        } catch (error) {
            console.error('Erreur:', error);
        } finally {
            loadingUsers.value = false;
        }
    };

    const fetchMonthlySummary = async () => {
        try {
            const response = await fetch('/api/dashboard/monthly-summary');
            const data = await response.json();
            monthlySummary.value = data;
        } catch (error) {
            console.error('Erreur:', error);
        } finally {
            loadingSummary.value = false;
        }
    };

    onMounted(() => {
        fetchTotalUsers();
        fetchMonthlySummary();
    });
</script>
```

---

## 📱 Liste Complète des Endpoints

| Endpoint                         | Description             | Réponse                                                 |
|----------------------------------|-------------------------|---------------------------------------------------------|
| `GET /dashboard/stats`           | Statistiques générales  | `{ totalUsers, totalOrders, totalRevenue, growthRate }` |
| `GET /dashboard/activities`      | Activités récentes      | `{ activities: [...] }`                                 |
| `GET /dashboard/sales-chart`     | Graphique des ventes    | `{ data: [...] }`                                       |
| `GET /dashboard/top-products`    | Trajets populaires      | `{ products: [...] }`                                   |
| `GET /dashboard/user-growth`     | Croissance utilisateurs | `{ data: [...] }`                                       |
| `GET /dashboard/performance`     | Métriques performance   | `{ metrics: {...} }`                                    |
| `GET /dashboard/total-users`     | **Total utilisateurs**  | `{ totalUsers: number }`                                |
| `GET /dashboard/monthly-summary` | **Résumé mensuel**      | `{ monthlyRides, totalDriverApplications, month }`      |

## 🔄 Rafraîchissement Recommandé

- **Total utilisateurs** : Toutes les 2 minutes
- **Résumé mensuel** : Toutes les 10 minutes
- **Statistiques générales** : Toutes les 5 minutes
- **Activités récentes** : Toutes les 30 secondes

```javascript
// Exemple de rafraîchissement automatique
const setupAutoRefresh = () => {
  // Total utilisateurs - toutes les 2 minutes
  setInterval(async () => {
    const totalUsers = await api.getTotalUsers();
    updateUserCounter(totalUsers);
  }, 2 * 60 * 1000);

  // Résumé mensuel - toutes les 10 minutes
  setInterval(async () => {
    const summary = await api.getMonthlySummary();
    updateMonthlySummary(summary);
  }, 10 * 60 * 1000);
};
```
