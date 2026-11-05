# PixelStudio 🎨

**A browser-based photo editing studio built with React, TypeScript, and HTML Canvas.**

PixelStudio is a modern image editing application that allows users to upload, edit, customize, and export images directly in their browser. It provides essential photo editing tools, layer management, non-destructive adjustments, project history, and local project storage through a clean and responsive interface.

## ✨ Features

### Image Editing
- Upload PNG, JPG, and WebP images.
- Crop images with selection controls.
- Rotate and flip images horizontally and vertically.
- Resize images using custom dimensions.
- Zoom in, zoom out, fit to screen, and reset the canvas.

### Image Adjustments
- Brightness control.
- Contrast adjustment.
- Saturation adjustment.
- Blur effect.
- Built-in image presets.
- Before/After comparison slider.

### Layer Management
- Add text, rectangle, circle, and image layers.
- Move, resize, and rotate layers.
- Control layer visibility and opacity.
- Lock and unlock layers.
- Reorder layers.
- Select and manage individual layers.

### History & Project Management
- Undo and redo operations.
- View and restore previous editing states.
- Save projects locally using IndexedDB.
- Reopen and delete saved projects.
- Restore image and layer information.

### Export Options
- Export images as PNG, JPG, and WebP.
- Configure export quality and dimensions.

### Interface & Usability
- Dark Mode and Light Mode.
- Responsive interface for desktop, tablet, and mobile.
- Keyboard shortcuts for common editing actions.

## 🛠️ Technology Stack

| Technology | Purpose |
|---|---|
| React | User interface |
| TypeScript | Type-safe development |
| Vite | Development server and build tool |
| HTML Canvas API | Image rendering and editing |
| CSS3 | Styling and responsive layouts |
| IndexedDB | Local project storage |
| Lucide React | Interface icons |


## 🚀 Getting Started

Follow these instructions to run PixelStudio locally.

### Prerequisites

- Node.js
- npm
- Git

### Installation

**1. Clone the repository**

```bash
git clone https://github.com/mawaiheema-tech/pixelstudio.git
```

**2. Navigate to the project directory**

```bash
cd pixelstudio
```

**3. Install dependencies**

```bash
npm install
```

**4. Start the development server**

```bash
npm run dev
```

**5. Open the application**

Visit the local URL displayed in your terminal, usually:

```text
http://localhost:5173/
```

## 📦 Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Create production build |
| `npm run preview` | Preview production build |
| `npm run lint` | Run Oxlint |

## 🌐 Repository

**GitHub:** https://github.com/mawaiheema-tech/pixelstudio

## 🔒 Data Storage

PixelStudio uses browser-based IndexedDB to store saved projects locally. Image editing and export are performed in the browser without requiring server-side image processing.

## 🎯 Project Goal

The goal of PixelStudio is to build a practical, user-friendly image editing application while exploring modern frontend development, Canvas-based image manipulation, state management, browser storage, and responsive UI design.

---

**Built with ❤️ using React, TypeScript, and Canvas API.**
