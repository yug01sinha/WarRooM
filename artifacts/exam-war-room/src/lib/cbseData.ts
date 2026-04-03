export const CBSE_SYLLABUS = {
  "Mathematics": ["Real Numbers", "Polynomials", "Pair of Linear Equations in Two Variables", "Quadratic Equations", "Arithmetic Progressions", "Triangles", "Coordinate Geometry", "Introduction to Trigonometry", "Some Applications of Trigonometry", "Circles", "Areas Related to Circles", "Surface Areas and Volumes", "Statistics", "Probability"],
  "Science": ["Chemical Reactions and Equations", "Acids Bases and Salts", "Metals and Non-metals", "Carbon and its Compounds", "Life Processes", "Control and Coordination", "How do Organisms Reproduce?", "Heredity", "Light – Reflection and Refraction", "Human Eye and Colourful World", "Electricity", "Magnetic Effects of Electric Current", "Our Environment"],
  "Social Science": ["The Rise of Nationalism in Europe", "Nationalism in India", "The Making of a Global World", "The Age of Industrialisation", "Print Culture and the Modern World", "Resources and Development", "Forest and Wildlife Resources", "Water Resources", "Agriculture", "Minerals and Energy Resources", "Manufacturing Industries", "Lifelines of National Economy", "Power Sharing", "Federalism", "Gender Religion and Caste", "Political Parties", "Outcomes of Democracy", "Development", "Sectors of the Indian Economy", "Money and Credit", "Globalisation and the Indian Economy", "Consumer Rights"],
  "English": ["A Letter to God", "Nelson Mandela Long Walk to Freedom", "Two Stories about Flying", "From the Diary of Anne Frank", "Glimpses of India", "Mijbil the Otter", "Madam Rides the Bus", "The Sermon at Benares", "The Proposal", "A Triumph of Surgery", "The Thief's Story", "The Midnight Visitor", "A Question of Trust", "Footprints without Feet", "The Making of a Scientist", "The Necklace", "The Hack Driver", "Bholi", "The Book That Saved the Earth"],
  "Hindi": ["Surdas ke Pad", "Ram Lakshman Parshuram Samvad", "Dev ke Savaiye", "Atm Trann", "Uttsaah Aur At Nahi Aati", "Yeh Danturit Muskan Aur Fasal", "Chaya Mat Choonakar", "Kar Chale Hum Fida", "Aatmakathya", "Ek Kahaani Yeh Bhi", "Meri Katha", "Ek Lok Katha", "Stri Shiksha Ke Virodhi Kutarkon Ka Khandan", "Manaviya Karuna Ki Divya Chamak", "Ek Kahaani Yeh Bhi", "Sanskriti"]
};

export const SUBJECTS = Object.keys(CBSE_SYLLABUS);

export function getRank(xp: number): string {
  if (xp <= 200) return "Cadet";
  if (xp <= 500) return "Soldier";
  if (xp <= 1000) return "Sergeant";
  if (xp <= 2000) return "Commander";
  if (xp <= 5000) return "General";
  return "War Hero";
}

export function getNextRankXp(xp: number): number {
  if (xp <= 200) return 201;
  if (xp <= 500) return 501;
  if (xp <= 1000) return 1001;
  if (xp <= 2000) return 2001;
  if (xp <= 5000) return 5001;
  return xp; // Maxed out
}
