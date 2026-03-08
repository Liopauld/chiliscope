/**
 * Client-side Profanity Filter
 * ============================
 * Lightweight profanity detection for real-time feedback in the UI.
 * The backend has the authoritative filter; this is a courtesy pre-check
 * so users get instant warnings before submitting.
 */

// ── Word lists (English + Filipino / Tagalog) ──
const BAD_WORDS: string[] = [
  // English
  'fuck','fucker','fucking','fucked','motherfucker','motherfucking',
  'shit','shitty','bullshit','dipshit','shithead',
  'asshole','dumbass','jackass',
  'bitch','bitches','bitchy','sonofabitch',
  'damn','goddamn','goddamnit',
  'dick','dickhead',
  'cock','cocksucker',
  'cunt','cunts',
  'bastard','bastards',
  'whore','whores',
  'slut','sluts',
  'piss','pissed',
  'retard','retarded',
  'stfu','gtfo','wtf',
  'nigger','nigga',
  'faggot','fag',
  'douche','douchebag',
  'porn','porno',
  'rape','rapist',
  // Filipino / Tagalog
  'putangina','putang ina','puta','putang',
  'tangina','tang ina','tanginamo',
  'gago','gaga','gagu',
  'tanga','tangang',
  'bobo','boba','bobong',
  'tarantado','tarantada',
  'ulol','ulul',
  'inutil',
  'leche','letseng',
  'pakyu','pakshet','paksheet',
  'punyeta','punyetang',
  'kupal',
  'hindot','hindutan',
  'kantot','kantutan',
  'ungas','unggas',
  'kingina','keng ina',
  'ampota','amputa',
  'potangina',
  'jakol','jakulero',
  'gunggong',
  'walanghiya','walang hiya',
  'siraulo','sira ulo',
  'pokpok',
]

// Leet-speak normalization
const LEET_MAP: Record<string, string> = {
  '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's',
  '7': 't', '8': 'b', '9': 'g', '@': 'a', '$': 's',
  '!': 'i', '+': 't',
}

function normalize(text: string): string {
  let t = text.toLowerCase()
  for (const [k, v] of Object.entries(LEET_MAP)) {
    t = t.split(k).join(v)
  }
  // Collapse repeated chars (e.g. "fuuuck" → "fuck")
  t = t.replace(/(.)\1{2,}/g, '$1')
  return t
}

// Build regex patterns (sorted longest first for greedy matching)
const patterns: { regex: RegExp; word: string }[] = BAD_WORDS
  .sort((a, b) => b.length - a.length)
  .map((word) => {
    // Allow optional separators between chars
    const spaced = word.split('').map(ch => ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('[\\s\\-_.*]*')
    return { regex: new RegExp(`\\b${spaced}\\b`, 'gi'), word }
  })

export interface ProfanityCheckResult {
  isClean: boolean
  flaggedWords: string[]
  censoredText: string
}

/**
 * Check text for profanity.
 * Returns whether the text is clean, which words were flagged, and a censored version.
 */
export function checkProfanity(text: string): ProfanityCheckResult {
  if (!text || !text.trim()) {
    return { isClean: true, flaggedWords: [], censoredText: text }
  }

  const normalized = normalize(text)
  const flagged: string[] = []
  let censored = text

  for (const { regex, word } of patterns) {
    if (regex.test(normalized)) {
      if (!flagged.includes(word)) flagged.push(word)
      // Replace in original text
      censored = censored.replace(new RegExp(regex.source, 'gi'), (match) => '*'.repeat(match.length))
    }
    // Reset regex lastIndex
    regex.lastIndex = 0
  }

  return {
    isClean: flagged.length === 0,
    flaggedWords: flagged,
    censoredText: censored,
  }
}

/**
 * Quick boolean check — useful for disabling submit buttons.
 */
export function containsProfanity(text: string): boolean {
  return !checkProfanity(text).isClean
}

/**
 * Extract the profanity warning message for a backend error response.
 * Returns a user-friendly message if the error is a profanity rejection, or null otherwise.
 */
export function extractProfanityError(err: unknown): string | null {
  if (!err || typeof err !== 'object') return null
  const resp = (err as { response?: { data?: { detail?: { type?: string; message?: string } | string } } }).response
  const detail = resp?.data?.detail
  if (typeof detail === 'object' && detail !== null && 'type' in detail && detail.type === 'profanity_detected') {
    return (detail as { message: string }).message
  }
  return null
}
