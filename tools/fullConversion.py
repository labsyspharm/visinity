from PIL import Image
import timeit
import os
import shutil
from pathlib import Path


# works with python 3 -  call as  /Users/johanna/anaconda/bin/python TifConverter.py
if os.name == 'nt':
    vipshome = os.path.dirname(os.path.abspath(__file__)) + r"\..\static\vips-dev-8.9\bin"
    os.environ['PATH'] = vipshome + ';' + os.environ['PATH']

import pyvips
import numpy as np
import cv2
from skimage.io import imread

import tifffile as tf
from PIL import Image
import os
import re

# set Libvips path for windows. If mac, please run `brew install vips`
if os.name == 'nt':
    vipshome = '..\\static\\vips-dev-8.9\\bin'
    os.environ['PATH'] = vipshome + ';' + os.environ['PATH']

Image.MAX_IMAGE_PIXELS = 1000000000


def convertTifToPyramid(channel_img, destFile, isLabelImg):
    img_dim = channel_img.shape[:2]
    print('img shape', img_dim, channel_img.dtype)
    channel_img = channel_img.astype('uint32')
    imgR = ((channel_img >> 16) % 256).astype('uint8')
    imgG = ((channel_img >> 8) % 256).astype('uint8')  # high bits
    imgB = (channel_img % 256).astype('uint8')  # low bits
    channel_img = cv2.merge((imgB, imgG, imgR))

    if channel_img is not None:
        print('Destfile', destFile)
        cv2.imwrite(destFile + '.png', channel_img)  # [cv2.IMWRITE_PNG_COMPRESSION, 9]
        image = pyvips.Image.new_from_file(destFile + '.png', access='sequential')
        # Remove any existing directory with the name of the channel
        if os.path.exists(destFile):
            shutil.rmtree(destFile)
        if not isLabelImg:
            image.dzsave(destFile, tile_size=128, overlap=2, suffix='.png')
        else:
            image.dzsave(destFile, tile_size=128, overlap=2, region_shrink='mode', suffix='.png')


def convertOmeTiff(filePath, fileName, isLabelImg=False):
    channelNames = []
    file_path = str(Path(filePath) / fileName)
    ome = tf.imread(file_path, is_ome=True)
    for channel in range(np.shape(ome)[0]):
        img = ome[channel, :, :]
        channelName = re.sub(r'\.ome|\.tiff|\.tif|\.png', '', fileName) + "_" + str(channel)
        channel_path = str(Path(filePath) / channelName)
        convertTifToPyramid(img, channel_path, isLabelImg)
        channelNames.append(channelName)
    return channelNames


def convertChannel(filePath, isLabelImg):
    channel_img = imread(filePath)
    channel_img = np.squeeze(channel_img)  # Remove any unnecessary single dimensions
    channelPath = re.sub(r'\.ome|\.tiff|\.tif|\.png', '', filePath)
    convertTifToPyramid(channel_img, channelPath, isLabelImg)
