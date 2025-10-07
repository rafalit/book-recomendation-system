# Zapytania dla książek - używane w wyszukiwaniu książek
UNI_BOOK_QUERIES = {
    "Akademia Górniczo-Hutnicza": [
        "mining engineering", "geology", "geophysics",
        "metallurgy", "materials science", "energy science",
        "renewable energy", "nuclear engineering",
        "computer science", "automation engineering",
        "nanotechnology", "environmental engineering",
    ],
    "Akademia Ignatianum": [
        "philosophy", "ethics", "psychology", "education science",
        "theology", "sociology", "cultural studies",
    ],
    "Akademia Muzyczna im. Krzysztofa Pendereckiego": [
        "music theory", "composition", "conducting",
        "instrumental performance", "vocal studies",
        "music education", "musicology",
    ],
    "Akademia Sztuk Pięknych im. Jana Matejki": [
        "fine arts", "painting", "sculpture",
        "graphic design", "architecture and design",
        "art history", "visual arts",
    ],
    "Akademia Sztuk Teatralnych im. Stanisława Wyspiańskiego": [
        "theatre studies", "acting", "directing",
        "drama studies", "stage design",
    ],
    "Akademia Wychowania Fizycznego im. Bronisława Czecha": [
        "physical education", "sports science",
        "physiotherapy", "biomechanics",
        "exercise physiology", "rehabilitation science",
    ],
    "Krakowska Akademia im. Andrzeja Frycza Modrzewskiego": [
        "law", "administration", "international relations",
        "management", "security studies",
        "public health", "pedagogy",
    ],
    "Politechnika Krakowska": [
        "architecture", "civil engineering", "mechanical engineering",
        "electrical engineering", "transport engineering",
        "materials engineering", "urban planning",
    ],
    "Uniwersytet Ekonomiczny": [
        "economics", "finance", "management",
        "accounting", "business", "marketing",
        "economic policy", "statistics",
    ],
    "Uniwersytet Jagielloński": [
        "law", "medicine", "pharmacy",
        "biology", "chemistry", "physics",
        "psychology", "history", "philosophy",
        "literature", "political science", "international law",
    ],
    "Uniwersytet Rolniczy im. Hugona Kołłątaja": [
        "agriculture", "horticulture", "forestry",
        "veterinary science", "food technology",
        "biotechnology", "animal science",
        "environmental protection", "soil science",
    ],
    "Uniwersytet Komisji Edukacji Narodowej": [
        "pedagogy", "education science", "psychology",
        "philology", "history of education",
        "special education", "early childhood education",
    ],
    "Uniwersytet Papieski Jana Pawła II": [
        "theology", "canon law", "philosophy of religion",
        "church history", "ethics",
    ],
    "Wyższa Szkoła Bezpieczeństwa Publicznego i Indywidualnego Apeiron": [
        "security studies", "public safety", "criminology",
        "internal security", "cybersecurity",
        "emergency management", "counter-terrorism",
    ],
    "Wyższa Szkoła Europejska im. ks. Józefa Tischnera": [
        "international relations", "cultural studies",
        "media studies", "management",
        "applied linguistics", "digital economy",
    ],
    "Wyższa Szkoła Zarządzania i Bankowości": [
        "management", "finance", "banking",
        "accounting", "business administration",
        "entrepreneurship", "applied economics",
    ],
}

# Zapytania dla newsów - wyłącznie o książkach powiązanych ze specyfiką uczelni
UNI_NEWS_QUERIES = {
    "Akademia Górniczo-Hutnicza": [
        "AGH książka", "AGH książki", "AGH biblioteka",
        "książka górnictwo", "książka informatyka", "książka technologia",
        "książka inżynieria", "książka matematyka", "książka fizyka",
        "targi książek Kraków", "wystawy książek Kraków", "nowości książkowe Kraków"
    ],
    "Akademia Ignatianum": [
        "Ignatianum książka", "Ignatianum książki", "Ignatianum biblioteka",
        "książka filozofia", "książka psychologia", "książka teologia",
        "książka edukacja", "książka kultura", "książka humanistyka",
        "targi książek Kraków", "wystawy książek Kraków", "nowości książkowe Kraków"
    ],
    "Akademia Muzyczna im. Krzysztofa Pendereckiego": [
        "Akademia Muzyczna książka", "Akademia Muzyczna książki", "Akademia Muzyczna biblioteka",
        "książka muzyka", "książka kompozycja", "książka dyrygentura",
        "książka muzykologia", "książka teoria muzyki", "książka jazz",
        "targi książek Kraków", "wystawy książek Kraków", "nowości książkowe Kraków"
    ],
    "Akademia Sztuk Pięknych im. Jana Matejki": [
        "ASP książka", "ASP książki", "ASP biblioteka",
        "książka sztuka", "książka malarstwo", "książka rzeźba",
        "książka grafika", "książka architektura", "książka historia sztuki",
        "targi książek Kraków", "wystawy książek Kraków", "nowości książkowe Kraków"
    ],
    "Akademia Sztuk Teatralnych im. Stanisława Wyspiańskiego": [
        "Akademia Teatralna książka", "Akademia Teatralna książki", "Akademia Teatralna biblioteka",
        "książka teatr", "książka aktorstwo", "książka reżyseria",
        "książka dramat", "książka dramaturgia", "książka historia teatru",
        "targi książek Kraków", "wystawy książek Kraków", "nowości książkowe Kraków"
    ],
    "Akademia Wychowania Fizycznego im. Bronisława Czecha": [
        "AWF książka", "AWF książki", "AWF biblioteka",
        "książka sport", "książka odżywianie", "książka fitness",
        "książka rehabilitacja", "książka medycyna sportowa", "książka trening",
        "targi książek Kraków", "wystawy książek Kraków", "nowości książkowe Kraków"
    ],
    "Krakowska Akademia im. Andrzeja Frycza Modrzewskiego": [
        "Krakowska Akademia książka", "Krakowska Akademia książki", "Krakowska Akademia biblioteka",
        "książka prawo", "książka administracja", "książka zarządzanie",
        "książka bezpieczeństwo", "książka pedagogika", "książka stosunki międzynarodowe",
        "targi książek Kraków", "wystawy książek Kraków", "nowości książkowe Kraków"
    ],
    "Politechnika Krakowska": [
        "Politechnika Krakowska książka", "Politechnika Krakowska książki", "Politechnika Krakowska biblioteka",
        "książka architektura", "książka budownictwo", "książka mechanika",
        "książka elektrotechnika", "książka inżynieria", "książka matematyka",
        "targi książek Kraków", "wystawy książek Kraków", "nowości książkowe Kraków"
    ],
    "Uniwersytet Ekonomiczny": [
        "UEK książka", "UEK książki", "UEK biblioteka",
        "książka ekonomia", "książka finanse", "książka zarządzanie",
        "książka marketing", "książka biznes", "książka przedsiębiorczość",
        "targi książek Kraków", "wystawy książek Kraków", "nowości książkowe Kraków"
    ],
    "Uniwersytet Jagielloński": [
        "UJ książka", "UJ książki", "UJ biblioteka",
        "książka medycyna", "książka prawo", "książka farmacja",
        "książka biologia", "książka chemia", "książka fizyka",
        "targi książek Kraków", "wystawy książek Kraków", "nowości książkowe Kraków"
    ],
    "Uniwersytet Komisji Edukacji Narodowej": [
        "UKEN książka", "UKEN książki", "UKEN biblioteka",
        "książka pedagogika", "książka edukacja", "książka psychologia",
        "książka filologia", "książka dydaktyka", "książka nauczanie",
        "targi książek Kraków", "wystawy książek Kraków", "nowości książkowe Kraków"
    ],
    "Uniwersytet Papieski Jana Pawła II": [
        "UPJPII książka", "UPJPII książki", "UPJPII biblioteka",
        "książka teologia", "książka prawo kanoniczne", "książka filozofia religii",
        "książka historia kościoła", "książka etyka", "książka religia",
        "targi książek Kraków", "wystawy książek Kraków", "nowości książkowe Kraków"
    ],
    "Wyższa Szkoła Bezpieczeństwa Publicznego i Indywidualnego Apeiron": [
        "Apeiron książka", "Apeiron książki", "Apeiron biblioteka",
        "książka bezpieczeństwo", "książka kryminologia", "książka cyberbezpieczeństwo",
        "książka obrona", "książka policja", "książka ratownictwo",
        "targi książek Kraków", "wystawy książek Kraków", "nowości książkowe Kraków"
    ],
    "Wyższa Szkoła Europejska im. ks. Józefa Tischnera": [
        "WSE książka", "WSE książki", "WSE biblioteka",
        "książka stosunki międzynarodowe", "książka kultura", "książka media",
        "książka zarządzanie", "książka turystyka", "książka komunikacja",
        "targi książek Kraków", "wystawy książek Kraków", "nowości książkowe Kraków"
    ],
    "Wyższa Szkoła Zarządzania i Bankowości": [
        "WSZiB książka", "WSZiB książki", "WSZiB biblioteka",
        "książka zarządzanie", "książka finanse", "książka bankowość",
        "książka marketing", "książka biznes", "książka przedsiębiorczość",
        "targi książek Kraków", "wystawy książek Kraków", "nowości książkowe Kraków"
    ],
    "Wyższa Szkoła Ekonomii i Informatyki": [
        "WSEI książka", "WSEI książki", "WSEI biblioteka",
        "książka ekonomia", "książka informatyka", "książka programowanie",
        "książka finanse", "książka zarządzanie", "książka marketing",
        "targi książek Kraków", "wystawy książek Kraków", "nowości książkowe Kraków"
    ],
    "Uniwersytet Rolniczy im. Hugona Kołłątaja": [
        "UR książka", "UR książki", "UR biblioteka",
        "książka rolnictwo", "książka ogrodnictwo", "książka leśnictwo",
        "książka weterynaria", "książka biotechnologia", "książka ochrona środowiska",
        "targi książek Kraków", "wystawy książek Kraków", "nowości książkowe Kraków"
    ],
}
