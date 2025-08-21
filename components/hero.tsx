"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Search, MapPin } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function Hero() {
  const [isVisible, setIsVisible] = useState(false);
  const [location, setLocation] = useState("");
  const [propertyType, setPropertyType] = useState("");
  const router = useRouter();

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const handleSearch = () => {
    const searchParams = new URLSearchParams();
    if (location) searchParams.set("location", location);
    if (propertyType) searchParams.set("type", propertyType);
    router.push(`/search?${searchParams.toString()}`);
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Video/Image */}
      <div className="absolute inset-0 z-0">
        <div
          className="w-full h-full bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.7)), url('/images/hero-bg.jpg')`,
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 text-center text-white px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        <div
          className={`transition-all duration-1000 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
          }`}
        >
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
            Find Your Perfect Room or Hostel –{" "}
            <span className="text-blue-400">Fast, Easy, Transparent</span>
          </h1>

          <p className="text-xl sm:text-2xl mb-8 text-gray-200 max-w-2xl mx-auto">
            Real-time availability, virtual tours, direct chat with providers
          </p>
        </div>

        {/* Quick Search Bar */}
        <div
          className={`mt-12 bg-white/95 backdrop-blur-md rounded-2xl p-6 shadow-2xl transition-all duration-1000 delay-500 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
          }`}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-2 text-gray-700">
              <MapPin className="h-5 w-5 text-blue-600" />
              <input
                type="text"
                placeholder="Where are you going?"
                className="w-full bg-transparent border-none outline-none text-gray-900 placeholder-gray-500"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
            <Select value={propertyType} onValueChange={setPropertyType}>
              <SelectTrigger className="w-full bg-transparent border-none text-gray-900">
                <SelectValue placeholder="Room Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="private_room">Private Room</SelectItem>
                <SelectItem value="shared_room">Shared Room</SelectItem>
                <SelectItem value="hostel_bed">Hostel Bed</SelectItem>
                <SelectItem value="studio">Studio</SelectItem>
                <SelectItem value="apartment">Apartment</SelectItem>
              </SelectContent>
            </Select>
            <Button
              className="w-full bg-blue-600 hover:bg-blue-700"
              onClick={handleSearch}
            >
              <Search className="mr-2 h-4 w-4" />
              Search
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
