from sklearn.neighbors import BallTree
import numpy as np
import pandas as pd
from skimage import color
import requests
import json
import os
from pathlib import Path
import time
import pickle

ball_tree = None
database = None
source = None
config = None


def init(datasource):
    load_ball_tree(datasource)


def load_db(datasource, reload=False):
    global database
    global source
    global config
    if source is datasource and database is not None and reload is False:
        return
    load_config()
    if reload:
        load_ball_tree(datasource, reload=reload)
    csvPath = "." + config[datasource]['featureData'][0]['src']
    index_col = None
    if 'idField' in config[datasource]['featureData'][0]:
        idField = config[datasource]['featureData'][0]['idField']
        if idField != 'none' and idField is not None:
            index_col = idField
    database = pd.read_csv(csvPath, index_col=index_col)
    source = datasource


def load_config():
    config_json_path = Path("static/data") / "config.json"
    global config
    with open(config_json_path, "r+") as configJson:
        config = json.load(configJson)


def load_ball_tree(datasource, reload=False):
    global ball_tree
    global database
    global config
    if datasource != source:
        load_db(datasource)
    pickled_kd_tree_path = str(Path(os.path.join(os.getcwd())) / "static" / "data" / datasource / "ball_tree.pickle")
    if os.path.isfile(pickled_kd_tree_path) and reload is False:
        print("Pickled KD Tree Exists, Loading")
        ball_tree = pickle.load(open(pickled_kd_tree_path, "rb"))
    else:
        print("Creating KD Tree")
        xCoordinate = config[datasource]['featureData'][0]['xCoordinate']
        print('X', xCoordinate)
        yCoordinate = config[datasource]['featureData'][0]['yCoordinate']
        csvPath = "." + config[datasource]['featureData'][0]['src']
        raw_data = pd.read_csv(csvPath)
        points = pd.DataFrame({'x': raw_data[xCoordinate], 'y': raw_data[yCoordinate]})
        ball_tree = BallTree(points, metric='euclidean')
        pickle.dump(ball_tree, open(pickled_kd_tree_path, 'wb'))


def query_for_closest_cell(x, y, datasource):
    global database
    global source
    global ball_tree
    if datasource != source:
        load_ball_tree(datasource)
    distance, index = ball_tree.query([[x, y]], k=1)
    if distance == np.inf:
        return {}
    #         Nothing found
    else:
        try:
            row = database.iloc[index[0]]
            obj = row.to_dict(orient='records')[0]
            obj['id'] = str(index[0][0])
            if 'phenotype' not in obj:
                obj['phenotype'] = ''
            return obj
        except:
            return {}


def get_row(row, datasource):
    global database
    global source
    global ball_tree
    if datasource != source:
        load_ball_tree(datasource)
    obj = database.loc[[row]].to_dict(orient='records')[0]
    obj['id'] = row
    return obj


def get_channel_names(datasource, shortnames=True):
    global database
    global source
    if datasource != source:
        load_ball_tree(datasource)
    if shortnames:
        channel_names = [channel['name'] for channel in config[datasource]['imageData'][1:]]
    else:
        channel_names = [channel['fullname'] for channel in config[datasource]['imageData'][1:]]
    return channel_names


def get_phenotypes(datasource):
    global database
    global source
    global config
    try:
        phenotype_field = config[datasource]['featureData'][0]['phenotype']
    except KeyError:
        phenotype_field = 'phenotype'

    if datasource != source:
        load_ball_tree(datasource)
    if phenotype_field in database.columns:
        return database[phenotype_field].unique().tolist()
    else:
        return ['']


def get_neighborhood(x, y, datasource, r=100):
    global database
    global source
    global ball_tree
    if datasource != source:
        load_ball_tree(datasource)
    index = ball_tree.query_radius([[x, y]], r=r)
    neighbors = index[0]
    try:
        neighborhood = []
        for neighbor in neighbors:
            row = database.iloc[[neighbor]]
            obj = row.to_dict(orient='records')[0]
            obj['id'] = str(neighbor)
            if 'phenotype' not in obj:
                obj['phenotype'] = ''
            neighborhood.append(obj)
        return neighborhood
    except:
        return {}


def get_number_of_cells_in_circle(x, y, datasource, r):
    global source
    global ball_tree
    if datasource != source:
        load_ball_tree(datasource)
    index = ball_tree.query_radius([[x, y]], r=r)
    try:
        return len(index[0])
    except:
        return 0


def get_color_scheme(datasource, refresh, label_field='phenotype'):
    color_scheme_path = str(
        Path(os.path.join(os.getcwd())) / "static" / "data" / datasource / str(label_field + "_color_scheme.pickle"))
    if refresh == False:
        if os.path.isfile(color_scheme_path):
            print("Color Scheme Exists, Loading")
            color_scheme = pickle.load(open(color_scheme_path, "rb"))
            return color_scheme
    if label_field == 'phenotype':
        labels = get_phenotypes(datasource)
    elif label_field == 'cluster':
        labels = get_clusters()
    payload = {
        'hueFilters': [],
        'lightnessRange': ["25", "85"],
        'startPalette': [[75, 25, 75]],
        'weights': {'ciede2000': 1, 'nameDifference': 0, 'nameUniqueness': 0, 'pairPreference': 0},
        'paletteSize': len(labels)
    }
    now = time.time()
    r = requests.post("http://vrl.cs.brown.edu/color/makePalette",
                      data=json.dumps(payload), allow_redirects=True)
    print((now - time.time()), 'seconds to fetch')
    palette = r.json()['palette']
    rgb_palette = [
        np.array(color.lab2rgb(np.reshape(elem, (1, 1, 3)).astype(float)) * 255, dtype=int).flatten().tolist() for
        elem in palette]
    color_scheme = {}
    for i in range(len(rgb_palette)):
        color_scheme[str(labels[i])] = {}
        color_scheme[str(labels[i])]['rgb'] = rgb_palette[i]
        color_scheme[str(labels[i])]['hex'] = '%02x%02x%02x' % tuple(rgb_palette[i])


    pickle.dump(color_scheme, open(color_scheme_path, 'wb'))
    return color_scheme


def get_clusters():
    data = np.load(Path("static/data/Ton_378/embedding.npy"))
    clusters = np.unique(data[:, 2])
    return clusters.astype('int32').tolist()


def get_scatterplot_data():
    data = np.load(Path("static/data/Ton_378/embedding.npy"))
    list_of_obs = [{'x': elem[0], 'y': elem[1], 'cluster': elem[2], 'id': id} for id, elem in enumerate(data)]
    visData = {
        'data': list_of_obs,
        'xMin': np.min(data[:, 0]),
        'xMax': np.max(data[:, 0]),
        'yMin': np.min(data[:, 1]),
        'yMax': np.max(data[:, 1])
    }
    return visData
