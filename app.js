let recognition;
let audioContext;
let analyser;
let dataArray;
let canvas;
let canvasCtx;

const questions = [
  "Is this a new or existing client?",
  "What is the caller's name?",
  "What is the phone number?",
  "What is the pet's name?",
  "How old is the pet?",
  "What service is requested?",
  "What is the specific reason for the call?",
  "What is the preferred appointment time?",
  "Which doctor is requested?",
  "Who handled this call?",
  "Is a follow-up needed?",
  "Any remarks?",
  "Is the client new/existing?",
  "What is the pet's type or breed?",
  "Where did the caller hear about us?",
  "Is the appointment confirmed?",
  "What is the urgency level?",
  "Is a callback scheduled?",
  "Any additional instructions?"
];

let currentQuestionIndex = 0;
let answers = [];
let isInterviewRunning = false;

document.addEventListener("DOMContentLoaded", () => {
  const initBtn = document.getElementById("initBtn");
  const startBtn = document.getElementById("startBtn");

  initBtn.onclick = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition not supported in this browser.");
      return;
    }

    recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.continuous = false;

    initializeWaveform();

    recognition.onstart = () => console.log("🎙️ Listening...");
    recognition.onspeechend = () => console.log("🛑 Speech ended.");

    recognition.onresult = (event) => {
      const answer = event.results[0][0].transcript;
      answers.push(answer);
      logQA(questions[currentQuestionIndex], answer);

      recognition.stop();
      currentQuestionIndex++;
      setTimeout(askNextQuestion, 500);
    };

    recognition.onerror = (e) => {
      console.error("Recognition error:", e.error);
      alert("Speech recognition error: " + e.error);
    };

    startBtn.disabled = false;
  };

  startBtn.onclick = () => {
    if (!recognition) return alert("Please initialize first.");
    isInterviewRunning = true;
    currentQuestionIndex = 0;
    answers = [];
    document.getElementById("log").innerHTML = "";
    askNextQuestion();
  };
});

function askNextQuestion() {
  if (currentQuestionIndex >= questions.length) {
    isInterviewRunning = false;

    const isNewClient = answers[0]?.toLowerCase().includes("new");
    fetch("http://localhost:3000/logAnswers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers, isNewClient }),
    })
      .then((res) => res.text())
      .then((msg) => logStatus(msg))
      .catch((err) => logStatus("Error logging to server: " + err.message));
    return;
  }

  const question = questions[currentQuestionIndex];
  logQuestion(question);
  playBeep();
  speak(question, () => recognition.start());
}

function playBeep() {
  const beep = new Audio("https://actions.google.com/sounds/v1/alarms/beep_short.ogg");
  beep.play();
}

function speak(text, callback) {
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  utterance.rate = 1;
  utterance.pitch = 1;
  speechSynthesis.speak(utterance);
  utterance.onend = () => {
    if (callback) callback();
  };
}

function initializeWaveform() {
  canvas = document.getElementById("waveform");
  canvasCtx = canvas.getContext("2d");

  navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;

    const bufferLength = analyser.frequencyBinCount;
    dataArray = new Uint8Array(bufferLength);

    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);

    drawWaveform();
  }).catch((err) => {
    console.error("Microphone access error:", err);
    alert("Microphone access denied.");
  });
}

function drawWaveform() {
  requestAnimationFrame(drawWaveform);

  if (!analyser) return;

  analyser.getByteTimeDomainData(dataArray);

  canvasCtx.fillStyle = "#f9f9f9";
  canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

  canvasCtx.lineWidth = 2;
  canvasCtx.strokeStyle = "#4caf50";
  canvasCtx.beginPath();

  const sliceWidth = canvas.width / dataArray.length;
  let x = 0;

  for (let i = 0; i < dataArray.length; i++) {
    const v = dataArray[i] / 128.0;
    const y = (v * canvas.height) / 2;
    i === 0 ? canvasCtx.moveTo(x, y) : canvasCtx.lineTo(x, y);
    x += sliceWidth;
  }

  canvasCtx.lineTo(canvas.width, canvas.height / 2);
  canvasCtx.stroke();
}

function logQA(question, answer) {
  logQuestion(question);
  const log = document.getElementById("log");
  const entryA = document.createElement("div");
  entryA.className = "log-entry answer";
  entryA.innerText = "A: " + answer;
  log.appendChild(entryA);
}

function logQuestion(q) {
  const log = document.getElementById("log");
  const entryQ = document.createElement("div");
  entryQ.className = "log-entry question";
  entryQ.innerText = "Q: " + q;
  log.appendChild(entryQ);
}

function logStatus(msg) {
  const log = document.getElementById("log");
  const entry = document.createElement("div");
  entry.className = "log-entry status";
  entry.innerText = msg;
  log.appendChild(entry);
  log.scrollTop = log.scrollHeight;
}
