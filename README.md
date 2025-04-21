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

## 📡 API Endpoints

| Method | Path                             | Description                                |
|:------:|:---------------------------------|:-------------------------------------------|
| POST   | `/upload/initiate-upload`        | Start a new upload, returns `uploadId`     |
| POST   | `/upload/upload-chunk`           | POST one chunk (multipart/form-data)       |
| POST   | `/upload/finalize-upload`        | Finish & reassemble all chunks             |
| GET    | `/upload/status/:uploadId`       | Get how many chunks have been received     |

---

## ✅ Setup & Run

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


## 📝 Project Notes
- ⚠️ **Android background uploads**: still in progress (time-boxed)
- ✅ Unit tests added for core backend services (Jest)
- 🚀 Built for **cross-platform scalability** 

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

---

**Note**: Given the time constraints, core functionality (stability, concurrency, resumability) was prioritized. The above roadmap highlights next steps toward production readiness.

## 👤 Author
- **Name**: Joe Ulyatt
- 🔗 [**LinkedIn**](https://www.linkedin.com/in/joewhocodes)
- 🐙 [**GitHub**](https://github.com/JoeDareZone)

---

## 📜 License
This project is licensed under the **MIT License**.
