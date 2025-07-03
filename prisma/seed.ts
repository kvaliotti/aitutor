import { PrismaClient } from '../src/generated/prisma'

const prisma = new PrismaClient()

const subjectCategories = [
  // Core Academic & Professional Categories
  { name: "Programming", icon: "💻", displayOrder: 1 },
  { name: "Data Science & Analytics", icon: "📊", displayOrder: 2 },
  { name: "Design & UX", icon: "🎨", displayOrder: 3 },
  { name: "Business & Management", icon: "📈", displayOrder: 4 },
  { name: "Marketing & Sales", icon: "📣", displayOrder: 5 },
  { name: "Finance & Economics", icon: "💰", displayOrder: 6 },
  { name: "Science & Technology", icon: "🔬", displayOrder: 7 },
  { name: "Engineering", icon: "⚙️", displayOrder: 8 },
  { name: "Mathematics", icon: "🔢", displayOrder: 9 },
  { name: "Languages", icon: "🗣️", displayOrder: 10 },

  // Creative & Arts Categories
  { name: "Arts & Creativity", icon: "🎭", displayOrder: 11 },
  { name: "Music & Audio", icon: "🎵", displayOrder: 12 },
  { name: "Photography & Video", icon: "📷", displayOrder: 13 },
  { name: "Writing & Literature", icon: "✍️", displayOrder: 14 },
  { name: "Graphic Design", icon: "🖼️", displayOrder: 15 },

  // Health & Wellness Categories
  { name: "Health & Wellness", icon: "🏥", displayOrder: 16 },
  { name: "Sports & Fitness", icon: "🏃", displayOrder: 17 },
  { name: "Nutrition & Diet", icon: "🥗", displayOrder: 18 },
  { name: "Mental Health", icon: "🧠", displayOrder: 19 },
  { name: "Medicine & Healthcare", icon: "⚕️", displayOrder: 20 },

  // Lifestyle & Personal Categories
  { name: "Personal Development", icon: "🌱", displayOrder: 21 },
  { name: "Cooking & Culinary", icon: "👨‍🍳", displayOrder: 22 },
  { name: "Travel & Culture", icon: "✈️", displayOrder: 23 },
  { name: "Hobbies & Crafts", icon: "🧵", displayOrder: 24 },
  { name: "Parenting & Family", icon: "👨‍👩‍👧‍👦", displayOrder: 25 },

  // Professional Skills Categories
  { name: "Communication", icon: "💬", displayOrder: 26 },
  { name: "Leadership", icon: "👥", displayOrder: 27 },
  { name: "Project Management", icon: "📋", displayOrder: 28 },
  { name: "Public Speaking", icon: "🎤", displayOrder: 29 },
  { name: "Sales & Negotiation", icon: "🤝", displayOrder: 30 },

  // Technical & Digital Categories
  { name: "Cybersecurity", icon: "🔒", displayOrder: 31 },
  { name: "AI & Machine Learning", icon: "🤖", displayOrder: 32 },
  { name: "Cloud Computing", icon: "☁️", displayOrder: 33 },
  { name: "Mobile Development", icon: "📱", displayOrder: 34 },
  { name: "Web Development", icon: "🌐", displayOrder: 35 },

  // Specialized Professional Categories
  { name: "Law & Legal", icon: "⚖️", displayOrder: 36 },
  { name: "Education & Teaching", icon: "🎓", displayOrder: 37 },
  { name: "Psychology", icon: "🧠", displayOrder: 38 },
  { name: "Real Estate", icon: "🏠", displayOrder: 39 },
  { name: "Manufacturing", icon: "🏭", displayOrder: 40 },

  // Science & Research Categories
  { name: "Environmental Science", icon: "🌍", displayOrder: 41 },
  { name: "Physics", icon: "⚛️", displayOrder: 42 },
  { name: "Chemistry", icon: "🧪", displayOrder: 43 },
  { name: "Biology", icon: "🧬", displayOrder: 44 },
  { name: "Research Methods", icon: "📚", displayOrder: 45 },

  // Emerging & Niche Categories
  { name: "Sustainability", icon: "♻️", displayOrder: 46 },
  { name: "Gaming & Entertainment", icon: "🎮", displayOrder: 47 },
  { name: "Social Media", icon: "📱", displayOrder: 48 },
  { name: "Blockchain & Crypto", icon: "⛓️", displayOrder: 49 },
  
  // Catch-all Category
  { name: "Other", icon: "📚", displayOrder: 50 }
]

async function main() {
  console.log('🌱 Seeding subject categories...')
  
  // Create subject categories
  for (const category of subjectCategories) {
    await prisma.subjectCategory.upsert({
      where: { name: category.name },
      update: {},
      create: category,
    })
  }
  
  console.log(`✅ Created ${subjectCategories.length} subject categories`)
  
  // Update existing learning sessions to have "Other" category (ID: 50)
  const otherCategory = await prisma.subjectCategory.findUnique({
    where: { name: "Other" }
  })
  
  if (otherCategory) {
    const updateResult = await prisma.learningSession.updateMany({
      where: { subjectCategoryId: null },
      data: { subjectCategoryId: otherCategory.id }
    })
    console.log(`✅ Updated ${updateResult.count} existing sessions to "Other" category`)
  }
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  }) 