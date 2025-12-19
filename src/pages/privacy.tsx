import React from 'react';

const PrivacyPage = () => {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <div className="max-w-4xl mx-auto px-6 py-16 space-y-8">
        <div className="space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold text-white bg-gradient-to-r from-orange-500 to-pink-500 bg-clip-text text-transparent">
            Privacy Policy
          </h1>
          <p className="text-slate-400">Effective Date: December 19, 2025</p>
        </div>

        <section className="space-y-3 bg-slate-800/50 p-6 rounded-lg border border-slate-700">
          <h2 className="text-2xl font-semibold text-white">1. Introduction</h2>
          <p className="text-slate-300 leading-relaxed">
            WorkDash ("we," "us," or "our") is committed to protecting your privacy. This Privacy Policy
            explains how we collect, use, disclose, and safeguard your information when you use our application
            and services.
          </p>
        </section>

        <section className="space-y-3 bg-slate-800/50 p-6 rounded-lg border border-slate-700">
          <h2 className="text-2xl font-semibold text-white">2. Information We Collect</h2>
          <p className="text-slate-300 leading-relaxed">We collect the following types of information:</p>
          <ul className="list-disc ml-6 space-y-2 text-slate-300">
            <li>
              <strong className="text-white">Account Information:</strong> Email address, username, and password
              (hashed and secured)
            </li>
            <li>
              <strong className="text-white">Profile Data:</strong> Display name, avatar, and other optional
              profile information you provide
            </li>
            <li>
              <strong className="text-white">Usage Data:</strong> Activity logs, feature usage, session duration,
              and interaction patterns
            </li>
            <li>
              <strong className="text-white">Communication Data:</strong> Messages, voice/video call metadata
              (not content), and collaboration activity
            </li>
            <li>
              <strong className="text-white">Technical Data:</strong> IP address, device information, browser type,
              and operating system
            </li>
          </ul>
        </section>

        <section className="space-y-3 bg-slate-800/50 p-6 rounded-lg border border-slate-700">
          <h2 className="text-2xl font-semibold text-white">3. How We Use Your Information</h2>
          <p className="text-slate-300 leading-relaxed">We use your information to:</p>
          <ul className="list-disc ml-6 space-y-2 text-slate-300">
            <li>Provide, maintain, and improve our services</li>
            <li>Authenticate users and secure accounts</li>
            <li>Enable real-time communication and collaboration features</li>
            <li>Analyze usage patterns to enhance user experience</li>
            <li>Send service-related notifications and updates</li>
            <li>Detect and prevent fraud, abuse, and security incidents</li>
            <li>Comply with legal obligations</li>
          </ul>
        </section>

        <section className="space-y-3 bg-slate-800/50 p-6 rounded-lg border border-slate-700">
          <h2 className="text-2xl font-semibold text-white">4. Voice, Video, and Screen Sharing</h2>
          <p className="text-slate-300 leading-relaxed">
            All real-time voice, video, and screen sharing communications are end-to-end encrypted using
            WebRTC/Mediasoup technology. We do not record, store, or access the content of your communications.
            Only metadata (such as call duration and participant information) may be logged for operational purposes.
          </p>
        </section>

        <section className="space-y-3 bg-slate-800/50 p-6 rounded-lg border border-slate-700">
          <h2 className="text-2xl font-semibold text-white">5. Data Storage and Security</h2>
          <p className="text-slate-300 leading-relaxed">
            We implement industry-standard security measures to protect your data, including:
          </p>
          <ul className="list-disc ml-6 space-y-2 text-slate-300">
            <li>Encrypted data transmission (HTTPS/TLS)</li>
            <li>Secure password hashing (bcrypt or similar)</li>
            <li>Regular security audits and updates</li>
            <li>Access controls and authentication mechanisms</li>
            <li>Data backup and disaster recovery procedures</li>
          </ul>
          <p className="text-slate-300 leading-relaxed mt-3">
            While we strive to protect your information, no method of transmission or storage is 100% secure.
            You use our services at your own risk.
          </p>
        </section>

        <section className="space-y-3 bg-slate-800/50 p-6 rounded-lg border border-slate-700">
          <h2 className="text-2xl font-semibold text-white">6. Data Sharing and Disclosure</h2>
          <p className="text-slate-300 leading-relaxed">
            We do not sell your personal information. We may share your data only in these circumstances:
          </p>
          <ul className="list-disc ml-6 space-y-2 text-slate-300">
            <li>
              <strong className="text-white">With Your Consent:</strong> When you explicitly authorize us to
              share information
            </li>
            <li>
              <strong className="text-white">Service Providers:</strong> Third-party vendors who assist in
              operating our services (e.g., hosting, analytics)
            </li>
            <li>
              <strong className="text-white">Legal Compliance:</strong> When required by law, court order, or
              government authority
            </li>
            <li>
              <strong className="text-white">Safety and Security:</strong> To protect against fraud, abuse, or
              security threats
            </li>
          </ul>
        </section>

        <section className="space-y-3 bg-slate-800/50 p-6 rounded-lg border border-slate-700">
          <h2 className="text-2xl font-semibold text-white">7. Cookies and Tracking</h2>
          <p className="text-slate-300 leading-relaxed">
            We use cookies and similar tracking technologies to maintain sessions, analyze usage, and improve
            functionality. You can control cookie preferences through your browser settings, but disabling
            cookies may affect certain features.
          </p>
        </section>

        <section className="space-y-3 bg-slate-800/50 p-6 rounded-lg border border-slate-700">
          <h2 className="text-2xl font-semibold text-white">8. Data Retention</h2>
          <p className="text-slate-300 leading-relaxed">
            We retain your data for as long as your account is active or as needed to provide services.
            After account deletion, we may retain certain information for legal, security, or operational
            purposes for a reasonable period.
          </p>
        </section>

        <section className="space-y-3 bg-slate-800/50 p-6 rounded-lg border border-slate-700">
          <h2 className="text-2xl font-semibold text-white">9. Your Rights</h2>
          <p className="text-slate-300 leading-relaxed">You have the right to:</p>
          <ul className="list-disc ml-6 space-y-2 text-slate-300">
            <li>Access, update, or delete your personal information</li>
            <li>Export your data in a portable format</li>
            <li>Opt out of marketing communications</li>
            <li>Request restriction of data processing</li>
            <li>Object to automated decision-making</li>
            <li>Withdraw consent at any time</li>
          </ul>
          <p className="text-slate-300 leading-relaxed mt-3">
            To exercise these rights, contact us at workdash@gmail.com.
          </p>
        </section>

        <section className="space-y-3 bg-slate-800/50 p-6 rounded-lg border border-slate-700">
          <h2 className="text-2xl font-semibold text-white">10. Children's Privacy</h2>
          <p className="text-slate-300 leading-relaxed">
            Our services are not intended for users under 13 years of age. We do not knowingly collect
            information from children. If we discover we have collected data from a child, we will delete
            it promptly.
          </p>
        </section>

        <section className="space-y-3 bg-slate-800/50 p-6 rounded-lg border border-slate-700">
          <h2 className="text-2xl font-semibold text-white">11. International Data Transfers</h2>
          <p className="text-slate-300 leading-relaxed">
            Your data may be transferred to and processed in countries other than your own. We ensure
            appropriate safeguards are in place to protect your information in compliance with applicable
            data protection laws.
          </p>
        </section>

        <section className="space-y-3 bg-slate-800/50 p-6 rounded-lg border border-slate-700">
          <h2 className="text-2xl font-semibold text-white">12. Changes to This Policy</h2>
          <p className="text-slate-300 leading-relaxed">
            We may update this Privacy Policy from time to time. We will notify you of significant changes
            by posting the new policy on our website and updating the effective date. Continued use of our
            services constitutes acceptance of the updated policy.
          </p>
        </section>

        <section className="space-y-3 bg-slate-800/50 p-6 rounded-lg border border-slate-700">
          <h2 className="text-2xl font-semibold text-white">Contact Us</h2>
          <p className="text-slate-300 leading-relaxed">
            If you have questions or concerns about this Privacy Policy or our data practices, please contact us at:
          </p>
          <p className="text-slate-300 leading-relaxed mt-2">
            Email: workdash@gmail.com
          </p>
        </section>
      </div>
    </div>
  );
};

export default PrivacyPage;
