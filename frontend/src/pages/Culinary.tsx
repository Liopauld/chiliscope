import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Flame, Clock, Users, ChefHat, X, ChevronRight, Search,
  Utensils, Lightbulb, AlertTriangle, ThumbsUp
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface Recipe {
  id: string; title: string; description: string; image: string
  prepTime: string; cookTime: string; servings: number; difficulty: string
  heatLevel: 'Mild' | 'Medium' | 'Hot' | 'Extra Hot'
  category: string; chiliType: string
  ingredients: string[]; instructions: string[]
  tips: string[]; tags: string[]
}

interface CulinaryTip {
  id: string; title: string; description: string; icon: string; category: string
}

const recipes: Recipe[] = [
  {
    id: '1', title: 'Sinigang na Baboy', description: 'A classic Filipino sour soup with tender pork belly, fresh vegetables, and siling haba for a gentle kick.',
    image: '/images/haba.webp', prepTime: '20 min', cookTime: '1 hr', servings: 6, difficulty: 'Easy',
    heatLevel: 'Mild', category: 'Soup', chiliType: 'Siling Haba',
    ingredients: ['500g pork belly, cut into chunks', '2 medium tomatoes, quartered', '1 large onion, quartered', '3-4 pieces siling haba', '200g kangkong (water spinach)', '2 pieces radish, sliced', '1 pack sinigang mix (tamarind)', '2 tablespoons fish sauce', '6 cups water', '1 eggplant, sliced', 'String beans, cut into 2-inch pieces'],
    instructions: ['Boil water in a large pot. Add pork belly and cook until tender (about 45 minutes).', 'Add tomatoes and onion. Simmer for 5 minutes.', 'Add the sinigang mix and stir to dissolve.', 'Add radish and eggplant. Cook for 5 minutes.', 'Add string beans and siling haba.', 'Season with fish sauce to taste.', 'Add kangkong last. Turn off heat once wilted.', 'Serve hot with steamed rice.'],
    tips: ['Keep siling haba whole to prevent it from being too spicy.', 'Fresh tamarind can replace the sinigang mix for authentic flavor.', 'Don\'t overcook the vegetables.'],
    tags: ['Filipino Classic', 'Comfort Food', 'One-Pot']
  },
  {
    id: '2', title: 'Bicol Express', description: 'A rich and fiery coconut milk stew loaded with siling labuyo, perfect for those who love intense heat with creamy flavor.',
    image: '/images/labuyo.jfif', prepTime: '15 min', cookTime: '45 min', servings: 4, difficulty: 'Medium',
    heatLevel: 'Hot', category: 'Main Dish', chiliType: 'Siling Labuyo',
    ingredients: ['500g pork belly, sliced thin', '400ml coconut milk', '200ml coconut cream', '8-10 pieces siling labuyo', '1 thumb-sized ginger, julienned', '6 cloves garlic, minced', '1 large onion, sliced', '3 tablespoons shrimp paste (bagoong)', '2 tablespoons cooking oil', 'Salt and pepper to taste'],
    instructions: ['Sauté garlic, onion, and ginger in oil until fragrant.', 'Add pork belly and cook until slightly browned.', 'Pour in coconut milk and bring to a simmer.', 'Add shrimp paste and stir well.', 'Add siling labuyo (whole or sliced depending on desired heat).', 'Simmer until pork is tender and sauce thickens, about 30 minutes.', 'Pour in coconut cream and simmer for 5 more minutes.', 'Season with salt and pepper. Serve with rice.'],
    tips: ['For less heat, keep the chilies whole and remove before serving.', 'Stir occasionally to prevent coconut milk from curdling.', 'Best served the next day when flavors have melded.'],
    tags: ['Bicolano', 'Spicy', 'Coconut']
  },
  {
    id: '3', title: 'Laing', description: 'Dried taro leaves slow-cooked in coconut milk with siling labuyo, a beloved Bicolano dish full of earthy, spicy, and creamy flavors.',
    image: '/images/labuyo.jfif', prepTime: '10 min', cookTime: '1 hr', servings: 4, difficulty: 'Medium',
    heatLevel: 'Hot', category: 'Main Dish', chiliType: 'Siling Labuyo',
    ingredients: ['200g dried taro leaves', '400ml coconut milk', '200ml coconut cream', '200g pork belly, diced small', '5-7 pieces siling labuyo', '4 cloves garlic, minced', '1 onion, diced', '2 tablespoons shrimp paste', '1 thumb ginger, sliced', 'Salt to taste'],
    instructions: ['DO NOT stir during cooking — this is crucial!', 'Layer dried taro leaves in a pot.', 'Pour coconut milk over the leaves.', 'Add pork, garlic, onion, ginger, and shrimp paste on top.', 'Add siling labuyo.', 'Bring to a gentle simmer and cook for 45 minutes without stirring.', 'Add coconut cream and cook for 10 more minutes.', 'Gently fold the mixture only when fully cooked. Serve with rice.'],
    tips: ['Never stir while cooking — it will cause itchiness from the taro.', 'Dried taro leaves work best; fresh leaves need to be dried first.', 'Low and slow is the key to perfect Laing.'],
    tags: ['Bicolano', 'Traditional', 'No-Stir']
  },
  {
    id: '4', title: 'Spicy Chicken Adobo', description: 'A fiery twist on the Filipino national dish, combining soy sauce and vinegar braised chicken with siling labuyo heat.',
    image: '/images/labuyo.jfif', prepTime: '15 min', cookTime: '45 min', servings: 4, difficulty: 'Easy',
    heatLevel: 'Medium', category: 'Main Dish', chiliType: 'Siling Labuyo',
    ingredients: ['1kg chicken pieces', '1/3 cup soy sauce', '1/3 cup vinegar (cane or coconut)', '1 head garlic, crushed', '3-5 pieces siling labuyo', '3 bay leaves', '1 tablespoon whole peppercorns', '1 tablespoon cooking oil', '1 cup water', 'Salt and sugar to taste'],
    instructions: ['Combine chicken, soy sauce, vinegar, garlic, bay leaves, and peppercorns in a pot.', 'Add water and bring to a boil.', 'Reduce heat and simmer for 30 minutes until chicken is tender.', 'Add siling labuyo and cook for 5 more minutes.', 'Remove chicken pieces and pan-fry in oil until slightly crispy.', 'Reduce the sauce until slightly thick.', 'Return chicken to the pot and coat with sauce.', 'Serve hot with steamed rice.'],
    tips: ['Don\'t stir the vinegar immediately — let it boil first to remove acidity.', 'Slice the chilies for more heat, keep whole for milder version.', 'Marinating overnight in the soy-vinegar mixture deepens the flavor.'],
    tags: ['Filipino Classic', 'Quick & Easy', 'Spicy Twist']
  },
  {
    id: '5', title: 'Ginisang Monggo with Chili', description: 'A hearty mung bean soup elevated with siling haba, a common Friday dish in Filipino households.',
    image: '/images/haba.webp', prepTime: '10 min', cookTime: '40 min', servings: 6, difficulty: 'Easy',
    heatLevel: 'Mild', category: 'Soup', chiliType: 'Siling Haba',
    ingredients: ['2 cups mung beans, washed', '200g pork, diced', '1 bunch spinach or ampalaya leaves', '3-4 pieces siling haba', '3 cloves garlic, minced', '1 onion, diced', '2 medium tomatoes, diced', '2 tablespoons fish sauce', '6 cups water', '1 tablespoon cooking oil'],
    instructions: ['Boil mung beans in water until soft (about 25 minutes).', 'In a separate pan, sauté garlic, onion, and tomatoes.', 'Add pork and cook until browned.', 'Add sautéed mixture to the mung beans.', 'Add siling haba and fish sauce.', 'Simmer for 10 minutes.', 'Add leafy greens and cook until wilted.', 'Serve hot with rice and fried fish.'],
    tips: ['Soak mung beans overnight for faster cooking.', 'Add chicharrón (pork cracklings) on top for extra texture.', 'Ampalaya leaves add a nice bitter contrast.'],
    tags: ['Budget-Friendly', 'Healthy', 'Friday Dish']
  },
  {
    id: '6', title: 'Spicy Sisig', description: 'The ultimate Filipino bar food made extra exciting with siling labuyo — crispy, tangy, and blazing hot.',
    image: '/images/demonyo.jpg', prepTime: '30 min', cookTime: '30 min', servings: 4, difficulty: 'Hard',
    heatLevel: 'Extra Hot', category: 'Appetizer', chiliType: 'Siling Demonyo',
    ingredients: ['500g pig face and ears (or pork belly substitute)', '1/4 cup soy sauce', '1/4 cup vinegar', '5-8 pieces siling labuyo, minced', '4 cloves garlic, minced', '2 onions, finely diced', '2 tablespoons mayonnaise', '1 egg', '2 tablespoons butter', 'Calamansi juice', 'Salt and pepper to taste'],
    instructions: ['Boil pork until tender, then grill until charred.', 'Chop grilled pork finely.', 'Sauté garlic and onion in butter on a sizzling plate.', 'Add chopped pork and stir-fry.', 'Season with soy sauce, vinegar, and calamansi juice.', 'Mix in minced siling labuyo and mayonnaise.', 'Crack an egg on top and mix while sizzling.', 'Serve immediately on the hot plate with extra chilies on the side.'],
    tips: ['A sizzling plate is essential for authentic sisig.', 'Chicken liver can be added for traditional Kapampangan style.', 'Wear gloves when handling Siling Demonyo!'],
    tags: ['Pulutan', 'Bar Food', 'Extreme Heat']
  },
  {
    id: '7', title: 'Chili Garlic Oil', description: 'A versatile condiment made with toasted garlic and siling labuyo in oil — perfect drizzled over everything.',
    image: '/images/labuyo.jfif', prepTime: '10 min', cookTime: '15 min', servings: 12, difficulty: 'Easy',
    heatLevel: 'Hot', category: 'Condiment', chiliType: 'Siling Labuyo',
    ingredients: ['1 cup cooking oil (vegetable or canola)', '1 head garlic, minced', '20 pieces siling labuyo, finely chopped', '1 teaspoon salt', '1 teaspoon sugar', '1 tablespoon soy sauce', '1 tablespoon sesame oil (optional)'],
    instructions: ['Heat oil in a pan over medium heat.', 'Add minced garlic and fry until golden (don\'t burn!).', 'Remove from heat and let oil cool for 2 minutes.', 'Add chopped siling labuyo to the warm oil.', 'Add salt, sugar, and soy sauce. Mix well.', 'Add sesame oil if desired.', 'Let it cool completely before transferring to a jar.', 'Store in the refrigerator for up to 2 weeks.'],
    tips: ['Cool the oil slightly before adding chilies to preserve color.', 'Use a mix of dried and fresh chilies for deeper flavor.', 'Add a few tablespoons to instant noodles for an upgrade.'],
    tags: ['Condiment', 'Make-Ahead', 'Versatile']
  },
  {
    id: '8', title: 'Spicy Mango Shake', description: 'A refreshing Filipino-inspired drink that combines sweet mango with a surprising chili kick.',
    image: '/images/labuyo.jfif', prepTime: '5 min', cookTime: '0 min', servings: 2, difficulty: 'Easy',
    heatLevel: 'Mild', category: 'Beverage', chiliType: 'Siling Labuyo',
    ingredients: ['2 ripe Philippine mangoes (carabao variety)', '1 cup ice', '1/2 cup milk or coconut milk', '2 tablespoons honey', '1 small siling labuyo, deseeded', 'Pinch of salt', 'Chili flakes for garnish'],
    instructions: ['Peel and chop the mangoes.', 'Add mango, ice, milk, and honey to a blender.', 'Add the deseeded siling labuyo.', 'Blend until smooth.', 'Taste and adjust sweetness.', 'Pour into glasses.', 'Garnish with a pinch of chili flakes.', 'Serve immediately.'],
    tips: ['Deseed the chili for mild heat, keep seeds for more kick.', 'Freeze mango chunks beforehand for a thicker shake.', 'A rim of chili-salt on the glass adds a nice touch.'],
    tags: ['Beverage', 'Quick', 'Refreshing']
  }
]

const culinaryTips: CulinaryTip[] = [
  { id: '1', title: 'Handling Hot Peppers', description: 'Always wear gloves when handling hot chilies like Siling Labuyo and Siling Demonyo. Avoid touching your face, especially eyes. Wash hands with dish soap (capsaicin is oil-soluble).', icon: '🧤', category: 'Safety' },
  { id: '2', title: 'Controlling Heat Levels', description: 'Remove seeds and white membrane to reduce heat. Adding dairy (coconut milk) balances capsaicin. Start with less chili and add more gradually.', icon: '🌡️', category: 'Technique' },
  { id: '3', title: 'Storing Chilies', description: 'Fresh chilies last 1-2 weeks in the refrigerator. Dry or dehydrate them for longer storage. Freeze whole chilies for up to 6 months.', icon: '❄️', category: 'Storage' },
  { id: '4', title: 'Pairing Principles', description: 'Mild chilies like Siling Haba pair with delicate fish and soups. Hot chilies like Labuyo match with rich, fatty meats. Sweet fruits balance extreme heat.', icon: '🍽️', category: 'Flavor' },
  { id: '5', title: 'Capsaicin Remedies', description: 'If you eat something too hot: drink milk (not water!), eat rice or bread, try sugar or honey. Capsaicin dissolves in fat and sugar, not water.', icon: '🥛', category: 'Safety' },
  { id: '6', title: 'Toasting & Drying', description: 'Dry-toast chilies in a pan to intensify flavor. Sun-dry for 3-5 days for dried flakes. Smoking adds complex depth to the heat.', icon: '🔥', category: 'Technique' },
]

const heatLevels = ['All', 'Mild', 'Medium', 'Hot', 'Extra Hot'] as const
const categories = ['All', 'Main Dish', 'Soup', 'Appetizer', 'Condiment', 'Beverage'] as const

function HeatBadge({ level }: { level: string }) {
  const c: Record<string, string> = { Mild: 'heat-gradient-mild', Medium: 'heat-gradient-medium', Hot: 'heat-gradient-hot', 'Extra Hot': 'heat-gradient-extra-hot' }
  return <span className={cn('px-2.5 py-1 rounded-full text-[10px] font-bold text-white shadow-sm', c[level] || 'bg-gray-500')}>{level}</span>
}

function RecipeCard({ recipe, onClick }: { recipe: Recipe; onClick: () => void }) {
  return (
    <motion.div initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
      <Card className="overflow-hidden cursor-pointer group hover:-translate-y-0.5 transition-all duration-200" onClick={onClick}>
        <div className="relative h-40 bg-sidebar overflow-hidden">
          <img src={recipe.image} alt={recipe.title} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute top-3 right-3"><HeatBadge level={recipe.heatLevel} /></div>
          <div className="absolute bottom-0 left-0 right-0 p-3">
            <span className="text-white/70 text-[10px] font-medium">{recipe.category}</span>
          </div>
        </div>
        <CardContent className="p-4">
          <h3 className="font-bold font-display text-foreground mb-1 group-hover:text-primary transition-colors">{recipe.title}</h3>
          <p className="text-foreground-secondary text-xs mb-3 line-clamp-2">{recipe.description}</p>
          <div className="flex items-center gap-3 text-[10px] text-foreground-muted mb-3">
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{recipe.cookTime}</span>
            <span className="flex items-center gap-1"><Users className="h-3 w-3" />{recipe.servings}</span>
            <span className="flex items-center gap-1"><Flame className="h-3 w-3" />{recipe.chiliType}</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {recipe.tags.slice(0, 3).map((t, i) => <span key={i} className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-medium rounded-full">{t}</span>)}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

function RecipeModal({ recipe, onClose }: { recipe: Recipe; onClose: () => void }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={onClose}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-xl shadow-modal max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="relative h-48 bg-sidebar overflow-hidden">
          <img src={recipe.image} alt={recipe.title} className="absolute inset-0 w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
          <button onClick={onClose} className="absolute top-3 right-3 h-8 w-8 bg-white/20 rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-colors">
            <X className="h-4 w-4" />
          </button>
          <div className="absolute bottom-4 left-5 right-5">
            <HeatBadge level={recipe.heatLevel} />
            <h2 className="text-2xl font-bold font-display text-white mt-2">{recipe.title}</h2>
          </div>
        </div>
        <div className="p-5 space-y-5">
          <p className="text-foreground-secondary text-sm leading-relaxed">{recipe.description}</p>
          <div className="grid grid-cols-4 gap-3">
            {[
              { icon: Clock, label: 'Prep', value: recipe.prepTime },
              { icon: Clock, label: 'Cook', value: recipe.cookTime },
              { icon: Users, label: 'Serves', value: recipe.servings.toString() },
              { icon: Flame, label: 'Difficulty', value: recipe.difficulty },
            ].map((m) => (
              <div key={m.label} className="text-center bg-surface p-2.5 rounded-lg">
                <m.icon className="h-4 w-4 text-primary mx-auto mb-1" />
                <p className="text-[10px] text-foreground-muted">{m.label}</p>
                <p className="text-xs font-bold text-foreground">{m.value}</p>
              </div>
            ))}
          </div>
          <div>
            <h3 className="font-bold text-sm text-foreground mb-2 flex items-center gap-1.5"><Utensils className="h-4 w-4 text-primary" /> Ingredients</h3>
            <ul className="bg-surface rounded-lg p-3 space-y-1.5">
              {recipe.ingredients.map((ing, i) => <li key={i} className="flex items-start gap-2 text-xs text-foreground-secondary"><span className="h-1.5 w-1.5 bg-primary rounded-full mt-1.5 shrink-0" />{ing}</li>)}
            </ul>
          </div>
          <div>
            <h3 className="font-bold text-sm text-foreground mb-2 flex items-center gap-1.5"><ChevronRight className="h-4 w-4 text-primary" /> Instructions</h3>
            <ol className="space-y-2.5">
              {recipe.instructions.map((step, i) => (
                <li key={i} className="flex gap-3">
                  <span className="shrink-0 h-6 w-6 bg-primary text-white rounded-full flex items-center justify-center text-[10px] font-bold">{i + 1}</span>
                  <p className="text-sm text-foreground-secondary pt-0.5">{step}</p>
                </li>
              ))}
            </ol>
          </div>
          {recipe.tips.length > 0 && (
            <div className="bg-amber-50 rounded-lg p-3.5">
              <h3 className="font-bold text-sm text-amber-800 mb-2 flex items-center gap-1.5"><Lightbulb className="h-4 w-4" /> Pro Tips</h3>
              <ul className="space-y-1.5">
                {recipe.tips.map((tip, i) => <li key={i} className="flex items-start gap-2 text-xs text-amber-700"><ThumbsUp className="h-3 w-3 mt-0.5 shrink-0" />{tip}</li>)}
              </ul>
            </div>
          )}
          <div className="flex flex-wrap gap-1.5">
            {recipe.tags.map((t, i) => <span key={i} className="px-2.5 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full">{t}</span>)}
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default function Culinary() {
  const [selectedHeat, setSelectedHeat] = useState<string>('All')
  const [selectedCategory, setSelectedCategory] = useState<string>('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null)

  const filtered = recipes.filter((r) => {
    const matchHeat = selectedHeat === 'All' || r.heatLevel === selectedHeat
    const matchCat = selectedCategory === 'All' || r.category === selectedCategory
    const matchSearch = searchQuery === '' || r.title.toLowerCase().includes(searchQuery.toLowerCase()) || r.description.toLowerCase().includes(searchQuery.toLowerCase()) || r.chiliType.toLowerCase().includes(searchQuery.toLowerCase())
    return matchHeat && matchCat && matchSearch
  })

  return (
    <div className="page-container space-y-8">
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary/10 rounded-full text-xs font-medium text-primary mb-3">
          <ChefHat className="h-3.5 w-3.5" /> Filipino Recipes
        </div>
        <h1 className="page-title">Culinary Corner</h1>
        <p className="text-foreground-secondary max-w-2xl">
          Explore authentic Filipino recipes featuring Philippine chili peppers. From mild sinigang to fiery sisig, discover dishes for every heat tolerance.
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-muted" />
              <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search recipes, ingredients, chili types..." className="pl-9 h-10" />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {heatLevels.map((h) => (
                <Button key={h} variant={selectedHeat === h ? 'default' : 'outline'} size="sm" onClick={() => setSelectedHeat(h)} className="h-8 text-xs">
                  {h !== 'All' && <Flame className="mr-1 h-3 w-3" />}{h}
                </Button>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-3">
            {categories.map((c) => (
              <Button key={c} variant={selectedCategory === c ? 'default' : 'ghost'} size="sm" onClick={() => setSelectedCategory(c)} className="h-7 text-[10px]">{c}</Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recipes Grid */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="page-subtitle">Recipes</h2>
          <span className="text-xs text-foreground-muted">{filtered.length} recipe{filtered.length !== 1 ? 's' : ''} found</span>
        </div>
        {filtered.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filtered.map((r) => <RecipeCard key={r.id} recipe={r} onClick={() => setSelectedRecipe(r)} />)}
          </div>
        ) : (
          <Card>
            <CardContent className="py-16 text-center">
              <ChefHat className="h-10 w-10 text-foreground-muted mx-auto mb-3" />
              <h3 className="font-bold text-foreground mb-1">No recipes found</h3>
              <p className="text-sm text-foreground-secondary">Try adjusting your filters or search terms.</p>
            </CardContent>
          </Card>
        )}
      </section>

      {/* Culinary Tips */}
      <section>
        <h2 className="page-subtitle mb-4">Chili Tips & Tricks</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {culinaryTips.map((tip, i) => (
            <motion.div key={tip.id} initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} viewport={{ once: true }}>
              <Card className="h-full hover:-translate-y-0.5 transition-all duration-200">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-lg shrink-0">{tip.icon}</div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-sm text-foreground">{tip.title}</h3>
                        {tip.category === 'Safety' && <AlertTriangle className="h-3 w-3 text-amber-500" />}
                      </div>
                      <p className="text-xs text-foreground-secondary leading-relaxed">{tip.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Heat Level Guide */}
      <section>
        <h2 className="page-subtitle mb-4">Heat Level Guide</h2>
        <Card>
          <CardContent className="p-5">
            <div className="h-4 rounded-full bg-gradient-to-r from-green-400 via-amber-400 via-orange-500 to-red-600 mb-6" />
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { level: 'Mild', range: '0 – 15K SHU', desc: 'Gentle warmth, perfect for beginners. Enhances flavor without overwhelming.', emoji: '🌶️', bg: 'bg-green-50', text: 'text-green-700' },
                { level: 'Medium', range: '15K – 50K SHU', desc: 'Noticeable heat that adds excitement. A nice balance of flavor and spice.', emoji: '🌶️🌶️', bg: 'bg-amber-50', text: 'text-amber-700' },
                { level: 'Hot', range: '50K – 100K SHU', desc: 'Serious heat for experienced spice lovers. Builds gradually and lingers.', emoji: '🌶️🌶️🌶️', bg: 'bg-orange-50', text: 'text-orange-700' },
                { level: 'Extra Hot', range: '100K+ SHU', desc: 'Extreme intensity — proceed with caution! For the bravest chili enthusiasts.', emoji: '🌶️🌶️🌶️🌶️', bg: 'bg-red-50', text: 'text-red-700' },
              ].map((item) => (
                <div key={item.level} className={cn('rounded-xl p-4', item.bg)}>
                  <p className="text-xl mb-1">{item.emoji}</p>
                  <h4 className={cn('font-bold text-sm mb-0.5', item.text)}>{item.level}</h4>
                  <p className={cn('text-xs font-semibold mb-1.5', item.text)}>{item.range}</p>
                  <p className="text-xs text-foreground-secondary leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Recipe Modal */}
      <AnimatePresence>{selectedRecipe && <RecipeModal recipe={selectedRecipe} onClose={() => setSelectedRecipe(null)} />}</AnimatePresence>
    </div>
  )
}
