# Smart Home Monitoring System - Ynov Hackathon 2025

![NestJS](https://img.shields.io/badge/NestJS-10.0.0-red)
![Firebase](https://img.shields.io/badge/Firebase-11.4.0-yellow)
![MQTT](https://img.shields.io/badge/MQTT-5.10.4-green)
![TypeScript](https://img.shields.io/badge/TypeScript-5.1.3-blue)

## 📋 Description

Ce projet est un système de monitoring domotique conçu pour la gestion de capteurs IoT dans différentes pièces d'un bâtiment. Développé avec NestJS, il propose une API REST complète ainsi qu'un système de communication en temps réel via MQTT pour collecter et gérer les données des capteurs.

## 🛠️ Technologies

- **Backend**: NestJS (Framework Node.js)
- **Base de données**: Firebase Firestore
- **Authentification**: Firebase Auth
- **Communication IoT**: MQTT (via HiveMQ Cloud)
- **Langage**: TypeScript

## ⚙️ Architecture

Le système est organisé en plusieurs modules :

- **Module Room**: Gestion des pièces/zones
- **Module Sensor**: Gestion des différents capteurs (température, humidité, etc.)
- **Module MQTT**: Communication en temps réel avec les appareils IoT
- **Module Authentication**: Gestion des utilisateurs et authentification

## 🚀 Fonctionnalités

- 🏠 **Gestion des pièces**: Création, modification, suppression et récupération
- 🌡️ **Gestion des capteurs**: Ajout, configuration et suppression de capteurs par pièce
- 📡 **Communication MQTT**: Échange de données en temps réel avec les appareils connectés
- 🔄 **Simulation de données**: Génération automatique de données pour les capteurs
- 👤 **Authentification**: Inscription et connexion des utilisateurs
- 📊 **Flux de données SSE**: Streaming des données en temps réel

## 📥 Installation

### Prérequis

- Node.js (v16 ou supérieur)
- npm ou yarn
- Un compte Firebase (pour la base de données et l'authentification)
- Un broker MQTT (configuration par défaut: HiveMQ Cloud)
- Python (v3.8 ou supérieur)

### Étapes d'installation

1. **Cloner le dépôt**
   ```bash
   git clone <repository-url>
   cd ynov-hackaton-2025
   ```

2. **Installer les dépendances**
   ```bash
   npm install
   ```

3. **Configuration Firebase**
   
   La configuration Firebase est déjà incluse dans `src/main.ts`. Vous pouvez la modifier si nécessaire.

4. **Configuration Python**
   ```bash
   # Créer un environnement virtuel
   python -m venv .venv
   
   # Activer l'environnement virtuel
   # Sur Windows
   .venv\Scripts\activate
   # Sur macOS/Linux
   source .venv/bin/activate
   
   # Installer les dépendances Python
   pip install -r requirements.txt
   ```

5. **Démarrer l'application**
   ```bash
   # Mode développement
   npm run start:dev
   
   # Mode production
   npm run start:prod
   ```

## 📚 API Documentation

### Gestion des pièces (Rooms)

- **Créer une pièce**
  ```
  POST /rooms
  Body: { "name": "Salon", "topic": "home/salon" }
  ```

- **Récupérer toutes les pièces**
  ```
  GET /rooms
  ```

- **Récupérer une pièce par ID**
  ```
  GET /rooms/{id}
  ```

- **Mettre à jour une pièce**
  ```
  PUT /rooms/{id}
  Body: { "name": "Nouveau nom", "topic": "nouveau/topic" }
  ```

- **Supprimer une pièce**
  ```
  DELETE /rooms/{id}
  ```

### Gestion des capteurs (Sensors)

- **Créer un capteur**
  ```
  POST /sensors
  Body: { "name": "TempSensor1", "roomId": "room-id", "type": "temperature" }
  ```

- **Récupérer tous les capteurs**
  ```
  GET /sensors
  ```

- **Récupérer les capteurs d'une pièce**
  ```
  GET /sensors?roomId={roomId}
  ```

- **Récupérer un capteur par ID**
  ```
  GET /sensors/{id}
  ```

- **Mettre à jour un capteur**
  ```
  PUT /sensors/{id}
  Body: { "name": "Nouveau nom", "type": "humidity" }
  ```

- **Supprimer un capteur**
  ```
  DELETE /sensors/{id}
  ```

### Communication MQTT

- **Simulations en cours**
  ```
  GET /mqtt/simulations
  ```

- **Flux de données en temps réel**
  ```
  GET /mqtt/stream (SSE endpoint)
  ```

### Authentification

- **Créer un utilisateur**
  ```
  POST /authentification
  Body: { "email": "user@example.com", "password": "password", "username": "username" }
  ```

## 🗂️ Structure du projet

```
src/
├── modules/
│   ├── authentification/  # Gestion des utilisateurs
│   ├── mqtt/              # Service de communication MQTT
│   ├── rooms/             # Gestion des pièces
│   └── sensors/           # Gestion des capteurs
├── app.controller.ts
├── app.module.ts
├── app.service.ts
└── main.ts               # Point d'entrée et configuration Firebase
```

## 🌐 Fonctionnement MQTT

Le système utilise MQTT pour communiquer avec les capteurs IoT:

- **Topic par pièce**: Chaque pièce a son propre topic MQTT
- **Topic par capteur**: Format `{room-topic}/{sensor-name}/{sensor-type}`
- **Simulation automatique**: Les capteurs de température et d'humidité génèrent des données simulées
- **Streaming SSE**: Les données MQTT sont disponibles via un endpoint SSE

## 🔍 Caractéristiques techniques

- **Firebase Firestore**: Stockage NoSQL pour les pièces et les capteurs
- **Firebase Auth**: Gestion sécurisée des utilisateurs
- **MQTT over TLS**: Communication sécurisée avec les appareils IoT
- **Server-Sent Events**: Communication temps réel avec le frontend

## 📝 Développement

### Commandes utiles

```bash
# Lancer l'application en mode développement
npm run start:dev

# Compiler le projet
npm run build

# Lancer les tests
npm run test

# Linting
npm run lint
```

## 📄 Licence

Ce projet est sous licence MIT.

## 👥 Équipe 

Développé pour le Hackathon Ynov 2025.

---

💡 **Note**: Ce projet a été développé dans un cadre académique pour le Hackathon Ynov 2025 et représente un système de gestion IoT pour smart home avec monitoring en temps réel des capteurs.
