import { useState, useEffect } from "react";

/**
 * Custom hook - Fast typing ko slow karta hai (debounce)
 *
 * Example: User search box me "pothole" type kar raha hai
 * Agar har letter pe API call karoge to 7 calls honge
 * Debounce se sirf last letter ke 300ms baad 1 call hoga - Performance badhegi!
 *
 * @param value - Raw value (jaise search input ka text)
 * @param delay - Kitna wait karna hai milliseconds me (default 300ms)
 * @returns Debounced value - jo delay ke baad update hoga
 */

export function useDebounce<T>(value: T, delay: number = 300): T {
  // Yeh debounced value hai - jo delay ke baad update hota hai
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Har baar jab value change hoga, ek timer set karo
    // Timer ke andar debouncedValue ko update karo

    const handler = setTimeout(() => {
      // Delay ke baad original value ko debouncedValue me daal do
      setDebouncedValue(value);
    }, delay);

    // Cleanup: Agar user jaldi jaldi type kar raha hai to purana timer cancel karo
    // Isse har letter pe API call nahi hoga, sirf last letter pe hoga
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]); // Jab value ya delay change ho to effect dubara chalao

  // Debounced value return karo - isko search filter me use karo
  return debouncedValue;
}

/**
 * Kaise use karna hai:
 *
 * const [search, setSearch] = useState("");
 * const debouncedSearch = useDebounce(search, 500); // 500ms wait
 *
 * useEffect(() => {
 * // API call yahan karo - sirf debouncedSearch change pe chalega
 * fetchIssues(debouncedSearch);
 * }, [debouncedSearch]);
 */