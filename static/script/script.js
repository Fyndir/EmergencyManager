
const IMG_PATH = '../img/';
const SOUND_PATH = '../sounds/';

let bufferedAudio = {
    cashMoney: new Audio(SOUND_PATH + 'money.mp3'),
    crowdScream1: new Audio(SOUND_PATH + 'crowd/crowd1.wav'),
    crowdScream2: new Audio(SOUND_PATH + 'crowd/crowd2.wav'),
    crowdScream3: new Audio(SOUND_PATH + 'crowd/crowd3.wav'),
    extinguish: new Audio(SOUND_PATH + 'extinguish.wav'),
    boom: new Audio(SOUND_PATH + 'boom.wav'),
    waw: new Audio(SOUND_PATH + 'waw.mp3'),
}

// this array is filled with all the fire [lat,long] for which we have already popped ze petits bonhommes
let triggeredFirePetitBonhomme = [];

// contains all the [lat, long] in which there is fumée qui est en train de s'éteindre
let laFumeeEstEnTrainDeSeteindre = []; 

let locationsCoordinates = [];
let firetrucks = []; // contains all the firetrucks data, such as current position, next position...
let renderedMarkers = {
    fireMarkers: {
        areShown: true,
        isLocked: false, // if is locked, you can't add to it -> used by the fire marker filter
        markers: [],
        litFires: [] // contains the [lat, long] of all lit fires on the ma
    },
    buildingMarkers: {
        areShown: true,
        markers: []
    },
    firestationMarkers: {
        areShown: true,
        markers: []
    },
    truckMarkers: {
        areShown: true,
        markers: []
    },
    petitBonhommeMarkers: {
        markers: []
    },
    smokeMarkers: {
        markers: []
    }
};
let renderedPolylines = [];

// associe à un couple [lat,long] un filename. Voilà à quoi il ressemble
// [
//   {
//      coord: [lat, long],
//      filename: 'aaa.png'
//   },
// ]
let coordToFilenameMAP = [];

// --------------------------------------------------------------------------------------------------------------
// @brief
// This iz where de fun beginz
document.addEventListener('DOMContentLoaded', () => 
{
    console.log('> Document loaded');

    // reset
    locationsCoordinates = [];

    let mymap = setupLeaflet();
    addCPEMarker(mymap);
    fetchAndDisplayCaserne(mymap);
    fetchAndDisplayCamion(mymap);
    fetchAndDisplayIncendie(mymap); // fetch first set of data
    async_gatherDataRegularly(1000, mymap);
});


// --------------------------------------------------------------------------------------------------------------
// @brief
//  Initializes and sets up the Leaflet map. This function returns the initialized Leaflet map
// @source
//   https://github.com/ewoken/Leaflet.MovingMarker
function setupLeaflet () 
{
    var mymap = L.map('leafletMap').setView(
        [45.74846, 4.84671], // Lyon's geographical coordinates
        13 // zoom level
    );

    const accessToken = 'pk.eyJ1IjoiY291Y291aWxsZSIsImEiOiJjazNvZzhmdnUxbGFkM2tvN2FyZ2t4NjZiIn0.0RGUwtF2X-i72qCEeb_G0w';
    L.tileLayer(
        `https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token=${accessToken}`, 
        {
            attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
            maxZoom: 18,
            id: 'mapbox/streets-v11',
            accessToken
        }
    ).addTo(mymap);

    // var circle = L.circle([45.74846, 4.84671], {
    //     color: 'red',
    //     fillColor: '#f03',
    //     fillOpacity: 0.5,
    //     radius: 500
    // }).addTo(mymap);

    // add controls to the map
    const customControl_hideFire = L.Control.extend({
        options: {
            position: 'topright'
        },

        onAdd: function(map) {
            let container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-hide-fire');
            container.style.backgroundColor = 'white';
            container.style.width = '30px';
            container.style.height = '30px';
            
            container.style.backgroundImage = 'url("' + IMG_PATH + 'fire/fire1.gif")';
            container.style.backgroundSize = "30px 30px";
        
            container.onclick = function() {
                const areMarkersShown = renderedMarkers.fireMarkers.areShown;
                renderedMarkers.fireMarkers.isLocked = areMarkersShown;
                renderedMarkers.fireMarkers.areShown = !areMarkersShown;
                for (let marker of renderedMarkers.fireMarkers.markers) {
                    if (areMarkersShown)
                        mymap.removeLayer(marker);
                    else
                        mymap.addLayer(marker);
                }

                updateIncendieData([], mymap) // empty array to use already existing data
            }
            return container;
        }
    });
    mymap.addControl(new customControl_hideFire);

    const customControl_hideTruck = L.Control.extend({
        options: {
            position: 'topright'
        },

        onAdd: function(map) {
            let container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-hide-truck');
            container.style.backgroundColor = 'white';
            container.style.width = '30px';
            container.style.height = '30px';
            
            container.style.backgroundImage = 'url("' + IMG_PATH + 'camion.gif")';
            container.style.backgroundSize = "30px 30px";
        
            container.onclick = function(){
                const areMarkersShown = renderedMarkers.truckMarkers.areShown;
                renderedMarkers.truckMarkers.areShown = !areMarkersShown;
                for (let markerContainer of renderedMarkers.truckMarkers.markers) {
                    if (areMarkersShown)
                        mymap.removeLayer(markerContainer.marker);
                    else
                        mymap.addLayer(markerContainer.marker);
                }
            }
            return container;
        }
    });
    mymap.addControl(new customControl_hideTruck);

    // test
    // const start = [45.54846, 4.84671];
    // const end = [45.94846, 4.84671];
    // fetchAndDisplayRoute(start, end, mymap);

    return mymap;
}


// --------------------------------------------------------------------------------------------------------------
// @brief
//  The [latitude, longitude]'s order contained in 'array' is swaped by this function
function swapLatLong (array) { return [array[1], array[0]] }


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
//  Fetches the route computed by the OSRM online and free engine and displays it on the leaflet map 'mymap'
// @note
//  The 'from' and 'to' variables are arrays containing latitude and longitude data
// If the OSRM API can't give me a valid route, then the marker will simply travel in a straight line to its target
function fetchAndDisplayRoute (from, to, mymap) 
{
    const travelTime = 20000; // the time it takes to get to the destination (in ms)
    fetch(`https://router.project-osrm.org/route/v1/driving/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full`)
    .then(r => r.json()).then(data => {
        try {
            data.routes.map(m => {
                let decodedPolyline = L.polyline(
                    polyline.decode(m.geometry), {
                    color: 'red',
                    weight: 3,
                    opacity: 1
                });
                decodedPolyline.addTo(mymap);
                renderedPolylines.push(decodedPolyline);
                addMovingFiretruck(decodedPolyline['_latlngs'], travelTime, mymap);
            });
        } catch(e) {
            console.error('Too many calls to the OSRM API. Try again later ('+e+')')
            addMovingFiretruck([from, to], travelTime, mymap);
        }
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
    renderedMarkers.fireMarkers.markers.push(marker);
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
    renderedMarkers.firestationMarkers.markers.push(marker);
}


// --------------------------------------------------------------------------------------------------------------
// @brief
//  Adds a firetruck marker in the Leaflet map 'mymap' at coordinates [lat, long] represented by the 
// 'coordinates' argument, in the 'mymap' Leaflet map
function addFiretruckMarker (coordinates, immatriculation, mymap) {
    const firestationIcon = L.icon({
        iconUrl: IMG_PATH + 'camion.gif',
        iconSize:     [60, 47], // size of the icon
        iconAnchor:   [30, 30], // point of the icon which will correspond to marker's location
        popupAnchor:  [-3, -76] // point from which the popup should open relative to the iconAnchor
    });
    let marker = L.marker(coordinates, {icon: firestationIcon}).addTo(mymap);
    marker.setZIndexOffset(1000);
    renderedMarkers.truckMarkers.markers.push({immatriculation, marker});
}


// --------------------------------------------------------------------------------------------------------------
// @brief
//  Adds a marker in the Leaflet map 'mymap' form the coordinates 'start' to 'end' and a duration of 'duration'
// expressed in milliseconds
function addMovingFiretruck (steps, duration, mymap) 
{
    const movingMarkerIcon = L.icon({
        iconUrl: IMG_PATH + 'camion.gif',
        iconSize:     [60, 47], // size of the icon
        iconAnchor:   [30, 30], // point of the icon which will correspond to marker's location
        popupAnchor:  [-3, -76] // point from which the popup should open relative to the iconAnchor
    });

    const firestationIcon = L.icon({
        iconUrl: IMG_PATH + 'firestation.jpg',
        iconSize:     [60, 90], // size of the icon
        iconAnchor:   [30, 60], // point of the icon which will correspond to marker's location
        popupAnchor:  [-3, -76] // point from which the popup should open relative to the iconAnchor
    });

    const fireIcon = L.icon({
        iconUrl: IMG_PATH + 'fire/fire1.gif',
        iconSize:     [60, 90], // size of the icon
        iconAnchor:   [30, 70], // point of the icon which will correspond to marker's location
        popupAnchor:  [-3, -76] // point from which the popup should open relative to the iconAnchor
    });

    // drawing the line the moving marker will follow
    let coordinateArray = [...steps];
    let myPolyline = L.polyline(coordinateArray);
    myPolyline.addTo(mymap);
    renderedPolylines.push(myPolyline);

    // adding start & end markers
    let startMarker = L.marker(coordinateArray[0], {icon: firestationIcon}).addTo(mymap);
    let endMarker = L.marker(coordinateArray[coordinateArray.length - 1], {icon: fireIcon}).addTo(mymap);
    renderedMarkers.buildingMarkers.markers.push(startMarker);
    renderedMarkers.fireMarkers.markers.push(endMarker);

    // here is the moving marker (6 seconds animation)
    let movingFiretruck = L.Marker.movingMarker(
        coordinateArray, 
        duration, 
        { 
            autostart: false,
            icon: movingMarkerIcon
        }
    );

    // on arrival tu coco
    movingFiretruck.addEventListener('end', () => {
        console.log('ze sui arrivé')
    })

    mymap.addLayer(movingFiretruck);
    renderedMarkers.truckMarkers.markers.push(movingFiretruck);
    movingFiretruck.start();
}


// --------------------------------------------------------------------------------------------------------------
// @brief
//  Returns the name of the location identified by its coordinates' array 'latLong' as [lat, long]
function fromLatLongToName (latLong) {
    for (let data of LyonGeogrpahicalData) {
        if (areDoubletEqual(latLong, data.coord))
            return data.name;
    }
    return 'no name';
}


// --------------------------------------------------------------------------------------------------------------
// @brief
//  Fetches all the caserne positions from the PostgreSQL database and displays them inside the Leaflet map 'mymap'
async function fetchAndDisplayCaserne (mymap) {
    fetch('/caserne/get').then(r => r.json()).then(data => 
    {
        if (data == 'no data')
            return;

        displayCaserneData(data, mymap);
    })
    .catch(e => { console.error(e) })
}


// --------------------------------------------------------------------------------------------------------------
// @brief
//  Fetches all the incendie data from the PostgreSQL database and displays them inside the Leaflet map 'mymap'
async function fetchAndDisplayIncendie (mymap) {
    fetch('/fire/get').then(r => r.json()).then(data => 
    {
        if (data == 'no data')
            return;

        updateIncendieData(data, mymap)
    })
    .catch(e => { console.error(e) })
}


// --------------------------------------------------------------------------------------------------------------
// @brief
//  Fetches all the firetruck data from the PostgreSQL database and displays them inside the Leaflet map 'mymap'
async function fetchAndDisplayCamion (mymap) {
    fetch('/camion/get').then(r => r.json()).then(data => 
    {
        if (data == 'no data')
            return;

        updateFiretruckData(data, mymap)
    })
    .catch(e => { console.error(e) })
}


// --------------------------------------------------------------------------------------------------------------
// @brief
//  In the Leaflet map 'mymap', displays the casernes data with the positions contained in 'data'
function displayCaserneData (caserneData, mymap) 
{
    for (let data of caserneData)
        addFirestationMarker([data[0], data[1]], mymap);
}


// --------------------------------------------------------------------------------------------------------------
// @brief
//  In the Leaflet map 'mymap', updates all the displayed data with the new 'newDataset'
function updateIncendieData (newDataset, mymap) 
{
    // if no data is already set, render everything
    if (locationsCoordinates.length === 0)
        locationsCoordinates = newDataset;

    let shouldClearMap = true
    if (newDataset.length === 0) {
        newDataset = locationsCoordinates;
        shouldClearMap = false;
    }

    // render everything
    locationsCoordinates = newDataset;
    if (shouldClearMap) clearMap(mymap);
    for (const data of locationsCoordinates) {
        const coordinates = [data[0], data[1]];
        const intensity = data[2];

        const wasFireLitBefore = renderedMarkers.fireMarkers.litFires.find(e => areDoubletEqual(e, coordinates)) != undefined;
        const fumeeSeteintTelle = laFumeeEstEnTrainDeSeteindre.find(e => areDoubletEqual(e, coordinates)) != undefined;
        if (intensity > 0 && !renderedMarkers.fireMarkers.isLocked) 
        {
            addFireMarker(coordinates, intensity, mymap)

            // ajout d'un petit bonhomme si pas déjà fait 1 fois
            const havePetitBonhommeBeenTriggered = triggeredFirePetitBonhomme.find(e => areDoubletEqual(e, coordinates)) != undefined;
            if (!havePetitBonhommeBeenTriggered) 
            {
                const NB_PETIT_BONHOMME = 50;
                for (let i = 0 ; i < NB_PETIT_BONHOMME ; i++) {
                    const destinationOfPetitBonhomme_lat = coordinates[0] + rand_float(-.0115, .0115, 8);
                    const destinationOfPetitBonhomme_long = coordinates[1] + rand_float(-.0115, .0115, 8);
                    createAndDisplayPetitBonhomme(
                        [
                            coordinates, // from
                            [destinationOfPetitBonhomme_lat, destinationOfPetitBonhomme_long], // to
                        ], mymap);
                }

                // on se souviendra de pas les redessiner à chaque refresh !
                triggeredFirePetitBonhomme.push(coordinates);

                // boom + scream !!
                try { 
                    let whichScream = rand(1, 3);
                    if (whichScream == 1)
                        bufferedAudio.crowdScream1.play();
                    else if (whichScream == 2)
                        bufferedAudio.crowdScream2.play();
                    else
                        bufferedAudio.crowdScream3.play();

                    bufferedAudio.boom.play();
                } catch (e) {
                    console.error(e)
                }
            }
        }

        // if the fire is now of intensity 0 and was lit before
        else if (intensity === 0 && wasFireLitBefore) {
            // remove current coordinates from litFires[]
            let arrayTronquey = [];
            for (let data of renderedMarkers.fireMarkers.litFires)
                if (!areDoubletEqual(data, coordinates))
                    arrayTronquey.push(data)
            renderedMarkers.fireMarkers.litFires = arrayTronquey

            // reset petit bonhomme for this location
            arrayTronquey = [];
            for (let data of triggeredFirePetitBonhomme)
                if (!areDoubletEqual(data, coordinates))
                    arrayTronquey.push(data)
            triggeredFirePetitBonhomme = arrayTronquey

            // extinguish sa mère
            bufferedAudio.extinguish.play();

            laFumeeEstEnTrainDeSeteindre.push(coordinates);
            addSmokeMarker(coordinates, mymap);
        }

        else if (!fumeeSeteintTelle) {
            addIdleMarker(coordinates, mymap)
        }
    }
}


// --------------------------------------------------------------------------------------------------------------
// @brief
//  In the Leaflet map 'mymap', updates all the displayed firetruck with the new 'newDataset'
function updateFiretruckData (firetruckData, mymap) 
{
    for (let data of firetruckData) 
    {
        const dataCurrentCoord = [data[0], data[1]];
        const dataDestinationCoord = [data[2], data[3]]; // never changes
        const dataImmatriculation = data[4];

        // buffer firetruck if not already
        let bufferedFiretruck = firetrucks.find(e => areDoubletEqual(e.immatriculation, dataImmatriculation));
        if (bufferedFiretruck == undefined) {
            firetrucks.push({
                immatriculation: dataImmatriculation,
                originCoord: dataCurrentCoord,
                currentCoord: dataCurrentCoord,
                futureCoord: undefined
            })
            console.log('buffered a firetruck')
            addFiretruckMarker(dataCurrentCoord, dataImmatriculation, mymap);
        }

        // finding the marker and updating its position
        let markerContainer = renderedMarkers.truckMarkers.markers.find(e => e.immatriculation = dataImmatriculation);
        if (markerContainer != undefined) {
            markerContainer.marker.setLatLng([dataCurrentCoord[0], dataCurrentCoord[1]]);
        }

        // else, update the buffered firetruck
        /*
        else {
            const hasFiretruckToMoveFromOrigin = !areDoubletEqual(bufferedFiretruck.originCoord, dataCurrentCoord) && bufferedFiretruck.futureCoord == undefined;
            const hasFiretruckToMoveFromCurrent = bufferedFiretruck.currentCoord != undefined  && !areDoubletEqual(bufferedFiretruck.currentCoord, dataCurrentCoord);
            if (hasFiretruckToMoveFromOrigin) {
                console.log('need to move from origin');
                bufferedFiretruck.currentCoord = bufferedFiretruck.originCoord;
                bufferedFiretruck.futureCoord = dataCurrentCoord;
            }
            else if (hasFiretruckToMoveFromCurrent) {
                console.log('need to move from current');
                bufferedFiretruck.futureCoord = dataCurrentCoord;
            }
        }*/

        // addFiretruckMarker(dataCurrentCoord, mymap);
    }
}


// --------------------------------------------------------------------------------------------------------------
// @brief
//  Fetches incendie data every 'delay' milliseconds and processes it accordingly
async function async_gatherDataRegularly (delay, mymap) {
    setInterval(() => {
        fetchAndDisplayIncendie(mymap);
        fetchAndDisplayCamion(mymap);
    }, delay)
}


// --------------------------------------------------------------------------------------------------------------
// @brief
//  Clears all the markers rendered in the Leaflet map 'mymap'
function clearAllMarkers (mymap) {
    for (let marker of renderedMarkers.fireMarkers.markers) {
        mymap.removeLayer(marker);
    }
    for (let marker of renderedMarkers.buildingMarkers.markers) {
        mymap.removeLayer(marker);
        mymap.removeLayer(marker);
    }
    for (let marker of renderedMarkers.truckMarkers.markers) {
        // mymap.removeLayer(marker);
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
        mymap.removeLayer(polyline);
    }
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
    clearAllPolylines(mymap);
}


// -----------------------------------------------------------------------------------------------------
// @brief
//  Returns a random number between 'min' and 'max', both included
function rand(min, max){ 
	const _min = Math.ceil(min);
    const _max = Math.floor(max);
    return Math.floor(Math.random() * (_max - _min + 1)) + _min;
}


// -------------------------------------------------------------------------------------------------------
// @brief
//  Retourne un nombre aléatoire entre 'min' et 'max', avec 'precision' décimales
// 
function rand_float(min, max, precision = 2) {
    return parseFloat((Math.random() * (max - min) + min).toFixed(precision));
}

// -----------------------------------------------------------------------------------------------------
// @brief
//  Associates to the [latitude, longitude] 'latLong' array a unique file name to be able to alaways have
// the same file name associated to the doublet
function latLongToFileName (latLong) 
{
    // en premier, on cherche si on n'a pas déjà associé un filename
    for (let association of coordToFilenameMAP) {
        if (areDoubletEqual(latLong, association.coord))
            return association.filename;
    }

    // sinon, on l'associe.
    let hassAssociated = false;
    let filename;
    while (!hassAssociated)
    {
        // build filename
        const fileNumber = rand(1, 199);
        fileName = `buildings/building(${fileNumber}).png`;

        // check if filename already associated
        hassAssociated = true;
        for (let association of coordToFilenameMAP) {
            if (association.fileName === latLong)
                hassAssociated = false;
                continue;
        }

        coordToFilenameMAP.push({ coord: latLong, filename: fileName});
    }

    return fileName;
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
            autostart: true,
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


// -----------------------------------------------------------------------------------------------------
// @brief
//  Pretty straightforward B O I
function isNotNullNorUndefined (variable) { 
	return variable !== null && typeof variable !== 'undefined'; 
}


// -----------------------------------------------------------------------------------------------------
// @brief
// this function returns true if doublet1 === doublet2, false sinon
// (?) gros, Javascript est pas capable de le faire tout seul. Alors, je le fais pour lui !
let areDoubletEqual = (doublet1, doublet2) => { return isNotNullNorUndefined(doublet1) && isNotNullNorUndefined(doublet2) && doublet1[0] === doublet2[0] && doublet1[1] === doublet2[1] }