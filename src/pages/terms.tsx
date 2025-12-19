import React from 'react';

const TermsPage = () => {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <div className="max-w-4xl mx-auto px-6 py-16 space-y-8">
        <div className="space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold text-white bg-gradient-to-r from-orange-500 to-pink-500 bg-clip-text text-transparent">
            Terms of Service
          </h1>
          <p className="text-slate-400">Effective Date: December 19, 2025</p>
        </div>

        <section className="space-y-3 bg-slate-800/50 p-6 rounded-lg border border-slate-700">
          <h2 className="text-2xl font-semibold text-white">1. Eligibility</h2>
          <p className="text-slate-300 leading-relaxed">
            You must be at least 13 years old to use this App. By using the App,
            you confirm that you have the legal right to do so.
          </p>
        </section>

        <section className="space-y-3 bg-slate-800/50 p-6 rounded-lg border border-slate-700">
          <h2 className="text-2xl font-semibold text-white">2. Account Responsibility</h2>
          <p className="text-slate-300 leading-relaxed">
            You are responsible for securing your account credentials and may not
            share accounts. Users are allowed only one free-tier account. Multiple
            accounts to abuse the free tier are prohibited.
          </p>
        </section>

        <section className="space-y-3 bg-slate-800/50 p-6 rounded-lg border border-slate-700">
          <h2 className="text-2xl font-semibold text-white">3. User Conduct</h2>
          <p className="text-slate-300 leading-relaxed">You agree not to:</p>
          <ul className="list-disc ml-6 space-y-2 text-slate-300">
            <li>Harass, threaten, abuse, or harm other users.</li>
            <li>Upload or share illegal, obscene, or infringing content.</li>
            <li>Attempt to exploit, cheat, or hack the App or game mechanics.</li>
            <li>Attempt to gain unauthorized access to servers, data, or accounts.</li>
            <li>Launch or facilitate DDoS, brute force, or other attacks against the App.</li>
            <li>Use the App to transmit viruses, malware, or malicious code.</li>
            <li>Circumvent security mechanisms or manipulate the App for unfair advantage.</li>
          </ul>
        </section>

        <section className="space-y-3 bg-slate-800/50 p-6 rounded-lg border border-slate-700">
          <h2 className="text-2xl font-semibold text-white">4. Content and Intellectual Property</h2>
          <p className="text-slate-300 leading-relaxed">
            Users retain ownership of their original content (messages, avatars, etc.).
            By using the App, you grant WorkDash a non-exclusive license to operate,
            display, and moderate content. All App code, graphics, server-side logic,
            and game assets are the property of WorkDash.
          </p>
        </section>

        <section className="space-y-3 bg-slate-800/50 p-6 rounded-lg border border-slate-700">
          <h2 className="text-2xl font-semibold text-white">5. Voice, Video, and Screen Sharing</h2>
          <p className="text-slate-300 leading-relaxed">
            All real-time communication is end-to-end encrypted via WebRTC/Mediasoup.
            The App does not store voice, video, or screen sessions unless explicitly stated.
            You are responsible for the content you share.
          </p>
        </section>

        <section className="space-y-3 bg-slate-800/50 p-6 rounded-lg border border-slate-700">
          <h2 className="text-2xl font-semibold text-white">6. Free Tier and Usage Limits</h2>
          <p className="text-slate-300 leading-relaxed">
            Abuse of free-tier accounts, creating multiple accounts, or exceeding usage limits
            may result in suspension or permanent termination.
          </p>
        </section>

        <section className="space-y-3 bg-slate-800/50 p-6 rounded-lg border border-slate-700">
          <h2 className="text-2xl font-semibold text-white">7. Privacy</h2>
          <p className="text-slate-300 leading-relaxed">
            Your use of the App is subject to our Privacy Policy, which explains what data is
            collected, how it is used, and your rights regarding that data.
          </p>
        </section>

        <section className="space-y-3 bg-slate-800/50 p-6 rounded-lg border border-slate-700">
          <h2 className="text-2xl font-semibold text-white">8. Limitation of Liability</h2>
          <p className="text-slate-300 leading-relaxed">
            The App is provided &quot;as is&quot; without warranties. WorkDash is not responsible for:
          </p>
          <ul className="list-disc ml-6 space-y-2 text-slate-300">
            <li>Loss or corruption of data</li>
            <li>Service outages or interruptions</li>
            <li>Behavior of other users</li>
            <li>Any indirect, incidental, or consequential damages</li>
          </ul>
        </section>

        <section className="space-y-3 bg-slate-800/50 p-6 rounded-lg border border-slate-700">
          <h2 className="text-2xl font-semibold text-white">9. Indemnification</h2>
          <p className="text-slate-300 leading-relaxed">
            You agree to defend, indemnify, and hold harmless WorkDash and its operators
            from any claims, damages, or expenses arising from your use of the App or violation
            of these Terms.
          </p>
        </section>

        <section className="space-y-3 bg-slate-800/50 p-6 rounded-lg border border-slate-700">
          <h2 className="text-2xl font-semibold text-white">10. Termination</h2>
          <p className="text-slate-300 leading-relaxed">
            We may suspend or terminate your account at our discretion for violations of these Terms.
            Upon termination, you lose access to all App features and data stored on our servers.
          </p>
        </section>

        <section className="space-y-3 bg-slate-800/50 p-6 rounded-lg border border-slate-700">
          <h2 className="text-2xl font-semibold text-white">11. Governing Law</h2>
          <p className="text-slate-300 leading-relaxed">
            These Terms are governed by the laws of the Philippines. Any disputes will be resolved
            in the courts of the Philippines unless otherwise agreed.
          </p>
        </section>

        <section className="space-y-3 bg-slate-800/50 p-6 rounded-lg border border-slate-700">
          <h2 className="text-2xl font-semibold text-white">12. Changes to Terms</h2>
          <p className="text-slate-300 leading-relaxed">
            WorkDash may update these Terms from time to time. Continued use of the App constitutes
            acceptance of the updated Terms.
          </p>
        </section>

        <section className="space-y-3 bg-slate-800/50 p-6 rounded-lg border border-slate-700">
          <h2 className="text-2xl font-semibold text-white">Contact</h2>
          <p className="text-slate-300 leading-relaxed">
            For questions or concerns about these Terms, email: workdash@gmail.com
          </p>
        </section>
      </div>
    </div>
  );
};

export default TermsPage;
