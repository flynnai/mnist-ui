import tensorflow as tf

# load dataset
mnist = tf.keras.datasets.mnist

# get train, test data
(x_train, y_train), (x_test, y_test) = mnist.load_data()
x_train, x_test = x_train / 255.0, x_test / 255.0

# define model
model = tf.keras.models.Sequential(
    [
        tf.keras.layers.Flatten(input_shape=(28, 28)),
        tf.keras.layers.Dense(128, activation="relu"),
        tf.keras.layers.Dropout(0.2),
        tf.keras.layers.Dense(10),
    ]
)


# compile model
loss_fn = tf.keras.losses.SparseCategoricalCrossentropy(from_logits=True)
model.compile(optimizer="adam", loss=loss_fn, metrics=["accuracy"])

# predictions example
predictions = model(x_train[:1]).numpy()
loss_fn(y_train[:1], predictions).numpy()

# train model
model.fit(x_train, y_train, epochs=5)

# evaluate model on test data
model.evaluate(x_test, y_test, verbose=2)

# create softmaxed version
# probability_model = tf.keras.Sequential([model, tf.keras.layers.Softmax()])

# SAVE NON-SOFTMAX version:
probability_model = model

probability_model.save("mnist-sequential.hdf5")
