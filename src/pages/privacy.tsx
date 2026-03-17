import React from "react";

const PrivacyPage = () => {
    return (
        <div className="min-h-screen bg-slate-900 text-slate-100">
            <div className="max-w-4xl mx-auto px-6 py-16 space-y-8">
                <div className="space-y-4">
                    <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-orange-500 to-pink-500 bg-clip-text text-transparent">
                        Privacy Policy
                    </h1>
                    <p className="text-slate-400">
                        Effective Date: March 18, 2026
                    </p>
                </div>

                <section className="space-y-3 bg-slate-800/50 p-6 rounded-lg border border-slate-700">
                    <h2 className="text-2xl font-semibold text-white">
                        1. Introduction
                    </h2>
                    <p className="text-slate-300 leading-relaxed">
                        Workdash (“we”, “us”, or “our”) respects your privacy.
                        This Privacy Policy explains how we collect, use, and
                        protect personal information when you use the Workdash
                        application and related services.
                    </p>
                </section>

                <section className="space-y-3 bg-slate-800/50 p-6 rounded-lg border border-slate-700">
                    <h2 className="text-2xl font-semibold text-white">
                        2. Information We Collect
                    </h2>
                    <ul className="list-disc ml-6 space-y-2 text-slate-300">
                        <li>
                            <strong className="text-white">
                                Account Information:
                            </strong>{" "}
                            Email address, name, and profile information
                            provided through Google Sign-In.
                        </li>
                        <li>
                            <strong className="text-white">Usage Data:</strong>{" "}
                            Session duration, feature usage, and interaction
                            metrics used to improve Workdash.
                        </li>
                        <li>
                            <strong className="text-white">
                                Technical Data:
                            </strong>{" "}
                            IP address, browser type, device information, and
                            operating system.
                        </li>
                    </ul>
                </section>

                <section className="space-y-3 bg-slate-800/50 p-6 rounded-lg border border-orange-500/30">
                    <h2 className="text-2xl font-semibold text-white">
                        3. Google User Data Policy & Limited Use
                    </h2>

                    <p className="text-slate-300 leading-relaxed bg-slate-900/50 p-4 rounded border border-slate-700">
                        Workdash’s use and transfer to any other app of
                        information received from Google APIs will adhere to the{" "}
                        <a
                            href="https://developers.google.com/terms/api-services-user-data-policy"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-orange-400 underline hover:text-orange-300"
                        >
                            Google API Services User Data Policy
                        </a>
                        , including the Limited Use requirements.
                    </p>

                    <div className="space-y-4 text-slate-300 mt-4">
                        <p>
                            We request the{" "}
                            <code className="text-orange-300 bg-slate-900/50 px-1 rounded text-sm">
                                calendar.readonly
                            </code>{" "}
                            scope to read your Google Calendar data. We access
                            only event summaries, times, and free/busy status to
                            display your schedule and provide 1-click access to
                            meeting links within the Workdash interface. No
                            calendar data is modified, created, or deleted.
                        </p>

                        <strong className="text-white block mt-2">
                            Data Protection Standards:
                        </strong>
                        <ul className="list-disc ml-6 space-y-2">
                            <li>
                                We do{" "}
                                <span className="text-white font-bold">
                                    not
                                </span>{" "}
                                share Google user data with third-party
                                toolsets, platforms, or individuals.
                            </li>
                            <li>
                                We do{" "}
                                <span className="text-white font-bold">
                                    not
                                </span>{" "}
                                use Google user data for serving advertisements.
                            </li>
                            <li>
                                We do{" "}
                                <span className="text-white font-bold">
                                    not
                                </span>{" "}
                                use Google user data for training machine
                                learning or AI models.
                            </li>
                            <li>
                                Data is processed in-memory and is not stored at
                                rest on our servers.
                            </li>
                        </ul>

                        <strong className="text-white block mt-4">
                            Data Protection Mechanisms:
                        </strong>
                        <ul className="list-disc ml-6 space-y-2">
                            <li>
                                <strong className="text-white">
                                    Encryption in Transit:
                                </strong>{" "}
                                All communication between your browser and our
                                servers is encrypted using TLS/HTTPS. Real-time
                                media streams (voice, video, screen share) are
                                encrypted via DTLS-SRTP through WebRTC.
                            </li>
                            <li>
                                <strong className="text-white">
                                    Secure Authentication:
                                </strong>{" "}
                                We use OAuth 2.0 via Google Sign-In for
                                authentication. We never receive, store, or have
                                access to your Google password.
                            </li>
                            <li>
                                <strong className="text-white">
                                    Minimal Data Retention:
                                </strong>{" "}
                                Google Calendar data is fetched on demand and
                                processed in-memory only. It is never written to
                                a database or persisted on disk.
                            </li>
                            <li>
                                <strong className="text-white">
                                    Access Controls:
                                </strong>{" "}
                                Access to production systems is restricted to
                                authorized personnel only, using
                                role-based access controls and secure
                                credential management.
                            </li>
                            <li>
                                <strong className="text-white">
                                    Token Security:
                                </strong>{" "}
                                OAuth tokens are stored securely and are
                                automatically revoked when you disconnect your
                                Google account or delete your Workdash account.
                            </li>
                        </ul>
                    </div>
                </section>

                <section className="space-y-3 bg-slate-800/50 p-6 rounded-lg border border-slate-700">
                    <h2 className="text-2xl font-semibold text-white">
                        4. Voice, Video, and Screen Sharing
                    </h2>
                    <p className="text-slate-300 leading-relaxed">
                        Workdash uses WebRTC to provide real-time communication.
                        Media streams are encrypted in transit and are{" "}
                        <span className="text-white font-bold">never</span>{" "}
                        recorded or stored.
                    </p>
                </section>

                <section className="space-y-3 bg-slate-800/50 p-6 rounded-lg border border-slate-700">
                    <h2 className="text-2xl font-semibold text-white">
                        5. Data Deletion & Your Rights
                    </h2>
                    <p className="text-slate-300 leading-relaxed">
                        You may access, update, or delete your account data at
                        any time. To request permanent deletion of your account
                        and associated data, please contact us at the email
                        below.
                    </p>
                    <p className="text-slate-300">
                        You can revoke Google API access at any time via your{" "}
                        <a
                            href="https://myaccount.google.com/permissions"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-orange-400 underline"
                        >
                            Google Security Settings
                        </a>
                        .
                    </p>
                </section>

                <section className="space-y-3 bg-slate-800/50 p-6 rounded-lg border border-slate-700">
                    <h2 className="text-2xl font-semibold text-white">
                        Contact Us
                    </h2>
                    <p className="text-slate-300 leading-relaxed">
                        For any privacy-related inquiries, please contact:
                        <br />
                        <span className="text-orange-400 font-medium">
                            workdash@gmail.com
                        </span>
                    </p>
                </section>
            </div>
        </div>
    );
};

export default PrivacyPage;
