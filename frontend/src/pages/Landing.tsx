import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Flame, 
  Calendar, 
  Newspaper, 
  UtensilsCrossed,
  MapPin,
  Clock,
  TrendingUp,
  Sparkles,
  ArrowRight,
  ChevronRight,
  ChevronLeft,
  MessageSquare,
  BookOpen,
  ChefHat,
  Users,
  Zap,
  Shield,
  BarChart3,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

// Carousel slides data
const carouselSlides = [
  {
    id: 1,
    title: 'Siling Labuyo',
    subtitle: 'The Philippine Bird\'s Eye Chili',
    description: 'One of the hottest chilies in the Philippines, ranging from 80,000 to 100,000 Scoville units.',
    image: '/images/labuyo.jfif',
    gradient: 'from-red-700 via-red-600 to-orange-500',
    heatLevel: '🔥 Very Hot'
  },
  {
    id: 2,
    title: 'Siling Haba',
    subtitle: 'The Long Green Chili',
    description: 'A milder variety perfect for everyday Filipino cooking, with heat levels from 5,000 to 30,000 SHU.',
    image: '/images/haba.webp',
    gradient: 'from-orange-600 via-amber-500 to-yellow-500',
    heatLevel: '🌶️ Mild to Medium'
  },
  {
    id: 3,
    title: 'Siling Demonyo',
    subtitle: 'The Demon Chili',
    description: 'A fiery hybrid variety with extreme heat, ideal for hot sauce production and spice challenges.',
    image: '/images/demonyo.jpg',
    gradient: 'from-red-800 via-red-600 to-orange-600',
    heatLevel: '🔥🔥 Extremely Hot'
  },
  {
    id: 4,
    title: 'AI-Powered Analysis',
    subtitle: 'Predict Heat Levels with ML',
    description: 'Upload images of chili pods and get instant predictions of heat level, variety, and maturity using machine learning.',
    image: '/images/chiliscope.png',
    gradient: 'from-orange-700 via-red-600 to-rose-600',
    heatLevel: '✨ Technology'
  }
]

// Mock news data - In production, this would come from a news API
const mockNews = [
  {
    id: 1,
    title: 'Philippine Chili Exports Hit Record High in 2025',
    source: 'ABS-CBN News',
    date: '2026-01-30',
    url: '#',
    image: 'https://images.unsplash.com/photo-1583119022894-919a68a3d0e3?w=400'
  },
  {
    id: 2,
    title: 'New Study Shows Health Benefits of Capsaicin',
    source: 'Philippine Daily Inquirer',
    date: '2026-01-29',
    url: '#',
    image: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=400'
  },
  {
    id: 3,
    title: 'Climate Change Affecting Chili Harvests in Bicol Region',
    source: 'GMA News',
    date: '2026-01-28',
    url: '#',
    image: 'https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?w=400'
  }
]

// Mock recipes - In production, this would come from a recipe API
const mockRecipes = [
  {
    id: 1,
    title: 'Bicol Express',
    description: 'Creamy coconut pork stew with siling labuyo',
    prepTime: '45 mins',
    difficulty: 'Medium',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/18/Bicol_Express.jpg/1280px-Bicol_Express.jpg'
  },
  {
    id: 2,
    title: 'Laing',
    description: 'Taro leaves in spicy coconut milk',
    prepTime: '1 hour',
    difficulty: 'Medium',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Laing_%28food%29_by_Judgefloro_05.jpg/640px-Laing_%28food%29_by_Judgefloro_05.jpg'
  },
  {
    id: 3,
    title: 'Dynamite Lumpia',
    description: 'Cheese-stuffed long green chili spring rolls',
    prepTime: '30 mins',
    difficulty: 'Easy',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ac/Lumpiang_Shanghai_at_Dampa_sa_Libis.jpg/640px-Lumpiang_Shanghai_at_Dampa_sa_Libis.jpg'
  }
]

// Mock events - In production, this would come from an events API
const mockEvents = [
  {
    id: 1,
    title: 'Philippine Chili Festival 2026',
    location: 'Bicol Region',
    date: 'February 15-17, 2026',
    type: 'Festival'
  },
  {
    id: 2,
    title: 'Hot Sauce Competition Manila',
    location: 'SM Mall of Asia',
    date: 'March 5, 2026',
    type: 'Competition'
  },
  {
    id: 3,
    title: 'Urban Chili Gardening Workshop',
    location: 'UP Diliman',
    date: 'February 22, 2026',
    type: 'Workshop'
  },
  {
    id: 4,
    title: 'Chili Pepper Expo 2026',
    location: 'World Trade Center',
    date: 'April 10-12, 2026',
    type: 'Expo'
  }
]

export default function Landing() {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [news, setNews] = useState(mockNews)
  const [recipes, setRecipes] = useState(mockRecipes)
  const [events, setEvents] = useState(mockEvents)
  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)

  // Auto-advance carousel
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % carouselSlides.length)
    }, 5000) // Change slide every 5 seconds

    return () => clearInterval(interval)
  }, [])

  // Fetch real-time data from backend API
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      try {
        const API_URL = import.meta.env.VITE_API_URL || '/api/v1'
        const response = await fetch(`${API_URL}/content/content`)
        
        if (response.ok) {
          const data = await response.json()
          
          // Map API response to component format
          if (data.news?.length) {
            setNews(data.news.map((article: { id: string; title: string; description?: string; source: string; url: string; image?: string; published_at: string }) => ({
              id: article.id,
              title: article.title,
              source: article.source,
              date: article.published_at?.split('T')[0] || new Date().toISOString().split('T')[0],
              url: article.url,
              image: article.image
            })))
          }
          
          if (data.recipes?.length) {
            setRecipes(data.recipes.map((recipe: { id: string; title: string; description: string; prep_time: string; difficulty: string; image?: string }) => ({
              id: recipe.id,
              title: recipe.title,
              description: recipe.description,
              prepTime: recipe.prep_time,
              difficulty: recipe.difficulty,
              image: recipe.image
            })))
          }
          
          if (data.events?.length) {
            setEvents(data.events.map((event: { id: string; title: string; location: string; date: string; event_type: string }) => ({
              id: event.id,
              title: event.title,
              location: event.location,
              date: event.date,
              type: event.event_type
            })))
          }
          
          setLastUpdated(data.last_updated)
        }
      } catch (error) {
        console.log('Using mock data - API not available')
        // Keep using mock data on error
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
    
    // Refresh data every 5 minutes
    const refreshInterval = setInterval(fetchData, 5 * 60 * 1000)
    return () => clearInterval(refreshInterval)
  }, [])

  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % carouselSlides.length)
  }, [])

  const prevSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev - 1 + carouselSlides.length) % carouselSlides.length)
  }, [])

  return (
    <div className="min-h-screen bg-background">
      {/* ── Header ── */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-lg border-b border-red-100/50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-600 to-orange-500 flex items-center justify-center shadow-md">
                <Flame className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-foreground font-display tracking-tight">ChiliScope</span>
            </div>
            
            {/* Nav links — browse without account */}
            <nav className="hidden md:flex items-center gap-1">
              <Link to="/forum" className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-foreground-secondary hover:text-red-600 hover:bg-red-50/60 transition-all duration-200">
                <MessageSquare className="h-4 w-4" /> Forum
              </Link>
              <Link to="/encyclopedia" className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-foreground-secondary hover:text-red-600 hover:bg-red-50/60 transition-all duration-200">
                <BookOpen className="h-4 w-4" /> Encyclopedia
              </Link>
              <Link to="/culinary" className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-foreground-secondary hover:text-red-600 hover:bg-red-50/60 transition-all duration-200">
                <ChefHat className="h-4 w-4" /> Culinary
              </Link>
              <Link to="/market" className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-foreground-secondary hover:text-red-600 hover:bg-red-50/60 transition-all duration-200">
                <TrendingUp className="h-4 w-4" /> Market
              </Link>
            </nav>

            <div className="flex items-center gap-2">
              <Link to="/login">
                <Button variant="ghost" size="sm" className="text-foreground-secondary hover:text-red-600">
                  Sign In
                </Button>
              </Link>
              <Link to="/register">
                <Button size="sm" className="bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-700 hover:to-orange-600 text-white shadow-md shadow-red-200/50">
                  Get Started <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* ── Hero Carousel ── */}
      <section className="pt-16 relative h-[80vh] min-h-[560px] overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: 'easeInOut' }}
            className="absolute inset-0 hero-gradient"
          >
            {/* Decorative elements */}
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full bg-white/5 blur-sm" />
              <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full bg-white/5" />
              <div className="absolute top-1/3 right-1/4 w-64 h-64 rounded-full bg-orange-400/10 blur-3xl animate-pulse" />
              <div className="absolute bottom-1/4 left-1/3 w-40 h-40 rounded-full bg-red-400/10 blur-2xl" />
            </div>

            <div className="relative h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center">
              <div className="grid lg:grid-cols-2 gap-12 items-center w-full">
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.6 }}
                  className="text-white"
                >
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/15 rounded-full text-sm mb-6 backdrop-blur-sm border border-white/10">
                    <Flame className="h-3.5 w-3.5 text-orange-300" />
                    <span className="text-white/90 font-medium">{carouselSlides[currentSlide].heatLevel}</span>
                  </div>
                  <h1 className="text-5xl lg:text-7xl font-bold font-display mb-4 leading-[1.1] tracking-tight">
                    {carouselSlides[currentSlide].title}
                  </h1>
                  <p className="text-xl lg:text-2xl text-white/80 mb-3 font-medium">
                    {carouselSlides[currentSlide].subtitle}
                  </p>
                  <p className="text-base text-white/55 mb-10 max-w-lg leading-relaxed">
                    {carouselSlides[currentSlide].description}
                  </p>
                  <div className="flex gap-3">
                    <Link to="/register">
                      <Button size="lg" className="bg-white text-red-800 hover:bg-white/90 shadow-xl shadow-black/20 font-bold h-12 px-7 text-base">
                        Start Analyzing <ArrowRight className="ml-2 h-5 w-5" />
                      </Button>
                    </Link>
                    <Link to="/encyclopedia">
                      <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10 bg-white/5 backdrop-blur-sm h-12 px-7 text-base">
                        Browse Varieties
                      </Button>
                    </Link>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3, duration: 0.6 }}
                  className="hidden lg:flex justify-center"
                >
                  <div className="relative">
                    <div className="w-[340px] h-[340px] rounded-3xl overflow-hidden shadow-2xl shadow-black/30 border-2 border-white/20 relative">
                      <img 
                        src={carouselSlides[currentSlide].image} 
                        alt={carouselSlides[currentSlide].title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none'
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                      <div className="absolute bottom-4 left-4 right-4">
                        <span className="px-3 py-1.5 bg-white/20 backdrop-blur-md rounded-full text-xs font-semibold text-white border border-white/10">
                          {carouselSlides[currentSlide].heatLevel}
                        </span>
                      </div>
                    </div>
                    {/* Floating decorative elements */}
                    <div className="absolute -top-4 -right-4 w-20 h-20 rounded-2xl bg-orange-400/20 backdrop-blur-sm border border-white/10 flex items-center justify-center">
                      <Flame className="h-8 w-8 text-orange-300/80" />
                    </div>
                    <div className="absolute -bottom-3 -left-3 w-16 h-16 rounded-xl bg-red-400/20 backdrop-blur-sm border border-white/10 flex items-center justify-center">
                      <Zap className="h-6 w-6 text-yellow-300/80" />
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Navigation arrows */}
        <button onClick={prevSlide} className="absolute left-4 lg:left-8 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-white/10 backdrop-blur-md text-white hover:bg-white/20 transition-all duration-200 border border-white/10 shadow-lg">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button onClick={nextSlide} className="absolute right-4 lg:right-8 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-white/10 backdrop-blur-md text-white hover:bg-white/20 transition-all duration-200 border border-white/10 shadow-lg">
          <ChevronRight className="h-5 w-5" />
        </button>

        {/* Dot indicators */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2.5">
          {carouselSlides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`h-2.5 rounded-full transition-all duration-300 ${
                index === currentSlide ? 'w-10 bg-white shadow-md' : 'w-2.5 bg-white/40 hover:bg-white/60'
              }`}
            />
          ))}
        </div>
      </section>

      {/* ── Browse Without an Account ── */}
      <section className="py-6 bg-gradient-to-r from-red-50 via-orange-50 to-amber-50 border-b border-red-100/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 text-center sm:text-left">
            <div className="flex items-center gap-2 text-sm text-red-800 font-medium">
              <Users className="h-4 w-4" />
              <span>Explore without an account:</span>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Link to="/forum">
                <Button variant="outline" size="sm" className="border-red-200 text-red-700 hover:bg-red-50 hover:border-red-300 gap-1.5 rounded-full">
                  <MessageSquare className="h-3.5 w-3.5" /> Community Forum
                </Button>
              </Link>
              <Link to="/encyclopedia">
                <Button variant="outline" size="sm" className="border-orange-200 text-orange-700 hover:bg-orange-50 hover:border-orange-300 gap-1.5 rounded-full">
                  <BookOpen className="h-3.5 w-3.5" /> Encyclopedia
                </Button>
              </Link>
              <Link to="/culinary">
                <Button variant="outline" size="sm" className="border-amber-200 text-amber-700 hover:bg-amber-50 hover:border-amber-300 gap-1.5 rounded-full">
                  <ChefHat className="h-3.5 w-3.5" /> Culinary Guide
                </Button>
              </Link>
              <Link to="/market">
                <Button variant="outline" size="sm" className="border-green-200 text-green-700 hover:bg-green-50 hover:border-green-300 gap-1.5 rounded-full">
                  <BarChart3 className="h-3.5 w-3.5" /> Market Prices
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="py-24 bg-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-bl from-red-50 to-transparent rounded-full -translate-y-1/2 translate-x-1/3" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-red-50 rounded-full text-sm font-medium text-red-600 mb-4">
              <Sparkles className="h-4 w-4" /> Why Choose ChiliScope
            </div>
            <h2 className="text-4xl font-bold font-display text-foreground mb-4">
              Everything You Need for Chili Analysis
            </h2>
            <p className="text-foreground-secondary max-w-2xl mx-auto text-lg">
              Leverage cutting-edge AI technology to predict chili heat levels before harvest
            </p>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Sparkles,
                title: 'AI-Powered Predictions',
                description: 'Our machine learning model analyzes pod morphology and maturity to predict heat levels with high accuracy.',
                color: 'from-orange-500 to-red-500',
                bgColor: 'bg-orange-50',
              },
              {
                icon: TrendingUp,
                title: 'Research-Grade Analytics',
                description: 'Access detailed analytics and trends to support your agricultural research or farming decisions.',
                color: 'from-red-500 to-rose-500',
                bgColor: 'bg-red-50',
              },
              {
                icon: Flame,
                title: 'Philippine Chili Focus',
                description: 'Specialized for native Philippine varieties including Siling Labuyo, Siling Haba, and Siling Demonyo.',
                color: 'from-amber-500 to-orange-500',
                bgColor: 'bg-amber-50',
              },
              {
                icon: MessageSquare,
                title: 'Active Community',
                description: 'Join discussions with fellow researchers, farmers, and chili enthusiasts. Share knowledge openly.',
                color: 'from-rose-500 to-pink-500',
                bgColor: 'bg-rose-50',
              },
              {
                icon: Shield,
                title: 'Reliable & Secure',
                description: 'Your data is safe with enterprise-grade security and reliable cloud infrastructure.',
                color: 'from-red-600 to-red-500',
                bgColor: 'bg-red-50',
              },
              {
                icon: BookOpen,
                title: 'Rich Knowledge Base',
                description: 'Comprehensive encyclopedia of chili varieties, culinary guides, and market intelligence.',
                color: 'from-orange-600 to-amber-500',
                bgColor: 'bg-orange-50',
              }
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
                className={`group relative p-7 rounded-2xl ${feature.bgColor} border border-transparent hover:border-red-100 hover:shadow-xl hover:shadow-red-100/50 transition-all duration-300`}
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-5 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-lg font-bold font-display text-foreground mb-2">{feature.title}</h3>
                <p className="text-foreground-secondary text-sm leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── News ── */}
      <section className="py-20 bg-gradient-to-b from-stone-50 to-orange-50/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-lg">
                <Newspaper className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold font-display text-foreground">Latest Chili News</h2>
                <p className="text-sm text-foreground-muted">Real-time updates from around the world</p>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-foreground-muted bg-white px-3 py-1.5 rounded-full border border-border">
              <Clock className="h-3.5 w-3.5" />
              {lastUpdated ? `Updated ${new Date(lastUpdated).toLocaleTimeString()}` : 'Updated just now'}
            </div>
          </div>

          {isLoading ? (
            <div className="grid md:grid-cols-3 gap-5">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-card rounded-xl p-4 animate-pulse border border-border">
                  <div className="h-36 bg-surface rounded-lg mb-4" />
                  <div className="h-4 bg-surface rounded w-3/4 mb-2" />
                  <div className="h-3 bg-surface rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid md:grid-cols-3 gap-6">
              {news.map((article, index) => (
                <motion.a
                  key={article.id}
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:shadow-red-100/30 hover:-translate-y-1 transition-all duration-300 border border-border"
                >
                  <div className="h-40 bg-surface relative overflow-hidden">
                    <img 
                      src={article.image} 
                      alt={article.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x200?text=Chili+News'
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div className="p-5">
                    <h3 className="font-semibold text-foreground text-sm mb-3 line-clamp-2 group-hover:text-red-600 transition-colors leading-snug">
                      {article.title}
                    </h3>
                    <div className="flex items-center justify-between text-xs text-foreground-muted">
                      <span className="font-medium">{article.source}</span>
                      <span>{new Date(article.date).toLocaleDateString()}</span>
                    </div>
                  </div>
                </motion.a>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Recipes ── */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg">
                <UtensilsCrossed className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold font-display text-foreground">Trending Chili Recipes</h2>
                <p className="text-sm text-foreground-muted">Delicious dishes featuring native chilies</p>
              </div>
            </div>
            <Link to="/culinary" className="text-red-600 hover:text-red-700 text-sm font-semibold flex items-center gap-1 transition-colors group">
              View All <ChevronRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {recipes.map((recipe, index) => (
              <motion.div
                key={recipe.id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
                className="group bg-white rounded-2xl overflow-hidden border border-border hover:shadow-xl hover:shadow-orange-100/40 hover:-translate-y-1 transition-all duration-300"
              >
                <div className="h-48 bg-surface relative overflow-hidden">
                  <img 
                    src={recipe.image} 
                    alt={recipe.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x200?text=Filipino+Recipe'
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                  <div className="absolute top-3 right-3 px-2.5 py-1 bg-white/95 backdrop-blur-sm rounded-full text-xs font-bold text-foreground shadow-sm">
                    {recipe.difficulty}
                  </div>
                </div>
                <div className="p-5">
                  <h3 className="font-bold text-foreground mb-1.5 text-lg group-hover:text-red-600 transition-colors">{recipe.title}</h3>
                  <p className="text-sm text-foreground-secondary mb-3 leading-relaxed">{recipe.description}</p>
                  <div className="flex items-center gap-1.5 text-xs text-foreground-muted font-medium">
                    <Clock className="h-3.5 w-3.5 text-orange-500" />
                    {recipe.prepTime}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Events ── */}
      <section className="py-20 hero-gradient relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-orange-500/10 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full bg-red-500/10 blur-3xl" />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center backdrop-blur-sm border border-white/10">
              <Calendar className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold font-display text-white">Upcoming Chili Events</h2>
              <p className="text-sm text-white/50">Don't miss these exciting events</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {events.map((event, index) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.08 }}
                viewport={{ once: true }}
                className="group bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/15 hover:bg-white/20 hover:border-white/25 hover:-translate-y-1 transition-all duration-300"
              >
                <span className="inline-block px-2.5 py-1 bg-white/20 rounded-full text-[10px] font-bold text-white uppercase tracking-wider mb-4">
                  {event.type}
                </span>
                <h3 className="font-bold text-white text-sm mb-4 leading-snug">{event.title}</h3>
                <div className="space-y-2 text-xs text-white/55">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    <span>{event.location}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5 shrink-0" />
                    <span>{event.date}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-24 bg-gradient-to-br from-red-800 via-red-700 to-orange-700 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full bg-orange-500/10 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-96 h-96 rounded-full bg-red-500/10 blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] rounded-full bg-white/[0.02] rotate-12" />
        </div>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 rounded-full text-sm text-white/80 mb-6 backdrop-blur-sm border border-white/10">
              <Zap className="h-4 w-4 text-yellow-300" /> Join the ChiliScope Community
            </div>
            <h2 className="text-4xl lg:text-5xl font-bold font-display text-white mb-5 leading-tight">
              Ready to Predict Chili<br />Heat Levels?
            </h2>
            <p className="text-lg text-white/55 mb-10 max-w-2xl mx-auto leading-relaxed">
              Join researchers, farmers, and chili enthusiasts using AI to revolutionize chili cultivation and analysis.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/register">
                <Button size="lg" className="bg-white text-red-800 hover:bg-white/90 shadow-xl shadow-black/20 font-bold h-13 px-10 text-base">
                  Create Free Account <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link to="/forum">
                <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10 bg-white/5 backdrop-blur-sm h-13 px-10 text-base">
                  <MessageSquare className="mr-2 h-5 w-5" /> Browse Forum
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="footer-bg py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-600 to-orange-500 flex items-center justify-center shadow-md">
                <Flame className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-bold text-white/80">ChiliScope</span>
            </div>
            <p className="text-xs text-white/40 text-center">
              © 2026 ChiliScope — Technological University of the Philippines Taguig | Developed by Group 9
            </p>
            <div className="flex gap-6 text-xs text-white/40">
              <Link to="/about" className="hover:text-white/80 transition-colors">About Us</Link>
              <a href="#" className="hover:text-white/80 transition-colors">Privacy</a>
              <a href="#" className="hover:text-white/80 transition-colors">Terms</a>
              <a href="#" className="hover:text-white/80 transition-colors">Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
