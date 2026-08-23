"""
Labels for the Yemeni Arabic Sign Language (ArYSL) words model.
32 classes — index matches label_map.json from training.
Arabic translations verified manually.
"""

WORD_LABELS = {
    0:  {"en": "Animals",       "ar": "حيوانات"},
    1:  {"en": "Attentive",     "ar": "منتبه"},
    2:  {"en": "Doctor",        "ar": "دكتور"},
    3:  {"en": "brother",       "ar": "أخ"},
    4:  {"en": "builder",       "ar": "بنّاء"},
    5:  {"en": "cheap",         "ar": "رخيص"},
    6:  {"en": "excellent",     "ar": "ممتاز"},
    7:  {"en": "friend",        "ar": "صديق"},
    8:  {"en": "good",          "ar": "جيد"},
    9:  {"en": "him",           "ar": "هو"},
    10: {"en": "how",           "ar": "كيف"},
    11: {"en": "husband",       "ar": "زوج"},
    12: {"en": "mechanic",      "ar": "ميكانيكي"},
    13: {"en": "morning",       "ar": "صباح"},
    14: {"en": "plane",         "ar": "طيارة"},
    15: {"en": "president",     "ar": "رئيس"},
    16: {"en": "satisfaction",  "ar": "رضا"},
    17: {"en": "school",        "ar": "مدرسة"},
    18: {"en": "seven",         "ar": "سبعة"},
    19: {"en": "six",           "ar": "ستة"},
    20: {"en": "teacher",       "ar": "معلم"},
    21: {"en": "translator",    "ar": "مترجم"},
    22: {"en": "vegetables",    "ar": "خضروات"},
    23: {"en": "very good",     "ar": "جيد جداً"},
    24: {"en": "wait",          "ar": "انتظر"},
    25: {"en": "wash",          "ar": "اغسل"},
    26: {"en": "watch maker",   "ar": "صانع ساعات"},
    27: {"en": "what",          "ar": "ماذا"},
    28: {"en": "when",          "ar": "متى"},
    29: {"en": "who",           "ar": "من"},
    30: {"en": "with_god_will", "ar": "بإذن الله"},
    31: {"en": "yours",         "ar": "لك"},
}

NUM_WORD_CLASSES = len(WORD_LABELS)

INDEX_TO_WORD_AR = {k: v["ar"] for k, v in WORD_LABELS.items()}
INDEX_TO_WORD_EN = {k: v["en"] for k, v in WORD_LABELS.items()}

assert NUM_WORD_CLASSES == 32
