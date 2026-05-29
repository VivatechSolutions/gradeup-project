import { useState } from "react";

/**
 * Custom hook that persists state to sessionStorage
 * Automatically restores state on page refresh within the same session
 * Clears when browser tab is closed
 */
export function useSessionState<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((val: T) => T)) => void, () => void] {
  // State to store our value
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      // Check if sessionStorage is available
      if (typeof window === "undefined") {
        return initialValue;
      }

      const item = window.sessionStorage.getItem(key);
      if (item) {
        return JSON.parse(item);
      }
      return initialValue;
    } catch (error) {
      console.warn(`useSessionState: Failed to read '${key}' from sessionStorage`, error);
      return initialValue;
    }
  });

  // Update sessionStorage when state changes
  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.warn(`useSessionState: Failed to write '${key}' to sessionStorage`, error);
    }
  };

  // Function to clear the stored value
  const clearValue = () => {
    try {
      setStoredValue(initialValue);
      if (typeof window !== "undefined") {
        window.sessionStorage.removeItem(key);
      }
    } catch (error) {
      console.warn(`useSessionState: Failed to clear '${key}' from sessionStorage`, error);
    }
  };

  return [storedValue, setValue, clearValue];
}
