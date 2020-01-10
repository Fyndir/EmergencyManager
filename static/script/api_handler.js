// --------------------------------------------------------------------------------------------------------------
// @brief
//  Fetches the route computed by the OSRM online and free engine and displays it on the leaflet map 'mymap'
// This route is associated to the firetruck of immatriculation 'immatriculation' cool
// @note
//  The 'from' and 'to' variables are arrays containing latitude and longitude data
// If the OSRM API can't give me a valid route, then the marker will simply travel in a straight line to its target
function fetchAndDisplayRoute (from, to, immatriculation, mymap) 
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
                renderedPolylines.push({immatriculation, polyline: decodedPolyline});
            });
        } catch(e) {
            // console.error('Too many calls to the OSRM API. Retrying')
            setTimeout(() => {fetchAndDisplayRoute(from, to, immatriculation, mymap) }, 500);
            
            // drawing the line the moving marker will follow
            // let coordinateArray = [from, to];
            // let straightLine = L.polyline(coordinateArray);
            // straightLine.addTo(mymap);
            // renderedPolylines.push({immatriculation, polyline: straightLine});
        }
    });
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
        const posId = data[0]
        const coordinates = [data[1], data[2]];
        const intensity = data[3];

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
    console.log('%c> ' + firetrucks.length + ' buffered firetrucks', 'color:#9b59b6')
    console.log('%c> ' + renderedMarkers.truckMarkers.markers.length + ' rendered firetrucks', 'color:#10ac84')
    console.log('')
    for (let data of firetruckData) 
    {
        const dataCurrentCoord = [data[0], data[1]]; // are updated by the backend, real time camion position
        const dataDestinationCoord = [data[2], data[3]]; // never changes
        const dataImmatriculation = data[4];

        // buffer firetruck if not already
        let bufferedFiretruck = firetrucks.find(e => e.immatriculation === dataImmatriculation);
        if (typeof bufferedFiretruck == 'undefined') 
        {
            firetrucks.push({
                immatriculation: dataImmatriculation,
                originCoord: dataCurrentCoord,
                currentCoord: dataCurrentCoord,
                futureCoord: dataCurrentCoord,
                destinationCoord: dataDestinationCoord
            })
            addFiretruckMarker(dataCurrentCoord, dataImmatriculation, mymap);

            // ajout de la polyligne du trajet du camion vers sa destination si il doit bouger
            if (!areDoubletEqual(dataCurrentCoord, dataDestinationCoord)) {
                clearSpecificPolyline(dataImmatriculation, mymap);
                fetchAndDisplayRoute(dataCurrentCoord, dataDestinationCoord, dataImmatriculation, mymap);
            }
        }

        else {
            // update the associated marker position
            let markerContainer = renderedMarkers.truckMarkers.markers.find(e => e.immatriculation = dataImmatriculation);
            if (typeof markerContainer != 'undefined') 
            {
                // maj firetruck data
                bufferedFiretruck.currentCoord = bufferedFiretruck.futureCoord;
                bufferedFiretruck.futureCoord = dataCurrentCoord;

                // move firetruck
                clearSpecificFiretruck(dataImmatriculation, mymap);
                addMovingFiretruck(
                    [bufferedFiretruck.currentCoord, bufferedFiretruck.futureCoord], // [from, to]
                    1000, // duration in second
                    dataImmatriculation, // immatriculation du camion qu'on déplace
                    mymap // la map Leaflet dans laquelle le camion sera rendered
                );

                // si la destination a changé, mettre à jour la polyligne du trajet du camion
                if (!areDoubletEqual(bufferedFiretruck.destinationCoord, dataDestinationCoord)) 
                {
                    bufferedFiretruck.destinationCoord = dataDestinationCoord;
                    clearSpecificPolyline(bufferedFiretruck.immatriculation, mymap);
                    fetchAndDisplayRoute(bufferedFiretruck.currentCoord, dataDestinationCoord, dataImmatriculation, mymap);
                }
            }
        }
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