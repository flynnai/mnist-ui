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
    for (let i = 0; i < IMAGE_SIZE; i++) {
        for (let j = 0; j < IMAGE_SIZE; j++) {
            let grayscaleVal = inputImage[i][j];
            ctx.fillStyle = `rgb(${grayscaleVal}, ${grayscaleVal}, ${grayscaleVal})`;
            ctx.fillRect(
                i * squareSizePx,
                j * squareSizePx,
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
        let row = Math.floor(((i / 4) % highResC.width) / squareSizePx);
        let col = Math.floor(Math.floor(i / 4 / highResC.width) / squareSizePx);
        pixelated[row][col] += grayscale;
    }
    for (let i = 0; i < IMAGE_SIZE; i++) {
        for (let j = 0; j < IMAGE_SIZE; j++) {
            pixelated[i][j] = Math.floor(
                pixelated[i][j] / (squareSizePx * squareSizePx)
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
    if (isMouseDown) {
        const MARKER_SIZE = 35;

        if (prevMouse) {
            const canvasRect = c.getBoundingClientRect();
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
            const markerColor = document.querySelector("input[name=marker-color]:checked").value;
            highResCtx.strokeStyle = markerColor === "white" ? grayscaleRgb(255) : grayscaleRgb(0);
            highResCtx.stroke();
        } else {
            prevMouse = {};
        }
        prevMouse.x = e.clientX;
        prevMouse.y = e.clientY;

        pixelateHighRes();
    }
};
