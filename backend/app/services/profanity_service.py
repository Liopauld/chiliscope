"""
Profanity Filter Service
========================

Server-side profanity detection and censorship for forum posts, comments,
chat messages, and other user-generated content.

Features:
- Comprehensive English + Filipino/Tagalog profanity word list
- Leet-speak normalization (e.g. "f*ck", "sh1t", "b!tch")
- Partial-word matching with word-boundary awareness
- Adjustable: can censor (replace with ***) or reject entirely
- Thread-safe singleton
"""

import re
from typing import NamedTuple

__all__ = ["profanity_filter", "ProfanityResult"]


class ProfanityResult(NamedTuple):
    is_clean: bool
    flagged_words: list[str]
    censored_text: str


# ── Word lists ──────────────────────────────────────────────────────────────

# English profanity (common + variations)
_ENGLISH_WORDS: set[str] = {
    # Core profanity
    "fuck", "fucker", "fucking", "fucked", "fucks", "motherfucker", "motherfucking",
    "shit", "shitty", "shitting", "bullshit", "horseshit", "dipshit", "shithead",
    "ass", "asshole", "asses", "dumbass", "jackass", "fatass", "smartass", "badass",
    "bitch", "bitches", "bitchy", "bitching", "sonofabitch",
    "damn", "damned", "damnit", "goddamn", "goddamnit",
    "hell", "helll",
    "dick", "dicks", "dickhead", "dickface",
    "cock", "cocks", "cocksucker", "cocksucking",
    "cunt", "cunts",
    "bastard", "bastards",
    "whore", "whores", "whorish",
    "slut", "sluts", "slutty",
    "piss", "pissed", "pissing", "pissoff",
    "crap", "crappy",
    "retard", "retarded", "retards",
    "idiot", "idiots", "idiotic",
    "stupid", "stupids",
    "moron", "moronic", "morons",
    "stfu", "gtfo", "lmfao",
    "wtf", "wth",
    "nigger", "nigga", "niggas",
    "faggot", "fag", "fags", "faggots",
    "dyke", "dykes",
    "tranny", "trannies",
    "spic", "spics",
    "chink", "chinks",
    "kike", "kikes",
    "wetback", "wetbacks",
    "beaner", "beaners",
    "twat", "twats",
    "wanker", "wankers", "wank",
    "bollocks",
    "arse", "arsehole",
    "bloody",
    "bugger",
    "tosser",
    "bellend",
    "prick", "pricks",
    "douche", "douchebag", "douchebags",
    "scumbag", "scumbags",
    "porn", "porno", "pornography",
    "sex", "sexy",
    "nude", "nudes", "nudity",
    "penis", "vagina", "boobs", "tits", "titties",
    "dildo", "dildos",
    "orgasm", "orgasms",
    "masturbate", "masturbation", "fap",
    "blowjob", "handjob",
    "anal",
    "rape", "raping", "rapist",
    "molest", "molestation",
    "pedophile", "paedophile",
    "kill", "killing",
    "murder", "murders",
    "suicide",
    "terrorist", "terrorism",
    "nazi", "nazis",
    "genocide",
}

# Filipino / Tagalog profanity
_FILIPINO_WORDS: set[str] = {
    "putangina", "putang ina", "putangina mo", "puta", "putang",
    "tangina", "tang ina", "tanginamo",
    "gago", "gaga", "gagu",
    "tanga", "tangahan", "tangang",
    "bobo", "boba", "bobong", "bobita",
    "tarantado", "tarantada",
    "ulol", "olol", "ulul",
    "inutil",
    "lintik", "lintikan",
    "leche", "lechegas", "letseng",
    "pakyu", "pak yu", "pakshet", "paksheet",
    "shet", "shet",
    "bwisit", "bwiset",
    "punyeta", "punyetang",
    "kupal",
    "hindot", "hindutan",
    "kantot", "kantutan", "kinantot",
    "tite", "titi",
    "puke", "puki", "pepe",
    "bayag", "betlog",
    "hayop", "hayop ka",
    "peste",
    "bruha", "bruho",
    "engot",
    "gunggong",
    "salot",
    "walanghiya", "walang hiya",
    "siraulo", "sira ulo",
    "ungas", "unggas",
    "hampas lupa", "hampaslupa",
    "hudas",
    "demonyo",
    "supot",
    "bakla",  # used as slur
    "bading",  # used as slur
    "pokpok",
    "malandi",
    "kabit",
    "kingina", "keng ina",
    "ampota", "amputa",
    "potangina",
    "suso",
    "jakol", "jakulero",
    "torpe",
}

# Build the combined set (all lowercase)
_ALL_BAD_WORDS: set[str] = {w.lower() for w in (_ENGLISH_WORDS | _FILIPINO_WORDS)}

# ── Leet-speak normalization ────────────────────────────────────────────────

_LEET_MAP: dict[str, str] = {
    "0": "o", "1": "i", "3": "e", "4": "a", "5": "s",
    "7": "t", "8": "b", "9": "g", "@": "a", "$": "s",
    "!": "i", "+": "t", "(": "c", "|": "l",
}

_LEET_RE = re.compile("|".join(re.escape(k) for k in _LEET_MAP))


def _normalize(text: str) -> str:
    """Lowercase + strip leet-speak substitutions."""
    t = text.lower()
    t = _LEET_RE.sub(lambda m: _LEET_MAP[m.group()], t)
    # Collapse repeated chars  (e.g. "fuuuuck" → "fuck")
    t = re.sub(r'(.)\1{2,}', r'\1', t)
    return t


# ── Pre-compiled regex patterns ─────────────────────────────────────────────

def _build_patterns() -> list[tuple[re.Pattern[str], str]]:
    """Build a list of (compiled_regex, canonical_word) for matching."""
    patterns: list[tuple[re.Pattern[str], str]] = []
    for word in sorted(_ALL_BAD_WORDS, key=len, reverse=True):
        # Allow optional separators between characters (handles "f u c k", "f-u-c-k", etc.)
        spaced = r"[\s\-_.*]*".join(re.escape(ch) for ch in word)
        pattern = re.compile(r"\b" + spaced + r"\b", re.IGNORECASE)
        patterns.append((pattern, word))
    return patterns


_PATTERNS = _build_patterns()


# ── Core filter class ───────────────────────────────────────────────────────

class ProfanityFilter:
    """Singleton profanity filter with detect / censor / validate methods."""

    _instance: "ProfanityFilter | None" = None

    def __new__(cls) -> "ProfanityFilter":
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    # -- Public API -----------------------------------------------------------

    def check(self, text: str) -> ProfanityResult:
        """
        Analyze *text* for profanity.

        Returns a ProfanityResult with:
        - is_clean: True if no profanity detected
        - flagged_words: list of bad words found (lowercased canonical forms)
        - censored_text: text with bad words replaced by asterisks
        """
        if not text or not text.strip():
            return ProfanityResult(is_clean=True, flagged_words=[], censored_text=text)

        normalized = _normalize(text)
        flagged: list[str] = []
        censored = text  # operate on original text for replacement

        for pattern, canonical in _PATTERNS:
            # Search in normalized text for detection
            if pattern.search(normalized):
                if canonical not in flagged:
                    flagged.append(canonical)
                # Replace in original text (case-insensitive)
                censored = re.sub(
                    pattern.pattern.replace(r"\b", r"\b"),
                    lambda m: "*" * len(m.group()),
                    censored,
                    flags=re.IGNORECASE,
                )

        return ProfanityResult(
            is_clean=len(flagged) == 0,
            flagged_words=flagged,
            censored_text=censored,
        )

    def is_clean(self, text: str) -> bool:
        """Quick boolean check — True if no profanity found."""
        return self.check(text).is_clean

    def censor(self, text: str) -> str:
        """Return censored version of text (bad words → asterisks)."""
        return self.check(text).censored_text

    def validate_or_raise(self, text: str, field_name: str = "content") -> str:
        """
        Check text and raise HTTPException 400 if profanity is detected.
        Returns the original text if clean.
        """
        result = self.check(text)
        if not result.is_clean:
            from fastapi import HTTPException
            raise HTTPException(
                status_code=400,
                detail={
                    "message": f"Your {field_name} contains inappropriate language. Please revise and try again.",
                    "field": field_name,
                    "flagged_words": result.flagged_words,
                    "type": "profanity_detected",
                },
            )
        return text


# Module-level singleton
profanity_filter = ProfanityFilter()
