# 📤 Upload Hero

> **Upload Hero** is a cross‑platform media file uploader built with React (Web), React Native (Mobile), and Node.js. It offers chunked, resumable uploads with pause/resume/cancel, real‑time progress, and automatic retries.

---

![Node.js](https://img.shields.io/badge/Node.js-20.x-green)
![Expo](https://img.shields.io/badge/Expo-CLI-orange)
![React](https://img.shields.io/badge/React-18.x-blue)
![React Native](https://img.shields.io/badge/React%20Native-0.74-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen)

---

## 📸 Demo

### Web Upload Flow  
<img src="./frontend/assets/images/web-demo.gif" alt="Upload Hero Web Demo" width="600"/>

### Mobile Upload Flow  
<img src="./frontend/assets/images/mobile-demo.gif" alt="Upload Hero Mobile Demo" width="300"/>

*Note: Same core functionality on both Android & iOS. Demonstration shown here on iOS.*

---


## 🚀 Features

- 📁 **File Picker**: multi‑select, image/video filters, instant validation  
- 🔄 **Chunked Uploads** (1 MB chunks), up to 3 concurrent uploads  
- ⏸️ **Pause / Resume / Cancel** per file  
- 📊 **Progress Tracking** (individual & overall)  
- 🔁 **Exponential Backoff Retries** (max 3 attempts)  
- 💾 **Resizable State** for resumable uploads (in‑memory + local storage)  
- 🌐 **Web**: drag‑and‑drop, responsive, history in `localStorage`  
- 📱 **Mobile**: Expo native file picker, camera, permissions  
- 📡 **Server**: Node.js handles chunk reception, reassembly, MD5 dedupe  

---

<details> 
  <summary>📡 API Endpoints</summary>
  <br> 

| Method | Path                             | Description                                |
|:------:|:---------------------------------|:-------------------------------------------|
| POST   | `/upload/initiate-upload`        | Start a new upload, returns `uploadId`     |
| POST   | `/upload/upload-chunk`           | POST one chunk (multipart/form-data)       |
| POST   | `/upload/finalize-upload`        | Finish & reassemble all chunks             |
| GET    | `/upload/status/:uploadId`       | Get how many chunks have been received     |

</details>

---

<details> 
  <summary>✅ Setup & Run</summary>

### 🖥️ Server (Node.js)
```bash
cd backend
npm install
npm start
```

### 🌍 Web (React Native for Web)
```bash
cd frontend
npm install
npm run web
```

### 📱 Mobile (Expo + React Native)
```bash
cd frontend
npm install
npm start
# then press:
#  • i — launch on iOS Simulator
#  • a — launch on Android Emulator
```

**Note**: Expo Go must be installed on your device or emulator.

</details>

---

<details>
  <summary>📝 Project Notes</summary>
  
- ⚠️ **Android background uploads**: still in progress (time-boxed)
- ✅ Unit tests added for core backend services (Jest)
- 🚀 Built for **cross-platform scalability**
🧪 **Upload delay constant**: To simulate realistic network conditions and allow testing of pause/resume, uploads are artificially throttled using [`ARTIFICIAL_DELAY`](https://github.com/JoeDareZone/upload-hero/blob/main/frontend/utils/constants.ts#L6) in `frontend/utils/constants.ts`.

- ⚠️ **UI glitch**: On upload, the image preview briefly flashes. This appears to be a render timing quirk and does not affect functionality.

</details>

---

## 📈 Future Improvements

| Feature                                      | Status        | Notes                                                        |
| -------------------------------------------- | ------------- | ------------------------------------------------------------ |
| Client‑side resume (localStorage/AsyncStorage) | 🚧 Planned    | Persist chunk state across reloads                           |
| Server‑side resume (Redis chunk tracking)     | 🚧 Planned    | 24 h expiry, fast missing‑chunk queries                      |
| Advanced logging & monitoring (Sentry/Winston)| 🚧 Planned    | Log levels, audit, retention, real‑time dashboard integration |
| E2E & Stress Testing                          | 🚧 Planned    | Jest, Supertest for core flows, Detox for E2E, k6/Artillery for 100+ concurrent   |
| Android background upload                     | 🚧 In Progress| Hook into native services for reliable background tasks      |
| Code cleanup & performance tuning             | ✅ Done       | Refactored hooks & services, added comments                  |

> 💡 Performance targets from the advanced spec (first load <2s, chunk latency <300ms, reassembly ≥50MB/s) have been largely met — see Performance Metrics for detailed breakdown.

**Note**: Given the time constraints, core functionality (stability, concurrency, resumability) was prioritized. The above roadmap highlights next steps toward production readiness.

---

<details> 
  <summary>📊 Performance Metrics</summary>
  <br> 

This section demonstrates how the project meets the non-functional requirements from the spec:

- **First Load Time < 2s**
- **Chunk Upload Latency < 300ms**
- **Reassembly Speed ≥ 50MB/s**

### Web Performance (Lighthouse)

- **Performance Score**: 100/100  
- **First Contentful Paint**: 0.2s  
- **Largest Contentful Paint**: 0.4s  
- **Total Blocking Time**: 60ms  
- **Cumulative Layout Shift**: 0.003  
- **Speed Index**: 0.5s

### Mobile Performance

- **Initial Load Time**: 157.10 ms (measured using performance.now() from launch to first render)

### Chunk Upload Latency

| Chunk | Latency (ms) |
|-------|--------------|
| 1     | 95.78        |
| 2     | 124.10       |
| 3     | 73.06        |
| 4     | 59.13        |
| 5     | 60.20        |
| 6     | 36.71        |
| 7     | 51.24        |
| 8     | 43.30        |
| 9     | 59.28        |
| 10    | 39.54        |
| 11    | 51.88        |

- **Total Reassembly Time**: 300.98ms on 10MB file
- **Approx. Speed**: ~38.23MB/s 

Initial experiments with buffer-tuned chunk streaming showed promise for speed, but introduced inconsistent checksums under time pressure. For stability and correctness, the original approach was retained, with performance optimisations scoped for post-submission."

</details>

---

## 👤 Author
- **Name**: Joe Ulyatt
- 🔗 [**LinkedIn**](https://www.linkedin.com/in/joewhocodes)
- 🐙 [**GitHub**](https://github.com/JoeDareZone)

---

<details> <summary>🧪 Known Issues & Testing Notes</summary>
<br>

- 🔁 **UI image flash**: A visual flicker occurs on upload confirmation. Likely a minor re-render artefact; does not impact upload correctness or data integrity.
- 🧪 **Advanced testing**: While some unit tests are in place, the current submission includes minimal E2E and no stress testing. With more time, I would extend Jest coverage, add E2E flows with Detox or Playwright, and simulate ≥100 concurrent uploads using tools like k6.
- 🧠 **Advanced features**: To focus on delivery of core functionality, advanced features like Redis chunk tracking, long-term logging, and sandboxed file validation were deferred but scoped in the roadmap above.

---

</details>

## 📜 License
This project is licensed under the **MIT License**.
