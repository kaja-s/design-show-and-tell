"use client";

import { useEffect, useState } from "react";

export function LastVisitor() {
  const [location, setLocation] = useState<string | null>(null);

  useEffect(() => {
    // Check if we have a stored previous visitor
    const stored = localStorage.getItem("lastVisitor");
    if (stored) {
      setLocation(stored);
    }

    // Fetch current visitor location
    fetch("https://ipapi.co/json/")
      .then((res) => res.json())
      .then((data) => {
        if (data.city && data.country_name) {
          const newLocation = `${data.city}, ${data.country_name}`;
          // Store current visitor for next time
          localStorage.setItem("lastVisitor", newLocation);
          // Don't update the display immediately - it will show on next visit
        }
      })
      .catch(() => {
        // Silently fail if geolocation doesn't work
      });
  }, []);

  if (!location) return null;

  return (
    <span className="text-xs lowercase opacity-40">
      last visitor from {location}
    </span>
  );
}
