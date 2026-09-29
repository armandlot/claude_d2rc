#!/usr/bin/env python3
"""
Génère src/data/itemNames.ts : correspondance nom français -> nom anglais des
objets de Diablo II: Resurrected, à partir des fichiers de textes du jeu
(data/local/lng/strings[-legacy]/item-names.json et item-runes.json).

Usage : python3 scripts/build-item-names.py <dossier lng> > src/data/itemNames.ts
Le dossier <lng> contient les sous-dossiers strings/ et strings-legacy/.

Les fichiers de certains mods ajoutent des annotations (codes couleur « ÿcX »,
statistiques, étoiles) : elles sont retirées ici.
"""
import json
import re
import sys
import unicodedata

COLOR = re.compile(r"ÿc.")
GENDER = re.compile(r"^\[[a-z]{2}\]")


def clean(text):
    """Dernière ligne, sans balise de genre, sans annotations colorées."""
    if not text:
        return ""
    line = text.split("\n")[-1]
    line = GENDER.sub("", line)
    line = re.sub(r"^(ÿc.|\s|★)+", "", line)  # codes couleur et étoiles en tête
    line = line.split("ÿc")[0]  # annotations ajoutées après le nom
    line = COLOR.sub("", line).replace("★", "")
    return re.sub(r"\s+", " ", line).strip()


def load(path):
    with open(path, encoding="utf-8-sig") as f:
        return json.load(f)


def valid(name):
    return (
        bool(name)
        and len(name) <= 40
        and re.search(r"[A-Za-zÀ-ÿ]{2}", name) is not None  # au moins un mot (écarte « · » des mods)
        and not re.search(r"[%{}\[\]<>|•@/]", name)
    )


def main(lng):
    pairs = {}  # fr -> en

    def add(fr, en):
        if valid(fr) and valid(en):
            pairs.setdefault(fr, en)

    for folder in ("strings-legacy", "strings"):  # legacy d'abord : français non modifié par les mods
        for entry in load(f"{lng}/{folder}/item-names.json"):
            key = entry["Key"]
            if key.startswith(("Runeword", "Rune")):
                continue
            add(clean(entry.get("frFR")), clean(entry.get("enUS")))

    # Runes : « Rune Ber » / « Ber » -> « Ber Rune » (nom court rNNL).
    for folder in ("strings-legacy",):
        runes = {e["Key"]: e for e in load(f"{lng}/{folder}/item-runes.json")}
        for n in range(1, 34):
            short = runes.get(f"r{n:02d}L")
            full = runes.get(f"r{n:02d}")
            if not short:
                continue
            en = f"{clean(short['enUS'])} Rune"
            add(clean(full.get("frFR")) if full else "", en)
            add(f"Rune {clean(short.get('frFR') or short['enUS'])}", en)

    items = sorted(pairs.items(), key=lambda p: unicodedata.normalize("NFD", p[0]).lower())
    print("// Généré par scripts/build-item-names.py à partir des textes du jeu — ne pas modifier à la main.")
    print("// Correspondance nom français (en jeu) -> nom anglais (utilisé par Traderie).")
    print("export const ITEM_NAMES_FR_EN: [string, string][] = [")
    for fr, en in items:
        print(f"  [{json.dumps(fr, ensure_ascii=False)}, {json.dumps(en, ensure_ascii=False)}],")
    print("];")


if __name__ == "__main__":
    main(sys.argv[1])
