# Haru for Pinokio

[![Install with Pinokio](https://badges.pinokio.co/install.svg)](https://pinokio.co/resolve?url=https://github.com/cocktailpeanut/Haru.pinokio)

A one-click launcher for [Haru](https://github.com/higurashi-ai/Haru), a multilingual voice model that listens and speaks at the same time. Uses a browser interface on Apple silicon Macs and NVIDIA CUDA systems running Windows or Linux.

## Install with Pinokio

Click the badge above or [install Haru with Pinokio](https://pinokio.co/resolve?url=https://github.com/cocktailpeanut/Haru.pinokio). Open the link to add the project if prompted, signing in if needed. Then click **Install** in Pinokio.

You can also use Pinokio's **Download from URL** with `https://github.com/cocktailpeanut/Haru.pinokio`.

## Requirements

- **Apple silicon Mac:** macOS 13 or later and at least 16 GB of memory. Uses MLX inference with Haru's browser interface.
- **Windows or Linux:** an NVIDIA CUDA GPU and a compatible NVIDIA driver. Upstream estimates about 12 GB of VRAM; that is a GPU-memory estimate, not the complete system-memory requirement or a verified minimum for this launcher. Uses the upstream PyTorch web demo. UV selects the PyTorch backend for the detected driver.
- **System memory:** host RAM and virtual memory are also needed during model loading. The Windows path has been verified with 28 GB of RAM and the machine's existing system-managed paging file. The minimum host-memory requirement has not been measured.
- Allow roughly 10 GB for the model, plus space for dependencies. Installation uses Pinokio's AI bundle and an isolated Python environment.
- A microphone, headphones, and a reference voice clip: one speaker, 3 seconds to 3 minutes of clean speech. Haru ships without voice clips. Use a voice you have permission to use.

Intel Macs, CPU-only machines, and AMD GPUs are not supported by this launcher's local inference paths. The model is a research base model, with the limitations described in the [upstream README](https://github.com/higurashi-ai/Haru#limitations).

## Use

1. Open this folder in Pinokio and click **Install**. It clones Haru into `app/` and installs dependencies in `app/env`.
2. Click **Start**. The first launch downloads `higurashi-ai/Haru-4B` from Hugging Face.
3. **Open Web UI** opens Haru in the browser on every supported platform. Wait for the model to finish loading, and allow microphone access when prompted.
4. Choose a character, upload or record a reference voice, and start a conversation. Wired audio devices give the lowest latency.

Stop the server with Pinokio's Stop control before updating, reinstalling, or resetting.

- **Update** pulls the launcher when it has a Git remote, pulls the upstream app, then reruns installation.
- **Reinstall** repeats dependency setup without removing the clone.
- **Reset** deletes `app/`, including its Python environment and anything you saved inside that folder. Click Install afterwards. The model cache under `cache/` is retained.

The web server binds to `127.0.0.1` on a port chosen by Pinokio. Use the displayed URL; there is no fixed port or public tunnel. Browser microphone access requires a loopback URL or HTTPS.

The web client is already bundled upstream, so Node.js and a frontend build are unnecessary. Optional public sharing, WebRTC, Triton kernels, and the separate vLLM deployment are not installed by this launcher.

On Mac, `mlx-web.py` connects the upstream web server to the upstream MLX backend through their shared conversation API. Both Python packages are installed because the web server imports modules from the PyTorch package; model inference uses MLX. The upstream files are unchanged, and no native app build is needed.

On Windows, `windows-web.py` initializes model parameters as empty placeholders until the checkpoint assigns their values. This avoids a temporary CPU allocation of about 19.6 GiB for Haru-4B, while keeping nonpersistent buffers initialized normally. It uses the existing dependencies and leaves Windows paging-file settings unchanged. Windows and Linux launch from `app/haru` so the editable package's bundled assets resolve correctly.

## Programmatic access

### Python: model API on either platform

Run Python in the environment created by Install: `app/env`. The packages expose the same conversation API. This example feeds ten seconds of silence as placeholder microphone input and saves the generated audio; replace each `user_audio` frame with 3200 mono float32 samples at 24 kHz for a live client.

```python
import importlib
import json
import sys
from importlib import resources

import numpy as np
import soundfile as sf

package = "haru_mlx" if sys.platform == "darwin" else "haru"
api = importlib.import_module(package)
audio = importlib.import_module(f"{package}.audio")
prompt = importlib.import_module(f"{package}.prompt")

card = json.loads((resources.files(package) / "assets/cards/en.json").read_text())["chat"]
system_prompt = prompt.render_card(card, prompt.card_templates()["templates"]["en"])
model = api.HaruModel.from_pretrained("higurashi-ai/Haru-4B")
reference = audio.prepare_reference(audio.load_audio("voice.wav"))
session = api.DuplexSession(model, system_prompt=system_prompt, reference=reference)

frame = session.start()
reply = [frame.audio]
for _ in range(75):
    if frame.done:
        break
    user_audio = np.zeros(3200, dtype=np.float32)
    frame = session.step(user_audio)
    reply.append(frame.audio)
    print(frame.text, end="", flush=True)
sf.write("reply.wav", np.concatenate(reply), 24000)
```

### JavaScript: web demo API

Use the base URL shown by Pinokio. `systemPrompt` is a complete character card; the web UI can help construct one. This Node.js example uploads a voice and registers a session:

```javascript
import { readFile } from "node:fs/promises";

async function createConversation(baseUrl, voicePath, systemPrompt) {
  async function request(path, options) {
    const response = await fetch(`${baseUrl}${path}`, options);
    if (!response.ok) throw new Error(await response.text());
    return response.json();
  }
  if (!(await request("/api/ready")).ready) throw new Error("Model is still loading");
  const voice = await request("/api/reference_audio", {
    method: "POST",
    headers: { "Content-Type": "audio/wav" },
    body: await readFile(voicePath),
  });
  return request("/api/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ system_prompt: systemPrompt, reference_audio_id: voice.id }),
  });
}
```

The result is `{ "id": "..." }`. Registering a session prepares it; actual audio streaming uses the WebSocket at `/api/chat?session_id=<id>`. Haru's web client implements its binary protocol; see [server.py](https://github.com/higurashi-ai/Haru/blob/main/haru/haru/server.py) and the [client](https://github.com/higurashi-ai/Haru/tree/main/client).

### Curl: web demo API

Replace `PORT` with the port shown in Pinokio:

```bash
curl http://127.0.0.1:PORT/api/ready
curl http://127.0.0.1:PORT/api/config
curl -X POST http://127.0.0.1:PORT/api/reference_audio \
  -H "Content-Type: audio/wav" --data-binary @voice.wav
```

The upload returns a voice `id`, its duration, and whether it was trimmed. Use that ID as `reference_audio_id` in a JSON request to `POST /api/session`, with a nonempty `system_prompt`.

## Troubleshooting

- Launcher execution logs: `logs/`, including `logs/api/<script>/latest` and session logs.
- Mac model logs are in the same Pinokio Start terminal as the web server.
- Missing NVIDIA GPU or driver: check the install terminal's CUDA assertion and NVIDIA driver installation.
- Missing `assets/card_templates.json`, or Windows paging-file error 1455 with an older launcher: click Update for the package-directory and Windows memory-loading fixes, then Start again.
- Download errors: check access to Hugging Face, then restart. Downloads resume from the cache.
- No default voice: upload or record your own reference clip; upstream intentionally ships none.

## Verification

Verified on Apple silicon with Python 3.10 against Haru commit `d3612b02037d0f1083490b8afe153aa8553092af`:

- Pinokio Install, Reset, clean reinstall, and Update.
- Real MLX model loading, reference upload, prompt preparation, and bidirectional WebSocket Opus audio: 11 returned chunks decoded to 34,560 finite samples (1.44 seconds), plus text, using synthetic input.
- Static web client, nine language configurations, invalid request handling, platform command generation, menu states, and captured URL.
- Windows and Linux CUDA dependency resolution in dry runs. Linux GPU execution and live microphone capture remain untested.

Also verified on a Windows Shadow PC with 28 GB RAM, an NVIDIA RTX A4500 (20 GB VRAM), PyTorch `2.14.1+cu132`, and CUDA 13.2: the complete model loaded on `cuda:0` and completed the upstream warm-up with the memory-efficient initializer. Windows settings were unchanged. A small-model regression check confirmed exact checkpoint values, buffers, and forward outputs match the normal initializer, and initialization hooks restore after success and exceptions. The approximate 12 GB VRAM configuration has not been tested directly.

## License

The launcher is Apache-2.0; see [LICENSE](LICENSE). Its icon comes from Haru's native app. Haru's source and model weights are also Apache-2.0; see the [upstream license](https://github.com/higurashi-ai/Haru/blob/main/LICENSE) and [third-party notices](https://github.com/higurashi-ai/Haru/blob/main/THIRD_PARTY_NOTICES.md). The launcher downloads the upstream source without modifying it.
