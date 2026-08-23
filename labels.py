"""
Class label mapping for the Arabic Sign Language Alphabet model.

This order was reconstructed by sorting the actual Kaggle dataset folder
names alphabetically (exactly how Keras' ImageDataGenerator.flow_from_directory
assigns class_indices), then mapping each folder to its Arabic letter using
the dataset's official paper (Al-Barham et al., 2023, arXiv:2301.11932).

Folder order confirmed directly against the Kaggle dataset listing:
muhammadalbrham/rgb-arabic-alphabets-sign-language-dataset

DO NOT reorder this list -- the index position IS the model's output index.
"""

# index -> (folder_name, arabic_letter, display_name_en)
CLASS_LABELS = [
    {"index": 0,  "folder": "Ain",         "arabic": "ع",  "name_en": "Ain"},
    {"index": 1,  "folder": "Al",          "arabic": "ال", "name_en": "Al"},
    {"index": 2,  "folder": "Alef",        "arabic": "أ",  "name_en": "Alef"},
    {"index": 3,  "folder": "Beh",         "arabic": "ب",  "name_en": "Beh"},
    {"index": 4,  "folder": "Dad",         "arabic": "ض",  "name_en": "Dad"},
    {"index": 5,  "folder": "Dal",         "arabic": "د",  "name_en": "Dal"},
    {"index": 6,  "folder": "Feh",         "arabic": "ف",  "name_en": "Feh"},
    {"index": 7,  "folder": "Ghain",       "arabic": "غ",  "name_en": "Ghain"},
    {"index": 8,  "folder": "Hah",         "arabic": "ح",  "name_en": "Hah"},
    {"index": 9,  "folder": "Heh",         "arabic": "ه",  "name_en": "Heh"},
    {"index": 10, "folder": "Jeem",        "arabic": "ج",  "name_en": "Jeem"},
    {"index": 11, "folder": "Kaf",         "arabic": "ك",  "name_en": "Kaf"},
    {"index": 12, "folder": "Khah",        "arabic": "خ",  "name_en": "Khah"},
    {"index": 13, "folder": "Laa",         "arabic": "لا", "name_en": "Laa"},
    {"index": 14, "folder": "Lam",         "arabic": "ل",  "name_en": "Lam"},
    {"index": 15, "folder": "Meem",        "arabic": "م",  "name_en": "Meem"},
    {"index": 16, "folder": "Noon",        "arabic": "ن",  "name_en": "Noon"},
    {"index": 17, "folder": "Qaf",         "arabic": "ق",  "name_en": "Qaf"},
    {"index": 18, "folder": "Reh",         "arabic": "ر",  "name_en": "Reh"},
    {"index": 19, "folder": "Sad",         "arabic": "ص",  "name_en": "Sad"},
    {"index": 20, "folder": "Seen",        "arabic": "س",  "name_en": "Seen"},
    {"index": 21, "folder": "Sheen",       "arabic": "ش",  "name_en": "Sheen"},
    {"index": 22, "folder": "Tah",         "arabic": "ط",  "name_en": "Tah"},
    {"index": 23, "folder": "Teh",         "arabic": "ت",  "name_en": "Teh"},
    {"index": 24, "folder": "Teh_Marbuta", "arabic": "ة",  "name_en": "Teh Marbuta"},
    {"index": 25, "folder": "Thal",        "arabic": "ذ",  "name_en": "Thal"},
    {"index": 26, "folder": "Theh",        "arabic": "ث",  "name_en": "Theh"},
    {"index": 27, "folder": "Waw",         "arabic": "و",  "name_en": "Waw"},
    {"index": 28, "folder": "Yeh",         "arabic": "ي",  "name_en": "Yeh"},
    {"index": 29, "folder": "Zah",         "arabic": "ظ",  "name_en": "Zah"},
    {"index": 30, "folder": "Zain",        "arabic": "ز",  "name_en": "Zain"},
]

NUM_CLASSES = len(CLASS_LABELS)

INDEX_TO_ARABIC = {c["index"]: c["arabic"] for c in CLASS_LABELS}
INDEX_TO_NAME_EN = {c["index"]: c["name_en"] for c in CLASS_LABELS}

assert NUM_CLASSES == 31
assert sorted(c["folder"] for c in CLASS_LABELS) == [c["folder"] for c in CLASS_LABELS], \
    "Folder list must stay alphabetically sorted -- this IS the class_indices order."
