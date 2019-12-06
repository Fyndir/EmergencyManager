from flask import Flask, send_from_directory, jsonify, request
from multiprocessing import Array, Process, Value
from collections import namedtuple
from ctypes import c_char, c_wchar
from flask_cors import CORS
import threading
import psycopg2
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

def writeCloudData(data):
    try:
        client = InfluxDBClient(INFLUXDB_CLIENT_URL, INFLUXDB_CLIENT_TOKEN)
        # client.write(BUCKET_ID, INFLUXDB_CLIENT_TOKEN, data)
        client.write_points(data)
    except Exception as error:
        print(error)

writeCloudData('COUCOU GAMAIN')

def async_sendSimulationDataToIOT():
    INTERVAL_BETWEEN_CALLS = 1 # in seconds
    print('> sending data to IOT device')
    # threading.Timer(INTERVAL_BETWEEN_CALLS, async_sendSimulationDataToIOT).start()
    # result = requests.post('http://127.0.0.1:5000/test', data='putasse')
    # print(result)

def insertIntoDatabase(allData):
    # PostegreSQL connection variables
    POSTGRES_URL = "raja.db.elephantsql.com"
    POSTGRES_PORT = "5432"
    POSTGRES_USER = "cjczxqkt"
    POSTGRES_PASSWORD = "VA69fv50J_3JHnNqEOLQ5r7bs1wPQPXS"
    POSTGRES_DB_NAME = "cjczxqkt"

    retVal = 'no data'
    try:
        connection = psycopg2.connect(user=POSTGRES_USER,
                                      password=POSTGRES_PASSWORD,
                                      host=POSTGRES_URL,
                                      port=POSTGRES_PORT,
                                      database=POSTGRES_DB_NAME)
        cursor = connection.cursor()

        # create query by extracting all atomic fields
        query = 'INSERT INTO v_pos (pos_x, pos_y, pos_i) VALUES '
        for dataArray in allData:
            query += "(" + dataArray[0] + ", " + dataArray[1] + ", " + dataArray[2] + "),"
        query = query[:-1] # remove last ','

        print('here is the query')
        print(query)

        # cursor.execute(query)
        # retVal = cursor.fetchall()

    except (Exception, psycopg2.Error) as error :
        print ("Error while inserting data into PostgreSQL", error)

    # closing database connection.
    finally:
        if(connection):
            cursor.close()
            connection.close()

def queryDatabase():
    # PostegreSQL connection variables
    POSTGRES_URL = "raja.db.elephantsql.com"
    POSTGRES_PORT = "5432"
    POSTGRES_USER = "cjczxqkt"
    POSTGRES_PASSWORD = "VA69fv50J_3JHnNqEOLQ5r7bs1wPQPXS"
    POSTGRES_DB_NAME = "cjczxqkt"

    retVal = 'no data'
    try:
        connection = psycopg2.connect(user=POSTGRES_USER,
                                      password=POSTGRES_PASSWORD,
                                      host=POSTGRES_URL,
                                      port=POSTGRES_PORT,
                                      database=POSTGRES_DB_NAME)
        cursor = connection.cursor()
        cursor.execute("SELECT pos_x,pos_y,pos_i FROM v_pos")
        retVal = cursor.fetchall()

    except (Exception, psycopg2.Error) as error :
        print ("Error while fetching data from PostgreSQL", error)

    # closing database connection.
    finally:
        if(connection):
            cursor.close()
            connection.close()

    return retVal

# ROUTING
app = Flask(__name__, static_folder='static/')
# cors = CORS(app, resources={r"*": {"origins": "*"}})
CORS(app)

@app.route('/')
def root():
    return send_from_directory(os.path.join('.', 'static'), 'index.html')

@app.route('/data')
def API_BASIC():
    return jsonify(queryDatabase())

@app.route('/send', methods=['POST'])
def handlePostData():
    rawData = 'no data'
    try:
        # parsing raw data
        # (?) should look like that: 1,2,3;4,5,6;7,8,9[...]
        rawData = request.data.decode('UTF-8')
        exploitableData = []
        for data in rawData.split(';'):
            subArray = []
            for atomicData in data.split(','):
                subArray.append(atomicData)

            exploitableData.append(subArray)
        
        insertIntoDatabase(exploitableData)
    except (Exception, psycopg2.Error) as error :
        print(error)
    finally:
        return rawData

# start to send asynchronous data
# async_sendSimulationDataToIOT()
    
# main function, simply launching the server
if __name__ == "__main__":
    app.run(debug=True)