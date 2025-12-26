import React from "react";
import { GitBranch, GitPullRequest, AlertCircle } from "lucide-react";

interface GitHubPreviewProps {
    owner: string;
    repo: string;
    url: string;
    type: 'repo' | 'issue' | 'pull';
    issueNumber?: string;
}

export function GitHubPreview({ owner, repo, url, type, issueNumber }: GitHubPreviewProps) {
    const getIcon = () => {
        switch (type) {
            case 'pull':
                return <GitPullRequest className="w-5 h-5 text-purple-500" />;
            case 'issue':
                return <AlertCircle className="w-5 h-5 text-green-500" />;
            default:
                return <GitBranch className="w-5 h-5 text-neutral-400" />;
        }
    };

    const getTitle = () => {
        if (type === 'pull') return `Pull Request #${issueNumber}`;
        if (type === 'issue') return `Issue #${issueNumber}`;
        return 'Repository';
    };

    const getBorderColor = () => {
        switch (type) {
            case 'pull':
                return 'hover:border-purple-500/50';
            case 'issue':
                return 'hover:border-green-500/50';
            default:
                return 'hover:border-neutral-600';
        }
    };

    return (
        <div className="mt-2">
            {/* URL Headline */}
            <div className="mb-1 px-1">
                <p className="text-xs text-neutral-400 truncate">{url}</p>
            </div>

            {/* Preview Card */}
            <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className={`block max-w-md rounded-lg overflow-hidden border border-neutral-700 ${getBorderColor()} transition-colors group`}
            >
                <div className="bg-neutral-800 p-4">
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-neutral-900 rounded-lg flex items-center justify-center flex-shrink-0 border border-neutral-700">
                            {getIcon()}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <svg className="w-4 h-4 text-neutral-400" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                                </svg>
                                <span className="text-xs text-neutral-500">{getTitle()}</span>
                            </div>
                            <p className="text-sm font-semibold text-white mt-1 truncate">
                                {owner}/{repo}
                            </p>
                            <p className="text-xs text-neutral-400 mt-1">
                                View on GitHub
                            </p>
                        </div>
                    </div>
                </div>
            </a>
        </div>
    );
}
