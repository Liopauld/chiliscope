import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  Flame, ArrowLeft, Mail, Phone, MapPin,
  GraduationCap, Code2, Leaf, Brain,
} from 'lucide-react'

const developers = [
  {
    name: 'Paul Dominic Syparrado',
    photo: '/images/syparrado.png',
    phone: '09770035933',
    address: '26-C Ilang-Ilang St., Wawa, Taguig City',
    email: 'pauldominic.syparrado@tup.edu.ph',
    role: 'Full-Stack Developer',
  },
  {
    name: 'Maricarl C. Leaño',
    photo: '/images/leano.png',
    phone: '09765387998',
    address: 'Purok 6-C, 12, Jasmin, Lower Bicutan, Taguig City',
    email: 'maricarl.leano@tup.edu.ph',
    role: 'Frontend Developer',
  },
  {
    name: 'Renz Mark A. Madera',
    photo: '/images/madera.jpg',
    phone: '09947407994',
    address: '08 Alagao St. Western Bicutan, Taguig City',
    email: 'renzmark.madera@tup.edu.ph',
    role: 'Backend Developer',
  },
  {
    name: 'Richard Anthony G. Iddurut',
    photo: '/images/iddurut.jpg',
    phone: '09930065091',
    address: '7110 Kasoy St. Comembo Taguig City',
    emails: ['richardainthony@gmail.com', 'richardanthony.iddurut@tup.edu.ph'],
    role: 'ML Engineer',
  },
]

export default function AboutUs() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-amber-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-red-700 via-red-600 to-orange-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <Link
              to="/landing"
              className="flex items-center gap-2 text-white/80 hover:text-white transition-colors text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                <Flame className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-lg tracking-tight">ChiliScope</span>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-r from-red-700 via-red-600 to-orange-600 text-white pb-20 pt-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-2 text-sm mb-6 backdrop-blur-sm">
              <GraduationCap className="w-4 h-4" />
              Technological University of the Philippines — Taguig
            </div>
            <h1 className="text-4xl sm:text-5xl font-extrabold font-display mb-4">
              Meet <span className="text-amber-300">Group 9</span>
            </h1>
            <p className="text-white/80 text-lg max-w-2xl mx-auto leading-relaxed">
              The developers behind ChiliScope — an AI-powered Philippine chili pepper
              identification and analysis system built as a capstone project.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Project Overview Cards */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-12">
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { icon: Leaf, title: 'Chili Identification', desc: 'Classify Siling Haba, Labuyo & Demonyo using computer vision' },
            { icon: Brain, title: 'ML Predictions', desc: 'Predict SHU heat levels and maturity with trained models' },
            { icon: Code2, title: 'Full-Stack App', desc: 'Web, mobile & API — React, React Native, FastAPI' },
          ].map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.1 }}
              className="bg-white rounded-2xl shadow-lg p-6 border border-red-100"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center mb-3">
                <item.icon className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-bold text-gray-900 mb-1">{item.title}</h3>
              <p className="text-sm text-gray-500">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Developers */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-extrabold font-display text-gray-900 mb-3">The Developers</h2>
          <p className="text-gray-500 max-w-lg mx-auto">
            Group 9 — BS Information Technology students building intelligent agricultural solutions.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {developers.map((dev, i) => (
            <motion.div
              key={dev.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              viewport={{ once: true }}
              className="group bg-white rounded-2xl shadow-md hover:shadow-xl border border-gray-100 overflow-hidden transition-all duration-300 hover:-translate-y-1"
            >
              {/* Photo */}
              <div className="h-64 bg-gradient-to-br from-red-100 to-orange-100 relative overflow-hidden">
                <img
                  src={dev.photo}
                  alt={dev.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-4">
                  <span className="inline-block bg-red-600 text-white text-xs font-bold px-2.5 py-1 rounded-full">
                    {dev.role}
                  </span>
                </div>
              </div>

              {/* Info */}
              <div className="p-5 space-y-3">
                <h3 className="font-bold text-gray-900 text-lg">{dev.name}</h3>

                <div className="space-y-2 text-sm text-gray-500">
                  <div className="flex items-start gap-2">
                    <Phone className="w-4 h-4 mt-0.5 text-red-400 shrink-0" />
                    <span>{dev.phone}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 mt-0.5 text-red-400 shrink-0" />
                    <span>{dev.address}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Mail className="w-4 h-4 mt-0.5 text-red-400 shrink-0" />
                    <div>
                      {'emails' in dev && dev.emails ? (
                        (dev.emails as string[]).map((e) => (
                          <a
                            key={e}
                            href={`mailto:${e}`}
                            className="block text-red-600 hover:underline break-all"
                          >
                            {e}
                          </a>
                        ))
                      ) : (
                        <a
                          href={`mailto:${dev.email}`}
                          className="text-red-600 hover:underline break-all"
                        >
                          {dev.email}
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-400 text-sm">
            © 2026 ChiliScope — Technological University of the Philippines Taguig | Group 9 Capstone Project
          </p>
        </div>
      </footer>
    </div>
  )
}
