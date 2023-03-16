import React, { useEffect, useRef, useState } from "react";
import "./App.css";

const CANVAS_SIZE = 616;
// 28 by 28 0-255 grayscale
const IMAGE_SIZE = 28;

// load tf from CDN
const tf = window.tf;

const grayscaleRgb = (val) => `rgb(${val}, ${val}, ${val})`;

const joinClasses = (...args) => args.filter(Boolean).join(" ");

const Ranking = React.memo(({ group, priority, prob }) => {
    const [displayedProb, setDisplayedProb] = useState(prob);
    useEffect(() => {
        const animate = (ticksLeft) => {
            setDisplayedProb((curr) => curr + (prob - curr) / 4);
            if (ticksLeft > 0) {
                setTimeout(() => animate(ticksLeft - 1), 60);
            }
        };
        animate(20);
    }, [prob]);
    return (
        <div
            className={joinClasses("ranking", priority === 0 && "chosen")}
            style={{
                top: `${Math.min(priority, 4) * 80}px`,
                opacity: priority > 3 ? 0 : 1,
            }}
        >
            <span className="predicted-class">{group}</span>
            <span className="percentage">
                {Math.round(displayedProb * 100)}%
            </span>
        </div>
    );
});

function RankedPredictions({ softmaxes }) {
    const HEIGHT = 320;
    const priorityByKey = Object.fromEntries(
        softmaxes
            .map((prob, group) => ({
                prob,
                group,
            }))
            .sort((a, b) => b.prob - a.prob)
            .map(({ prob, group }, index) => [group, index])
    );
    // console.log("Softmaxes:", sortedGroups);

    console.log(priorityByKey);
    return (
        <div
            className="ranked-predictions card"
            style={{ height: `${HEIGHT}px` }}
        >
            {softmaxes.map((prob, index) => (
                <Ranking
                    group={index}
                    priority={priorityByKey[index]}
                    prob={prob}
                    key={index}
                />
            ))}
        </div>
    );
}

function App() {
    // Component state, refs
    const cRef = useRef(null);
    const highResCRef = useRef(null);
    const modelRef = useRef(null);
    const [markerColor, setMarkerColor] = useState("white");
    const [softmaxes, setSoftmaxes] = useState(new Array(10).fill(0));
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
            const highResCtx = highResC.getContext("2d", {
                willReadFrequently: true,
            });
            highResCtx.fillStyle = "black";
            highResCtx.fillRect(0, 0, highResC.width, highResC.height);
            cRef.current = c;
            drawNumber();
        }
    };

    const clearInputCanvas = () => {
        const highResC = highResCRef.current;
        const highResCtx = highResC.getContext("2d", {
            willReadFrequently: true,
        });
        highResCtx.fillStyle = "black";
        highResCtx.fillRect(0, 0, highResC.width, highResC.height);
        inputImageRef.current = pixelateHighRes();
        drawNumber();
    };

    const pixelateHighRes = () => {
        const highResC = highResCRef.current;
        const highResCtx = highResC.getContext("2d", {
            willReadFrequently: true,
        });

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

        const model = modelRef.current;
        const newSoftmaxes = (
            await model.predict(tf.tensor3d([normalized], [1, 28, 28])).array()
        )[0];

        setSoftmaxes(newSoftmaxes);
        console.log("Softmaxes:", newSoftmaxes);
    };

    useEffect(() => {
        // EVENT LISTENERS
        if (!cRef.current) return;

        const c = cRef.current;

        const ctx = c.getContext("2d");
        const highResC = highResCRef.current;
        const highResCtx = highResC.getContext("2d", {
            willReadFrequently: true,
        });

        let isMouseDown = false;
        let prevMouse = null;
        let didClickCanvas = false;

        const onMouseDown = () => {
            isMouseDown = true;
            didClickCanvas = true;
        };
        const onMouseUp = () => {
            isMouseDown = false;
            prevMouse = null;
            if (didClickCanvas) {
                getPrediction();
            }
            didClickCanvas = false;
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

    const openRetrainModel = async () => {
        let response = window.prompt("Which number should it have been?");
        while (
            isNaN(parseInt(response)) ||
            parseInt(response) < 0 ||
            parseInt(response) > 9
        ) {
            response = window.prompt(
                "Invalid number. Please enter an integer from 0 to 9."
            );
        }

        console.log("Training for number:", parseInt(response));

        const model = modelRef.current;
        const normalized = inputImageRef.current.map((row) =>
            row.map((elt) => elt / 255)
        );
        const oneHot = new Array(10).fill(0);
        oneHot[parseInt(response)] = 1;
        const h = await model.fit(
            tf.tensor3d([normalized], [1, 28, 28]),
            tf.tensor2d([oneHot], [1, 10]),
            {
                batchSize: 1,
                epochs: 10,
            }
        );
        console.log(h);
        getPrediction();
    };

    return (
        <div className="wrapper">
            <div className="content">
                <div className="description">
                    <h1>
                        <span>MNIST Dataset</span> Neural Net Recognition
                    </h1>
                    <p>
                        <b>Draw a number</b> in the space on the right and see
                        if the ML model can recognize it correctly.
                        Implementation: a simple fully-connected Neural Network
                        with 128 hidden nodes. Written in TensorFlow, trained in
                        Python with on 60,000 images from the{" "}
                        <a
                            href="https://en.wikipedia.org/wiki/MNIST_database"
                            target="_blank"
                        >
                            MNIST dataset
                        </a>
                        , and run locally via TensorFlow.js in-browser.
                    </p>
                    <p>
                        Model guessed wrong? Click the WRONG button to retrain
                        for a few epochs to recognize that sample.
                    </p>
                </div>
                <div className="column-left">
                    <canvas
                        id="number-input"
                        className="fade-in"
                        ref={initializeCanvases}
                        width={`${CANVAS_SIZE}px`}
                        height={`${CANVAS_SIZE}px`}
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
                            <i className="fa fa-ban"></i> Clear
                        </div>
                    </div>

                    <RankedPredictions softmaxes={softmaxes} />
                    <div
                        className="retrain-button card button"
                        onClick={() => openRetrainModel()}
                    >
                        WRONG?
                    </div>
                </div>
            </div>
        </div>
    );
}
export default App;
