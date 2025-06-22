export function Footer() {
  return (
    <footer className="w-full border-t border-neutral-200/50 bg-[#F5F5F7]">
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="space-y-4">
            <h3 className="text-base font-semibold text-[#1D1D1F]">
              MediBuddy AI
            </h3>
            <p className="text-base text-[#86868B] leading-relaxed">
              Revolutionizing clinical trial matching through AI-powered
              conversation analysis.
            </p>
          </div>
          <div className="space-y-4">
            <h4 className="text-base font-semibold text-[#1D1D1F]">Features</h4>
            <ul className="space-y-3">
              <li className="text-base text-[#86868B] hover:text-[#1D1D1F] transition-colors">
                AI Transcription
              </li>
              <li className="text-base text-[#86868B] hover:text-[#1D1D1F] transition-colors">
                Trial Matching
              </li>
              <li className="text-base text-[#86868B] hover:text-[#1D1D1F] transition-colors">
                HIPAA Compliant
              </li>
            </ul>
          </div>
          <div className="space-y-4">
            <h4 className="text-base font-semibold text-[#1D1D1F]">
              Resources
            </h4>
            <ul className="space-y-3">
              <li>
                <a
                  href="/docs"
                  className="text-base text-[#86868B] hover:text-[#0066CC] transition-colors"
                >
                  Documentation
                </a>
              </li>
              <li>
                <a
                  href="/support"
                  className="text-base text-[#86868B] hover:text-[#0066CC] transition-colors"
                >
                  Support
                </a>
              </li>
              <li>
                <a
                  href="/blog"
                  className="text-base text-[#86868B] hover:text-[#0066CC] transition-colors"
                >
                  Blog
                </a>
              </li>
            </ul>
          </div>
          <div className="space-y-4">
            <h4 className="text-base font-semibold text-[#1D1D1F]">Legal</h4>
            <ul className="space-y-3">
              <li>
                <a
                  href="/privacy"
                  className="text-base text-[#86868B] hover:text-[#0066CC] transition-colors"
                >
                  Privacy Policy
                </a>
              </li>
              <li>
                <a
                  href="/terms"
                  className="text-base text-[#86868B] hover:text-[#0066CC] transition-colors"
                >
                  Terms of Service
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-16 pt-8 border-t border-neutral-200/50">
          <p className="text-center text-sm text-[#86868B]">
            © {new Date().getFullYear()} MediBuddy AI. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
