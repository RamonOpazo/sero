/**
 * Content and message utilities for the application
 * Contains easter eggs, loading messages, and other text content
 */

/**
 * Collection of witty easter egg phrases for empty states and loading messages
 */
const EASTER_EGG_PHRASES: readonly string[] = [
  "There is no place like ████████…",
  "It's not a bug. It's an undocumented redaction…",
  "You shall not pass… this security boundary…",
  "sudo hide the evidence…",
  "Welcome, agent. This message will self-destruct…",
  "Compiling plausible deniability…",
  "01101100 01101111 01101100 — nothing to see here…",
  "The classified is a lie…",
  "Fetching metadata from /dev/null…",
  "All your docs are belong to us…",
  "Encryption complete. Trust no one…",
  "Shredding digital paper trail…",
  "Loading classified assets from █████…",
  "Initializing quantum obfuscation…",
  "Warning: This message never existed…",
  "Access granted. Welcome to the █████…",
  "Deploying smoke and mirrors…",
  "Running security through obscurity…",
  "Preparing files for the memory hole…",
  "Executing plausible deniability protocol…"
] as const

/**
 * Returns a random easter egg phrase
 * 
 * @returns A random witty phrase with redaction theme
 * 
 * @example
 * const subtitle = getRandomEasterEgg() // "sudo hide the evidence…"
 */
export function getRandomEasterEgg(): string {
  const randomIndex = Math.floor(Math.random() * EASTER_EGG_PHRASES.length)
  return EASTER_EGG_PHRASES[randomIndex]
}

/**
 * Returns a specific easter egg phrase by index (useful for testing)
 * 
 * @param index - The index of the phrase to return
 * @returns The easter egg phrase at the specified index
 * @throws Error if index is out of range
 */
export function getEasterEggByIndex(index: number): string {
  if (index < 0 || index >= EASTER_EGG_PHRASES.length) {
    throw new Error(`Easter egg index ${index} is out of range (0-${EASTER_EGG_PHRASES.length - 1})`)
  }
  return EASTER_EGG_PHRASES[index]
}

/**
 * Returns all available easter egg phrases
 * 
 * @returns Readonly array of all easter egg phrases
 */
export function getAllEasterEggs(): readonly string[] {
  return EASTER_EGG_PHRASES
}

/**
 * Returns the total number of available easter egg phrases
 * 
 * @returns The count of easter egg phrases
 */
export function getEasterEggCount(): number {
  return EASTER_EGG_PHRASES.length
}
