"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { PropertyService } from "@/lib/services/property-service";

interface FavoritesContextType {
  favoritesCount: number;
  refreshFavorites: () => Promise<void>;
}

const FavoritesContext = createContext<FavoritesContextType>({
  favoritesCount: 0,
  refreshFavorites: async () => {},
});

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const [favoritesCount, setFavoritesCount] = useState(0);
  const { user } = useAuth();
  const propertyService = new PropertyService();

  const refreshFavorites = async () => {
    if (!user) {
      setFavoritesCount(0);
      return;
    }

    try {
      const favorites = await propertyService.getUserFavorites(user.id);
      setFavoritesCount(favorites.length);
    } catch (error) {
      console.error("Error fetching favorites count:", error);
    }
  };

  useEffect(() => {
    refreshFavorites();
  }, [user]);

  return (
    <FavoritesContext.Provider value={{ favoritesCount, refreshFavorites }}>
      {children}
    </FavoritesContext.Provider>
  );
}

export const useFavorites = () => useContext(FavoritesContext);
