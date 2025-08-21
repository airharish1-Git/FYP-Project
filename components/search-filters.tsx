"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Search, MapPin, Filter, X } from "lucide-react";

interface SearchFiltersProps {
  onFiltersChange: (filters: any) => void;
}

export function SearchFilters({ onFiltersChange }: SearchFiltersProps) {
  const [priceRange, setPriceRange] = useState([0, 5000]);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [city, setCity] = useState("");
  const [propertyType, setPropertyType] = useState("");

  const amenities = [
    "WiFi",
    "AC",
    "Kitchen",
    "Parking",
    "Laundry",
    "Gym",
    "Pool",
    "Security",
  ];

  const toggleAmenity = (amenity: string) => {
    const newAmenities = selectedAmenities.includes(amenity)
      ? selectedAmenities.filter((a) => a !== amenity)
      : [...selectedAmenities, amenity];
    setSelectedAmenities(newAmenities);
    updateFilters({ amenities: newAmenities });
  };

  const updateFilters = (newFilters: any) => {
    const filters = {
      city: city || undefined,
      propertyType: propertyType || undefined,
      minPrice: priceRange[0] > 0 ? priceRange[0] : undefined,
      maxPrice: priceRange[1] < 5000 ? priceRange[1] : undefined,
      amenities: selectedAmenities.length > 0 ? selectedAmenities : undefined,
      ...newFilters,
    };
    onFiltersChange(filters);
  };

  const handleSearch = () => {
    updateFilters({});
  };

  const clearFilters = () => {
    setCity("");
    setPropertyType("");
    setPriceRange([0, 5000]);
    setSelectedAmenities([]);
    onFiltersChange({});
  };

  return (
    <div className="bg-background shadow-sm border-b border-border sticky top-16 z-40">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* Main Search Bar */}
        <div className="flex flex-col lg:flex-row gap-4 items-center">
          <div className="flex-1 flex gap-2">
            <div className="relative flex-1">
              <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Where are you looking?"
                className="pl-10 bg-background text-foreground border-border"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>
            <Select value={propertyType} onValueChange={setPropertyType}>
              <SelectTrigger className="w-40 bg-background text-foreground border-border">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="private_room">Private Room</SelectItem>
                <SelectItem value="shared_room">Shared Room</SelectItem>
                <SelectItem value="hostel_bed">Hostel Bed</SelectItem>
                <SelectItem value="studio">Studio</SelectItem>
                <SelectItem value="apartment">Apartment</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 border-border"
            >
              <Filter className="h-4 w-4" />
              Filters
              {(selectedAmenities.length > 0 ||
                priceRange[0] > 0 ||
                priceRange[1] < 5000) && (
                <Badge variant="secondary" className="ml-1 border-border">
                  {selectedAmenities.length +
                    (priceRange[0] > 0 || priceRange[1] < 5000 ? 1 : 0)}
                </Badge>
              )}
            </Button>
            <Button className="flex items-center gap-2" onClick={handleSearch}>
              <Search className="h-4 w-4" />
              Search
            </Button>
            {(city ||
              propertyType ||
              selectedAmenities.length > 0 ||
              priceRange[0] > 0 ||
              priceRange[1] < 5000) && (
              <Button
                variant="outline"
                onClick={clearFilters}
                className="border-border"
              >
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="mt-4 p-4 bg-muted rounded-lg border border-border">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Price Range */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Price Range: ${priceRange[0]} - ${priceRange[1]}
                </label>
                <Slider
                  value={priceRange}
                  onValueChange={(value) => {
                    setPriceRange(value);
                    updateFilters({ minPrice: value[0], maxPrice: value[1] });
                  }}
                  max={5000}
                  step={50}
                  className="w-full"
                />
              </div>

              {/* Availability */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Availability
                </label>
                <Select>
                  <SelectTrigger className="bg-background text-foreground border-border">
                    <SelectValue placeholder="Select availability" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Available Now</SelectItem>
                    <SelectItem value="soon">Available Soon</SelectItem>
                    <SelectItem value="flexible">Flexible</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Amenities */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-foreground mb-2">
                Amenities
              </label>
              <div className="flex flex-wrap gap-2">
                {amenities.map((amenity) => (
                  <Badge
                    key={amenity}
                    variant={
                      selectedAmenities.includes(amenity)
                        ? "default"
                        : "outline"
                    }
                    className={`cursor-pointer border-border ${
                      selectedAmenities.includes(amenity)
                        ? "bg-primary text-primary-foreground"
                        : "bg-background text-foreground hover:bg-muted/50"
                    }`}
                    onClick={() => toggleAmenity(amenity)}
                  >
                    {amenity}
                    {selectedAmenities.includes(amenity) && (
                      <X className="ml-1 h-3 w-3" />
                    )}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
