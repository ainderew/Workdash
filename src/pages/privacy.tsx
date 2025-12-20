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
                        Effective Date: December 19, 2025
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
                        <li>
                            <strong className="text-white">
                                Communication Metadata:
                            </strong>{" "}
                            Call duration and participant counts. Media content
                            is never stored.
                        </li>
                    </ul>
                </section>

                <section className="space-y-3 bg-slate-800/50 p-6 rounded-lg border border-slate-700">
                    <h2 className="text-2xl font-semibold text-white">
                        3. Google User Data
                    </h2>

                    <p className="text-slate-300 leading-relaxed">
                        Workdash uses Google APIs only after you log in and
                        explicitly opt in to connect your Google account. Access
                        is limited to read-only Google Calendar data.
                    </p>

                    <p className="text-slate-300 leading-relaxed mt-2">
                        The following Google Calendar data may be accessed on
                        demand:
                    </p>

                    <ul className="list-disc ml-6 space-y-2 text-slate-300">
                        <li>Event titles</li>
                        <li>Event dates and times</li>
                        <li>Event descriptions</li>
                        <li>
                            Meeting or conference links included in calendar
                            events (e.g., Zoom links)
                        </li>
                    </ul>

                    <p className="text-slate-300 leading-relaxed mt-3">
                        This data is used solely to:
                    </p>

                    <ul className="list-disc ml-6 space-y-2 text-slate-300">
                        <li>Display your schedule inside Workdash</li>
                        <li>
                            Allow you to join meetings directly when a meeting
                            link is present
                        </li>
                    </ul>

                    <p className="text-slate-300 leading-relaxed mt-3">
                        Google Calendar data is fetched directly from Google’s
                        servers on demand when you use this feature. The data is
                        processed in memory for real-time display purposes only.
                    </p>

                    <p className="text-slate-300 leading-relaxed mt-3">
                        Workdash does{" "}
                        <strong className="text-white">not</strong>:
                    </p>

                    <ul className="list-disc ml-6 space-y-2 text-slate-300">
                        <li>Store Google Calendar data at rest</li>
                        <li>Cache Google Calendar data</li>
                        <li>Log calendar event contents</li>
                        <li>Modify Google Calendar events</li>
                        <li>Share Google user data with third parties</li>
                        <li>
                            Use Google user data for advertising, profiling, or
                            machine learning
                        </li>
                    </ul>

                    <p className="text-slate-300 leading-relaxed mt-3">
                        You may revoke Workdash’s access to Google data at any
                        time through your Google Account permissions. Once
                        access is revoked, Workdash immediately loses the
                        ability to query Google Calendar data.
                    </p>

                    <p className="text-slate-300 leading-relaxed mt-3">
                        Workdash’s use of information received from Google APIs
                        strictly complies with the
                        <strong className="text-white">
                            {" "}
                            Google API Services User Data Policy
                        </strong>
                        , including the
                        <strong className="text-white">
                            {" "}
                            Limited Use requirements
                        </strong>
                        .
                    </p>
                </section>

                <section className="space-y-3 bg-slate-800/50 p-6 rounded-lg border border-slate-700">
                    <h2 className="text-2xl font-semibold text-white">
                        4. Voice, Video, and Screen Sharing
                    </h2>
                    <p className="text-slate-300 leading-relaxed">
                        Workdash uses WebRTC and Mediasoup to provide real-time
                        voice, video, and screen sharing. Media streams are
                        encrypted in transit and are not recorded, stored, or
                        accessed by Workdash.
                    </p>
                </section>

                <section className="space-y-3 bg-slate-800/50 p-6 rounded-lg border border-slate-700">
                    <h2 className="text-2xl font-semibold text-white">
                        5. Data Security
                    </h2>
                    <ul className="list-disc ml-6 space-y-2 text-slate-300">
                        <li>Encrypted data transmission (HTTPS / TLS)</li>
                        <li>
                            Restricted server access and authentication controls
                        </li>
                        <li>Regular monitoring and system updates</li>
                    </ul>
                </section>

                <section className="space-y-3 bg-slate-800/50 p-6 rounded-lg border border-slate-700">
                    <h2 className="text-2xl font-semibold text-white">
                        6. Data Retention
                    </h2>
                    <p className="text-slate-300 leading-relaxed">
                        Account data is retained while your account is active.
                        Google Calendar data and real-time communication data
                        are not stored after use.
                    </p>
                </section>

                <section className="space-y-3 bg-slate-800/50 p-6 rounded-lg border border-slate-700">
                    <h2 className="text-2xl font-semibold text-white">
                        7. Your Rights
                    </h2>
                    <p className="text-slate-300 leading-relaxed">
                        You may access, update, or delete your personal
                        information at any time. For privacy-related requests,
                        contact us at workdash@gmail.com.
                    </p>
                </section>

                <section className="space-y-3 bg-slate-800/50 p-6 rounded-lg border border-slate-700">
                    <h2 className="text-2xl font-semibold text-white">
                        Contact Us
                    </h2>
                    <p className="text-slate-300 leading-relaxed">
                        Email: workdash@gmail.com
                    </p>
                </section>
            </div>
        </div>
    );
};

export default PrivacyPage;
