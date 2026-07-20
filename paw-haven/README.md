# 🐾 Paw Haven

A modern, responsive pet adoption website, now connected to a real backend:
**HTML5/CSS3/Vanilla JS frontend + Flask/SQLite backend + admin dashboard.**

## Run It

```bash
pip install -r requirements.txt
python app.py          # creates pawhaven.db automatically
python seed_data.py    # loads the original 14 demo pets (run once)
```

Open **http://127.0.0.1:5000** — Flask serves the whole site (frontend + API) from one origin, so there's no separate server or CORS setup needed.

## Folder Structure

```
paw-haven/
├── index.html            Home page
├── pets.html              Browse all pets — search, filter, sort
├── pet-details.html       Full profile for a single pet (?id=p01)
├── adopt.html              Adoption application → POSTs to /api/applications
├── about.html              Our story, mission, team, timeline
├── contact.html            Contact form → POSTs to /api/messages
├── admin.html               Admin dashboard (manage pets, view applicants & messages)
├── css/style.css
├── js/script.js             Fetches pets from /api/pets; all shared UI logic
├── app.py                   Flask backend + API
├── seed_data.py              One-time script to load demo pets into SQLite
├── requirements.txt
└── README.md
```

## How Frontend & Backend Are Connected

- **Pets** are fetched from `GET /api/pets` on every page load (`js/script.js` → `fetchPets()`), replacing the old hardcoded array.
- **Adoption applications** (`adopt.html`) are POSTed to `/api/applications`.
- **Contact messages** (`contact.html`) are POSTed to `/api/messages`.
- **`admin.html`** is a separate page that logs in against `/api/admin/login` (hardcoded password, see below) and can add/edit/delete pets and view/delete applications and messages — all live against the same database.
- **Favorites, dark mode, and recently-viewed** stay client-side in `localStorage` since they're per-visitor preferences, not shared data.

## Admin Access

Go to `/admin.html`. Password is set in `app.py`:

```python
ADMIN_PASSWORD = "PawHaven@Admin2026"   # change this before deploying anywhere public
SECRET_KEY = "change-this-to-a-random-string-before-deploying"
```

⚠️ This is a hardcoded password with no hashing, rate-limiting, or HTTPS enforcement — fine for local use or a trusted internal tool, not for a public production deployment without hardening.

## API Reference

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| GET | `/api/pets` | Public | List all pets |
| GET | `/api/pets/<id>` | Public | Get one pet |
| POST | `/api/pets` | Admin | Add a pet |
| PUT | `/api/pets/<id>` | Admin | Update a pet |
| DELETE | `/api/pets/<id>` | Admin | Remove a pet |
| POST | `/api/applications` | Public | Submit adoption application |
| GET | `/api/applications` | Admin | View all applicants |
| DELETE | `/api/applications/<id>` | Admin | Remove an application |
| POST | `/api/messages` | Public | Submit contact message |
| GET | `/api/messages` | Admin | View all messages |
| DELETE | `/api/messages/<id>` | Admin | Remove a message |
| POST | `/api/admin/login` | — | `{"password": "..."}` → sets session |
| POST | `/api/admin/logout` | — | Clears session |
| GET | `/api/admin/check` | — | `{"is_admin": true/false}` |

## Notes

- Each pet stores **one image** in the database (`image` field). The pet-details gallery still shows 3 thumbnails for layout consistency, but they currently repeat the same photo — extend the schema with a `pet_images` table if you want a true multi-photo gallery.
- The static-file route in `app.py` explicitly blocks serving `.py`, `.db`, and `requirements.txt` files directly, so backend source and the database can't be downloaded by URL.

