// --------------------------------------------------------------------------------------------------------------
// @brief
//  Adds a custom marker in the Leaflet map 'mymap' identifying the amazing CPE engeneering school
function addCPEMarker (mymap) {
    const CPEIcon = L.icon({
        iconUrl: IMG_PATH + 'money.gif',
        iconSize:     [40, 30], // size of the icon
        iconAnchor:   [20, 22], // point of the icon which will correspond to marker's location
        popupAnchor:  [-3, -76] // point from which the popup should open relative to the iconAnchor
    });
    let marker = L.marker([45.78155, 4.868178], {icon: CPEIcon}).addTo(mymap);
    marker.on('click', e => {
        console.log('> add -7000e over the liasse de billets')
        bufferedAudio.cashMoney.play();
    });
}


// --------------------------------------------------------------------------------------------------------------
// @brief
//  Adds smoke marker in the Leaflet map 'mymap' at coordinates [lat, long] represented by the 'coordinates'
// argument, in the 'mymap' Leaflet map
function addSmokeMarker (coordinates, mymap) 
{
    const smokeIcon = L.icon({
        iconUrl: IMG_PATH + 'smoke.gif',
        iconSize:     [200, 200], // size of the icon
        iconAnchor:   [98, 175], // point of the icon which will correspond to marker's location
        popupAnchor:  [-3, -76] // point from which the popup should open relative to the iconAnchor
    });
    let marker = L.marker(coordinates, {icon: smokeIcon}).addTo(mymap);
    renderedMarkers.smokeMarkers.markers.push(marker);

    // éteindre la fumée au bout d'un certain temps, et faire réapparaître le batîment
    setTimeout(() => {

        const arrayTronquey = [];
        for (let data of laFumeeEstEnTrainDeSeteindre)
            if (!areDoubletEqual(data, coordinates))
                arrayTronquey.push(data)
        laFumeeEstEnTrainDeSeteindre = arrayTronquey

        mymap.removeLayer(marker);
        addIdleMarker(coordinates, mymap);
        bufferedAudio.waw.play();
    }, 3000);
}


// --------------------------------------------------------------------------------------------------------------
// @brief
//  Adds an idle site marker in the Leaflet map 'mymap' at coordinates [lat, long] represented by the 'coordinates'
// argument, in the 'mymap' Leaflet map
function addIdleMarker (coordinates, mymap) 
{
    // if it is already rendered, gtfo...
    let isItAlreadyBuffered = false;
    // for (let association of coordToFilenameMAP) {
    //     if (areDoubletEqual(coordinates, association.coord)) {
    //         isItAlreadyBuffered = true;
    //         break;
    //     }
    // }

    const fileName = latLongToFileName(coordinates);
    const idleMarkerIcon = L.icon({
        iconUrl: IMG_PATH + fileName,
        iconSize:     [40, 30], // size of the icon
        iconAnchor:   [20, 22], // point of the icon which will correspond to marker's location
        popupAnchor:  [-3, -76] // point from which the popup should open relative to the iconAnchor
    });

    try {
        let marker = L.marker(coordinates, {icon: idleMarkerIcon}).addTo(mymap);
        // marker._icon.classList.add('leaflet_idleMarker');
        renderedMarkers.buildingMarkers.markers.push(marker);

        if (!isItAlreadyBuffered) { }

    } catch (e) { }
}


// --------------------------------------------------------------------------------------------------------------
// @brief
//  Adds an animated fire marker in the Leaflet map 'mymap' at coordinates [lat, long] represented by the 'coordinates'
// argument, in the 'mymap' Leaflet map
//  @note
//  The 'intensity' parameter is used to choose the fire GIF : the more intensity you input, the more intense
// the fire GIF icon will be. This parameter must be between 1 and 10
function addFireMarker (coordinates, intensity, mymap) 
{
    let fireGIF_filename = 'fire1.gif'; // default value
    if (intensity === 1)
        fireGIF_filename = 'fire1.gif';
    if (intensity === 2)
        fireGIF_filename = 'fire4.gif';
    if (intensity === 3)
        fireGIF_filename = 'fire7.gif';
    if (intensity === 4)
        fireGIF_filename = 'fire3.gif';
    if (intensity === 5)
        fireGIF_filename = 'fire2.gif';
    if (intensity === 6)
        fireGIF_filename = 'fire5.gif';
    if (intensity >= 7)
        fireGIF_filename = 'fire6.gif';

    // find location's name
    let locationName = fromLatLongToName(coordinates);

    const fireIcon = L.icon({
        iconUrl: IMG_PATH + 'fire/' + fireGIF_filename,
        iconSize:     [60, 90], // size of the icon
        iconAnchor:   [30, 70], // point of the icon which will correspond to marker's location
        popupAnchor:  [-3, -76] // point from which the popup should open relative to the iconAnchor
    });
    let marker = L.marker(coordinates, {icon: fireIcon}).addTo(mymap);
    renderedMarkers.fireMarkers.markers.push({coordinates, marker});
    renderedMarkers.fireMarkers.litFires.push(coordinates);

    // add onclick popup
    // marker.bindPopup('<p class="popupLocationName">'+ locationName +'</p><h1 class="popupTitle">' + intensity + '</h1>', 
    marker.bindPopup('<h1 class="popupTitle">' + intensity + '</h1>', 
    {
        closeButton: false
    });
    marker.on('mouseover', e => { marker.openPopup(); });
    marker.on('mouseout',  e => { marker.closePopup(); });
}


// --------------------------------------------------------------------------------------------------------------
// @brief
//  Adds a firestation building marker in the Leaflet map 'mymap' at coordinates [lat, long] represented by the 
// 'coordinates' argument, in the 'mymap' Leaflet map
function addFirestationMarker (coordinates, mymap) {
    const firestationIcon = L.icon({
        iconUrl: IMG_PATH + 'firestation.jpg',
        iconSize:     [80, 110], // size of the icon
        iconAnchor:   [30, 70], // point of the icon which will correspond to marker's location
        popupAnchor:  [-3, -76] // point from which the popup should open relative to the iconAnchor
    });
    let marker = L.marker(coordinates, {icon: firestationIcon}).addTo(mymap);
    renderedMarkers.firestationMarkers.markers.push({coordinates, marker});
}


// --------------------------------------------------------------------------------------------------------------
// @brief
//  Si le camion immatriculé 'immatriculation' a déjà été asocié à un gif de camion, cette fonction retourne
// le numéro de ce gif. Autrement, cette fonction assigne à cette immatriculation un numéro de gif aléatoire
// et renvoie ce numéro
function getRegisteredCamionImageNumber (immatriculation) 
{
    const registeredImmatriculationImage = firetrucksImageMap.find(e => e.immatriculation == immatriculation);
    let camionImageNumber;
    if (typeof registeredImmatriculationImage != 'undefined')
        camionImageNumber = registeredImmatriculationImage.imageNumber;
    else {
        camionImageNumber = rand(1, 4);
        firetrucksImageMap.push({immatriculation, imageNumber: camionImageNumber});
    }

    return camionImageNumber;
}


// --------------------------------------------------------------------------------------------------------------
// @brief
//  Adds a firetruck marker in the Leaflet map 'mymap' at coordinates [lat, long] represented by the 
// 'coordinates' argument, in the 'mymap' Leaflet map
function addFiretruckMarker (coordinates, immatriculation, mymap) 
{
    let camionImageNumber = getRegisteredCamionImageNumber(immatriculation);
    const firestationIcon = L.icon({
        iconUrl: IMG_PATH + `camion${camionImageNumber}.gif`,
        iconSize:     [60, 47], // size of the icon
        iconAnchor:   [30, 30], // point of the icon which will correspond to marker's location
        popupAnchor:  [-3, -76] // point from which the popup should open relative to the iconAnchor
    });

    let marker = L.marker(coordinates, {icon: firestationIcon});
    if (renderedMarkers.truckMarkers.areShown) {
        marker.addTo(mymap);
        marker.setZIndexOffset(1000);
    }

    renderedMarkers.truckMarkers.markers.push({immatriculation, marker});
}


// --------------------------------------------------------------------------------------------------------------
// @brief
//  Adds a marker in the Leaflet map 'mymap' form the coordinates 'start' to 'end' and a duration of 'duration'
// This moving firetruck must be identified by its immatriculation 'immatriculation'
// expressed in milliseconds
// @note
//  The 'duration' must be expressed in ms
function addMovingFiretruck (steps, duration, immatriculation, mymap) 
{
    let camionImageNumber = getRegisteredCamionImageNumber(immatriculation);
    const firetruckIcon = L.icon({
        iconUrl: IMG_PATH + `camion${camionImageNumber}.gif`,
        iconSize:     [60, 47], // size of the icon
        iconAnchor:   [30, 30], // point of the icon which will correspond to marker's location
        popupAnchor:  [0, 50] // point from which the popup should open relative to the iconAnchor
    });

    // drawing the line the moving marker will follow
    let coordinateArray = [...steps];
    // let myPolyline = L.polyline(coordinateArray);
    // myPolyline.addTo(mymap);
    // renderedPolylines.push({immatriculation, polyline: myPolyline});

    // here is the moving marker
    let movingFiretruck = L.Marker.movingMarker(
        coordinateArray, 
        duration, 
        { 
            autostart: false,
            icon: firetruckIcon
        }
    );

    // on départ du sancho
    movingFiretruck.addEventListener('start', () => 
    {
        const startCoordinates = steps[0];
        const isFiretruckMoving = !areDoubletEqual(steps[0], steps[1]);

        // si on part de la station
        const isLeavingFirestation = typeof renderedMarkers.firestationMarkers.markers.find(e => areDoubletEqual(e.coordinates, startCoordinates)) != 'undefined';
        if (isFiretruckMoving && isLeavingFirestation)
            console.log('Un camion quitte sa station !')

        // si on part de feu l'incendie
        const isLeavingFire = typeof renderedMarkers.fireMarkers.markers.find(e => areDoubletEqual(e.coordinates, startCoordinates)) != 'undefined';
        const isLeavingIdle = typeof renderedMarkers.buildingMarkers.markers.find(e => areDoubletEqual(e.coordinates, startCoordinates)) != 'undefined';
        if (isFiretruckMoving && (isLeavingFire || isLeavingIdle))
            console.log('Un camion quitte le feu qu\'il vient d\'éteindre !')
    })

    // on arrival tu coco
    movingFiretruck.addEventListener('end', () => 
    {
        console.log('end')
        const endCoordinates = steps[1];

        console.log(endCoordinates)

        // si on est arrivé à un feu
        const hasArrivedToFire = typeof renderedMarkers.fireMarkers.markers.find(e => areDoubletEqual(e.coordinates, endCoordinates)) != 'undefined';
        const hasArrivedToIdle = typeof renderedMarkers.buildingMarkers.markers.find(e => areDoubletEqual(e.coordinates, endCoordinates)) != 'undefined';
        if (hasArrivedToFire || hasArrivedToIdle)
            console.log('Un camion vient d\'arriver à un feu !')

        // si on est arrivé à une station
        const hasArrivedToFirestation = typeof renderedMarkers.firestationMarkers.markers.find(e => areDoubletEqual(e.coordinates, endCoordinates)) != 'undefined';
        if (hasArrivedToFirestation)
            console.log('Un camion vient de rentrer à sa caserne !')
    })

    renderedMarkers.truckMarkers.markers.push({immatriculation, marker: movingFiretruck});
    if (renderedMarkers.truckMarkers.areShown) {
        mymap.addLayer(movingFiretruck);
        movingFiretruck.start();
    }
}


// --------------------------------------------------------------------------------------------------------------
// @brief
//  Clears all the markers rendered in the Leaflet map 'mymap'
function clearAllMarkers (mymap) {
    for (let markerAbstraction of renderedMarkers.fireMarkers.markers) {
        mymap.removeLayer(markerAbstraction.marker);
    }
    for (let marker of renderedMarkers.buildingMarkers.markers) {
        mymap.removeLayer(marker);
        mymap.removeLayer(marker);
    }

    renderedMarkers.fireMarkers.markers = [];
    renderedMarkers.buildingMarkers.markers = [];
    // renderedMarkers.truckMarkers.markers = [];
}


// --------------------------------------------------------------------------------------------------------------
// @brief
//  Clears all the polylines rendered in the Leaflet map 'mymap'
function clearAllPolylines (mymap) {
    for (let polyline of renderedPolylines) {
        mymap.removeLayer(polyline.polyline);
    }
}


// --------------------------------------------------------------------------------------------------------------
// @brief
//  Clears the polyline identified by the immatriculation 'camionImmatriculation' rendered in the Leaflet map 'mymap'
function clearSpecificPolyline (camionImmatriculation, mymap) {
    let reconstructedArray = [];
    for (let associatedPolyline of renderedPolylines) {
        if (associatedPolyline.immatriculation == camionImmatriculation) {
            mymap.removeLayer(associatedPolyline.polyline);
        } else {
            reconstructedArray.push(associatedPolyline);
        }
    }

    renderedPolylines = reconstructedArray;
}


// --------------------------------------------------------------------------------------------------------------
// @brief
//  Clears all the petitBonhommes rendered in the Leaflet map 'mymap'
function clearAllPetitBonhomme (mymap) {
    for (let pb of renderedMarkers.petitBonhommeMarkers.markers) {
        mymap.removeLayer(pb);
    }
}


// --------------------------------------------------------------------------------------------------------------
// @brief
//  Clears all the firetruck markers rendered in the Leaflet map 'mymap'
function clearAllFiretruckMarkers (mymap) {
    for (let markerAbstraction of renderedMarkers.truckMarkers.markers)
        mymap.removeLayer(markerAbstraction.marker);

    renderedMarkers.truckMarkers.markers = [];
}


// --------------------------------------------------------------------------------------------------------------
// @brief
//  Clears the firetruck marker identified by the immatriculation 'camionImmatriculation' rendered in the Leaflet map 'mymap'
function clearSpecificFiretruck (immatriculation, mymap) 
{
    // removing marker and reconstructing its associted marker array
    let reconstructedArray = [];
    for (let markerAbstraction of renderedMarkers.truckMarkers.markers) {
        if (markerAbstraction.immatriculation == immatriculation) {
            mymap.removeLayer(markerAbstraction.marker);
        } else {
            reconstructedArray.push(markerAbstraction);
        }
    }
    renderedMarkers.truckMarkers.markers = reconstructedArray;
}


// --------------------------------------------------------------------------------------------------------------
// @brief
//  Clears all the smoke markers rendered in the Leaflet map 'mymap'
function clearAllSmoke (mymap) {
    for (let somke of renderedMarkers.smokeMarkers.markers) {
        mymap.removeLayer(smoke);
    }
}


// --------------------------------------------------------------------------------------------------------------
// @brief
//  Clears everything from the Leaflet map 'mymap' except the map tiles
function clearMap (mymap) {
    clearAllMarkers(mymap);
    // clearAllPolylines(mymap);
}


// -----------------------------------------------------------------------------------------------------
// @brief
//  Ajoute un petit bonhomme (cad un marker Leaflet) qui court de la position 'from' à la position 'to',
// et tout cela dans la map Leaflet 'mymap'
function createAndDisplayPetitBonhomme (steps, mymap) {
    const petitBonhommeFileNumber = rand(1, 1);
    const petitBonhommeIcon = L.icon({
        iconUrl: IMG_PATH + `petitBonhomme${petitBonhommeFileNumber}.png`,
        iconSize:     [40, 25], // size of the icon
        iconAnchor:   [20, 20], // point of the icon which will correspond to marker's location
        popupAnchor:  [-3, -76] // point from which the popup should open relative to the iconAnchor
    });

    // déplace le petit bonhomme de 'from' à 'to'
    const pathToFollow = [...steps];
    let petitBonhomme = L.Marker.movingMarker(
        pathToFollow, 
        6000, 
        { 
            autostart: false,
            icon: petitBonhommeIcon
        }
    );

    // on arrival tu coco
    petitBonhomme.addEventListener('end', () => {
        const delay = rand(0, 1000);
        setTimeout(() => {
            mymap.removeLayer(petitBonhomme);
        }, delay);
    })

    mymap.addLayer(petitBonhomme);
    petitBonhomme.start();
    renderedMarkers.petitBonhommeMarkers.markers.push(petitBonhomme);
}


