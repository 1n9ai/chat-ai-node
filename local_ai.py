"""AI ในเครื่อง (ไม่ต้องมี API key) — ติดตั้ง Ollama + โมเดลชุดที่ทดสอบแล้ว แล้วให้ node ตั้งเป็นการเชื่อมต่อให้เอง

ค่าเริ่มต้นของระบบยังเป็น BYOK (cloud) — ทางนี้มีไว้ให้ลูกค้าที่ไม่มี key ใช้งานได้ทันที
- เช็คเครื่องก่อน (RAM, พื้นที่ว่าง, การ์ดจอแยก) หน้าเว็บใช้ผลนี้แสดงคำเตือนว่าอาจช้า
- Windows: ถ้ายังไม่มี Ollama จะดาวน์โหลดตัวติดตั้งทางการแล้วติดตั้งแบบเงียบ · ระบบอื่น/Docker ต้องมี Ollama รันอยู่แล้ว
- โหลดโมเดลผ่าน API ของ Ollama เอง (/api/pull) แล้วรายงานความคืบหน้าให้หน้าเว็บ
งานติดตั้งรันใน thread เดียวต่อเครื่อง (กดซ้ำระหว่างทำ = ได้สถานะงานเดิม)
"""
from __future__ import annotations

import ctypes
import json
import os
import platform
import shutil
import subprocess
import tempfile
import threading
import time
from pathlib import Path

import httpx

OLLAMA_URL = (os.environ.get("NODE_LOCAL_OLLAMA_URL") or "http://127.0.0.1:11434").rstrip("/")
OLLAMA_SETUP_URL = "https://ollama.com/download/OllamaSetup.exe"
# โมเดลชุดที่ทดสอบกับระบบแล้ว: qwen3:4b-instruct ไม่มีโหมดคิด (รุ่น qwen3:4b ปิดการคิดไม่ได้ — ตอบช้ามาก)
LLM_MODEL = "qwen3:4b-instruct"
EMBEDDING_MODEL = "bge-m3"
EMBEDDING_DIM = 1024
MODELS_GB = 3.7  # ขนาดโมเดลทั้งสองตัวรวมกันโดยประมาณ
OLLAMA_SETUP_GB = 1.7  # ตัวติดตั้ง Ollama สำหรับ Windows (รวมไลบรารีการ์ดจอ) — วัด 2026-10-28
# prompt ของระบบยาวเกินค่าเริ่มต้นของ Ollama (4K) — โมเดลบางตัวตัดส่วนเกินทิ้งเงียบ ๆ บางตัวตอบ 400
CONTEXT_LENGTH = "8192"
MIN_RAM_GB, REC_RAM_GB = 8, 16
MIN_DISK_GB, MIN_DISK_WITH_OLLAMA_GB = 5, 10  # โมเดลอย่างเดียว / ติดตั้ง Ollama ด้วย (ตัวติดตั้ง + ไฟล์ที่แตกออก)

_lock = threading.Lock()
_job: dict = {"state": "idle"}


# ── เช็คเครื่อง ──────────────────────────────────────

def _ram_gb() -> float | None:
    try:
        if os.name == "nt":
            class MEMORYSTATUSEX(ctypes.Structure):
                _fields_ = [("dwLength", ctypes.c_ulong), ("dwMemoryLoad", ctypes.c_ulong),
                            ("ullTotalPhys", ctypes.c_ulonglong), ("ullAvailPhys", ctypes.c_ulonglong),
                            ("ullTotalPageFile", ctypes.c_ulonglong), ("ullAvailPageFile", ctypes.c_ulonglong),
                            ("ullTotalVirtual", ctypes.c_ulonglong), ("ullAvailVirtual", ctypes.c_ulonglong),
                            ("ullAvailExtendedVirtual", ctypes.c_ulonglong)]
            st = MEMORYSTATUSEX()
            st.dwLength = ctypes.sizeof(MEMORYSTATUSEX)
            ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(st))
            return round(st.ullTotalPhys / 1024 ** 3, 1)
        return round(os.sysconf("SC_PAGE_SIZE") * os.sysconf("SC_PHYS_PAGES") / 1024 ** 3, 1)
    except (OSError, ValueError, AttributeError):
        return None


def _gpu_names() -> list[str]:
    try:
        if os.name == "nt":
            out = subprocess.run(
                ["powershell", "-NoProfile", "-Command", "(Get-CimInstance Win32_VideoController).Name"],
                capture_output=True, text=True, timeout=15, creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0))
            return [l.strip() for l in out.stdout.splitlines() if l.strip()]
        if shutil.which("nvidia-smi"):
            out = subprocess.run(["nvidia-smi", "--query-gpu=name", "--format=csv,noheader"],
                                 capture_output=True, text=True, timeout=15)
            return [l.strip() for l in out.stdout.splitlines() if l.strip()]
    except (OSError, subprocess.SubprocessError):
        pass
    return []


def _usable_gpu(names: list[str]) -> bool:
    """การ์ดจอที่ Ollama ใช้เร่งความเร็วได้: NVIDIA, AMD Radeon รุ่นการ์ดแยก (RX/PRO), Mac ชิป Apple
    การ์ดจอออนบอร์ด (Intel UHD/Iris, AMD Radeon Graphics ในซีพียู) Ollama แทบไม่ได้ใช้ — นับว่าไม่มี"""
    if platform.system() == "Darwin" and platform.machine() == "arm64":
        return True
    for n in names:
        u = n.upper()
        if "NVIDIA" in u or ("RADEON" in u and ("RX " in u or "PRO " in u)):
            return True
    return False


def hardware(data_dir: Path) -> dict:
    gpus = _gpu_names()
    try:
        disk = round(shutil.disk_usage(Path.home()).free / 1024 ** 3, 1)
    except OSError:
        disk = None
    need_ollama = ollama_models() is None and os.name == "nt"
    return {"os": platform.system().lower(), "ram_gb": _ram_gb(), "disk_free_gb": disk, "gpus": gpus,
            "gpu": _usable_gpu(gpus), "min_ram_gb": MIN_RAM_GB, "rec_ram_gb": REC_RAM_GB,
            "min_disk_gb": MIN_DISK_WITH_OLLAMA_GB if need_ollama else MIN_DISK_GB,
            "download_gb": round(MODELS_GB + (OLLAMA_SETUP_GB if need_ollama else 0), 1), "can_install_ollama": os.name == "nt"}


# ── Ollama ───────────────────────────────────────────

def ollama_models() -> list[str] | None:
    """ชื่อโมเดลที่มีใน Ollama · None = ติดต่อ Ollama ไม่ได้"""
    try:
        r = httpx.get(f"{OLLAMA_URL}/api/tags", timeout=4)
        r.raise_for_status()
        return [m.get("name", "") for m in r.json().get("models") or []]
    except (httpx.HTTPError, ValueError):
        return None


def _has(models: list[str], name: str) -> bool:
    return any(m == name or m == f"{name}:latest" for m in models)


def status() -> dict:
    models = ollama_models()
    with _lock:
        job = dict(_job)
    return {"ollama_running": models is not None, "llm_ready": bool(models) and _has(models, LLM_MODEL),
            "embedding_ready": bool(models) and _has(models, EMBEDDING_MODEL),
            "llm_model": LLM_MODEL, "embedding_model": EMBEDDING_MODEL, "base_url": OLLAMA_URL, "job": job}


def _set(**kw) -> None:
    with _lock:
        _job.update(kw)


def _wait_ollama(seconds: int) -> bool:
    end = time.time() + seconds
    while time.time() < end:
        if ollama_models() is not None:
            return True
        time.sleep(2)
    return False


def _install_ollama_windows() -> None:
    # ตั้ง context ก่อนติดตั้ง — ตัวติดตั้งเปิด Ollama ให้ทันทีหลังติดตั้งเสร็จ และอ่านค่าตัวแปรตอนเปิดเท่านั้น
    if not os.environ.get("OLLAMA_CONTEXT_LENGTH"):
        subprocess.run(["setx", "OLLAMA_CONTEXT_LENGTH", CONTEXT_LENGTH], capture_output=True, timeout=30,
                       creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0))
    path = Path(tempfile.gettempdir()) / "OllamaSetup.exe"
    _set(step="download", progress=0)
    with httpx.stream("GET", OLLAMA_SETUP_URL, follow_redirects=True, timeout=60) as r:
        r.raise_for_status()
        total = int(r.headers.get("content-length") or 0)
        done = 0
        with open(path, "wb") as f:
            for chunk in r.iter_bytes(1 << 20):
                f.write(chunk)
                done += len(chunk)
                if total:
                    _set(progress=round(done * 100 / total))
    _set(step="install", progress=None)
    subprocess.run([str(path), "/VERYSILENT", "/NORESTART", "/SUPPRESSMSGBOXES"], timeout=900, check=True)
    try:
        path.unlink()
    except OSError:
        pass
    _set(step="start")
    if not _wait_ollama(60):
        app = Path(os.environ.get("LOCALAPPDATA", "")) / "Programs" / "Ollama" / "ollama app.exe"
        if app.exists():
            subprocess.Popen([str(app)], creationflags=getattr(subprocess, "DETACHED_PROCESS", 0))
        if not _wait_ollama(90):
            raise RuntimeError("ollama_not_started")


def _pull(model: str, step: str) -> None:
    _set(step=step, progress=0)
    with httpx.stream("POST", f"{OLLAMA_URL}/api/pull", json={"model": model, "stream": True}, timeout=None) as r:
        r.raise_for_status()
        for line in r.iter_lines():
            if not line.strip():
                continue
            try:
                ev = json.loads(line)
            except ValueError:
                continue
            if ev.get("error"):
                raise RuntimeError(f"pull_failed: {ev['error']}")
            if ev.get("total"):
                _set(progress=round((ev.get("completed") or 0) * 100 / ev["total"]))


def _run(configure) -> None:
    try:
        if ollama_models() is None:
            if os.name != "nt":
                raise RuntimeError("ollama_not_found")
            _install_ollama_windows()
        models = ollama_models() or []
        if not _has(models, LLM_MODEL):
            _pull(LLM_MODEL, "pull_llm")
        if not _has(models, EMBEDDING_MODEL):
            _pull(EMBEDDING_MODEL, "pull_embedding")
        _set(step="configure", progress=None)
        configure(OLLAMA_URL, LLM_MODEL, EMBEDDING_MODEL, EMBEDDING_DIM)
        _set(state="done", step="done", progress=100, finished_at=time.time())
    except Exception as e:  # รายงานให้หน้าเว็บ — ไม่ปล่อยให้ thread ตายเงียบ
        code = str(e).split(":", 1)[0] if str(e).startswith(("ollama_", "pull_failed")) else "install_failed"
        _set(state="error", error_code=code, error=str(e)[:300], finished_at=time.time())


def start(configure) -> dict:
    """เริ่มงานติดตั้ง (ถ้ายังไม่มีงานที่ทำอยู่) — configure(base_url, llm, embedding, dim) เรียกตอนโมเดลพร้อมแล้ว"""
    with _lock:
        if _job.get("state") == "running":
            return dict(_job)
        _job.clear()
        _job.update(state="running", step="check", progress=None, started_at=time.time())
    threading.Thread(target=_run, args=(configure,), daemon=True).start()
    return status()["job"]
