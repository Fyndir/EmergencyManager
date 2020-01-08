from flask import Flask, send_from_directory, jsonify, request
from multiprocessing import Array, Process, Value
from collections import namedtuple
from ctypes import c_char, c_wchar
from flask_cors import CORS
from DAL import *
import threading
import requests
import time
import json
import os

# cloud imports
import influxdb_client
from influxdb_client import InfluxDBClient
INFLUXDB_CLIENT_TOKEN = 'ts74DsI13lMtInWbkBB4PTJSl-VarXQ74U0SvPBEaaBr5L0mjvAEaj_S2v-OUlbNyl8D1jua8uyze5GnIR0CQQ=='
INFLUXDB_CLIENT_URL = 'https://us-west-2-1.aws.cloud2.influxdata.com'
BUCKET_ID = "Transversal"


# -----------------------------------------------------------------------------------------
# @brief
#  Envoie et stock dans le cloud la donnée 'data'
def writeCloudData(data):
    try:
        client = InfluxDBClient(INFLUXDB_CLIENT_URL, INFLUXDB_CLIENT_TOKEN)
        # client.write(BUCKET_ID, INFLUXDB_CLIENT_TOKEN, data)
        client.write_points(data)
    except Exception as error:
        print(error)

writeCloudData('COUCOU GAMAIN')


# -----------------------------------------------------------------------------------------
# @brief
#  Sends data to the IoT device, at a fixed interval
def async_sendSimulationDataToIOT():
    INTERVAL_BETWEEN_CALLS = 1 # in seconds
    print('> sending data to IOT device')
    # threading.Timer(INTERVAL_BETWEEN_CALLS, async_sendSimulationDataToIOT).start()
    # result = requests.post('http://127.0.0.1:5000/test', data='putasse')
    # print(result)


# ---------------------------------------------------------------------------------------------
# @brief
#  Returns True if 'stringo' is an integer or a float, Flase otherwise
def isStringIntOrFloat(stringo):
    if stringo.isdigit():
        return True
    if stringo.replace('.', '', 1).isdigit() and stringo.count('.') < 2:
        return True
    return False


# ---------------------------------------------------------------------------------
#                                  WEBSITE USER ROUTING
# ---------------------------------------------------------------------------------
app = Flask(__name__, static_folder='static/')
# cors = CORS(app, resources={r"*": {"origins": "*"}})
CORS(app)

@app.route('/')
def root():
    return send_from_directory(os.path.join('.', 'static'), 'index.html')


# ---------------------------------------------------------------------------------
#                             LOCALISATION API ENDPOINTS
# ---------------------------------------------------------------------------------
@app.route('/caserne/get')
def API_CASERNE_GET():
    return jsonify(fetchCasernePosition())

@app.route('/fire/get')
def API_FIRE_GET():
    return jsonify(fetchFirePosition())

@app.route('/fire/send', methods=['POST'])
def API_FIRE_SEND():
    rawData = 'no data'

    # parsing received data
    # (?) should look like that: 1,2,3;4,5,6;7,8,9[...]
    try:
        rawData = request.data.decode('UTF-8')
        exploitableData = []

        # if there was no delimiter (aka on a envoyé qu'un seul triplet)
        splittedData = rawData.split(';')
        if splittedData[0] == rawData:
            subArray = []
            for atomicData in splittedData[0].split(','):
                if len(atomicData) > 0 and isStringIntOrFloat(atomicData):
                    subArray.append(atomicData)

            # array integrity check
            if (len(subArray) == 2):
                exploitableData.append(subArray)

        # sinon, on a envoyé plusieurs triplets, donc simplement faut les traiter un par un
        else:
            print('envoyé plusieurs triplets')
            for data in rawData.split(';'):
                subArray = []
                for atomicData in data.split(','):
                    if len(atomicData) > 0 and isStringIntOrFloat(atomicData):
                        subArray.append(atomicData)

                # array integrity check
                if (len(subArray) == 2):
                    exploitableData.append(subArray)
        
        insertIntoFireDatabase(exploitableData)
    except (Exception, psycopg2.Error) as error :
        print(error)
    finally:
        return rawData


# ---------------------------------------------------------------------------------
#                               FIRETRUCK API ENDPOINTS
# ---------------------------------------------------------------------------------

@app.route('/fire/test/ignite', methods=['GET', 'POST'])
def API_FIRE_TEST_IGNITE():
    try:
        insertIntoFireDatabase([[75, 9], [76, 4]])
    except (Exception, psycopg2.Error) as error :
        print(error)
    finally:
        return 'coucou antoine g allumé deu feu loul'

@app.route('/fire/test/stop', methods=['GET', 'POST'])
def API_FIRE_TEST_STOPFAYA():
    try:
        insertIntoFireDatabase([[75, 0], [76, 0]])
    except (Exception, psycopg2.Error) as error :
        print(error)
    finally:
        return 'coucou antoine g éten tou lol'


# ---------------------------------------------------------------------------------
#                               FIRETRUCK API ENDPOINTS
# ---------------------------------------------------------------------------------
@app.route('/camion/get')
def API_CAMION_GET():
    return jsonify(fetchFiretruckPosition())

@app.route('/camion/send', methods=['POST'])
def API_CAMION_SEND():
    rawData = 'no data'

    # parsing received data
    # (?) should look like that: lat1,long1;lat2,long2; [...]
    try:
        rawData = request.data.decode('UTF-8')
        exploitableData = []

        # if there was no delimiter (aka on a envoyé qu'un seul triplet)
        splittedData = rawData.split(';')
        if splittedData[0] == rawData:
            subArray = []
            for atomicData in splittedData[0].split(','):
                if len(atomicData) > 0:
                    subArray.append(atomicData)

            # array integrity check
            if (len(subArray) == 3):
                exploitableData.append(subArray)

        # sinon, on a envoyé plusieurs triplets, donc simplement faut les traiter un par un
        else:
            for data in rawData.split(';'):
                subArray = []
                for atomicData in data.split(','):
                    if len(atomicData) > 0:
                        subArray.append(atomicData)

                # array integrity check
                if (len(subArray) == 3):
                    exploitableData.append(subArray)
            
        updateFiretruckDatabase(exploitableData)
    except (Exception, psycopg2.Error) as error :
        print(error)
    finally:
        return rawData


# ---------------------------------------------------------------------------------
#                              API UTILITARY ENDPOINTS oui
# ---------------------------------------------------------------------------------

@app.route('/api/polyline/decode', methods=['POST'])
def API_POLYLINE_DECODE():
    rawData = request.data.decode('UTF-8')
    decodedPolyline = decodePolyline(rawData)
    return str(decodedPolyline)


# start to send asynchronous data
# async_sendSimulationDataToIOT()

# -------------------------------------------------------------------------------------------------------
# @brief
#  Prend en entrée les données encryptées 'encryptedData' grâce à la méthode AES, et le sépare en
# segments [ID _ DATA] de taille fixe 'segmentSize'
# @note
#  Pour obtenir des paquets d'une taille fixe de 60 octets, 'segmentSize' devrait valoir 11
def splitPaquet(encryptedData, segmentSize):
    hasFinishedSegmenting = False
    hasReachedEndOfData = False
    currentSegment = ''
    segments = []
    index = 0
    while not hasFinishedSegmenting:
        for x in range(0, segmentSize):
            currentSegment += encryptedData[index]

            if index >= len(encryptedData) - 1:
                hasReachedEndOfData = True
                break
            else:
                index += 1

        # si on est arrivé à la fin et qu'il n'y a pas assez de char pour avoir la taille souhaitée,
        # on rajoute des caractères bidons
        if hasReachedEndOfData and len(currentSegment) < segmentSize:
            for x in range(0, segmentSize - len(currentSegment)):
                currentSegment += '*'

        # arrivé ici, on a un segment de taille 'segmentSize'
        segments.append(currentSegment)
        currentSegment = '' # reset

        if hasReachedEndOfData:
            hasFinishedSegmenting = True


# -------------------------------------------------------------------------------------------------------
# @brief
#  Décode la polyligne 'polyline' au calme
def decodePolyline (polyline):
    str = ''
    precison = ''
    index = 0
    lat = 0
    lng = 0
    coordinates = []
    shift = 0
    result = 0
    byte = None
    latitude_change = None
    longitude_change = None
    factor = 10**5

    while index < len(str):
        byte = None
        shift = 0
        result = 0

        while True:
            byte = str.charCodeAt(index) - 63
            index += 1
            result |= (byte & 0x1f) << shift
            shift += 5

            if byte >= 0x20:
                break

        latitude_change = ~(result >> 1) if (result & 1) else (result >> 1)
        shift = result = 0

        while True:
            byte = str.charCodeAt(index) - 63
            index += 1
            result |= (byte & 0x1f) << shift
            shift += 5

            if byte >= 0x20:
                break

        longitude_change = ~(result >> 1) if (result & 1) else (result >> 1)

        lat += latitude_change
        lng += longitude_change

        print(lat)
        coordinates.append([lat / factor, lng / factor])
    return coordinates


# Il est essentiel d'ouvrir la connection avant toute interaction avec PostGre !
openDatabaseConnection()

    
# main function, simply launching the server
if __name__ == "__main__":
    app.run(debug=True)