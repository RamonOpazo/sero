/**
 * Utility functions for common operations
 */

/**
 * Throttle function - limits how often a function can be executed
 * Ensures the function is called at most once every `delay` milliseconds
 * 
 * @param func - The function to throttle
 * @param delay - The minimum time interval between function calls (in milliseconds)
 * @returns The throttled function
 * 
 * @example
 * const throttledScroll = throttle(() => console.log('scrolled'), 1000)
 * // Will only log 'scrolled' at most once per second, no matter how fast you scroll
 */
export function throttle<T extends (...args: any[]) => void>(func: T, delay: number): T {
  let timeoutId: NodeJS.Timeout | null = null
  let lastExecTime = 0
  
  return ((...args: any[]) => {
    const currentTime = Date.now()
    
    if (currentTime - lastExecTime > delay) {
      // Execute immediately if enough time has passed
      func(...args)
      lastExecTime = currentTime
    } else {
      // Schedule execution for later if within throttle window
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
      timeoutId = setTimeout(() => {
        func(...args)
        lastExecTime = Date.now()
      }, delay - (currentTime - lastExecTime))
    }
  }) as T
}

/**
 * Debounce function - delays function execution until after a specified time has elapsed
 * since the last time it was invoked. Useful for search inputs, resize events, etc.
 * 
 * @param func - The function to debounce
 * @param delay - The delay in milliseconds
 * @returns The debounced function
 * 
 * @example
 * const debouncedSearch = debounce((query) => searchAPI(query), 300)
 * // Will only call searchAPI 300ms after the user stops typing
 */
export function debounce<T extends (...args: any[]) => void>(func: T, delay: number): T {
  let timeoutId: NodeJS.Timeout | null = null
  
  return ((...args: any[]) => {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
    timeoutId = setTimeout(() => func(...args), delay)
  }) as T
}

/**
 * Creates a function that can only be called once
 * Subsequent calls return the result of the first call
 * 
 * @param func - The function to make callable only once
 * @returns The once-only function
 * 
 * @example
 * const initialize = once(() => console.log('Initialized'))
 * initialize() // logs 'Initialized'
 * initialize() // does nothing
 */
export function once<T extends (...args: any[]) => any>(func: T): T {
  let called = false
  let result: ReturnType<T>
  
  return ((...args: any[]) => {
    if (!called) {
      called = true
      result = func(...args)
    }
    return result
  }) as T
}

/**
 * Delays execution for a specified number of milliseconds
 * Useful for creating pauses in async functions
 * 
 * @param ms - Number of milliseconds to delay
 * @returns Promise that resolves after the delay
 * 
 * @example
 * await delay(1000) // Wait 1 second
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Clamps a number between a minimum and maximum value
 * 
 * @param value - The number to clamp
 * @param min - The minimum value
 * @param max - The maximum value
 * @returns The clamped value
 * 
 * @example
 * clamp(15, 0, 10) // returns 10
 * clamp(-5, 0, 10) // returns 0
 * clamp(5, 0, 10) // returns 5
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/**
 * Formats a number as a percentage
 * 
 * @param value - The decimal value (0-1)
 * @param decimals - Number of decimal places (default: 0)
 * @returns Formatted percentage string
 * 
 * @example
 * formatPercentage(0.1234) // "12%"
 * formatPercentage(0.1234, 1) // "12.3%"
 */
export function formatPercentage(value: number, decimals: number = 0): string {
  return `${(value * 100).toFixed(decimals)}%`
}
