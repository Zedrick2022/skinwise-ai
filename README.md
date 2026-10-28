# SkinWise AI
### AI-Powered Cosmetic Skin Insights & Personalized Skincare Planning

**SkinWise AI** is an AI-powered skincare web application that transforms facial photos into accessible cosmetic skin insights, interactive visualizations, and personalized skincare planning experiences.

By integrating the YouCam Skin Analysis API with an intuitive web interface, SkinWise AI helps users explore selected skin metrics, understand their analysis results, review previous assessments, and make more informed decisions about their skincare routines.

> **Project category:** Artificial Intelligence · Beauty Technology · Computer Vision · Data Visualization

---

## Overview

Understanding skincare needs can be confusing. SkinWise AI aims to make cosmetic skin analysis easier to explore by bringing AI-powered insights, visual analytics, and routine planning together in one application.

Users can take a selfie or upload an existing photo, review AI-generated estimates for selected skin attributes, explore visual summaries, and use a routine builder to organize their skincare preferences.

The application is designed around clarity, accessibility, and responsible use of AI.

## Key Features

### AI-Powered Skin Analysis
Submit a facial photo for AI-powered cosmetic analysis using the YouCam Skin Analysis API. The application presents available estimates for:

- **Acne**
- **Pores**
- **Skin texture**
- **Wrinkles**

Results are presented in a clear format to help users explore the returned cosmetic measurements.

### Flexible Photo Input
- **Take Selfie:** Capture a photo using a supported device camera.
- **Upload Photo:** Select an existing photo from the device.

Camera access depends on browser permissions and the environment in which the application is hosted.

### Interactive Visual Analytics
Visualize skin-analysis results through charts and graphical summaries. These visualizations help make numerical results easier to explore and compare.

### Analysis History & Progress Review
Review supported saved analyses and compare previous results to explore changes over time. History and comparisons depend on the records available in the application.

### Personalized Skincare Routine Builder
Explore skincare planning options based on user-selected preferences, including:

- Skincare goals
- Skin sensitivity
- Budget

The routine builder supports skincare planning; it does not replace professional advice or guarantee specific results.

### Reports & Data Export
Use available reporting and export features to retain or review supported analysis information, including print-ready reports and downloadable data.

---

## How It Works

1. **Choose a photo:** Take a selfie or upload an existing facial photo.
2. **Analyze:** Submit the image for processing through the configured YouCam Skin Analysis API.
3. **Explore results:** Review the available cosmetic estimates for acne, pores, texture, and wrinkles.
4. **Visualize:** Explore charts and summaries that help communicate the returned data.
5. **Review progress:** Revisit saved analyses and compare available historical results.
6. **Plan a routine:** Use the routine builder to organize skincare preferences.

---

## Technology Stack

| Technology | Purpose |
|---|---|
| HTML5 | Application structure |
| CSS3 | Responsive styling and visual design |
| JavaScript | Frontend interactions and application logic |
| Node.js | Server-side JavaScript runtime |
| Express.js | Backend routes and API integration |
| YouCam Skin Analysis API | AI-powered cosmetic skin analysis |
| MediaPipe Tasks Vision | Face-detection capabilities used by the camera experience |
| Chart.js | Data visualization |

---

## Responsible AI & Privacy

SkinWise AI is intended for **cosmetic and informational use only**.

- AI-generated measurements are estimates and may be inaccurate or incomplete.
- Results are not a medical diagnosis and must not be used to diagnose, prevent, or treat a medical condition.
- The application is not a substitute for a dermatologist or other qualified healthcare professional.
- Photos submitted for analysis are sent to the configured external analysis service for processing.
- Users should review the relevant service's privacy terms before submitting personal images.
- Depending on the browser implementation, saved analysis history may be stored locally on the user's device.
- API credentials must remain on the server and must never be exposed in public frontend code or committed to the repository.

Privacy, transparency, and appropriate expectations are important considerations when applying AI to personal-care experiences.

---

## Running the Project Locally

The following instructions are intended for developers who want to run or evaluate the application.

### Prerequisites

- Node.js and npm
- A valid YouCam API key with access to the required skin-analysis endpoints
- An internet connection for external API requests

### Installation

Clone the repository and enter the project directory:

```bash
git clone https://github.com/YOUR-USERNAME/YOUR-REPOSITORY.git
cd YOUR-REPOSITORY
```

Replace the example repository URL with the actual public GitHub repository address.

Install dependencies:

```bash
npm install
```

### Environment Configuration

Create a `.env` file in the project root:

```env
YOUCAM_API_KEY=your_api_key_here
```

Replace the placeholder with a valid API key. If a custom API base URL is required, configure `YOUCAM_API_BASE` according to the server configuration.

**Never commit `.env` or publish API credentials.** Ensure `.env` is excluded by `.gitignore`.

### Start the Application

```bash
npm start
```

If the project does not define an npm start script, use:

```bash
node server.js
```

Open the local application at:

http://localhost:3000

The server must remain running while the application is in use.

---

## Hackathon Project

SkinWise AI demonstrates how AI-powered image analysis can be combined with a consumer-facing web application, interactive data visualization, and personalized planning tools.

The project brings together several key ideas:

- Applying an AI API to a practical beauty and skincare use case.
- Making analysis outputs easier to understand through visual presentation.
- Connecting results with a user-centered skincare planning experience.
- Considering privacy and responsible AI use when working with facial images.

The objective is to create a useful, accessible experience that connects AI capabilities with understandable information and practical next steps.

---

## Limitations

- Analysis quality depends on the submitted photo, lighting, image quality, and the capabilities of the external analysis service.
- Available results depend on the response returned by the configured API.
- Skincare preferences and routine suggestions are informational and do not guarantee a particular outcome.
- Camera support, local history, reporting, and export behavior depend on the current application implementation and browser environment.

---

## Acknowledgements

- **YouCam** — Skin Analysis API
- **MediaPipe** — Face-detection technology
- **Chart.js** — Data visualization
- **Open-source developer community** — Tools and resources that support web development

---

## Disclaimer

SkinWise AI is an independent project for cosmetic, educational, and informational purposes. AI-generated outputs are not medical advice. Users with skin concerns should consult a qualified healthcare professional.

---

**SkinWise AI — Understand your skin insights. Visualize your results. Plan your skincare journey.**
