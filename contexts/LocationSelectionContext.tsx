import type { LocationSuggestion, OpenStreetMapResult } from '@julekgwa/react-native-places-autocomplete';
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

export type PendingLocationSuggestion = LocationSuggestion<OpenStreetMapResult> | null;

interface LocationSelectionContextType {
  pendingLocationSelection: PendingLocationSuggestion;
  setPendingLocationSelection: (suggestion: PendingLocationSuggestion) => void;
}

const LocationSelectionContext = createContext<LocationSelectionContextType | undefined>(undefined);

export function LocationSelectionProvider({ children }: { children: ReactNode }) {
  const [pendingLocationSelection, setPendingLocationSelection] = useState<PendingLocationSuggestion>(null);

  const setPending = useCallback((suggestion: PendingLocationSuggestion) => {
    setPendingLocationSelection(suggestion);
  }, []);

  return (
    <LocationSelectionContext.Provider
      value={{ pendingLocationSelection, setPendingLocationSelection: setPending }}
    >
      {children}
    </LocationSelectionContext.Provider>
  );
}

export function useLocationSelection() {
  const ctx = useContext(LocationSelectionContext);
  if (ctx === undefined) {
    throw new Error('useLocationSelection must be used within a LocationSelectionProvider');
  }
  return ctx;
}
