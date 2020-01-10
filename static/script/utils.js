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
//  Pretty straightforward B O I
function isNotNullNorUndefined (variable) { 
	return variable !== null && typeof variable !== 'undefined'; 
}


// -----------------------------------------------------------------------------------------------------
// @brief
// this function returns true if doublet1 === doublet2, false sinon
// (?) gros, Javascript est pas capable de le faire tout seul. Alors, je le fais pour lui !
let areDoubletEqual = (doublet1, doublet2) => { return isNotNullNorUndefined(doublet1) && isNotNullNorUndefined(doublet2) && doublet1[0] === doublet2[0] && doublet1[1] === doublet2[1] }