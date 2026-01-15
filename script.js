const video = document.getElementById("video");
const canvas = document.getElementById("overlay");
const logList = document.getElementById("log");

// List of 10 officers
const officers = [
  { name: "Maj Perera", descriptors: [] },
  { name: "Capt Silva", descriptors: [] },
  { name: "Lt Fernando", descriptors: [] },
  { name: "Lt Jayasinghe", descriptors: [] },
  { name: "Sgt Perera", descriptors: [] },
  { name: "Sgt Silva", descriptors: [] },
  { name: "Cpl Fernando", descriptors: [] },
  { name: "Cpl Jayawardena", descriptors: [] },
  { name: "Cpl Kumara", descriptors: [] },
  { name: "Cpl Bandara", descriptors: [] }
];

let logged = new Set();
let faceMatcher;

// Load face-api models and start camera
Promise.all([
  faceapi.nets.tinyFaceDetector.loadFromUri('models'),
  faceapi.nets.faceLandmark68Net.loadFromUri('models'),
  faceapi.nets.faceRecognitionNet.loadFromUri('models')
]).then(startVideo);

function startVideo() {
  navigator.mediaDevices.getUserMedia({ video: {} })
    .then(stream => video.srcObject = stream)
    .catch(err => alert("Camera error: " + err));
}

// --- ENROLL OFFICER DIRECTLY ON PHONE ---
async function enrollOfficer(index) {
  const detection = await faceapi
    .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
    .withFaceLandmarks()
    .withFaceDescriptor();

  if (!detection) {
    alert("No face detected. Try again.");
    return;
  }

  officers[index].descriptors.push(detection.descriptor);
  alert("Face captured for " + officers[index].name);

  // Update matcher after enrollment
  updateFaceMatcher();
}

// Update faceMatcher with current descriptors
function updateFaceMatcher() {
  const labeledDescriptors = officers.map(off => {
    return new faceapi.LabeledFaceDescriptors(off.name, off.descriptors);
  });
  faceMatcher = new faceapi.FaceMatcher(labeledDescriptors, 0.6);
}

// --- LIVE FACE DETECTION & LOGGING ---
video.addEventListener("play", async () => {
  const displaySize = { width: video.videoWidth, height: video.videoHeight };
  faceapi.matchDimensions(canvas, displaySize);

  setInterval(async () => {
    const detections = await faceapi
      .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptors();

    const resized = faceapi.resizeResults(detections, displaySize);
    canvas.getContext("2d").clearRect(0,0,canvas.width,canvas.height);

    let known = 0;
    let unknown = 0;

    resized.forEach(d => {
      let label = "Unknown";

      if (faceMatcher) {
        const result = faceMatcher.findBestMatch(d.descriptor);
        label = result.label;
      }

      if (label === "Unknown") {
        unknown++;
      } else {
        known++;
        if (!logged.has(label)) {
          logged.add(label);
          const time = new Date().toLocaleTimeString();
          const li = document.createElement("li");
          li.textContent = `${label} entered at ${time}`;
          logList.appendChild(li);
        }
      }

      const drawBox = new faceapi.draw.DrawBox(d.detection.box, { label });
      drawBox.draw(canvas);
    });

    document.getElementById("known").innerText = known;
    document.getElementById("unknown").innerText = unknown;
    document.getElementById("total").innerText = resized.length;

  }, 800);
});
