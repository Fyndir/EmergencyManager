# Projet Transversal 4IRC

Membres : 
* Antoine Gamain (https://github.com/Fyndir)
* Tom Blanchet (https://github.com/frontBOI)
* léo Meynet (https://github.com/Neexos)
* Lucas Philippe (https://github.com/Tenebry)

## Contexte

Ce projet consiste à simuler des incendies sur une ville, et leur prise en charge par les flottes d’urgence qui vont intervenir.

le projet se découpe en plusieurs briques : 

* Le centre de simulation (https://github.com/Fyndir/ClientJavaSimulation) : 

Son rôle est de générer des feux dont les coordonnées, l’intensité et la fréquence sont à définir dans le programme. Ces données sont par la site transmit au serveur Flash de simulation à l'aide d'une API mise à disposition par le dit serveur.
Par la site la gestion des déplacements des camions sera également gérer par ce programme et sera envoyée sur le serveur de l'emergencyManager à l'aide d'une API mis à disposition par celui-ci.

* Le serveur de simulation (https://github.com/Fyndir/FireSimulation) :

Son role est d'afficher la simulation en temps réel pour voir l'état des feu sur une map. Il permet également de récuper les données à un instant T grace a une URL qui renvoi les données sous un format prédéfinies.

* La brique IOT :

Son role est de transmettre les information du serveur de simulation au serveur d'emergency manager à l'aide de deux microcontrolleur , 2 rasberry et d'APIs devellopées sur les deux serveurs.

* Le serveur Emergency Manager (https://github.com/Fyndir/EmergencyManager):

Son role est d'inserer les données qu'il recoit dans la base de données à l'aide d'API. Il permet également d'afficher en temps réel le contenu de la base (feu / déplacement des camions)

* La base de données de l'emergency Manager : 

Son role est de stocker les données des feux et d'affecté les camions au dit feux à l'aide d'un ensemble de trigger SQL

## Le serveur Emergency Manager

### Fonctionnement

Voici le diagramme de séquence associé au fonctionnement général de notre application. Ce fonctionnement permet un rendu en temps réel de l'avancée des camions, du traitement des incendies et, finalement, de l'ensemble des process backend qu'il est souhaitable d'observer dans le front.

![Image of sequence diag](https://github.com/Fyndir/EmergencyManager/blob/master/DiagrammeS%C3%A9quence_main.png)

### API endpoints

Nous avons mis à disposition un certain nombre d'endpoints d'API :
  - [GET] **/caserne/get** : retourne l'ensemble des positions des casernes disponibles dans la base de données
  - [GET] **/fire/get** : retourne les IDs, les positions et les intensités (cad la gravité de l'incendie, 0 étant associé à un bâtiment sain) de chaque position susceptible d'être enflammée
  - [POST] **/fire/send** : en envoyant un ID couplé à une intensité, cet endpoint permet de mettre à jour l'intensité de la position identifiée par l'idientifiant ID
  - [GET] **/camion/get** : retourne l'ensemble des positions des camions accessibles depuis la base de données
  - [POST] **/camion/send** : en envoyant une position et une immatriculation, cet endpoint permet de mettre à jour la position du camion identifié par son immatriculation, en base de données
  - [POST] **/api/polyline/decode** : en envoyant une polyline encodée, cet endpoint renvoie la liste des coordonnées géographiques résultantes du décodage de la polyligne envoyée
  
A but de test, nous avons déployé deux endpoints de test rapide :
  - [POST] **/fire/test/ignite** : pour une liste d'ID de taille variable et une intensité associée à chacune, met le feu aux positions géographiques qui leurs sont associées
  - [POST] **/fire/test/stop** : pour une liste d'ID de taille variable, éteint les feux de toutes les positions géographiques associées (cad, set de l'intensité à 0)
