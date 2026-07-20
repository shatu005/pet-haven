"""
Paw Haven — Seed Data
======================
Loads the original 14 demo pets (the same ones from js/script.js) into
pawhaven.db, so your admin dashboard and pets page aren't empty on first run.

Run once, after app.py has created the database:
    python seed_data.py

Safe to re-run — it clears the pets table first, so it won't create duplicates.
"""

import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "pawhaven.db")

PETS = [
    ("p01", "Buddy", "Dog", "Golden Retriever", 2, "2 years", "Male", "28 kg", 150, 1,
     "Abuja Shelter, FCT", "Buddy is a sunshine-on-four-legs kind of dog. He loves long walks, belly rubs, and greeting everyone like they're his best friend.",
     "https://picsum.photos/seed/p01a/700/520", "Playful,Affectionate,Loyal", 1, 1,
     "Neutered. Up to date on all core vaccinations. No known health issues."),
    ("p02", "Luna", "Dog", "Siberian Husky", 1, "1 year", "Female", "20 kg", 180, 1,
     "Lagos Rescue Center", "Luna is a bright-eyed adventurer who needs a family ready for daily runs and mental puzzles.",
     "https://picsum.photos/seed/p02a/700/520", "Energetic,Independent,Smart", 1, 0,
     "Spayed. Vaccinated. Mild seasonal allergies, managed with diet."),
    ("p03", "Milo", "Cat", "Domestic Shorthair", 3, "3 years", "Male", "4.5 kg", 80, 1,
     "Abuja Shelter, FCT", "Milo spends his mornings sunbathing and his evenings curled up on laps.",
     "https://picsum.photos/seed/p03a/700/520", "Calm,Curious,Cuddly", 1, 1,
     "Neutered. Fully vaccinated. Dental check-up completed, all clear."),
    ("p04", "Bella", "Cat", "Persian", 2, "2 years", "Female", "4 kg", 120, 1,
     "Port Harcourt Adoption Hub", "Bella is the definition of grace — a quiet companion who loves a soft cushion.",
     "https://picsum.photos/seed/p04a/700/520", "Gentle,Quiet,Elegant", 1, 1,
     "Spayed. Vaccinated. Requires regular grooming for her long coat."),
    ("p05", "Coco", "Rabbit", "Holland Lop", 1, "1 year", "Female", "1.6 kg", 60, 1,
     "Abuja Shelter, FCT", "Coco is a little bundle of soft fur who loves fresh herbs and quiet corners.",
     "https://picsum.photos/seed/p05a/700/520", "Shy,Sweet,Gentle", 1, 0,
     "Vaccinated against RHD and myxomatosis. Litter-trained."),
    ("p06", "Peanut", "Rabbit", "Netherland Dwarf", 0.7, "8 months", "Male", "0.9 kg", 50, 0,
     "Lagos Rescue Center", "Peanut is small in size but big in personality.",
     "https://picsum.photos/seed/p06a/700/520", "Energetic,Curious,Tiny but mighty", 1, 0,
     "Not yet vaccinated — first shots scheduled with new owner's vet. Healthy weight."),
    ("p07", "Sunny", "Bird", "Cockatiel", 1, "1 year", "Male", "90 g", 70, 1,
     "Abuja Shelter, FCT", "Sunny greets every morning with a cheerful whistle.",
     "https://picsum.photos/seed/p07a/700/520", "Chatty,Cheerful,Musical", 1, 0,
     "Vaccinated and dewormed. Whistles happy tunes throughout the day."),
    ("p08", "Kiwi", "Bird", "Budgerigar", 0.5, "6 months", "Female", "35 g", 40, 1,
     "Port Harcourt Adoption Hub", "Kiwi is a tiny bundle of color who loves mirrors, bells, and chirping.",
     "https://picsum.photos/seed/p08a/700/520", "Playful,Social,Bright", 1, 0,
     "Vaccinated. Thriving on a varied seed and vegetable diet."),
    ("p09", "Rocky", "Dog", "Beagle", 4, "4 years", "Male", "12 kg", 130, 1,
     "Lagos Rescue Center", "Rocky follows his nose everywhere and his heart is just as big.",
     "https://picsum.photos/seed/p09a/700/520", "Friendly,Food-motivated,Gentle", 1, 1,
     "Neutered. Vaccinated. Slight weight management diet in progress."),
    ("p10", "Daisy", "Dog", "Labrador Mix", 3, "3 years", "Female", "24 kg", 140, 1,
     "Abuja Shelter, FCT", "Daisy is the ultimate family dog — patient with children, friendly with other pets.",
     "https://picsum.photos/seed/p10a/700/520", "Loving,Obedient,Patient", 1, 1,
     "Spayed. Fully vaccinated. Graduated from basic obedience training."),
    ("p11", "Shadow", "Cat", "Maine Coon", 2, "2 years", "Male", "6 kg", 150, 1,
     "Port Harcourt Adoption Hub", "Shadow is a gentle giant with a fluffy coat and a chirpy voice.",
     "https://picsum.photos/seed/p11a/700/520", "Majestic,Friendly,Vocal", 1, 1,
     "Neutered. Vaccinated. Large breed, in excellent health."),
    ("p12", "Willow", "Cat", "Tabby", 1, "1 year", "Female", "3.8 kg", 90, 1,
     "Lagos Rescue Center", "Willow is a spirited young cat who turns any piece of string into entertainment.",
     "https://picsum.photos/seed/p12a/700/520", "Playful,Curious,Sweet", 1, 1,
     "Spayed. Vaccinated. Loves interactive toys and window watching."),
    ("p13", "Thumper", "Rabbit", "Lionhead", 2, "2 years", "Male", "1.8 kg", 65, 1,
     "Abuja Shelter, FCT", "Thumper has a lion's mane and a lamb's heart.",
     "https://picsum.photos/seed/p13a/700/520", "Confident,Fluffy,Friendly", 1, 0,
     "Vaccinated against RHD and myxomatosis. Regular nail trims kept up."),
    ("p14", "Rio", "Bird", "Sun Conure", 3, "3 years", "Male", "120 g", 200, 1,
     "Lagos Rescue Center", "Rio is a burst of tropical color who bonds deeply with his person.",
     "https://picsum.photos/seed/p14a/700/520", "Vibrant,Loud,Affectionate", 0, 0,
     "Vaccinated and dewormed. Needs an experienced bird owner due to his loud calls."),
]

def seed():
    if not os.path.exists(DB_PATH):
        print("Database not found. Run `python app.py` once first to create it, then re-run this script.")
        return

    conn = sqlite3.connect(DB_PATH)
    conn.execute("DELETE FROM pets")  # clear existing rows so re-running doesn't duplicate
    conn.executemany(
        """INSERT INTO pets
           (id, name, species, breed, age_years, age_label, gender, weight, fee,
            vaccinated, location, description, image, personality,
            good_with_kids, good_with_pets, medical_history)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
        PETS,
    )
    conn.commit()
    conn.close()
    print(f"Seeded {len(PETS)} pets into {DB_PATH}")

if __name__ == "__main__":
    seed()
