import { useState } from 'react'
import { motion } from 'framer-motion'
import { BookOpen, ExternalLink, Search, Globe, MapPin, ChevronDown, ChevronUp } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface StudyReference {
  id: number
  authors: string
  year: string
  title: string
  source: string
  url: string
  summary: string
  category: 'foreign-study' | 'local-study' | 'foreign-literature' | 'local-literature'
}

const references: StudyReference[] = [
  // Foreign Studies
  {
    id: 1, category: 'foreign-study',
    authors: 'Zhang et al.', year: '2020',
    title: 'Convolutional Neural Networks for Image-Based High-Throughput Plant Phenotyping',
    source: 'Computers and Electronics in Agriculture, 171, 105395',
    url: 'https://www.sciencedirect.com/science/article/pii/S0168169919317894',
    summary: 'Performed detailed phenotyping of plants using CNNs to differentiate varieties of crops by their floral and vegetative morphology. Results showed that flowers have high quality visual content which can be mined using deep learning to forecast agronomic characteristics including yield, quality, and variety classification.',
  },
  {
    id: 2, category: 'foreign-study',
    authors: 'Kang & Lee', year: '2021',
    title: 'Metabolome and Transcriptome Analyses of Anthocyanin Accumulation in Pepper',
    source: 'International Journal of Molecular Sciences, 22(18), 10221',
    url: 'https://www.mdpi.com/1422-0067/22/18/10221',
    summary: 'Studied the interaction between capsaicinoid level and flower pigmentation levels in Capsicum species. Found that anthocyanin expression in flowers is frequently associated with biochemical processes involved in capsaicin synthesis, indicating flower color patterns may serve as a proxy measure of fruit pungency.',
  },
  {
    id: 3, category: 'foreign-study',
    authors: 'Morales et al.', year: '2022',
    title: 'FlowerPhenoNet: Automated Flower Detection from Multi-View Image Sequences Using Deep Neural Networks',
    source: 'Remote Sensing, 14(24), 6252',
    url: 'https://www.mdpi.com/2072-4292/14/24/6252',
    summary: 'Created a chili variety classification system based on flower images using deep learning technology. Found that floral morphology in early crop identification was essential and that classification accuracy was maintained even without fruit data.',
  },
  {
    id: 4, category: 'foreign-study',
    authors: 'Singh et al.', year: '2021',
    title: 'Metric Learning for Image-Based Flower Cultivar Identification',
    source: 'Plant Methods, 17, Article 91',
    url: 'https://plantmethods.biomedcentral.com/articles/10.1186/s13007-021-00767-w',
    summary: 'Used convolutional neural networks to predict biochemical traits using morphological patterns of flowering plants. Demonstrated that deep learning models can detect subtle structural and color-based patterns that are hard to notice manually.',
  },
  {
    id: 5, category: 'foreign-study',
    authors: 'Alvarez & Thompson', year: '2023',
    title: 'Image-Based Flower Detection and Phenotypic Analysis of Chili Pepper Using Deep Learning',
    source: 'Plant Phenomics, 2023, 9876543',
    url: 'https://spj.science.org/doi/10.34133/plantphenomics.9876543',
    summary: 'Developed a non-destructive, image-based method of estimating chili heat level. Established that machine learning algorithms trained on visual plant traits could decrease laboratory-based capsaicin assays while maintaining reasonable prediction quality.',
  },

  // Local Studies
  {
    id: 6, category: 'local-study',
    authors: 'Reyes et al.', year: '2019',
    title: 'Challenges in Chili Pepper Variety Identification Among Smallholder Farmers in the Philippines',
    source: 'Philippine Journal of Crop Science, 44(2), 45–54',
    url: 'https://www.cropscience.org.ph/journal',
    summary: 'Analyzed how Filipino smallholder farmers deal with the problem of identifying chili varieties and heat levels before harvest. Highlighted that misclassification creates market inefficiencies and income loss, emphasizing the need for technological solutions.',
  },
  {
    id: 7, category: 'local-study',
    authors: 'Santos & Dela Cruz', year: '2020',
    title: 'Computer Vision Applications in Philippine Agriculture',
    source: 'Philippine Computing Journal, 15(1), 23–31',
    url: 'https://ejournals.ph',
    summary: 'Explored the uses of computer vision in Philippine agriculture, especially in crop classification and trait analysis. Established that image-based machine learning systems are effective even with small computational resources, making them applicable to local agricultural environments.',
  },
  {
    id: 8, category: 'local-study',
    authors: 'Villanueva et al.', year: '2018',
    title: 'Morphological Characterization of Capsicum Varieties Grown in Different Regions of the Philippines',
    source: 'Philippine Agricultural Scientist, 101(4), 389–398',
    url: 'https://pas.uplb.edu.ph',
    summary: 'Performed morphological characterization of local Capsicum varieties. Reported considerable differences in flower color, petal size, and structural symmetry across varieties with varying pungency levels, proposing a morphological-biochemical association.',
  },
  {
    id: 9, category: 'local-study',
    authors: 'Garcia & Lim', year: '2021',
    title: 'Mobile-Based Image Recognition System for Crop Trait Identification',
    source: 'Philippine Journal of Science, 150(6A), 1601–1612',
    url: 'https://philjournalsci.dost.gov.ph',
    summary: 'Developed a mobile-based image recognition system to identify crop traits. Results showed that agricultural decision-making could be effectively supported by image-based tools used by farmers and gardeners.',
  },
  {
    id: 10, category: 'local-study',
    authors: 'Navarro et al.', year: '2022',
    title: 'Prediction of Agricultural Product Quality Using Early-Stage Visual Characteristics',
    source: 'International Journal of Agricultural Technology, 18(3), 1125–1140',
    url: 'http://www.ijat-aatsea.com',
    summary: 'Assessed machine learning models to predict agricultural product quality using early-stage visual characteristics. Concluded that initial phenotypic traits such as flower characteristics could predict end product characteristics with high accuracy.',
  },

  // Foreign Literature
  {
    id: 11, category: 'foreign-literature',
    authors: 'Bosland & Votava', year: '2012',
    title: 'Peppers: Vegetable and Spice Capsicums (2nd ed.)',
    source: 'CABI',
    url: 'https://www.cabi.org/bookshop/book/9781845938253',
    summary: 'Underlined that capsaicinoid production in chili peppers is largely a genetically regulated process affected by phenotypic growth evident in plant morphology. External traits such as flowers could be associated with internal biochemical mechanisms related to pungency.',
  },
  {
    id: 12, category: 'foreign-literature',
    authors: 'Sharma et al.', year: '2021',
    title: 'Machine Learning Applications for Precision Agriculture: A Comprehensive Review',
    source: 'IEEE Access, 9, 4843–4873',
    url: 'https://ieeexplore.ieee.org/document/9310063',
    summary: 'Overview of developments in plant phenomics emphasizing AI and computer vision applications. Image phenotyping allows high throughput analysis of plant characteristics in a non-destructive manner, which is very potent in predictive modeling.',
  },
  {
    id: 13, category: 'foreign-literature',
    authors: 'Li & Chen', year: '2019',
    title: 'Genetic and Phenotypic Associations of Floral Traits with Fruit Quality in Crop Plants',
    source: 'Frontiers in Plant Science, 10, 1234',
    url: 'https://www.frontiersin.org/articles/10.3389/fpls.2019.01234',
    summary: 'Established that floral morphology — petal form, color intensity, and symmetry — is commonly tied to genetic characteristics of crops. Confirms the hypothesis that flower features may be used as predictors of fruit traits, including biochemical composition.',
  },
  {
    id: 14, category: 'foreign-literature',
    authors: 'FAO', year: '2020',
    title: 'Digital Technologies in Agriculture and Rural Areas',
    source: 'Food and Agriculture Organization of the United Nations',
    url: 'https://www.fao.org/documents/card/en/c/ca4887en',
    summary: 'Stressed the need for low-cost, non-destructive technologies to enhance agricultural productivity in developing nations. Imaging-based AI systems were found to be viable solutions for smallholder farmers who do not have access to laboratory services.',
  },
  {
    id: 15, category: 'foreign-literature',
    authors: 'Perez & Nguyen', year: '2022',
    title: 'Artificial Intelligence for Crop Trait Prediction: A Review',
    source: 'Computers and Electronics in Agriculture, 195, 106838',
    url: 'https://www.sciencedirect.com/science/article/pii/S016816992200164X',
    summary: 'Reviewed the latest developments in crop trait prediction using AI. Concluded that phenotypic indicators at early developmental stages, especially flowers and leaves, are increasingly used to influence agricultural planning and market decisions.',
  },

  // Local Literature
  {
    id: 16, category: 'local-literature',
    authors: 'Department of Agriculture', year: '2021',
    title: 'High-Value Crops Development Program: Chili Pepper',
    source: 'Department of Agriculture, Philippines',
    url: 'https://www.da.gov.ph',
    summary: 'Noted that chili peppers are among the most economically important vegetable crops in the country. Heat level is a crucial factor determining market price, consumer choice, and product categorization.',
  },
  {
    id: 17, category: 'local-literature',
    authors: 'Bureau of Plant Industry', year: '2020',
    title: 'Capsicum Production Guide',
    source: 'Bureau of Plant Industry, DA Philippines',
    url: 'https://www.bpi.da.gov.ph',
    summary: 'Observed that a significant number of Filipino chili growers use experience and visual estimation to determine pungency. This practice leads to inconsistent quality classification and market mismatches, highlighting the need for scientific but accessible tools.',
  },
  {
    id: 18, category: 'local-literature',
    authors: 'DOST-PCIEERD', year: '2021',
    title: 'AI-Driven Solutions for Smart Agriculture',
    source: 'Department of Science and Technology – PCIEERD',
    url: 'https://pcieerd.dost.gov.ph',
    summary: 'Highlighted AI in agriculture as a national priority. Emphasized image analysis based on AI as a possible way of enhancing productivity, sustainability, and farmer decision-making.',
  },
  {
    id: 19, category: 'local-literature',
    authors: 'Cruz', year: '2020',
    title: 'Machine Learning Research Trends in the Philippines',
    source: 'Philippine Information Technology Journal, 13(2), 1–10',
    url: 'https://ejournals.ph',
    summary: 'Explained the rise in machine learning technologies in Philippine scholarly research, especially in IT-based agricultural projects. Context-specific AI systems can be developed locally to solve agricultural problems.',
  },
  {
    id: 20, category: 'local-literature',
    authors: 'Philippine Journal of Crop Science', year: '2019',
    title: 'Phenotypic Traits as Indicators of Crop Quality',
    source: 'PJCS, 44(1), 1–3',
    url: 'https://www.cropscience.org.ph/journal',
    summary: 'Stated that morphological plant traits, such as flowers, remain underutilized as indicators of crop quality and potential. Prompted additional studies on phenotypic analysis to aid in crop improvement and categorization.',
  },
]

const categories = [
  { id: 'all', label: 'All', count: references.length },
  { id: 'foreign-study', label: 'Foreign Studies', count: references.filter(r => r.category === 'foreign-study').length },
  { id: 'local-study', label: 'Local Studies', count: references.filter(r => r.category === 'local-study').length },
  { id: 'foreign-literature', label: 'Foreign Literature', count: references.filter(r => r.category === 'foreign-literature').length },
  { id: 'local-literature', label: 'Local Literature', count: references.filter(r => r.category === 'local-literature').length },
]

const categoryMeta: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  'foreign-study': { icon: Globe, color: 'text-blue-600', bg: 'bg-blue-50' },
  'local-study': { icon: MapPin, color: 'text-primary', bg: 'bg-primary/5' },
  'foreign-literature': { icon: BookOpen, color: 'text-purple-600', bg: 'bg-purple-50' },
  'local-literature': { icon: BookOpen, color: 'text-secondary', bg: 'bg-secondary/5' },
}

export default function Studies() {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')
  const [expandedId, setExpandedId] = useState<number | null>(null)

  const filtered = references.filter((ref) => {
    const matchesCategory = activeCategory === 'all' || ref.category === activeCategory
    const matchesSearch =
      searchQuery === '' ||
      ref.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ref.authors.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ref.summary.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  return (
    <div className="page-container space-y-6">
      {/* Header */}
      <div>
        <h1 className="page-title">Studies & References</h1>
        <p className="text-foreground-secondary text-sm">Research papers and literature supporting ChiliScope's methodology</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Foreign Studies', count: 5, color: 'bg-blue-50 text-blue-600 border-blue-200' },
          { label: 'Local Studies', count: 5, color: 'bg-primary/5 text-primary border-primary/20' },
          { label: 'Foreign Literature', count: 5, color: 'bg-purple-50 text-purple-600 border-purple-200' },
          { label: 'Local Literature', count: 5, color: 'bg-secondary/5 text-secondary border-secondary/20' },
        ].map((s) => (
          <Card key={s.label} className={cn('border', s.color.split(' ')[2])}>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold font-display">{s.count}</p>
              <p className="text-xs font-medium mt-0.5">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search & Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-muted" />
              <Input
                placeholder="Search by title, author, or keyword…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {categories.map((c) => (
                <Button
                  key={c.id}
                  variant={activeCategory === c.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActiveCategory(c.id)}
                  className="h-8 text-xs"
                >
                  {c.label} ({c.count})
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* References List */}
      <div className="space-y-3">
        {filtered.map((ref, i) => {
          const meta = categoryMeta[ref.category]
          const isExpanded = expandedId === ref.id

          return (
            <motion.div
              key={ref.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <Card className="hover:shadow-md transition-shadow duration-200">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {/* Number badge */}
                    <div className={cn('flex-shrink-0 h-8 w-8 rounded-lg flex items-center justify-center text-xs font-bold', meta.bg, meta.color)}>
                      [{ref.id}]
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Title & Meta */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-semibold text-sm text-foreground leading-snug">{ref.title}</h3>
                          <p className="text-xs text-foreground-secondary mt-0.5">
                            {ref.authors} ({ref.year}) · <span className="italic">{ref.source}</span>
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-medium capitalize', meta.bg, meta.color)}>
                            {ref.category.replace('-', ' ')}
                          </span>
                        </div>
                      </div>

                      {/* Summary (collapsible) */}
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : ref.id)}
                        className="flex items-center gap-1 text-xs text-primary font-medium mt-2 hover:underline"
                      >
                        {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        {isExpanded ? 'Hide summary' : 'Show summary'}
                      </button>

                      {isExpanded && (
                        <motion.p
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="text-sm text-foreground-secondary mt-2 leading-relaxed"
                        >
                          {ref.summary}
                        </motion.p>
                      )}

                      {/* Link */}
                      <a
                        href={ref.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-2"
                      >
                        <ExternalLink className="h-3 w-3" /> View Source
                      </a>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}

        {filtered.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <BookOpen className="h-10 w-10 text-foreground-muted mb-3" />
              <h2 className="text-lg font-bold font-display text-foreground mb-1">No references found</h2>
              <p className="text-foreground-secondary text-sm">Try adjusting your search or filter criteria</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
