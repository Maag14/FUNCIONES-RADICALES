const darkBtn = document.getElementById("darkModeBtn");

darkBtn.addEventListener("click", () => {
    document.body.classList.toggle("dark");
});

// ==============================
// SIMULADOR
// ==============================

const functionInput = document.getElementById("functionInput");
const aInput = document.getElementById("a");
const bInput = document.getElementById("b");
const nInput = document.getElementById("n");
const methodSelect = document.getElementById("method");

const approxText = document.getElementById("approx");
const realText = document.getElementById("real");
const errorText = document.getElementById("error");
const statusText = document.getElementById("functionStatus");
const exportWordBtn = document.getElementById("exportWord");

let lastSimulationData = null;
let lastGraphImage = "";

function preprocessExpression(expr) {
    return expr
        .replace(/\bsen\(/g, "sin(")
        .replace(/\bln\(/g, "log(")
        .replace(/\^/g, "**")
        .replace(/π/g, "PI")
        .replace(/\bpi\b/gi, "PI");
}

function buildEvaluator(expr) {
    const normalized = preprocessExpression(expr.trim());
    return new Function(
        "x",
        `"use strict";
        const { sin, cos, tan, asin, acos, atan, sqrt, abs, log, exp, pow, floor, ceil, round, PI, E } = Math;
        return (${normalized});`
    );
}

function evaluateFunction(expr, x) {
    try {
        const fn = buildEvaluator(expr);
        const value = fn(x);
        return Number.isFinite(value) ? value : NaN;
    } catch (e) {
        return NaN;
    }
}

function calculateIntegralApprox(expr, a, b, n, method) {
    const dx = (b - a) / n;
    let approximation = 0;

    for (let i = 0; i < n; i++) {
        let xi;

        if (method === "left") {
            xi = a + i * dx;
        } else if (method === "right") {
            xi = a + (i + 1) * dx;
        } else {
            xi = a + (i + 0.5) * dx;
        }

        const yi = evaluateFunction(expr, xi);

        if (!Number.isFinite(yi)) {
            return {
                ok: false,
                message: "La función no está definida en todo el intervalo seleccionado."
            };
        }

        approximation += yi * dx;
    }

    return {
        ok: true,
        value: approximation
    };
}

function calculateIntegralReal(expr, a, b) {
    const steps = 12000;
    const dx = (b - a) / steps;
    let area = 0;

    for (let i = 0; i < steps; i++) {
        const x = a + (i + 0.5) * dx;
        const y = evaluateFunction(expr, x);

        if (!Number.isFinite(y)) {
            return {
                ok: false,
                message: "No se pudo calcular el valor real porque la función no está definida en todo el intervalo."
            };
        }

        area += y * dx;
    }

    return {
        ok: true,
        value: area
    };
}

function showStatus(message, isError = false) {
    statusText.textContent = message;
    statusText.style.color = isError ? "#d9534f" : "#2e9b3e";
}

async function updateGraph() {
    const expr = functionInput.value.trim();
    const a = parseFloat(aInput.value);
    const b = parseFloat(bInput.value);
    const n = parseInt(nInput.value);
    const method = methodSelect.value;

    if (!expr) {
        approxText.textContent = "";
        realText.textContent = "";
        errorText.textContent = "";
        showStatus("Escribe una función para simular.", true);
        return;
    }

    if (Number.isNaN(a) || Number.isNaN(b)) {
        approxText.textContent = "";
        realText.textContent = "";
        errorText.textContent = "";
        showStatus("Revisa los límites del intervalo.", true);
        return;
    }

    if (a >= b) {
        approxText.textContent = "";
        realText.textContent = "";
        errorText.textContent = "";
        showStatus("El límite inferior debe ser menor que el superior.", true);
        return;
    }

    if (!Number.isInteger(n) || n <= 0) {
        approxText.textContent = "";
        realText.textContent = "";
        errorText.textContent = "";
        showStatus("El número de rectángulos debe ser mayor que cero.", true);
        return;
    }

    const samplePoints = 300;
    const xValues = [];
    const yValues = [];

    for (let i = 0; i <= samplePoints; i++) {
        const x = a + ((b - a) * i) / samplePoints;
        const y = evaluateFunction(expr, x);

        xValues.push(x);
        yValues.push(Number.isFinite(y) ? y : null);
    }

    const riemannApprox = calculateIntegralApprox(expr, a, b, n, method);

    if (!riemannApprox.ok) {
        approxText.textContent = "";
        realText.textContent = "";
        errorText.textContent = "";
        showStatus(riemannApprox.message, true);
        Plotly.purge("graph");
        lastSimulationData = null;
        lastGraphImage = "";
        return;
    }

    const realIntegral = calculateIntegralReal(expr, a, b);

    if (!realIntegral.ok) {
        approxText.textContent = "";
        realText.textContent = "";
        errorText.textContent = "";
        showStatus(realIntegral.message, true);
        Plotly.purge("graph");
        lastSimulationData = null;
        lastGraphImage = "";
        return;
    }

    const dx = (b - a) / n;
    const rx = [];
    const ry = [];

    for (let i = 0; i < n; i++) {
        let xi;

        if (method === "left") {
            xi = a + i * dx;
        } else if (method === "right") {
            xi = a + (i + 1) * dx;
        } else {
            xi = a + (i + 0.5) * dx;
        }

        const yi = evaluateFunction(expr, xi);

        if (!Number.isFinite(yi)) {
            approxText.textContent = "";
            realText.textContent = "";
            errorText.textContent = "";
            showStatus("La función no está definida en algún punto del intervalo seleccionado.", true);
            Plotly.purge("graph");
            lastSimulationData = null;
            lastGraphImage = "";
            return;
        }

        rx.push(xi);
        ry.push(yi);
    }

    const trace1 = {
        x: xValues,
        y: yValues,
        type: "scatter",
        mode: "lines",
        name: "Función"
    };

    const trace2 = {
        x: rx,
        y: ry,
        type: "bar",
        width: dx,
        opacity: 0.5,
        name: "Rectángulos"
    };

    const layout = {
        title: `Área bajo la curva: ${expr}`,
        xaxis: { title: "Eje X" },
        yaxis: { title: "Eje Y" },
        margin: { t: 50, l: 50, r: 20, b: 50 }
    };

    await Plotly.newPlot("graph", [trace1, trace2], layout, { responsive: true });

    try {
        lastGraphImage = await Plotly.toImage("graph", {
            format: "png",
            width: 1200,
            height: 700
        });
    } catch (e) {
        lastGraphImage = "";
    }

    const approximation = riemannApprox.value;
    const real = realIntegral.value;
    const error = Math.abs(real - approximation);

    approxText.textContent = `Aproximación de Riemann: ${approximation.toFixed(6)}`;
    realText.textContent = `Valor aproximado real: ${real.toFixed(6)}`;
    errorText.textContent = `Margen de error: ${error.toFixed(6)}`;
    showStatus("Cálculo realizado correctamente.");

    lastSimulationData = {
        expr,
        a,
        b,
        n,
        method,
        approximation,
        real,
        error,
        date: new Date().toLocaleString("es-MX")
    };
}

function downloadFile(filename, content, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();

    URL.revokeObjectURL(url);
}

function escapeHtml(text) {
    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function buildReportHtml() {
    const scoreData = getQuizScoreData();
    const simulation = lastSimulationData;

    let html = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <title>Reporte de Resultados</title>
        <style>
            body{
                font-family: Arial, sans-serif;
                padding: 30px;
                line-height: 1.6;
                color: #222;
            }
            h1, h2{
                margin-bottom: 10px;
            }
            .box{
                background: #f4f7fb;
                padding: 18px;
                border-radius: 12px;
                margin-bottom: 18px;
            }
            .item{
                background: #fff;
                border: 1px solid #ddd;
                padding: 14px;
                border-radius: 10px;
                margin-bottom: 12px;
            }
            img{
                max-width: 100%;
                height: auto;
                border: 1px solid #ddd;
                border-radius: 10px;
                margin-top: 10px;
            }
        </style>
    </head>
    <body>
        <h1>Reporte de Resultados</h1>
        <p>Fecha: ${new Date().toLocaleString("es-MX")}</p>
    `;

    html += `<div class="box"><h2>Simulador</h2>`;

    if (simulation) {
        html += `
            <p><strong>Función:</strong> ${escapeHtml(simulation.expr)}</p>
            <p><strong>Límite inferior:</strong> ${simulation.a}</p>
            <p><strong>Límite superior:</strong> ${simulation.b}</p>
            <p><strong>Rectángulos:</strong> ${simulation.n}</p>
            <p><strong>Tipo:</strong> ${simulation.method}</p>
            <p><strong>Aproximación de Riemann:</strong> ${simulation.approximation.toFixed(6)}</p>
            <p><strong>Valor aproximado real:</strong> ${simulation.real.toFixed(6)}</p>
            <p><strong>Margen de error:</strong> ${simulation.error.toFixed(6)}</p>
        `;
        if (lastGraphImage) {
            html += `<p><strong>Gráfica:</strong></p><img src="${lastGraphImage}" alt="Gráfica del simulador">`;
        }
    } else {
        html += `<p>No hay una simulación calculada todavía.</p>`;
    }

    html += `</div>`;

    html += `<div class="box"><h2>Cuestionario</h2>`;
    html += `<p><strong>Puntaje:</strong> ${scoreData.correct}/${scoreData.total}</p>`;

    quizQuestions.forEach((q, index) => {
        const answered = quizAnswers[index];
        const selectedText = answered === null ? "Sin responder" : q.options[answered];
        const correctText = q.options[q.correct];
        const result = answered === q.correct ? "Correcta" : (answered === null ? "Sin responder" : "Incorrecta");

        html += `
            <div class="item">
                <strong>${index + 1}. ${escapeHtml(q.question)}</strong><br>
                Respuesta elegida: ${escapeHtml(selectedText)}<br>
                Respuesta correcta: ${escapeHtml(correctText)}<br>
                Resultado: ${result}
            </div>
        `;
    });

    html += `</div></body></html>`;
    return html;
}

async function exportWordReport() {
    const html = buildReportHtml();
    downloadFile("reporte-resultados.doc", html, "application/msword;charset=utf-8");
}

exportWordBtn.addEventListener("click", exportWordReport);

functionInput.addEventListener("input", updateGraph);
aInput.addEventListener("input", updateGraph);
bInput.addEventListener("input", updateGraph);
nInput.addEventListener("input", updateGraph);
methodSelect.addEventListener("change", updateGraph);

// ==============================
// CUESTIONARIO
// ==============================

const quizContainer = document.getElementById("quizContainer");
const quizScore = document.getElementById("quizScore");
const resetQuizBtn = document.getElementById("resetQuiz");

const quizQuestions = [
    {
        question: "1. ¿Qué representa una integral definida?",
        options: [
            "Una familia de funciones",
            "Un valor numérico en un intervalo",
            "Una derivada de segundo orden",
            "Una función lineal"
        ],
        correct: 1
    },
    {
        question: "2. ¿Qué método aproxima áreas usando rectángulos?",
        options: [
            "Regla de tres",
            "Suma de Riemann",
            "Factorización",
            "Derivación implícita"
        ],
        correct: 1
    },
    {
        question: "3. ¿Cuál es una integral indefinida de √x?",
        options: [
            "(2/3)x^(3/2) + C",
            "x^2 + C",
            "1/x + C",
            "x + C"
        ],
        correct: 0
    },
    {
        question: "4. ¿Cuál de estas es una técnica de integración?",
        options: [
            "Sustitución",
            "Suma de matrices",
            "Teorema de Pitágoras",
            "Regla de signos"
        ],
        correct: 0
    },
    {
        question: "5. ¿Qué muestra el área bajo la curva?",
        options: [
            "Solo la pendiente",
            "La región entre la función y el eje X",
            "La fórmula de la derivada",
            "La intersección con el eje Y"
        ],
        correct: 1
    }
];

let quizAnswers = Array(quizQuestions.length).fill(null);

function renderQuiz() {
    quizContainer.innerHTML = "";

    quizQuestions.forEach((question, questionIndex) => {
        const card = document.createElement("div");
        card.className = "question-card";
        card.dataset.question = questionIndex;

        const title = document.createElement("h3");
        title.textContent = question.question;
        card.appendChild(title);

        const optionsWrapper = document.createElement("div");
        optionsWrapper.className = "options";

        question.options.forEach((optionText, optionIndex) => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "option-btn";
            button.textContent = optionText;

            button.addEventListener("click", () => answerQuestion(questionIndex, optionIndex));

            optionsWrapper.appendChild(button);
        });

        card.appendChild(optionsWrapper);
        quizContainer.appendChild(card);
    });

    updateQuizScore();
}

function answerQuestion(questionIndex, optionIndex) {
    if (quizAnswers[questionIndex] !== null) {
        return;
    }

    quizAnswers[questionIndex] = optionIndex;

    const question = quizQuestions[questionIndex];
    const card = document.querySelector(`.question-card[data-question="${questionIndex}"]`);
    const buttons = card.querySelectorAll(".option-btn");

    buttons.forEach((button, index) => {
        button.disabled = true;

        if (index === question.correct) {
            button.classList.add("correct");
        }

        if (index === optionIndex && optionIndex !== question.correct) {
            button.classList.add("incorrect");
        }
    });

    updateQuizScore();
}

function getQuizScoreData() {
    const correct = quizAnswers.filter((answer, index) => answer === quizQuestions[index].correct).length;
    return {
        correct,
        total: quizQuestions.length
    };
}

function updateQuizScore() {
    const scoreData = getQuizScoreData();
    quizScore.textContent = `Puntaje: ${scoreData.correct}/${scoreData.total}`;
}

resetQuizBtn.addEventListener("click", () => {
    quizAnswers = Array(quizQuestions.length).fill(null);
    renderQuiz();
});

// ==============================
// INICIO
// ==============================

renderQuiz();
updateGraph();