import { Link } from 'react-router-dom'
import { ArrowLeft, FileText } from 'lucide-react'

export default function Terms() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 text-white">
      <div className="max-w-3xl mx-auto px-4 py-16">
        <Link to="/landing" className="inline-flex items-center gap-2 text-white/60 hover:text-white mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>

        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 to-orange-500 flex items-center justify-center">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-3xl font-bold">Terms of Service</h1>
        </div>

        <p className="text-white/40 text-sm mb-10">Last updated: March 10, 2026</p>

        <div className="space-y-8 text-white/70 text-sm leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-white mb-3">1. Acceptance of Terms</h2>
            <p>By accessing and using ChiliScope, you agree to be bound by these Terms of Service. If you do not agree, please do not use the platform.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">2. Description of Service</h2>
            <p>ChiliScope is an AI-powered chili pepper analysis platform that provides:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Chili variety identification using deep learning models.</li>
              <li>Maturity stage assessment and health/disease detection.</li>
              <li>A chili encyclopedia, culinary guide, and growth guide.</li>
              <li>Real-time market price tracking and prediction for Philippine chili varieties.</li>
              <li>Community forum for knowledge sharing.</li>
              <li>AI-powered chat assistant for chili-related queries.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">3. User Accounts</h2>
            <ul className="list-disc list-inside space-y-1">
              <li>You must provide accurate information when creating an account.</li>
              <li>You are responsible for maintaining the security of your account credentials.</li>
              <li>You must not share your account with others or create multiple accounts.</li>
              <li>We reserve the right to suspend or terminate accounts that violate these terms.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">4. Acceptable Use</h2>
            <p>You agree not to:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Upload content that is offensive, illegal, or violates intellectual property rights.</li>
              <li>Attempt to reverse-engineer, exploit, or attack the platform or its AI models.</li>
              <li>Use automated tools to scrape data or overload the system.</li>
              <li>Misrepresent analysis results for commercial purposes without proper attribution.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">5. Intellectual Property</h2>
            <p>The ChiliScope platform, including its AI models, design, and content, is the intellectual property of the development team at TUP-Taguig (Group 9). You retain ownership of images you upload, but grant us a license to process them for analysis purposes.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">6. Disclaimer</h2>
            <p>ChiliScope's AI analysis results are provided for informational and educational purposes only. While we strive for accuracy, results should not be the sole basis for agricultural or commercial decisions. The platform is provided "as is" without warranties of any kind.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">7. Market Price Data</h2>
            <p>Market price data displayed on ChiliScope is sourced from publicly available records and may include estimated values. Price predictions are AI-generated forecasts and should not be treated as financial advice.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">8. Limitation of Liability</h2>
            <p>ChiliScope, its developers, and the Technological University of the Philippines shall not be liable for any direct, indirect, or consequential damages arising from the use of this platform.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">9. Changes to Terms</h2>
            <p>We may update these terms from time to time. Continued use of the platform after changes constitutes acceptance of the new terms.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">10. Contact</h2>
            <p>For questions about these terms, contact us at <a href="mailto:chiliscope.tuptaguig@gmail.com" className="text-red-400 hover:text-red-300 underline">chiliscope.tuptaguig@gmail.com</a>.</p>
          </section>
        </div>
      </div>
    </div>
  )
}
