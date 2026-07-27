# Scripts

Start and stop the Dockerized MVP.

| Script | Platform |
|--------|----------|
| `start.sh` / `stop.sh` | Mac / Linux |
| `start.ps1` / `stop.ps1` | Windows PowerShell |
| `start.bat` / `stop.bat` | Windows cmd (wrappers) |

## Behavior

- Build image `pm-mvp` from the repo root `Dockerfile`
- Run container `pm-mvp` on `http://localhost:8000`
- Mount `./data` to `/data`
- Pass root `.env` into the container when present

Windows scripts also look for Docker at `C:\Program Files\Docker\Docker\resources\bin\docker.exe` if it is not on PATH.
