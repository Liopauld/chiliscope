import { Link } from 'react-router-dom'
import { ArrowLeft, Shield } from 'lucide-react'

export default function Privacy() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 text-white">
      <div className="max-w-3xl mx-auto px-4 py-16">
        <Link to="/landing" className="inline-flex items-center gap-2 text-white/60 hover:text-white mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>

        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 to-orange-500 flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-3xl font-bold">Privacy Policy</h1>
        </div>

        <p className="text-white/40 text-sm mb-10">Last updated: March 10, 2026</p>

        <div className="space-y-8 text-white/70 text-sm leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-white mb-3">1. Information We Collect</h2>
            <p>ChiliScope collects the following information when you create an account and use our services:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li><strong className="text-white/90">Account Information:</strong> Name, email address, and profile photo (via Google Sign-In or manual registration).</li>
              <li><strong className="text-white/90">Uploaded Images:</strong> Chili pepper images you upload for analysis are processed by our AI models and stored in your library.</li>
              <li><strong className="text-white/90">Analysis Results:</strong> Classification results, maturity assessments, and health analyses generated from your uploads.</li>
              <li><strong className="text-white/90">Usage Data:</strong> Pages visited, features used, and general interaction patterns to improve the platform.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">2. How We Use Your Information</h2>
            <ul className="list-disc list-inside space-y-1">
              <li>Provide chili pepper identification, maturity, and health analysis services.</li>
              <li>Maintain your analysis library and dashboard.</li>
              <li>Improve our AI models and platform features.</li>
              <li>Communicate system updates or important notices.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">3. Data Storage & Security</h2>
            <p>Your data is stored securely using MongoDB Atlas with encryption at rest and in transit. Uploaded images are stored via Cloudinary with secure access controls. We use Firebase Authentication and JWT tokens to protect your account.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">4. Data Sharing</h2>
            <p>We do not sell or share your personal information with third parties. Your uploaded images and analysis results are private to your account. Aggregated, anonymized data may be used for academic research purposes at the Technological University of the Philippines.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">5. Your Rights</h2>
            <ul className="list-disc list-inside space-y-1">
              <li>Access and download your data at any time through your account settings.</li>
              <li>Delete your account and all associated data by contacting us.</li>
              <li>Opt out of non-essential communications.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">6. Academic Use</h2>
            <p>ChiliScope is a capstone project developed at the Technological University of the Philippines – Taguig by Group 9. Data collected may be referenced in academic papers in anonymized, aggregate form only.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">7. Contact</h2>
            <p>For privacy concerns or data requests, please contact us at <a href="mailto:chiliscope.tuptaguig@gmail.com" className="text-red-400 hover:text-red-300 underline">chiliscope.tuptaguig@gmail.com</a>.</p>
          </section>
        </div>
      </div>
    </div>
  )
}
