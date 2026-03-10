import { Link } from 'react-router-dom'
import { ArrowLeft, Mail, MapPin, Clock } from 'lucide-react'

export default function Contact() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 text-white">
      <div className="max-w-3xl mx-auto px-4 py-16">
        <Link to="/landing" className="inline-flex items-center gap-2 text-white/60 hover:text-white mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>

        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 to-orange-500 flex items-center justify-center">
            <Mail className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-3xl font-bold">Contact Us</h1>
        </div>

        <p className="text-white/60 mb-10">Have questions, feedback, or need support? Reach out to the ChiliScope team.</p>

        <div className="grid gap-6 sm:grid-cols-2 mb-12">
          <div className="bg-white/5 rounded-xl p-6 border border-white/10">
            <Mail className="w-6 h-6 text-red-400 mb-3" />
            <h3 className="font-semibold text-white mb-1">Email</h3>
            <a href="mailto:chiliscope.tuptaguig@gmail.com" className="text-sm text-red-400 hover:text-red-300 underline break-all">
              chiliscope.tuptaguig@gmail.com
            </a>
          </div>

          <div className="bg-white/5 rounded-xl p-6 border border-white/10">
            <MapPin className="w-6 h-6 text-red-400 mb-3" />
            <h3 className="font-semibold text-white mb-1">Location</h3>
            <p className="text-sm text-white/60">
              Technological University of the Philippines – Taguig<br />
              Km. 14, East Service Road, South Superhighway<br />
              Taguig City, Metro Manila, Philippines
            </p>
          </div>

          <div className="bg-white/5 rounded-xl p-6 border border-white/10">
            <Clock className="w-6 h-6 text-red-400 mb-3" />
            <h3 className="font-semibold text-white mb-1">Response Time</h3>
            <p className="text-sm text-white/60">
              We typically respond within 1–2 business days.
            </p>
          </div>

          <div className="bg-white/5 rounded-xl p-6 border border-white/10">
            <div className="w-6 h-6 text-red-400 mb-3 font-bold text-lg">G9</div>
            <h3 className="font-semibold text-white mb-1">Development Team</h3>
            <p className="text-sm text-white/60">
              ChiliScope is developed by Group 9 as a capstone project at TUP-Taguig.
            </p>
          </div>
        </div>

        <div className="bg-white/5 rounded-xl p-8 border border-white/10">
          <h2 className="text-lg font-semibold text-white mb-4">Common Topics</h2>
          <div className="space-y-3 text-sm text-white/60">
            <div className="flex items-start gap-3">
              <span className="text-red-400 font-bold mt-0.5">•</span>
              <div><strong className="text-white/80">Account Issues:</strong> Problems with login, registration, or Google Sign-In.</div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-red-400 font-bold mt-0.5">•</span>
              <div><strong className="text-white/80">Analysis Questions:</strong> Questions about chili identification accuracy or results.</div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-red-400 font-bold mt-0.5">•</span>
              <div><strong className="text-white/80">Data & Privacy:</strong> Requests to access, export, or delete your data.</div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-red-400 font-bold mt-0.5">•</span>
              <div><strong className="text-white/80">Bug Reports:</strong> Something not working as expected on the platform.</div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-red-400 font-bold mt-0.5">•</span>
              <div><strong className="text-white/80">Feature Requests:</strong> Suggestions for new features or improvements.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
