# 1n9 Chat AI node

Thai version: [README.th.md](README.th.md)

The node is the part of 1n9 Chat AI that runs on your own machine. It holds your files, bots, settings and AI keys, and sends every request to the 1n9 engine ("central") for processing. It has two web pages:

| Page | For | What it has |
|---|---|---|
| `/` | Users | The chat page. Pick a bot and ask. |
| `/admin` | Administrators | **Knowledge:** knowledge bases (upload, inspect chunks), skill sets, chatbots. **System:** AI connections (provider, key, model), status and usage overview. |

- Settings and data live in `data/node.db` (SQLite). Keys are encrypted. Changes made on `/admin/settings` take effect immediately.
- `.env` only provides defaults for the first start.
- The web UI is in `frontend/` (Next.js, built to static files and served by the node on the same origin as the API).

The node only ever connects outward (to the engine and to the AI provider you choose), so it can run on a local machine with no open port and no public IP.

A license key is required (a free one is issued on the setup page). The node is MIT-licensed; answers still run through the 1n9 engine.

## Run with Docker (recommended)

```bash
git clone https://github.com/1n9ai/chat-ai-node.git && cd chat-ai-node
cp .env.example .env        # set CENTRAL_URL, and optionally LICENSE_KEY / NODE_PASSWORD
docker compose up -d --build
```

- Open http://127.0.0.1:8080 and follow the setup page: choose an admin password, get a license, paste your AI key.
- By default only the machine itself can reach it. To let other machines in, set `NODE_BIND=0.0.0.0`.
- Behind a domain name (for example behind nginx), put the domain in `NODE_ALLOWED_HOSTS`, otherwise you get 403. `localhost` and IPs always work.
- Data is stored in the `node-data` volume.
- `CENTRAL_URL` must be the engine's domain or IP. Do not use `127.0.0.1`: inside a container it means the container itself.

## Run on a NAS or server (reachable from the LAN)

Set these in `.env` in addition to the defaults:

```
NODE_BIND=0.0.0.0                  # default is 127.0.0.1, other machines cannot reach it
NODE_PASSWORD=<a strong password>  # anyone on the LAN can reach the page, so set one
```

Then open `http://<NAS IP>:8080` and sign in as `admin`.

Troubleshooting:

- **`.env: no such file`:** create `.env` first (it is not in git because it holds keys).
- **`port is already allocated`:** another app uses 8080. Set `NODE_PORT=8090` in `.env`.
- **Other machines cannot connect:** open port 8080 in the firewall.
- **The page loads but says the engine cannot be reached:** check `curl <CENTRAL_URL>/v1/meta` from the same machine.
- **Update:** `git pull && docker compose up -d --build`. Data in the `node-data` volume is kept.

## Run on Windows without Docker

```powershell
cd frontend
npm ci; npm run build          # produces frontend\out
cd ..
python -m venv .venv
.venv\Scripts\pip install -r requirements.txt
.venv\Scripts\python -m uvicorn app:app --host 127.0.0.1 --port 8080
```

A ready-made Windows installer (it bundles the vector database) is available from https://www.1n9ai.com/it/.

## Sign-in

The first-run setup page asks for an admin password (user `admin`) as its first step; you can also preset it with `NODE_PASSWORD`. Once setup is done the chat page `/` is public, while `/admin` and its APIs require sign-in (the scope is adjustable with `NODE_AUTH_SCOPE`). Repeated failed sign-ins are slowed down.

## Good to know

- **Always back up `data/node.db` together with `data/secret.key`.** Without the key file, the AI keys stored in Settings cannot be decrypted and you must enter them again (knowledge bases and bots are kept).
- **Embedding model is fixed per knowledge base.** Changing it asks for confirmation, because the existing knowledge base can no longer be searched and must be rebuilt.
- **Ollama:** choose the "Ollama" provider and enter `http://<ip>:11434` with no `/v1` and no key.
- **Voice input (microphone button on the chat page)** uses the default Speech-to-Text model in the model library. Without one, bots that use Gemini transcribe by themselves; other bots hide the button. The transcript lands in the input box for review before sending. Browsers only allow the microphone over https or on localhost.
- **Original files** are in `data/originals/`, exports in `data/exports/`.
- **Your data is not tied to one engine.** The engine keeps neither your knowledge-base content nor your keys. You can point `CENTRAL_URL` at another engine and keep your knowledge bases and bots, as long as the license and vector database stay the same.
- **One license is active on one installation at a time.** If another installation takes it over, a banner offers to take it back.

## Security of the channel to the engine

Every request to the engine carries your API keys and data (questions, documents, rows), so the node enforces:

- `CENTRAL_URL` must be `https://`. Plain `http` over the internet is refused and nothing is sent. Plain `http` is accepted only on the same machine, a Docker service name or a LAN.
- For stricter setups, set `CENTRAL_CA_FILE` so the node trusts only certificates from the CAs in that file (certificate pinning), which prevents impersonation of the engine.
- The engine rejects internet clients that hit its port directly without HTTPS (`https_required`).
- The node talks to two destinations only: the engine and the AI provider you choose. A firewall can be set to allow just those two.

See [docs/DATA_HANDLING.md](docs/DATA_HANDLING.md) for how data is handled.

## License

The code is MIT-licensed (see LICENSE). The name and logo "1n9 AI" are trademarks of their owner and are not covered by the MIT license. If you redistribute or modify the code, change the name and logo.
