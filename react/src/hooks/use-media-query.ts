import { useState, useEffect } from 'react';

/**
 * Custom hook for tracking the state of a media query.
 * @param query The media query string to watch.
 * @returns `true` if the media query matches, `false` otherwise.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    if (media.matches !== matches) {
      setMatches(media.matches);
    }
    const listener = () => {
      setMatches(media.matches);
    };
    
    // Support for both addEventListener and addListener for backwards compatibility
    if (media.addEventListener) {
        media.addEventListener('change', listener);
    } else {
        media.addListener(listener);
    }

    return () => {
        if (media.removeEventListener) {
            media.removeEventListener('change', listener);
        } else {
            media.removeListener(listener);
        }
    };
  }, [matches, query]);

  return matches;
}
