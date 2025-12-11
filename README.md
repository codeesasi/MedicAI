<div align="center">
  <h1>💊 MedScript AI</h1>
  <p>
    <strong>A Next-Generation Medication Safety Assistant powered by Gemini 3 Pro</strong>
  </p>

  <p>
    <a href="https://react.dev/">
      <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black" alt="React" />
    </a>
    <a href="https://vitejs.dev/">
      <img src="https://img.shields.io/badge/Vite-Fast-646CFF?logo=vite&logoColor=white" alt="Vite" />
    </a>
    <a href="https://ai.google.dev/">
      <img src="https://img.shields.io/badge/Gemini-3_Pro-8E75B2?logo=google&logoColor=white" alt="Gemini AI" />
    </a>
    <a href="https://tailwindcss.com/">
      <img src="https://img.shields.io/badge/Tailwind-CSS-38B2AC?logo=tailwind-css&logoColor=white" alt="Tailwind" />
    </a>
    <img src="https://img.shields.io/badge/License-MIT-yellow" alt="License" />
  </p>

  <br />
</div>

<hr />

## 📖 Overview

**MedScript AI** is an intelligent, privacy-focused web application designed to enhance medication safety. It leverages Google's advanced **Gemini 3 Pro** and **2.5 Flash** models to digitize prescriptions via OCR, analyze potential drug interactions, and generate personalized, location-aware wellness plans.

All data is processed securely and stored locally on the client side, ensuring user privacy.

---

## 🚀 Key Features

<table>
  <tr>
    <td width="50%" valign="top">
      <h3>📷 Intelligent OCR Scanning</h3>
      <ul>
        <li><strong>Vision AI:</strong> Powered by <code>gemini-2.5-pro</code> to read handwritten and printed prescriptions.</li>
        <li><strong>Smart Extraction:</strong> Automatically identifies drug names, dosages, and patient vitals (Age, Weight, BP).</li>
        <li><strong>Built-in Editor:</strong> Crop, rotate, and enhance images before analysis for maximum accuracy.</li>
      </ul>
    </td>
    <td width="50%" valign="top">
      <h3>🛡️ Clinical Safety Agent</h3>
      <ul>
        <li><strong>Interaction Check:</strong> Detects Drug-Drug, Drug-Condition, and Drug-Vital risks using <code>gemini-3-pro-preview</code>.</li>
        <li><strong>Verification:</strong> Ensures prescribed meds match patient conditions.</li>
        <li><strong>Severity Scoring:</strong> Categorizes risks (Critical, Moderate, Safe) with actionable advice.</li>
      </ul>
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <h3>🧘 Location-Aware Wellness</h3>
      <ul>
        <li><strong>Diet Plans:</strong> Generates meal plans based on local cuisine and ingredients detected from your geolocation.</li>
        <li><strong>Lifestyle:</strong> Tailored yoga and sleep recommendations based on health conditions (e.g., Hypertension).</li>
      </ul>
    </td>
    <td width="50%" valign="top">
      <h3>💬 Context-Aware Chatbot</h3>
      <ul>
        <li><strong>RAG Experience:</strong> Chat with an AI that knows your current medication list.</li>
        <li><strong>Smart Suggestions:</strong> Prompts relevant questions like "Side effects of [Your Drug]?" automatically.</li>
      </ul>
    </td>
  </tr>
</table>

---

## 🧠 Multi-Model AI Architecture

We utilize a "Right Model for the Right Task" strategy to optimize for intelligence, speed, and cost.

<table width="100%">
  <thead>
    <tr>
      <th align="left">Feature Component</th>
      <th align="left">Gemini Model</th>
      <th align="left">Reasoning</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Complex Clinical Reasoning</strong></td>
      <td><code>gemini-3-pro-preview</code></td>
      <td>Highest reasoning capability for complex safety checks, agentic workflows, and detailed interactions.</td>
    </tr>
    <tr>
      <td><strong>Prescription Vision (OCR)</strong></td>
      <td><code>gemini-2.5-pro</code></td>
      <td>Best-in-class vision capabilities for reading difficult handwriting and extracting structured data.</td>
    </tr>
    <tr>
      <td><strong>Spelling & Translation</strong></td>
      <td><code>gemini-2.5-flash</code></td>
      <td>Low latency and high throughput for quick text correction and translation tasks.</td>
    </tr>
    <tr>
      <td><strong>Report Illustrations</strong></td>
      <td><code>gemini-2.5-flash-image</code></td>
      <td>Fast generation of abstract medical vector graphics for the PDF report.</td>
    </tr>
     <tr>
      <td><strong>Language Detection</strong></td>
      <td><code>gemini-2.0-flash-lite</code></td>
      <td>Ultra-fast, cost-effective model for simple classification tasks based on location.</td>
    </tr>
  </tbody>
</table>

---

## 🛠️ Tech Stack

- **Frontend:** React 19, TypeScript, Vite
- **Styling:** Tailwind CSS, Lucide React (Icons)
- **AI SDK:** Google GenAI SDK (`@google/genai`)
- **PDF Engine:** `html2pdf.js` for client-side report generation
- **Voice:** Web Speech API for hands-free data entry

---

## ⚡ Getting Started

### Prerequisites

1.  **Node.js** (v18 or higher)
2.  **Google Cloud API Key** with Gemini API enabled.

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/your-username/medscript-ai.git
    cd medscript-ai
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Setup Environment**
    Create a `.env` file in the root directory:
    ```env
    API_KEY=your_google_gemini_api_key_here
    ```

4.  **Run Development Server**
    ```bash
    npm run dev
    ```

---

## 📂 Project Structure

```text
/
├── components/          # React UI Components
│   ├── MedicationList.tsx    # Cabinet management
│   ├── PrescriptionScanner.tsx # Camera & OCR logic
│   ├── InteractionReport.tsx # Analysis results display
│   ├── MedicalChatBot.tsx    # AI Assistant overlay
│   └── ReportPreviewModal.tsx # PDF generation
├── services/
│   ├── gemini.ts        # AI interactions & prompt engineering
│   └── storage.ts       # LocalStorage persistence layer
├── types.ts             # TypeScript interfaces & constants
└── App.tsx              # Main application entry
```

---

<div align="center" style="background-color: #fff3cd; color: #856404; padding: 20px; border-radius: 10px; border: 1px solid #ffeeba;">
  <h3>⚠️ Medical Disclaimer</h3>
  <p>
    <strong>MedScript AI is an experimental tool for informational purposes only.</strong><br>
    It uses Artificial Intelligence to analyze data, which can produce hallucinations or errors. This application is <strong>not</strong> a substitute for professional medical advice, diagnosis, or treatment. Always consult a qualified healthcare provider for medical decisions.
  </p>
</div>