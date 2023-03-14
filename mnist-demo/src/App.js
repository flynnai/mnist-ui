import React, { useEffect, useRef, useState } from "react";
import "./App.css";

const CANVAS_SIZE = 616;
// 28 by 28 0-255 grayscale
const IMAGE_SIZE = 28;

// load tf from CDN
const tf = window.tf;

const grayscaleRgb = (val) => `rgb(${val}, ${val}, ${val})`;
const softmax = (arr) =>
    arr.map(
        (elt) =>
            Math.exp(elt) / arr.reduce((curr, acc) => curr + Math.exp(acc), 0)
    );

function App() {
    // Component state, refs
    const cRef = useRef(null);
    const highResCRef = useRef(null);
    const modelRef = useRef(null);
    const [markerColor, setMarkerColor] = useState("white");
    const inputImageRef = useRef(
        new Array(IMAGE_SIZE)
            .fill(0)
            .map((elt) => new Array(IMAGE_SIZE).fill(0))
    );

    const initializeCanvases = (c) => {
        if (!cRef.current) {
            highResCRef.current = document.createElement("CANVAS");
            let highResC = highResCRef.current;
            highResC.width = c.width;
            highResC.height = c.height;
            const highResCtx = highResC.getContext("2d");
            highResCtx.fillStyle = "black";
            highResCtx.fillRect(0, 0, highResC.width, highResC.height);
            cRef.current = c;
            drawNumber();
        }
    };

    const clearInputCanvas = () => {
        const highResC = highResCRef.current;
        const highResCtx = highResC.getContext("2d");
        highResCtx.fillStyle = "black";
        highResCtx.fillRect(0, 0, highResC.width, highResC.height);
        inputImageRef.current = pixelateHighRes();
        drawNumber();
    };

    const pixelateHighRes = () => {
        const highResC = highResCRef.current;
        const highResCtx = highResC.getContext("2d");

        const imageData = highResCtx.getImageData(
            0,
            0,
            highResC.width,
            highResC.height
        );
        const pixelated = new Array(IMAGE_SIZE)
            .fill(0)
            .map((_) => new Array(IMAGE_SIZE).fill(0));
        const squareSizePx = highResC.width / IMAGE_SIZE;

        for (let i = 0; i < imageData.data.length; i += 4) {
            // all we need is one value of r, g, or b (since grayscale)
            const grayscale = imageData.data[i];
            let row = Math.floor(
                Math.floor(i / 4 / highResC.width) / squareSizePx
            );
            let col = Math.floor(((i / 4) % highResC.width) / squareSizePx);
            pixelated[row][col] += grayscale;
        }

        for (let row = 0; row < IMAGE_SIZE; row++) {
            for (let col = 0; col < IMAGE_SIZE; col++) {
                pixelated[row][col] = Math.floor(
                    pixelated[row][col] / (squareSizePx * squareSizePx)
                );
            }
        }

        return pixelated;
    };

    const drawNumber = () => {
        const grayscaleImage = inputImageRef.current;
        const c = cRef.current;
        const ctx = c.getContext("2d");

        const squareSizePx = c.width / IMAGE_SIZE;
        for (let row = 0; row < IMAGE_SIZE; row++) {
            for (let col = 0; col < IMAGE_SIZE; col++) {
                let grayscaleVal = grayscaleImage[row][col];
                ctx.fillStyle = `rgb(${grayscaleVal}, ${grayscaleVal}, ${grayscaleVal})`;
                ctx.fillRect(
                    col * squareSizePx,
                    row * squareSizePx,
                    squareSizePx,
                    squareSizePx
                );
            }
        }
    };

    const getPrediction = async () => {
        const normalized = inputImageRef.current.map((row) =>
            row.map((elt) => elt / 255)
        );
        console.log("Sending", normalized);

        // const response = await fetch("/get-predictions", {
        //     method: "POST",
        //     body: JSON.stringify(normalized),
        //     headers: {
        //         Accept: "application/json",
        //         "Content-Type": "application/json",
        //     },
        // });
        // const data = await response.json();
        // const softmaxes = data[0];
        const model = modelRef.current;
        const softmaxes = (
            await model.predict(tf.tensor3d([normalized], [1, 28, 28])).array()
        )[0];
        let scores = {};
        for (let i = 0; i < 10; i++) {
            scores[i] = Math.round(softmaxes[i] * 100) / 100;
        }
        console.log("Got response:", scores);

        console.log("Softmaxes:", softmaxes);
        let guess = 0;
        softmaxes.forEach((score, i) => {
            if (score > softmaxes[guess]) {
                guess = i;
            }
        });

        console.log("That's definitely a ", guess);
        document.querySelector("#prediction").innerHTML = guess;

        const h = await model.fit(
            tf.tensor3d([normalized], [1, 28, 28]),
            tf.tensor2d([[0, 1, 0, 0, 0, 0, 0, 0, 0, 0]], [1, 10]),
            {
                batchSize: 4,
                epochs: 3,
            }
        );
        console.log(h);
    };

    useEffect(() => {
        // EVENT LISTENERS
        if (!cRef.current) return;

        const c = cRef.current;

        const ctx = c.getContext("2d");
        const highResC = highResCRef.current;
        const highResCtx = highResC.getContext("2d");

        let isMouseDown = false;
        let prevMouse = null;

        const onMouseDown = () => (isMouseDown = true);
        const onMouseUp = () => {
            isMouseDown = false;
            prevMouse = null;
        };
        const onMouseMove = (e) => {
            const canvasRect = c.getBoundingClientRect();
            const MARKER_SIZE = (c.width / IMAGE_SIZE) * 3;

            let cursorFillStyle = "#fff8";

            if (isMouseDown) {
                if (prevMouse) {
                    highResCtx.beginPath();
                    highResCtx.moveTo(
                        prevMouse.x - canvasRect.left,
                        prevMouse.y - canvasRect.top
                    );
                    highResCtx.lineTo(
                        e.clientX - canvasRect.left,
                        e.clientY - canvasRect.top
                    );
                    highResCtx.lineWidth = MARKER_SIZE;
                    highResCtx.lineCap = "round";
                    highResCtx.strokeStyle =
                        markerColor === "white"
                            ? grayscaleRgb(255)
                            : grayscaleRgb(0);
                    cursorFillStyle = markerColor;
                    highResCtx.stroke();
                } else {
                    prevMouse = {};
                }
                prevMouse.x = e.clientX;
                prevMouse.y = e.clientY;

                inputImageRef.current = pixelateHighRes();
            }

            drawNumber();

            // draw cursor
            ctx.beginPath();
            ctx.arc(
                e.clientX - canvasRect.left,
                e.clientY - canvasRect.top,
                MARKER_SIZE / 2,
                0,
                2 * Math.PI
            );
            ctx.fillStyle = cursorFillStyle;
            ctx.fill();
            if (cursorFillStyle === "black") {
                ctx.strokeStyle = "white";
                ctx.lineWidth = 2;
                ctx.stroke();
            }
        };
        const onMouseOut = () => drawNumber();

        c.addEventListener("mousedown", onMouseDown);
        window.addEventListener("mouseup", onMouseUp);
        c.addEventListener("mousemove", onMouseMove);
        c.addEventListener("mouseout", onMouseOut);
        return () => {
            c.removeEventListener("mousedown", onMouseDown);
            window.removeEventListener("mouseup", onMouseUp);
            c.removeEventListener("mousemove", onMouseMove);
            c.removeEventListener("mouseout", onMouseOut);
        };
    }, []);

    useEffect(() => {
        // load TF model
        if (!modelRef.current) {
            const loadTfModel = async () => {
                modelRef.current = await tf.loadLayersModel(
                    process.env.PUBLIC_URL +
                        "/js-version/tfjs_trained_model/model.json"
                );
                const model = modelRef.current;

                model.compile({
                    optimizer: "adam",
                    loss: "categoricalCrossentropy",
                });
            };
            loadTfModel();
        }
    }, []);

    return (
        <div className="wrapper">
            <div className="content">
                <div className="description">
                    <h1>
                        <span>MNIST Dataset</span> Neural Net Recognition
                    </h1>
                    <p>
                        Draw in the space on the right and see if the ML model
                        can predict the letter you're writing. Implementation:
                        uses TensorFlow for a simple fully-connected Neural
                        Network with one hidden layer of 128 nodes, trained with
                        10 epochs on the MNIST dataset.
                    </p>
                </div>
                <div className="column-left">
                    <canvas
                        id="number-input"
                        className="fade-in"
                        ref={initializeCanvases}
                        width={`${CANVAS_SIZE}px`}
                        height={`${CANVAS_SIZE}px`}
                        willReadFrequently="true"
                    />
                </div>
                <div className="column-right">
                    <div className="tools-wrapper card">
                        <div
                            className="draw tool-card button"
                            onClick={() => setMarkerColor("white")}
                        >
                            <i className="fa fa-pencil"></i>
                            Draw
                        </div>
                        <div
                            className="erase tool-card button"
                            onClick={() => setMarkerColor("black")}
                        >
                            <i className="fa fa-eraser"></i>
                            Erase
                        </div>

                        <div
                            className="restart tool-card button"
                            onClick={() => clearInputCanvas()}
                        >
                            <i className="fa fa-refresh"></i> Restart
                        </div>
                    </div>
                    <div
                        className="predict-button card button"
                        onClick={() => getPrediction()}
                    >
                        PREDICT
                    </div>
                    <div className="prediction card">
                        <p id="prediction"></p>
                    </div>
                </div>
            </div>
        </div>
    );
}
export default App;
