# Kimi K3 Chat

A focused local chat interface for **Kimi K3**, using the OpenAI-compatible TokenRouter API. It includes editable system prompts, reasoning controls, light/dark mode, Markdown rendering, fixed navigation/settings panels, and a K favicon.

## Screenshots

### Light mode

![Kimi K3 Chat — light mode](screenshots/kimi-k3-light.png)

### Dark mode

![Kimi K3 Chat — dark mode](screenshots/kimi-k3-dark.png)

## Run locally

```powershell
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Configuration

Create `.env.local`:

```env
TOKENROUTER_API_KEY=your_tokenrouter_key
```

The Vite development proxy keeps the API key out of browser code and forwards requests to TokenRouter. Never commit `.env.local` or paste API keys into the frontend.

## Build

```powershell
npm run build
```

## Model

The app uses the free TokenRouter model slug:

```text
moonshotai/kimi-k3-free
```
