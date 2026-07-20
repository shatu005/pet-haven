"""
Paw Haven — Backend (Flask + SQLite)
=====================================
Provides a JSON API for pets, adoption applications, and contact messages,
plus a hardcoded-password admin session, and serves your existing static
site (index.html, css/, js/, etc.) from the same origin.

Run:
    pip install flask
    python app.py

Then open http://127.0.0.1:5000 in your browser.
The first run auto-creates pawhaven.db and the required tables.
Run `python seed_data.py` once to load the original 14 demo pets.
"""

import os
import sqlite3
import functools
from datetime import datetime
from flask import Flask, request, jsonify, session, send_from_directory

# --------------------------------------------------------------------------
# Configuration — CHANGE THESE before deploying anywhere public.
# --------------------------------------------------------------------------
ADMIN_PASSWORD = "Dairymilk419"   # hardcoded admin password
SECRET_KEY = "change-this-to-a-random-string-before-deploying"

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "pawhaven.db")

app = Flask(__name__, static_folder=None)  # static_folder=None: we serve files ourselves below, with guard rails
app.secret_key = SECRET_KEY


# --------------------------------------------------------------------------
# Database helpers
# --------------------------------------------------------------------------
def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db()
    conn.executescript(
        """
        CREATE TABLE IF NOT EXISTS pets (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            species TEXT NOT NULL,
            breed TEXT,
            age_years REAL,
            age_label TEXT,
            gender TEXT,
            weight TEXT,
            fee INTEGER,
            vaccinated INTEGER,
            location TEXT,
            description TEXT,
            image TEXT,
            personality TEXT,
            good_with_kids INTEGER,
            good_with_pets INTEGER,
            medical_history TEXT
        );

        CREATE TABLE IF NOT EXISTS applications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            pet_name TEXT,
            full_name TEXT,
            email TEXT,
            phone TEXT,
            address TEXT,
            occupation TEXT,
            house_type TEXT,
            current_pets TEXT,
            past_pets TEXT,
            reason TEXT,
            contact_method TEXT,
            created_at TEXT
        );

        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            email TEXT,
            subject TEXT,
            message TEXT,
            created_at TEXT
        );
        """
    )
    conn.commit()
    conn.close()


def login_required(fn):
    """Guard for admin-only endpoints (add/edit/delete pets, view applications & messages)."""
    @functools.wraps(fn)
    def wrapper(*args, **kwargs):
        if not session.get("is_admin"):
            return jsonify({"error": "Unauthorized"}), 401
        return fn(*args, **kwargs)
    return wrapper


# --------------------------------------------------------------------------
# Admin auth
# --------------------------------------------------------------------------
@app.post("/api/admin/login")
def admin_login():
    data = request.get_json(force=True) or {}
    if data.get("password") == ADMIN_PASSWORD:
        session["is_admin"] = True
        return jsonify({"success": True})
    return jsonify({"success": False, "error": "Incorrect password"}), 401


@app.post("/api/admin/logout")
def admin_logout():
    session.pop("is_admin", None)
    return jsonify({"success": True})


@app.get("/api/admin/check")
def admin_check():
    return jsonify({"is_admin": bool(session.get("is_admin"))})


# --------------------------------------------------------------------------
# Pets — public read, admin-only write
# --------------------------------------------------------------------------
@app.get("/api/pets")
def get_pets():
    conn = get_db()
    rows = conn.execute("SELECT * FROM pets").fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])


@app.get("/api/pets/<pet_id>")
def get_pet(pet_id):
    conn = get_db()
    row = conn.execute("SELECT * FROM pets WHERE id = ?", (pet_id,)).fetchone()
    conn.close()
    if not row:
        return jsonify({"error": "Not found"}), 404
    return jsonify(dict(row))


@app.post("/api/pets")
@login_required
def create_pet():
    d = request.get_json(force=True) or {}
    if not d.get("id") or not d.get("name") or not d.get("species"):
        return jsonify({"error": "id, name and species are required"}), 400
    conn = get_db()
    conn.execute(
        """INSERT INTO pets
           (id, name, species, breed, age_years, age_label, gender, weight, fee,
            vaccinated, location, description, image, personality,
            good_with_kids, good_with_pets, medical_history)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
        (
            d["id"], d["name"], d["species"], d.get("breed"), d.get("age_years"),
            d.get("age_label"), d.get("gender"), d.get("weight"), d.get("fee"),
            int(bool(d.get("vaccinated"))), d.get("location"), d.get("description"),
            d.get("image"), d.get("personality", ""),
            int(bool(d.get("good_with_kids", True))), int(bool(d.get("good_with_pets", True))),
            d.get("medical_history", ""),
        ),
    )
    conn.commit()
    conn.close()
    return jsonify({"success": True}), 201


@app.put("/api/pets/<pet_id>")
@login_required
def update_pet(pet_id):
    d = request.get_json(force=True) or {}
    conn = get_db()
    conn.execute(
        """UPDATE pets SET
           name=?, species=?, breed=?, age_years=?, age_label=?, gender=?, weight=?, fee=?,
           vaccinated=?, location=?, description=?, image=?, personality=?,
           good_with_kids=?, good_with_pets=?, medical_history=?
           WHERE id=?""",
        (
            d.get("name"), d.get("species"), d.get("breed"), d.get("age_years"),
            d.get("age_label"), d.get("gender"), d.get("weight"), d.get("fee"),
            int(bool(d.get("vaccinated"))), d.get("location"), d.get("description"),
            d.get("image"), d.get("personality", ""),
            int(bool(d.get("good_with_kids", True))), int(bool(d.get("good_with_pets", True))),
            d.get("medical_history", ""), pet_id,
        ),
    )
    conn.commit()
    conn.close()
    return jsonify({"success": True})


@app.delete("/api/pets/<pet_id>")
@login_required
def delete_pet(pet_id):
    conn = get_db()
    conn.execute("DELETE FROM pets WHERE id = ?", (pet_id,))
    conn.commit()
    conn.close()
    return jsonify({"success": True})


# --------------------------------------------------------------------------
# Adoption applications — public create (from adopt.html), admin read/delete
# --------------------------------------------------------------------------
@app.post("/api/applications")
def submit_application():
    d = request.get_json(force=True) or {}
    conn = get_db()
    conn.execute(
        """INSERT INTO applications
           (pet_name, full_name, email, phone, address, occupation, house_type,
            current_pets, past_pets, reason, contact_method, created_at)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?)""",
        (
            d.get("pet_name"), d.get("full_name"), d.get("email"), d.get("phone"),
            d.get("address"), d.get("occupation"), d.get("house_type"),
            d.get("current_pets"), d.get("past_pets"), d.get("reason"),
            d.get("contact_method"), datetime.utcnow().isoformat(),
        ),
    )
    conn.commit()
    conn.close()
    return jsonify({"success": True}), 201


@app.get("/api/applications")
@login_required
def get_applications():
    conn = get_db()
    rows = conn.execute("SELECT * FROM applications ORDER BY created_at DESC").fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])


@app.delete("/api/applications/<int:app_id>")
@login_required
def delete_application(app_id):
    conn = get_db()
    conn.execute("DELETE FROM applications WHERE id = ?", (app_id,))
    conn.commit()
    conn.close()
    return jsonify({"success": True})


# --------------------------------------------------------------------------
# Contact messages — public create (from contact.html), admin read/delete
# --------------------------------------------------------------------------
@app.post("/api/messages")
def submit_message():
    d = request.get_json(force=True) or {}
    conn = get_db()
    conn.execute(
        "INSERT INTO messages (name, email, subject, message, created_at) VALUES (?,?,?,?,?)",
        (d.get("name"), d.get("email"), d.get("subject"), d.get("message"), datetime.utcnow().isoformat()),
    )
    conn.commit()
    conn.close()
    return jsonify({"success": True}), 201


@app.get("/api/messages")
@login_required
def get_messages():
    conn = get_db()
    rows = conn.execute("SELECT * FROM messages ORDER BY created_at DESC").fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])


@app.delete("/api/messages/<int:msg_id>")
@login_required
def delete_message(msg_id):
    conn = get_db()
    conn.execute("DELETE FROM messages WHERE id = ?", (msg_id,))
    conn.commit()
    conn.close()
    return jsonify({"success": True})


# --------------------------------------------------------------------------
# Serve your existing static frontend (index.html, pets.html, css/, js/, etc.)
# from this same Flask app, so there's no separate server or CORS to deal with.
# --------------------------------------------------------------------------
@app.route("/")
def serve_index():
    return send_from_directory(BASE_DIR, "index.html")


@app.route("/<path:path>")
def serve_static(path):
    # Guard rail: never let this route hand out backend source code or the
    # database file, even if someone requests them directly by URL.
    blocked_suffixes = (".py", ".db", ".db-journal", ".sqlite", ".sqlite3")
    if path.lower().endswith(blocked_suffixes) or path in ("requirements.txt",):
        return jsonify({"error": "Not found"}), 404
    return send_from_directory(BASE_DIR, path)


if __name__ == "__main__":
    init_db()
    app.run(debug=True, port=5000)
