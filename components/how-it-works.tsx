"use client";

import { useEffect, useState } from "react";
import { Search, Eye, MessageSquare, CheckCircle } from "lucide-react";

const steps = [
  {
    icon: Search,
    title: "Search & Filter",
    description:
      "Use our advanced filters to find rooms that match your preferences",
  },
  {
    icon: Eye,
    title: "Virtual Tour",
    description:
      "Take a virtual tour or schedule a live video call with the provider",
  },
  {
    icon: MessageSquare,
    title: "Connect & Chat",
    description:
      "Message providers directly to ask questions and negotiate terms",
  },
  {
    icon: CheckCircle,
    title: "Book & Move In",
    description: "Confirm your booking and coordinate your move-in date",
  },
];

export function HowItWorks() {
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

    const element = document.getElementById("how-it-works");
    if (element) observer.observe(element);

    return () => observer.disconnect();
  }, []);

  return (
    <section id="how-it-works" className="py-20 bg-white dark:bg-gray-950">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            How It Works
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Finding your perfect accommodation is just four simple steps away
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <div
              key={index}
              className={`text-center transition-all duration-500 ${
                isVisible
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-10"
              }`}
              style={{ transitionDelay: `${index * 200}ms` }}
            >
              <div className="relative mb-6">
                <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <step.icon className="h-8 w-8 text-white" />
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                  {index + 1}
                </div>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                {step.title}
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
