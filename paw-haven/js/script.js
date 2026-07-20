/* =========================================================================
   PAW HAVEN — script.js
   Shared vanilla JS for every page: pet data, rendering, filtering,
   search, sorting, favorites, dark mode, forms, modals, nav, animations.
   ========================================================================= */


/* -------------------------------------------------------------------------
   1. PET DATA
   Pets now live in the SQLite database via the Flask API (see app.py).
   PETS starts empty and is populated by fetchPets() before any page
   tries to render pet cards. Every render/init function below already
   expects a plain array here, so nothing downstream needs to change.
   ------------------------------------------------------------------------- */
const API_BASE = ""; // same-origin (Flask serves both the API and these static files)
let PETS = [];

/** Convert a row shape from the Flask/SQLite API into the shape the UI expects. */
function mapApiPet(p) {
  return {
    id: p.id,
    name: p.name,
    species: p.species,
    breed: p.breed,
    ageYears: p.age_years,
    ageLabel: p.age_label,
    gender: p.gender,
    weight: p.weight,
    vaccinated: !!p.vaccinated,
    fee: p.fee,
    location: p.location,
    goodWithKids: !!p.good_with_kids,
    goodWithPets: !!p.good_with_pets,
    personality: p.personality ? p.personality.split(",").map((s) => s.trim()).filter(Boolean) : [],
    medicalHistory: p.medical_history,
    description: p.description,
    // The DB stores one image per pet; repeat it so the existing gallery/thumbnail
    // UI (built for 3 images) still works. Swap in real multi-image support later
    // by adding an `images` table if you want a true gallery per pet.
    images: p.image
      ? [p.image, p.image, p.image]
      : [`https://picsum.photos/seed/${p.id}/700/520`],
  };
}

/** Fetch all pets from the backend and populate the shared PETS array. */
async function fetchPets() {
  try {
    const res = await fetch(`${API_BASE}/api/pets`);
    if (!res.ok) throw new Error(`Request failed: ${res.status}`);
    const data = await res.json();
    PETS = data.map(mapApiPet);
  } catch (err) {
    console.error("Could not load pets from the server:", err);
    PETS = [];
  }
}


/* -------------------------------------------------------------------------
   2. UTILITIES
   ------------------------------------------------------------------------- */

/** Get favorites (array of pet ids) from Local Storage. */
function getFavorites() {
  return JSON.parse(localStorage.getItem("pawhaven_favorites") || "[]");
}

/** Save favorites array to Local Storage. */
function saveFavorites(favs) {
  localStorage.setItem("pawhaven_favorites", JSON.stringify(favs));
}

/** Toggle a pet id in/out of favorites and return the new state (true = favorited). */
function toggleFavorite(id) {
  let favs = getFavorites();
  const isFav = favs.includes(id);
  favs = isFav ? favs.filter((f) => f !== id) : [...favs, id];
  saveFavorites(favs);
  return !isFav;
}

/** Track recently viewed pets (max 4, most recent first). */
function addRecentlyViewed(id) {
  let recent = JSON.parse(localStorage.getItem("pawhaven_recent") || "[]");
  recent = recent.filter((r) => r !== id);
  recent.unshift(id);
  recent = recent.slice(0, 4);
  localStorage.setItem("pawhaven_recent", JSON.stringify(recent));
}

/** Simple query-string reader, e.g. getQueryParam("id"). */
function getQueryParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

/* -------------------------------------------------------------------------
   3. PET CARD RENDERING
   Shared markup builder so Home, Pets, and Details pages render
   visually identical cards.
   ------------------------------------------------------------------------- */
function createPetCard(pet) {
  const favs = getFavorites();
  const isFav = favs.includes(pet.id);

  const card = document.createElement("article");
  card.className = "pet-card reveal";
  card.setAttribute("data-species", pet.species);
  card.setAttribute("data-age", pet.ageYears);
  card.setAttribute("data-gender", pet.gender);
  card.setAttribute("data-vaccinated", pet.vaccinated);
  card.setAttribute("data-fee", pet.fee);
  card.setAttribute("data-name", pet.name);

  card.innerHTML = `
    <div class="pet-card__image-wrap">
      <img src="${pet.images[0]}" alt="Photo of ${pet.name}, a ${pet.breed}" loading="lazy" class="pet-card__image" />
      ${pet.vaccinated ? '<span class="badge badge--vaccinated">✔ Vaccinated</span>' : ""}
      <button class="favorite-btn ${isFav ? "is-active" : ""}" data-id="${pet.id}" aria-pressed="${isFav}" aria-label="Save ${pet.name} to favorites">
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <path d="M12 21s-6.7-4.35-9.3-8.1C1 10.2 1.7 6.9 4.6 5.4c2.3-1.2 4.7-.4 6 1.4l1.4 1.9 1.4-1.9c1.3-1.8 3.7-2.6 6-1.4 2.9 1.5 3.6 4.8 1.9 7.5C18.7 16.65 12 21 12 21z"/>
        </svg>
      </button>
    </div>
    <div class="pet-card__body">
      <div class="pet-card__title-row">
        <h3 class="pet-card__name">${pet.name}</h3>
        <span class="pet-card__fee">₦${pet.fee}</span>
      </div>
      <p class="pet-card__breed">${pet.breed}</p>
      <ul class="pet-card__meta">
        <li>${pet.ageLabel}</li>
        <li>${pet.gender}</li>
        <li>${pet.species}</li>
      </ul>
      <a class="btn btn--outline btn--block" href="pet-details.html?id=${pet.id}">View Details</a>
    </div>
  `;
  return card;
}

/** Render a list of pets into a container element by id. */
function renderPetGrid(containerId, pets) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = "";
  if (pets.length === 0) {
    container.innerHTML = `<p class="empty-state">No pets match your search just yet. Try adjusting your filters.</p>`;
    return;
  }
  pets.forEach((pet) => container.appendChild(createPetCard(pet)));
  bindFavoriteButtons(container);
  observeReveal();
}

/** Attach click handlers to all favorite (heart) buttons inside a container. */
function bindFavoriteButtons(scope = document) {
  scope.querySelectorAll(".favorite-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const id = btn.getAttribute("data-id");
      const nowFav = toggleFavorite(id);
      btn.classList.toggle("is-active", nowFav);
      btn.setAttribute("aria-pressed", nowFav);
    });
  });
}

/* -------------------------------------------------------------------------
   4. FEATURED PETS (Home page)
   ------------------------------------------------------------------------- */
function initFeaturedPets() {
  const featured = PETS.slice(0, 6);
  renderPetGrid("featured-pets-grid", featured);
}

/* -------------------------------------------------------------------------
   5. PETS PAGE — search, filter, sort
   ------------------------------------------------------------------------- */
function initPetsPage() {
  const grid = document.getElementById("pets-grid");
  if (!grid) return;

  const searchInput = document.getElementById("pet-search");
  const categoryFilter = document.getElementById("filter-category");
  const ageFilter = document.getElementById("filter-age");
  const genderFilter = document.getElementById("filter-gender");
  const vaccinatedFilter = document.getElementById("filter-vaccinated");
  const sortSelect = document.getElementById("sort-select");
  const resultsCount = document.getElementById("results-count");

  function applyFilters() {
    let results = [...PETS];
    const term = searchInput.value.trim().toLowerCase();

    if (term) {
      results = results.filter(
        (p) =>
          p.name.toLowerCase().includes(term) ||
          p.breed.toLowerCase().includes(term) ||
          p.species.toLowerCase().includes(term)
      );
    }
    if (categoryFilter.value !== "all") {
      results = results.filter((p) => p.species === categoryFilter.value);
    }
    if (ageFilter.value !== "all") {
      results = results.filter((p) => {
        if (ageFilter.value === "baby") return p.ageYears < 1;
        if (ageFilter.value === "young") return p.ageYears >= 1 && p.ageYears < 2;
        if (ageFilter.value === "adult") return p.ageYears >= 2 && p.ageYears < 5;
        if (ageFilter.value === "senior") return p.ageYears >= 5;
        return true;
      });
    }
    if (genderFilter.value !== "all") {
      results = results.filter((p) => p.gender === genderFilter.value);
    }
    if (vaccinatedFilter.value !== "all") {
      const wantVaccinated = vaccinatedFilter.value === "yes";
      results = results.filter((p) => p.vaccinated === wantVaccinated);
    }

    switch (sortSelect.value) {
      case "name-asc":
        results.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "age-asc":
        results.sort((a, b) => a.ageYears - b.ageYears);
        break;
      case "fee-asc":
        results.sort((a, b) => a.fee - b.fee);
        break;
      case "fee-desc":
        results.sort((a, b) => b.fee - a.fee);
        break;
      default:
        break;
    }

    renderPetGrid("pets-grid", results);
    if (resultsCount) {
      resultsCount.textContent = `${results.length} pet${results.length === 1 ? "" : "s"} found`;
    }
  }

  [searchInput, categoryFilter, ageFilter, genderFilter, vaccinatedFilter, sortSelect].forEach((el) => {
    if (!el) return;
    el.addEventListener("input", applyFilters);
    el.addEventListener("change", applyFilters);
  });

  // Support ?category= and ?search= links coming from the homepage.
  const presetCategory = getQueryParam("category");
  if (presetCategory && categoryFilter) {
    categoryFilter.value = presetCategory;
  }
  const presetSearch = getQueryParam("search");
  if (presetSearch && searchInput) {
    searchInput.value = presetSearch;
  }

  applyFilters();
}

/* -------------------------------------------------------------------------
   6. PET DETAILS PAGE
   ------------------------------------------------------------------------- */
function initPetDetailsPage() {
  const wrap = document.getElementById("pet-details");
  if (!wrap) return;

  const id = getQueryParam("id");
  const pet = PETS.find((p) => p.id === id) || PETS[0];
  addRecentlyViewed(pet.id);

  document.title = `${pet.name} | Paw Haven`;

  document.getElementById("detail-main-image").src = pet.images[0];
  document.getElementById("detail-main-image").alt = `Photo of ${pet.name}`;
  document.getElementById("detail-name").textContent = pet.name;
  document.getElementById("detail-breed").textContent = pet.breed;
  document.getElementById("detail-fee").textContent = `₦${pet.fee}`;
  document.getElementById("detail-age").textContent = pet.ageLabel;
  document.getElementById("detail-gender").textContent = pet.gender;
  document.getElementById("detail-weight").textContent = pet.weight;
  document.getElementById("detail-vaccinated").textContent = pet.vaccinated ? "Vaccinated ✔" : "Not yet vaccinated";
  document.getElementById("detail-location").textContent = pet.location;
  document.getElementById("detail-medical").textContent = pet.medicalHistory;
  document.getElementById("detail-description").textContent = pet.description;
  document.getElementById("detail-kids").textContent = pet.goodWithKids ? "Yes" : "Needs an adult-only home";
  document.getElementById("detail-pets").textContent = pet.goodWithPets ? "Yes" : "Prefers to be the only pet";

  const traitsList = document.getElementById("detail-traits");
  traitsList.innerHTML = pet.personality.map((t) => `<li>${t}</li>`).join("");

  const thumbRow = document.getElementById("detail-thumbnails");
  thumbRow.innerHTML = pet.images
    .map(
      (src, i) =>
        `<button class="thumb ${i === 0 ? "is-active" : ""}" data-src="${src}" aria-label="Show photo ${i + 1} of ${pet.name}">
          <img src="${src}" alt="" loading="lazy" />
        </button>`
    )
    .join("");

  thumbRow.querySelectorAll(".thumb").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.getElementById("detail-main-image").src = btn.getAttribute("data-src");
      thumbRow.querySelectorAll(".thumb").forEach((b) => b.classList.remove("is-active"));
      btn.classList.add("is-active");
    });
  });

  const adoptBtn = document.getElementById("detail-adopt-btn");
  if (adoptBtn) adoptBtn.href = `adopt.html?id=${pet.id}&name=${encodeURIComponent(pet.name)}`;

  const favBtn = document.getElementById("detail-favorite-btn");
  if (favBtn) {
    const isFav = getFavorites().includes(pet.id);
    favBtn.classList.toggle("is-active", isFav);
    favBtn.setAttribute("aria-pressed", isFav);
    favBtn.addEventListener("click", () => {
      const nowFav = toggleFavorite(pet.id);
      favBtn.classList.toggle("is-active", nowFav);
      favBtn.setAttribute("aria-pressed", nowFav);
    });
  }

  const related = PETS.filter((p) => p.species === pet.species && p.id !== pet.id).slice(0, 3);
  renderPetGrid("related-pets-grid", related.length ? related : PETS.filter((p) => p.id !== pet.id).slice(0, 3));
}

/* -------------------------------------------------------------------------
   7. ADOPTION FORM (adopt.html)
   ------------------------------------------------------------------------- */
function initAdoptForm() {
  const form = document.getElementById("adoption-form");
  if (!form) return;

  // Pre-fill the pet name if arriving from a Pet Details page.
  const petName = getQueryParam("name");
  const petField = document.getElementById("adopt-pet-name");
  if (petName && petField) petField.value = decodeURIComponent(petName);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    let isValid = true;

    form.querySelectorAll("[data-required]").forEach((field) => {
      // Radio groups: only validate once per group (on the first required radio found).
      if (field.type === "radio") {
        const groupName = field.name;
        if (field.dataset.groupChecked) return; // already validated this group
        const group = form.querySelectorAll(`input[name="${groupName}"]`);
        const fieldValid = Array.from(group).some((r) => r.checked);
        group.forEach((r) => (r.dataset.groupChecked = "true"));
        const errorEl = field.closest(".form-group").querySelector(".field-error");
        if (errorEl) errorEl.style.display = fieldValid ? "none" : "block";
        if (!fieldValid) isValid = false;
        return;
      }

      const errorEl = field.parentElement.querySelector(".field-error") || field.closest(".form-group")?.querySelector(".field-error");
      let fieldValid = field.value.trim() !== "";

      if (field.type === "email" && fieldValid) {
        fieldValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(field.value.trim());
      }
      if (field.type === "tel" && fieldValid) {
        fieldValid = /^[0-9+\-\s()]{7,}$/.test(field.value.trim());
      }
      if (field.type === "checkbox") {
        fieldValid = field.checked;
      }

      field.classList.toggle("is-invalid", !fieldValid);
      if (errorEl) errorEl.style.display = fieldValid ? "none" : "block";
      if (!fieldValid) isValid = false;
    });

    // Reset the one-time group-checked markers for next submission attempt.
    form.querySelectorAll("input[type='radio']").forEach((r) => delete r.dataset.groupChecked);

    if (!isValid) {
      const firstInvalid = form.querySelector(".is-invalid");
      if (firstInvalid) firstInvalid.focus();
      return;
    }

    const submitBtn = form.querySelector("button[type='submit']");
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = "Submitting..."; }

    try {
      const res = await fetch(`${API_BASE}/api/applications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pet_name: petField ? petField.value : "",
          full_name: document.getElementById("full-name").value,
          email: document.getElementById("email").value,
          phone: document.getElementById("phone").value,
          address: document.getElementById("address").value,
          occupation: document.getElementById("occupation").value,
          house_type: document.getElementById("house-type").value,
          current_pets: form.querySelector("input[name='current-pets']:checked")?.value || "",
          past_pets: form.querySelector("input[name='past-pets']:checked")?.value || "",
          reason: document.getElementById("reason").value,
          contact_method: document.getElementById("contact-method").value,
        }),
      });
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);

      openModal("success-modal");
      form.reset();
      if (petName && petField) petField.value = decodeURIComponent(petName);
    } catch (err) {
      console.error("Could not submit application:", err);
      alert("Sorry, something went wrong submitting your application. Please try again.");
    } finally {
      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = "Submit Application"; }
    }
  });
}

/* -------------------------------------------------------------------------
   8. MODAL HELPERS
   ------------------------------------------------------------------------- */
function openModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.classList.add("is-open");
  document.body.classList.add("modal-open");
}
function closeModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.classList.remove("is-open");
  document.body.classList.remove("modal-open");
}
function initModals() {
  document.querySelectorAll("[data-close-modal]").forEach((btn) => {
    btn.addEventListener("click", () => closeModal(btn.getAttribute("data-close-modal")));
  });
  document.querySelectorAll(".modal").forEach((modal) => {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeModal(modal.id);
    });
  });
}

/* -------------------------------------------------------------------------
   9. NEWSLETTER FORM VALIDATION (footer, all pages)
   ------------------------------------------------------------------------- */
function initNewsletterForm() {
  document.querySelectorAll(".newsletter-form").forEach((form) => {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const input = form.querySelector("input[type='email']");
      const message = form.querySelector(".newsletter-message");
      const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value.trim());
      if (!message) return;
      message.textContent = valid ? "Thanks for subscribing! 🐾" : "Please enter a valid email address.";
      message.style.color = valid ? "var(--success)" : "#e74c3c";
      if (valid) form.reset();
    });
  });
}

/* -------------------------------------------------------------------------
   10. CONTACT FORM (contact.html)
   ------------------------------------------------------------------------- */
function initContactForm() {
  const form = document.getElementById("contact-form");
  if (!form) return;
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    let isValid = true;
    form.querySelectorAll("[data-required]").forEach((field) => {
      const fieldValid = field.value.trim() !== "";
      field.classList.toggle("is-invalid", !fieldValid);
      if (!fieldValid) isValid = false;
    });
    if (!isValid) return;

    const submitBtn = form.querySelector("button[type='submit']");
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = "Sending..."; }

    try {
      const res = await fetch(`${API_BASE}/api/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: document.getElementById("contact-name").value,
          email: document.getElementById("contact-email").value,
          subject: document.getElementById("contact-subject").value,
          message: document.getElementById("contact-message").value,
        }),
      });
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);

      openModal("contact-success-modal");
      form.reset();
    } catch (err) {
      console.error("Could not send message:", err);
      alert("Sorry, something went wrong sending your message. Please try again.");
    } finally {
      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = "Send Message"; }
    }
  });
}

/* -------------------------------------------------------------------------
   11. FAQ ACCORDION (contact.html)
   ------------------------------------------------------------------------- */
function initFaqAccordion() {
  document.querySelectorAll(".faq-item").forEach((item) => {
    const question = item.querySelector(".faq-question");
    question.addEventListener("click", () => {
      const isOpen = item.classList.contains("is-open");
      document.querySelectorAll(".faq-item").forEach((i) => i.classList.remove("is-open"));
      if (!isOpen) item.classList.add("is-open");
    });
  });
}

/* -------------------------------------------------------------------------
   12. NAVIGATION — sticky shadow, mobile hamburger, smooth scroll
   ------------------------------------------------------------------------- */
function initNavigation() {
  const header = document.querySelector(".site-header");
  const toggle = document.querySelector(".nav-toggle");
  const menu = document.querySelector(".nav-menu");

  window.addEventListener("scroll", () => {
    if (header) header.classList.toggle("is-scrolled", window.scrollY > 12);
    toggleBackToTop();
  });

  if (toggle && menu) {
    toggle.addEventListener("click", () => {
      const isOpen = menu.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", isOpen);
      toggle.classList.toggle("is-active", isOpen);
    });
    menu.querySelectorAll("a").forEach((link) =>
      link.addEventListener("click", () => {
        menu.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", false);
        toggle.classList.remove("is-active");
      })
    );
  }

  // Smooth scroll for in-page anchors.
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", (e) => {
      const targetId = anchor.getAttribute("href");
      if (targetId.length < 2) return;
      const target = document.querySelector(targetId);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  });

  // Highlight current page link.
  const current = window.location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".nav-menu a").forEach((link) => {
    if (link.getAttribute("href") === current) link.classList.add("is-current");
  });
}

/* -------------------------------------------------------------------------
   13. BACK TO TOP BUTTON
   ------------------------------------------------------------------------- */
function toggleBackToTop() {
  const btn = document.getElementById("back-to-top");
  if (!btn) return;
  btn.classList.toggle("is-visible", window.scrollY > 400);
}
function initBackToTop() {
  const btn = document.getElementById("back-to-top");
  if (!btn) return;
  btn.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
}

/* -------------------------------------------------------------------------
   14. DARK MODE TOGGLE
   ------------------------------------------------------------------------- */
function initDarkMode() {
  const toggle = document.getElementById("dark-mode-toggle");
  const saved = localStorage.getItem("pawhaven_theme");
  if (saved === "dark") document.documentElement.setAttribute("data-theme", "dark");

  if (!toggle) return;
  toggle.setAttribute("aria-pressed", saved === "dark");
  toggle.addEventListener("click", () => {
    const isDark = document.documentElement.getAttribute("data-theme") === "dark";
    document.documentElement.setAttribute("data-theme", isDark ? "light" : "dark");
    localStorage.setItem("pawhaven_theme", isDark ? "light" : "dark");
    toggle.setAttribute("aria-pressed", !isDark);
  });
}

/* -------------------------------------------------------------------------
   15. SCROLL REVEAL ANIMATIONS
   ------------------------------------------------------------------------- */
function observeReveal() {
  const items = document.querySelectorAll(".reveal:not(.is-visible)");
  if (!("IntersectionObserver" in window)) {
    items.forEach((i) => i.classList.add("is-visible"));
    return;
  }
  const observer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          obs.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );
  items.forEach((item) => observer.observe(item));
}

/* -------------------------------------------------------------------------
   16. ANIMATED COUNTERS (Home page stats)
   ------------------------------------------------------------------------- */
function initCounters() {
  const counters = document.querySelectorAll("[data-count-to]");
  if (!counters.length) return;

  const animate = (el) => {
    const target = parseInt(el.getAttribute("data-count-to"), 10);
    // Suffix can be set explicitly via data-suffix="+", or is auto-detected
    // from whatever non-numeric characters already trail the element's text
    // (e.g. a <strong> that starts as "150+" in the markup).
    const suffix = el.hasAttribute("data-suffix")
      ? el.getAttribute("data-suffix")
      : (el.textContent.match(/[^\d,]+$/) || [""])[0];
    const duration = 1400;
    const start = performance.now();
    function step(now) {
      const progress = Math.min((now - start) / duration, 1);
      el.textContent = Math.floor(progress * target).toLocaleString() + suffix;
      if (progress < 1) requestAnimationFrame(step);
      else el.textContent = target.toLocaleString() + suffix;
    }
    requestAnimationFrame(step);
  };

  if (!("IntersectionObserver" in window)) {
    counters.forEach(animate);
    return;
  }
  const observer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          animate(entry.target);
          obs.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.4 }
  );
  counters.forEach((c) => observer.observe(c));
}

/* -------------------------------------------------------------------------
   17. LOADING SPINNER / SKELETONS
   Fades out the page loader once content is ready.
   ------------------------------------------------------------------------- */
function initLoader() {
  const loader = document.getElementById("page-loader");
  if (!loader) return;
  window.addEventListener("load", () => {
    setTimeout(() => loader.classList.add("is-hidden"), 300);
  });
}

/* -------------------------------------------------------------------------
   18. RECENTLY VIEWED (Home page + Pets page widget)
   ------------------------------------------------------------------------- */
function initRecentlyViewed() {
  const section = document.getElementById("recently-viewed");
  if (!section) return;
  const ids = JSON.parse(localStorage.getItem("pawhaven_recent") || "[]");
  const pets = ids.map((id) => PETS.find((p) => p.id === id)).filter(Boolean);
  if (!pets.length) {
    section.style.display = "none";
    return;
  }
  renderPetGrid("recently-viewed-grid", pets);
}

/* -------------------------------------------------------------------------
   19. INIT — runs on every page load
   ------------------------------------------------------------------------- */
document.addEventListener("DOMContentLoaded", async () => {
  initLoader();
  initNavigation();
  initDarkMode();
  initBackToTop();
  initModals();
  initNewsletterForm();
  initFaqAccordion();
  initContactForm();
  initCounters();

  // Pets now come from the backend — wait for them before rendering
  // anything that depends on the PETS array.
  await fetchPets();

  initFeaturedPets();
  initPetsPage();
  initPetDetailsPage();
  initAdoptForm();
  initRecentlyViewed();

  observeReveal();
});
