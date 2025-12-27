# tools/dump_repo.py
# Generate a single text dump of the repo for LLM review.
# - Tracked files only (git ls-files)
# - Text files: full content
# - Binary files: metadata only
# - Excludes common huge dirs and binary extensions
#
# Usage:
#   python tools/dump_repo.py --out repo_dump.txt --include-diff
#   python tools/dump_repo.py --out repo_dump.txt --max-bytes 2000000

from __future__ import annotations

import argparse
import fnmatch
import hashlib
import os
import subprocess
from pathlib import Path
from typing import List, Optional, Tuple


DEFAULT_EXCLUDE_DIRS = [
    ".git",
    "node_modules",
    "dist",
    "build",
    ".venv",
    "venv",
    "__pycache__",
    ".mypy_cache",
    ".pytest_cache",
    ".ruff_cache",
    ".tox",
    ".idea",
    ".vscode",
]

DEFAULT_BINARY_EXTS = [
    ".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp", ".ico",
    ".pdf",
    ".zip", ".7z", ".rar", ".tar", ".gz",
    ".exe", ".dll", ".so", ".dylib",
    ".bin", ".dat",
    ".mp3", ".wav", ".mp4", ".mov", ".mkv",
    ".ttf", ".otf", ".woff", ".woff2",
]


def run(cmd: List[str], cwd: Path) -> Tuple[int, str]:
    p = subprocess.run(cmd, cwd=str(cwd), capture_output=True)
    out = (p.stdout or b"") + (p.stderr or b"")
    text = decode_text(out) or out.decode("utf-8", errors="replace")
    return p.returncode, text.strip()


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def decode_text(data: bytes) -> Optional[str]:
    # Try common encodings (CP932 first for JP repos; UTF-8 fallback).
    for enc in ("cp932", "shift_jis", "utf-8", "utf-8-sig"):
        try:
            return data.decode(enc)
        except UnicodeDecodeError:
            continue
    return None


def is_excluded(path: Path, repo_root: Path, exclude_dirs: List[str], exclude_globs: List[str]) -> bool:
    rel = path.relative_to(repo_root).as_posix()

    # Exclude by dir segments
    parts = rel.split("/")
    for d in exclude_dirs:
        if d in parts:
            return True

    # Exclude by glob
    for g in exclude_globs:
        if fnmatch.fnmatch(rel, g):
            return True

    return False


def looks_binary(path: Path, binary_exts: List[str]) -> bool:
    if path.suffix.lower() in binary_exts:
        return True
    try:
        with path.open("rb") as f:
            head = f.read(8192)
        if b"\x00" in head:
            return True
        # If it decodes as text, treat as text
        return decode_text(head) is None
    except Exception:
        # If we can't read it reliably, be conservative
        return True


def git_ls_files(repo_root: Path) -> List[Path]:
    code, out = run(["git", "ls-files", "-z"], repo_root)
    if code != 0:
        raise RuntimeError("git ls-files failed:\n" + out)
    raw = out
    # When capture_output text=True, NULs may be preserved; split accordingly:
    files = [s for s in raw.split("\x00") if s]
    return [repo_root / s for s in files]


def write_section(fp, title: str, body: str) -> None:
    fp.write("\n")
    fp.write("# " + title + "\n")
    fp.write(body.rstrip() + "\n")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="repo_dump.txt")
    ap.add_argument("--max-bytes", type=int, default=0, help="0 means no limit; otherwise truncate huge text files")
    ap.add_argument("--include-diff", action="store_true", help="Include git diff in header")
    ap.add_argument("--exclude-dir", action="append", default=[])
    ap.add_argument("--exclude-glob", action="append", default=[])
    args = ap.parse_args()

    cwd = Path.cwd()
    code, top = run(["git", "rev-parse", "--show-toplevel"], cwd)
    if code != 0:
        raise SystemExit("Not inside a git repo (git rev-parse failed).")
    repo_root = Path(top.strip())

    exclude_dirs = DEFAULT_EXCLUDE_DIRS + list(args.exclude_dir or [])
    exclude_globs = list(args.exclude_glob or [])
    binary_exts = DEFAULT_BINARY_EXTS

    files = git_ls_files(repo_root)

    out_path = (repo_root / args.out).resolve()
    total_text = 0
    total_bin = 0
    total_skipped = 0

    with out_path.open("w", encoding="utf-8", newline="\n") as fp:
        # Header / meta
        fp.write("# REPO DUMP (for LLM review)\n")
        fp.write("repo_root: {0}\n".format(str(repo_root)))
        code, out = run(["git", "remote", "-v"], repo_root)
        fp.write("git_remote_v:\n{0}\n".format(out))
        code, out = run(["git", "status", "-sb"], repo_root)
        fp.write("git_status_sb:\n{0}\n".format(out))
        code, out = run(["git", "rev-parse", "HEAD"], repo_root)
        fp.write("git_head:\n{0}\n".format(out))
        code, out = run(["git", "status", "--porcelain"], repo_root)
        fp.write("git_status_porcelain:\n{0}\n".format(out))
        if args.include_diff:
            code, out = run(["git", "diff"], repo_root)
            write_section(fp, "git diff", out if out else "(no diff)")

        write_section(fp, "file list (tracked)", "\n".join([p.relative_to(repo_root).as_posix() for p in files]))

        # Body
        for path in files:
            if not path.exists():
                total_skipped += 1
                continue
            if is_excluded(path, repo_root, exclude_dirs, exclude_globs):
                total_skipped += 1
                continue

            rel = path.relative_to(repo_root).as_posix()
            size = path.stat().st_size

            if looks_binary(path, binary_exts):
                h = sha256_file(path)
                fp.write("\n===== BEGIN FILE: {0} (BINARY OMITTED) =====\n".format(rel))
                fp.write("bytes: {0}\nsha256: {1}\n".format(size, h))
                fp.write("===== END FILE: {0} =====\n".format(rel))
                total_bin += 1
                continue

            # Text
            data = path.read_bytes()
            text = decode_text(data)
            if text is None:
                # fallback: treat as binary-like
                h = sha256_file(path)
                fp.write("\n===== BEGIN FILE: {0} (UNDECODABLE OMITTED) =====\n".format(rel))
                fp.write("bytes: {0}\nsha256: {1}\n".format(size, h))
                fp.write("===== END FILE: {0} =====\n".format(rel))
                total_bin += 1
                continue

            if args.max_bytes and len(data) > args.max_bytes:
                # Truncate but keep ends
                head = data[: args.max_bytes // 2]
                tail = data[-(args.max_bytes // 2) :]
                head_txt = decode_text(head) or ""
                tail_txt = decode_text(tail) or ""
                text_out = head_txt + "\n\n... (TRUNCATED) ...\n\n" + tail_txt
            else:
                text_out = text

            fp.write("\n===== BEGIN FILE: {0} =====\n".format(rel))
            fp.write(text_out.rstrip() + "\n")
            fp.write("===== END FILE: {0} =====\n".format(rel))
            total_text += 1

        fp.write("\n# SUMMARY\n")
        fp.write("text_files: {0}\n".format(total_text))
        fp.write("binary_or_omitted_files: {0}\n".format(total_bin))
        fp.write("skipped_files: {0}\n".format(total_skipped))

    print("Wrote: {0}".format(str(out_path)))
    print("Bytes: {0}".format(out_path.stat().st_size))


if __name__ == "__main__":
    main()
