
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

    tchoutchou: new Audio(SOUND_PATH + '/camion/tchoutchou.wav'),
    camionStop: new Audio(SOUND_PATH + '/camion/camionStop.wav'),
    sirene: new Audio(SOUND_PATH + '/camion/sirene.wav'),
}

// this array is filled with all the fire [lat,long] for which we have already popped ze petits bonhommes
let triggeredFirePetitBonhomme = [];

// contains all the [lat, long] in which there is fumée qui est en train de s'éteindre
let laFumeeEstEnTrainDeSeteindre = []; 

let locationsCoordinates = [];
let firetrucks = []; // contains all the firetrucks data, such as current position, next position...
let firetrucksImageMap = []; // associe, à une immatriculation, une image de camion fixe
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
    firetrucks = [];
    firetrucksImageMap = [];

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
                for (let markerAbstraction of renderedMarkers.fireMarkers.markers) {
                    if (areMarkersShown)
                        mymap.removeLayer(markerAbstraction.marker);
                    else
                        mymap.addLayer(markerAbstraction.marker);
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
            
            container.style.backgroundImage = 'url("' + IMG_PATH + 'camion1.gif")';
            container.style.backgroundSize = "30px 30px";
        
            container.onclick = function(){
                const areMarkersShown = renderedMarkers.truckMarkers.areShown;
                renderedMarkers.truckMarkers.areShown = !areMarkersShown;
                for (let markerAbstraction of renderedMarkers.truckMarkers.markers) {
                    if (areMarkersShown)
                        mymap.removeLayer(markerAbstraction.marker);
                    else
                        mymap.addLayer(markerAbstraction.marker);
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