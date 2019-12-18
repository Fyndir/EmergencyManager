import psycopg2

# PostegreSQL connection variables
POSTGRES_URL = "raja.db.elephantsql.com"
POSTGRES_PORT = "5432"
POSTGRES_USER = "cjczxqkt"
POSTGRES_PASSWORD = "VA69fv50J_3JHnNqEOLQ5r7bs1wPQPXS"
POSTGRES_DB_NAME = "cjczxqkt"

# -----------------------------------------------------------------------------------------
# @brief
#  Inserts into the fire database the new fire data 'allData'
def insertIntoFireDatabase(allData):
    retVal = 'no data'
    try:
        connection = psycopg2.connect(user=POSTGRES_USER,
                                      password=POSTGRES_PASSWORD,
                                      host=POSTGRES_URL,
                                      port=POSTGRES_PORT,
                                      database=POSTGRES_DB_NAME)
        cursor = connection.cursor()

        # create query by extracting all atomic fields
        fireX = allData[0]
        fireY = allData[1]
        fireItensity = allData[2]
        query = 'INSERT INTO v_pos (pos_x, pos_y, pos_i) VALUES '
        for dataArray in allData:
            query += "(" + fireX + ", " + fireY + ", " + fireItensity + "),"
        query = query[:-1] # remove last ','
        cursor.execute(query)

    except (Exception, psycopg2.Error) as error :
        print ("Error while inserting data into PostgreSQL", error)

    # closing database connection.
    finally:
        if(connection):
            cursor.close()
            connection.close()


# -----------------------------------------------------------------------------------------
# @brief
#  Updates the firetruck database according to the new fire data 'allData'
def updateFiretruckDatabase(allData):
    retVal = 'no data'
    try:
        connection = psycopg2.connect(user=POSTGRES_USER,
                                      password=POSTGRES_PASSWORD,
                                      host=POSTGRES_URL,
                                      port=POSTGRES_PORT,
                                      database=POSTGRES_DB_NAME)
        cursor = connection.cursor()

        # create query by extracting all atomic fields
        camionX = allData[0]
        camionY = allData[1]
        camionImmat = allData[2]
        query = "UPDATE t_camion SET camion_x=" + camionX + ",camion_y=" + camionY + " WHERE immatriculation_camion=" + camionImmat
        cursor.execute(query)
        retVal = cursor.fetchall()

    except (Exception, psycopg2.Error) as error :
        print ("Error while inserting data into PostgreSQL", error)

    # closing database connection.
    finally:
        if(connection):
            cursor.close()
            connection.close()


# -----------------------------------------------------------------------------------------
# @brief
#  Fetches from the PostGreSQL database the fire positions and returns them
def fetchFirePosition():
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
        print ("Error while fetching fire data from PostgreSQL", error)

    # closing database connection.
    finally:
        if(connection):
            cursor.close()
            connection.close()

    return retVal


# -----------------------------------------------------------------------------------------
# @brief
#  Fetches from the PostGreSQL database the firetruck positions & ids and returns them
def fetchFiretruckPosition():
    retVal = 'no data'
    try:
        connection = psycopg2.connect(user=POSTGRES_USER,
                                      password=POSTGRES_PASSWORD,
                                      host=POSTGRES_URL,
                                      port=POSTGRES_PORT,
                                      database=POSTGRES_DB_NAME)
        cursor = connection.cursor()
        cursor.execute("SELECT camion_x, camion_y, destination_x, destination_y, immatriculation_camion FROM v_camion")
        retVal = cursor.fetchall()

    except (Exception, psycopg2.Error) as error :
        print ("Error while fetching firetruck data from PostgreSQL", error)

    # closing database connection.
    finally:
        if(connection):
            cursor.close()
            connection.close()

    return retVal