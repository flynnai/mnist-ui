const c = document.querySelector("#number-input");
const ctx = c.getContext("2d");
const highResC = document.createElement("CANVAS");
highResC.width = c.width;
highResC.height = c.height;
const highResCtx = highResC.getContext("2d");
highResCtx.fillStyle = "black";
highResCtx.fillRect(0, 0, highResC.width, highResC.height);

// 28 by 28 0-255 grayscale
const IMAGE_SIZE = 28;
let inputImage = new Array(IMAGE_SIZE)
    .fill(0)
    .map((elt) => new Array(IMAGE_SIZE).fill(0));

const RES_MULTIPLIER = 10;
const higherResImage = new Array(IMAGE_SIZE * RES_MULTIPLIER)
    .fill(0)
    .map((elt) => new Array(IMAGE_SIZE * RES_MULTIPLIER).fill(0));

const drawNumber = () => {
    const squareSizePx = c.width / IMAGE_SIZE;
    for (let row = 0; row < IMAGE_SIZE; row++) {
        for (let col = 0; col < IMAGE_SIZE; col++) {
            let grayscaleVal = inputImage[row][col];
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

const pixelateHighRes = () => {
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
        let row = Math.floor(Math.floor(i / 4 / highResC.width) / squareSizePx);
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

    inputImage = pixelated;
    drawNumber();
};

drawNumber();

// EVENT LISTENERS

let isMouseDown = false;
c.onmousedown = () => (isMouseDown = true);
window.onmouseup = () => {
    isMouseDown = false;
    prevMouse = null;
};

const grayscaleRgb = (val) => `rgb(${val}, ${val}, ${val})`;

let prevMouse = null;

c.onmousemove = (e) => {
    const canvasRect = c.getBoundingClientRect();
    const MARKER_SIZE = c.width / IMAGE_SIZE * 3;
    const markerColor = document.querySelector(
        "input[name=marker-color]:checked"
    ).value;

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
                markerColor === "white" ? grayscaleRgb(255) : grayscaleRgb(0);
            cursorFillStyle = markerColor;
            highResCtx.stroke();
        } else {
            prevMouse = {};
        }
        prevMouse.x = e.clientX;
        prevMouse.y = e.clientY;

        pixelateHighRes();
    } else {
        drawNumber();
    }
    // draw cursor
    ctx.beginPath();
    ctx.arc(e.clientX - canvasRect.left, e.clientY - canvasRect.top, MARKER_SIZE / 2, 0, 2*Math.PI);
    ctx.fillStyle = cursorFillStyle;
    ctx.fill();
    if(cursorFillStyle === "black") {
        ctx.strokeStyle = "white";
        ctx.lineWidth = 2;
        ctx.stroke();
    }

};
const prettyPrint2dArray = (arr) =>
    console.log(arr.map((row) => row.map((elt) => Math.round(elt))));

const getPrediction = async () => {
    const normalized = inputImage.map((row) => row.map((elt) => elt / 255));
    console.log("Sending", normalized);

    const response = await fetch("/get-predictions", {
        method: "POST",
        body: JSON.stringify(normalized),
        headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
        },
    });
    const data = await response.json();
    const softmaxes = data[0];
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
    document.querySelector('#prediction').innerHTML = guess;
};
