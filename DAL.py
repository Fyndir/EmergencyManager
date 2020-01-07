import psycopg2

# PostegreSQL connection variables
POSTGRES_URL = "raja.db.elephantsql.com"
POSTGRES_PORT = "5432"
POSTGRES_USER = "cjczxqkt"
POSTGRES_PASSWORD = "VA69fv50J_3JHnNqEOLQ5r7bs1wPQPXS"
POSTGRES_DB_NAME = "cjczxqkt"


connection = None


# -----------------------------------------------------------------------------------------
# @brief
#  Opens the database connection for the whole server session. It is closed when the server
# session ends
def openDatabaseConnection ():
    global connection
    connection = psycopg2.connect(user=POSTGRES_USER,
                                   password=POSTGRES_PASSWORD,
                                   host=POSTGRES_URL,
                                   port=POSTGRES_PORT,
                                   database=POSTGRES_DB_NAME)

# -----------------------------------------------------------------------------------------
# @brief
#  Inserts into the fire database the new fire data 'allData'
def insertIntoFireDatabase(allData):
    retVal = 'no data'
    global connection
    cursor = None

    # si on n'a rien envoyé, abort
    if len(allData) == 0:
        return

    try:
        connection.autocommit = True
        cursor = connection.cursor()
        query = ''

        # si on a envoyé juste un array
        if not isinstance(allData[0], list):
            fireX = allData[0]
            fireY = allData[1]
            fireItensity = allData[2]
            query = 'INSERT INTO v_pos (pos_x, pos_y, pos_i) VALUES ' + "(" + str(fireX) + ", " + str(fireY) + ", " + str(fireItensity) + ");"
            cursor.execute(query)

        # create query by extracting all atomic fields
        else:
            print('getting this array to INSERT INTO')
            print(allData)
            for dataArray in allData:
                fireX = dataArray[0]
                fireY = dataArray[1]
                fireItensity = dataArray[2]
                query = 'INSERT INTO v_pos (pos_x, pos_y, pos_i) VALUES ' + "(" + str(fireX) + ", " + str(fireY) + ", " + str(fireItensity) + ");"
                cursor.execute(query)
            # query = query[:-1] # remove last ','

        # cursor.execute(query)

    except (Exception, psycopg2.Error) as error :
        raise NameError("Error while inserting data into PostgreSQL", error)

    # closing database connection.
    finally:
        if(connection):
            cursor.close()


# -----------------------------------------------------------------------------------------
# @brief
#  Updates the firetruck database according to the new fire data 'allData'
def updateFiretruckDatabase(allData):
    retVal = 'no data'
    global connection
    cursor = None

    # si on n'a rien envoyé, abort
    if len(allData) == 0:
        return

    try:
        connection.autocommit = True
        cursor = connection.cursor()

        # create query by extracting all atomic fields
        for triplet in allData:
            camionX = triplet[0]
            camionY = triplet[1]
            camionImmat = triplet[2]
            query = 'UPDATE t_camion SET camion_x=' + str(camionX) + ',camion_y=' + str(camionY) + ' WHERE immatriculation_camion="' + str(camionImmat) + '"'
            print('\n', query, '\n')
            cursor.execute(query)
            retVal = cursor.fetchall()

    except (Exception, psycopg2.Error) as error :
        print ("Error while inserting firetruck data into PostgreSQL: ", error)

    # closing database connection.
    finally:
        if(connection):
            cursor.close()


# -----------------------------------------------------------------------------------------
# @brief
#  Fetches from the PostGreSQL database the fire casernes positions and returns them
def fetchCasernePosition():
    retVal = 'no data'
    global connection
    cursor = None
    try:
        cursor = connection.cursor()
        cursor.execute("SELECT caserne_x, caserne_y FROM t_caserne")
        retVal = cursor.fetchall()

    except (Exception, psycopg2.Error) as error :
        print ("Error while fetching caserne data from PostgreSQL", error)

    # closing database connection.
    finally:
        if(connection):
            cursor.close()

    return retVal


# -----------------------------------------------------------------------------------------
# @brief
#  Fetches from the PostGreSQL database the fire positions and returns them
def fetchFirePosition():
    retVal = 'no data'
    global connection
    cursor = None
    try:
        cursor = connection.cursor()
        cursor.execute("SELECT pos_x,pos_y,pos_i FROM v_pos")
        retVal = cursor.fetchall()

    except (Exception, psycopg2.Error) as error :
        print ("Error while fetching fire data from PostgreSQL", error)

    # closing database connection.
    finally:
        if(connection):
            cursor.close()

    return retVal


# -----------------------------------------------------------------------------------------
# @brief
#  Fetches from the PostGreSQL database the firetruck positions & ids and returns them
def fetchFiretruckPosition():
    retVal = 'no data'
    global connection
    cursor = None
    try:
        cursor = connection.cursor()
        cursor.execute("SELECT camion_x, camion_y, destination_x, destination_y, immatriculation_camion FROM v_camion")
        retVal = cursor.fetchall()

    except (Exception, psycopg2.Error) as error :
        print ("Error while fetching firetruck data from PostgreSQL", error)

    # closing database connection.
    finally:
        if(connection):
            cursor.close()

    if len(retVal) == 0:
        return 'no data'
    else:
        return retVal