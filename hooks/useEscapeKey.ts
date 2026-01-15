import { useEffect } from 'react';

/**
 * Custom hook to handle ESC key press for closing modals
 * @param callback - Function to call when ESC is pressed
 */
export const useEscapeKey = (callback: () => void) => {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        callback();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [callback]);
};
