
const IMG_PATH = '../img/';
let locationsCoordinates = [];
let renderedMarkers = {
    fireMarkers: {
        areShown: true,
        markers: []
    },
    buildingMarker: {
        areShown: true,
        markers: []
    },
    truckMarkers: {
        areShown: true,
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
        11 // zoom level
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
        
            container.onclick = function(){
                const areMarkersShown = renderedMarkers.fireMarkers.areShown;
                for (let marker of renderedMarkers.fireMarkers.markers) {
                    if (areMarkersShown) {
                        renderedMarkers.fireMarkers.areShown = false;
                        mymap.removeLayer(marker)
                    } else {
                        renderedMarkers.fireMarkers.areShown = true;
                        mymap.addLayer(marker)
                    }
                }
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
                for (let marker of renderedMarkers.truckMarkers.markers) {
                    if (areMarkersShown) {
                        renderedMarkers.truckMarkers.areShown = false;
                        mymap.removeLayer(marker)
                    } else {
                        renderedMarkers.truckMarkers.areShown = true;
                        mymap.addLayer(marker)
                    }
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
//  Adds an idle site marker in the Leaflet map 'mymap' at coordinates [lat, long] represented by the 'coordinates'
// argument, in the 'mymap' Leaflet map
function addIdleMarker (coordinates, mymap) 
{
    const fileName = latLongToFileName(coordinates);
    const idleMarkerIcon = L.icon({
        iconUrl: IMG_PATH + fileName,
        iconSize:     [40, 30], // size of the icon
        iconAnchor:   [30, 30], // point of the icon which will correspond to marker's location
        popupAnchor:  [-3, -76] // point from which the popup should open relative to the iconAnchor
    });
    let marker = L.marker(coordinates, {icon: idleMarkerIcon}).addTo(mymap);
    renderedMarkers.buildingMarker.markers.push(marker);
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
    if (intensity >= 1 && intensity < 3) {
        fireGIF_filename = 'fire1.gif';
    } else if (intensity >= 4 && intensity < 7) {
        fireGIF_filename = 'fire2.gif';
    } else {
        fireGIF_filename = 'fire3.gif';
    }

    const fireIcon = L.icon({
        iconUrl: IMG_PATH + 'fire/' + fireGIF_filename,
        iconSize:     [60, 90], // size of the icon
        iconAnchor:   [30, 70], // point of the icon which will correspond to marker's location
        popupAnchor:  [-3, -76] // point from which the popup should open relative to the iconAnchor
    });
    let marker = L.marker(coordinates, {icon: fireIcon}).addTo(mymap);
    renderedMarkers.fireMarkers.markers.push(marker);
}


// --------------------------------------------------------------------------------------------------------------
// @brief
//  Adds a firestation building marker in the Leaflet map 'mymap' at coordinates [lat, long] represented by the 
// 'coordinates' argument, in the 'mymap' Leaflet map
function addFirestationMarker (coordinates, mymap) {
    const firestationIcon = L.icon({
        iconUrl: IMG_PATH + 'firestation.gif',
        iconSize:     [60, 90], // size of the icon
        iconAnchor:   [30, 70], // point of the icon which will correspond to marker's location
        popupAnchor:  [-3, -76] // point from which the popup should open relative to the iconAnchor
    });
    let marker = L.marker(coordinates, {icon: firestation}).addTo(mymap);
    renderedMarkers.buildingMarker.markers.push(marker);
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
    renderedMarkers.buildingMarker.markers.push(startMarker);
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
//  Fetches all the incendie data from the PostgreSQL database and displays them inside the Leaflet map 'mymap'
async function fetchAndDisplayIncendie (mymap) {
    fetch('/fire/get').then(r => r.json()).then(data => 
    {
        updateIncendieData(data, mymap)
    })
    .catch(e => { console.error(e) })
}


// --------------------------------------------------------------------------------------------------------------
// @brief
//  In the Leaflet map 'mymap', updates all the displayed data with the new 'newDataset'
function updateIncendieData (newDataset, mymap) 
{
    console.log(newDataset)
    // if no data is already set, render everything
    if (locationsCoordinates.length === 0)
        locationsCoordinates = newDataset;

    // render everything
    locationsCoordinates = newDataset;
    clearMap(mymap);
    for (let data of locationsCoordinates) {
        let coordinates = [data[0], data[1]];
        let intensity = data[2];
        if (intensity > 0)
            addFireMarker(coordinates, intensity, mymap)
        else
            addIdleMarker(coordinates, mymap)
    }
}


// --------------------------------------------------------------------------------------------------------------
// @brief
//  Fetches incendie data every 'delay' milliseconds and processes it accordingly
async function async_gatherDataRegularly (delay, mymap) {
    setInterval(() => {fetchAndDisplayIncendie(mymap)}, delay)
}


// --------------------------------------------------------------------------------------------------------------
// @brief
//  Clears all the markers rendered in the Leaflet map 'mymap'
function clearAllMarkers (mymap) {
    for (let marker of renderedMarkers.fireMarkers.markers)
        mymap.removeLayer(marker);
    for (let marker of renderedMarkers.buildingMarker.markers)
        mymap.removeLayer(marker);
    for (let marker of renderedMarkers.truckMarkers.markers)
        mymap.removeLayer(marker);
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

// -----------------------------------------------------------------------------------------------------
// @brief
//  Associates to the [latitude, longitude] 'latLong' array a unique file name to be able to alaways have
// the same file name associated to the doublet
function latLongToFileName (latLong) 
{
    // this function returns true if doublet1 === doublet2, false sinon
    // (?) gros, Javascript est pas capable de le faire tout seul. Alors, je le fais pour lui !
    let areDoubletEqual = (doublet1, doublet2) => { return doublet1[0] === doublet2[0] && doublet1[1] === doublet2[1] }

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