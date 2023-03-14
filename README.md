# Installing Keras / Tensorflow

(for MacOS)

```zsh
python3 -m venv env
pip install tensorflow-macos
```

# Converting Model to TFJS

```zsh
tensorflowjs_converter --input_format=keras mnist-sequential.hdf5  ./static/js-version/js_model
```
