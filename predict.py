from tensorflow import keras
import numpy as np

model = keras.models.load_model('mnist-sequential', compile=False) # compile=False because we're not training


def classify_number(imagedata):
    predictions = model(np.array([imagedata])).numpy()
    return predictions
