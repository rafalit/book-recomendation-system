#!/usr/bin/env python3
"""Test funkcji przypisywania kategorii"""

from app.services.events_import import _assign_category_from_title

# Test funkcji
test_titles = [
    'Kraków | Między teatrem a psychologią | warsztaty teatralne z Inką Dowlasz',
    'Kraków | Chwila na Malarstwo | Taniec Tuszu - japońska sztuka suibokuga',
    'Kraków | Artystyczne środy | Październik z tuszem',
    'Kraków | "Teatr Wyobraźni" - Warsztaty tworzenia słuchowisk radiowych',
    'Kraków | Agata Duda-Gracz oprowadza po Galerii Autorskiej Jerzego Dudy-Gracza',
    'Kraków | Wycieczka po Krakowie',
    'Kraków | Konferencja naukowa',
    'Kraków | Zwykłe wydarzenie'
]

print("Test przypisywania kategorii:")
for title in test_titles:
    category = _assign_category_from_title(title, 'bilety')
    print(f'{category}: {title[:60]}...')
