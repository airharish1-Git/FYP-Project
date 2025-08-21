"use client";

import { useEffect, useState } from "react";
import {
  Video,
  MessageCircle,
  Clock,
  Shield,
  Star,
  MapPin,
} from "lucide-react";

const features = [
  {
    icon: Video,
    title: "Virtual Tours",
    description:
      "Take immersive virtual tours of rooms and hostels before booking",
  },
  {
    icon: Clock,
    title: "Real-Time Availability",
    description: "See live availability updates without refreshing the page",
  },
  {
    icon: MessageCircle,
    title: "Direct Communication",
    description: "Chat or call providers directly through our secure platform",
  },
  {
    icon: Shield,
    title: "Verified Listings",
    description: "All properties are verified for authenticity and quality",
  },
  {
    icon: Star,
    title: "Trusted Reviews",
    description: "Read genuine reviews from previous guests",
  },
  {
    icon: MapPin,
    title: "Prime Locations",
    description: "Find accommodations in the best neighborhoods",
  },
];

export function Features() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    const element = document.getElementById("features");
    if (element) observer.observe(element);

    return () => observer.disconnect();
  }, []);

  return (
    <section id="features" className="py-20 bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Why Choose RoomFinder?
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            We make finding and booking accommodations simple, transparent, and
            secure
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className={`bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 ${
                isVisible
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-10"
              }`}
              style={{ transitionDelay: `${index * 100}ms` }}
            >
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mb-4">
                <feature.icon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                {feature.title}
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
