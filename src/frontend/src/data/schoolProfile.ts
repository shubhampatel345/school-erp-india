export interface SchoolProfile {
  schoolName: string;
  tagline: string;
  address: string;
  phone: string;
  email: string;
  features: string[];
  photos: string[];
}

const STORAGE_KEY = "school_profile";

const defaultProfile: SchoolProfile = {
  schoolName: "Delhi Public School",
  tagline: "Excellence in Education",
  address: "123 Ring Road, New Delhi - 110001",
  phone: "+91 11 2345 6789",
  email: "info@dps.edu.in",
  features: [
    "Smart Classrooms",
    "Digital Library",
    "Sports Complex",
    "Science Labs",
    "Transport Facility",
    "Hostel Facility",
  ],
  photos: [],
};

export function getSchoolProfile(): SchoolProfile {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return { ...defaultProfile, ...JSON.parse(stored) };
  } catch {}
  return defaultProfile;
}

export function saveSchoolProfile(profile: SchoolProfile): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
}
