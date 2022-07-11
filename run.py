from waitress import serve
from minerva_analysis import app
import multiprocessing
import sys

if __name__ == '__main__':
    print('Serving on 0.0.0.0:8000 or http://localhost:8000/')
    serve(app, host='0.0.0.0', port=8000, max_request_body_size=1073741824000000, max_request_header_size=85899345920000)
