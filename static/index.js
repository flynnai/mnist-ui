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

let markerColor = "white";

function setMarkerColor(color) {
    markerColor = color;
}

function clearInputCanvas() {
    highResCtx.fillStyle = "black";
    highResCtx.fillRect(0, 0, highResC.width, highResC.height);
    pixelateHighRes();
}

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

c.onmouseout = () => drawNumber();

const prettyPrint2dArray = (arr) =>
    console.log(arr.map((row) => row.map((elt) => Math.round(elt))));

const getPrediction = async () => {
    const normalized = inputImage.map((row) => row.map((elt) => elt / 255));
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

const softmax = (arr) =>
    arr.map(
        (elt) =>
            Math.exp(elt) / arr.reduce((curr, acc) => curr + Math.exp(acc), 0)
    );

const test_image = [
    [
        0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
        0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
    ],
    [
        0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
        0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
    ],
    [
        0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
        0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
    ],
    [
        0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
        0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
    ],
    [
        0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
        0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
    ],
    [
        0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.01176471,
        0.07058824, 0.07058824, 0.07058824, 0.49411765, 0.53333333, 0.68627451,
        0.10196078, 0.65098039, 1.0, 0.96862745, 0.49803922, 0.0, 0.0, 0.0, 0.0,
    ],
    [
        0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.11764706, 0.14117647,
        0.36862745, 0.60392157, 0.66666667, 0.99215686, 0.99215686, 0.99215686,
        0.99215686, 0.99215686, 0.88235294, 0.6745098, 0.99215686, 0.94901961,
        0.76470588, 0.25098039, 0.0, 0.0, 0.0, 0.0,
    ],
    [
        0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.19215686, 0.93333333, 0.99215686,
        0.99215686, 0.99215686, 0.99215686, 0.99215686, 0.99215686, 0.99215686,
        0.99215686, 0.98431373, 0.36470588, 0.32156863, 0.32156863, 0.21960784,
        0.15294118, 0.0, 0.0, 0.0, 0.0, 0.0,
    ],
    [
        0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.07058824, 0.85882353, 0.99215686,
        0.99215686, 0.99215686, 0.99215686, 0.99215686, 0.77647059, 0.71372549,
        0.96862745, 0.94509804, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
        0.0,
    ],
    [
        0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.31372549, 0.61176471,
        0.41960784, 0.99215686, 0.99215686, 0.80392157, 0.04313725, 0.0,
        0.16862745, 0.60392157, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
        0.0,
    ],
    [
        0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.05490196, 0.00392157,
        0.60392157, 0.99215686, 0.35294118, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
        0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
    ],
    [
        0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.54509804,
        0.99215686, 0.74509804, 0.00784314, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
        0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
    ],
    [
        0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.04313725,
        0.74509804, 0.99215686, 0.2745098, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
        0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
    ],
    [
        0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.1372549,
        0.94509804, 0.88235294, 0.62745098, 0.42352941, 0.00392157, 0.0, 0.0,
        0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
    ],
    [
        0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
        0.31764706, 0.94117647, 0.99215686, 0.99215686, 0.46666667, 0.09803922,
        0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
    ],
    [
        0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
        0.17647059, 0.72941176, 0.99215686, 0.99215686, 0.58823529, 0.10588235,
        0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
    ],
    [
        0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
        0.0, 0.0627451, 0.36470588, 0.98823529, 0.99215686, 0.73333333, 0.0,
        0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
    ],
    [
        0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
        0.0, 0.0, 0.0, 0.97647059, 0.99215686, 0.97647059, 0.25098039, 0.0, 0.0,
        0.0, 0.0, 0.0, 0.0, 0.0,
    ],
    [
        0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
        0.18039216, 0.50980392, 0.71764706, 0.99215686, 0.99215686, 0.81176471,
        0.00784314, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
    ],
    [
        0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.15294118,
        0.58039216, 0.89803922, 0.99215686, 0.99215686, 0.99215686, 0.98039216,
        0.71372549, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
    ],
    [
        0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.09411765,
        0.44705882, 0.86666667, 0.99215686, 0.99215686, 0.99215686, 0.99215686,
        0.78823529, 0.30588235, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
    ],
    [
        0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.09019608, 0.25882353,
        0.83529412, 0.99215686, 0.99215686, 0.99215686, 0.99215686, 0.77647059,
        0.31764706, 0.00784314, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
        0.0,
    ],
    [
        0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.07058824, 0.67058824, 0.85882353,
        0.99215686, 0.99215686, 0.99215686, 0.99215686, 0.76470588, 0.31372549,
        0.03529412, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
    ],
    [
        0.0, 0.0, 0.0, 0.0, 0.21568627, 0.6745098, 0.88627451, 0.99215686,
        0.99215686, 0.99215686, 0.99215686, 0.95686275, 0.52156863, 0.04313725,
        0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
    ],
    [
        0.0, 0.0, 0.0, 0.0, 0.53333333, 0.99215686, 0.99215686, 0.99215686,
        0.83137255, 0.52941176, 0.51764706, 0.0627451, 0.0, 0.0, 0.0, 0.0, 0.0,
        0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
    ],
    [
        0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
        0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
    ],
    [
        0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
        0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
    ],
    [
        0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
        0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
    ],
];

let model;
const loadTfModel = async () => {
    // `tf` available from script tag to CDN
    model = await tf.loadLayersModel(
        "./static/js-version/tfjs_trained_model/model.json"
    );
    model.compile({ optimizer: "adam", loss: "categoricalCrossentropy" });
};

loadTfModel();
