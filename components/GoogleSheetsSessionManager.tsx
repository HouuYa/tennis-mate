import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { X, Check, AlertCircle, BookOpen } from 'lucide-react';
import { GoogleSheetsGuide } from './GoogleSheetsGuide';

export const GoogleSheetsSessionManager = () => {
    const { setGoogleSheetsUrl, testGoogleSheetsConnection, loadGoogleSheetsData, getGoogleSheetsUrl } = useApp();

    const [url, setUrl] = useState(getGoogleSheetsUrl() || '');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [showGuide, setShowGuide] = useState(false);

    const handleTestConnection = async () => {
        if (!url.trim()) {
            setError('Please enter a Web App URL');
            return;
        }

        setIsLoading(true);
        setError(null);
        setSuccess(false);

        try {
            // Set the URL first
            await setGoogleSheetsUrl(url);

            // Test the connection
            const isConnected = await testGoogleSheetsConnection();

            if (isConnected) {
                setSuccess(true);
                setError(null);

                // Load data automatically after successful connection
                setTimeout(async () => {
                    try {
                        await loadGoogleSheetsData();
                    } catch (e) {
                        console.warn('Failed to load initial data:', e);
                    }
                }, 500);
            }
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : 'Connection failed. Please check your URL and try again.';
            setError(message);
            setSuccess(false);
        } finally {
            setIsLoading(false);
        }
    };

    const handleLoadData = async () => {
        setIsLoading(true);
        setError(null);

        try {
            await loadGoogleSheetsData();
            setSuccess(true);
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : 'Failed to load data from Google Sheets';
            setError(message);
        } finally {
            setIsLoading(false);
        }
    };

    if (showGuide) {
        return <GoogleSheetsGuide onClose={() => setShowGuide(false)} />;
    }

    const savedUrl = getGoogleSheetsUrl();
    const isConnected = success || savedUrl;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-slate-900 border-b border-slate-800 p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-bold text-slate-100">Google Sheets Setup</h2>
                            <p className="text-sm text-slate-400 mt-1">Connect your Google Sheets to save match data</p>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Setup Guide Button */}
                    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-blue-500/10 rounded-lg">
                                <BookOpen className="text-blue-400" size={20} />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-semibold text-slate-100">First time setup?</h3>
                                <p className="text-sm text-slate-400 mt-1">
                                    Follow our step-by-step guide to create and deploy your Google Sheets backend.
                                </p>
                                <button
                                    onClick={() => setShowGuide(true)}
                                    className="mt-3 text-sm text-blue-400 hover:text-blue-300 font-medium"
                                >
                                    View Setup Guide →
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* URL Input */}
                    <div className="space-y-3">
                        <label className="block text-sm font-medium text-slate-300">
                            Google Apps Script Web App URL
                        </label>
                        <input
                            type="url"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            placeholder="https://script.google.com/macros/s/..."
                            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                            disabled={isLoading}
                        />
                        <p className="text-xs text-slate-500">
                            Paste the Web App URL from your deployed Google Apps Script
                        </p>
                    </div>

                    {/* Status Messages */}
                    {error && (
                        <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                            <AlertCircle className="text-red-400 flex-shrink-0" size={20} />
                            <div className="flex-1">
                                <p className="text-sm text-red-400">{error}</p>
                            </div>
                        </div>
                    )}

                    {success && (
                        <div className="flex items-start gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                            <Check className="text-emerald-400 flex-shrink-0" size={20} />
                            <div className="flex-1">
                                <p className="text-sm text-emerald-400">
                                    Connection successful! You can now start using Google Sheets Mode.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Connection Status */}
                    {isConnected && !success && (
                        <div className="flex items-center gap-2 text-sm">
                            <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                            <span className="text-slate-400">Connected to Google Sheets</span>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                        <button
                            onClick={handleTestConnection}
                            disabled={isLoading || !url.trim()}
                            className="flex-1 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-xl font-medium transition-colors"
                        >
                            {isLoading ? 'Testing...' : 'Test & Connect'}
                        </button>

                        {isConnected && (
                            <button
                                onClick={handleLoadData}
                                disabled={isLoading}
                                className="px-6 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-xl font-medium transition-colors"
                            >
                                Refresh Data
                            </button>
                        )}
                    </div>

                    {/* Info Section */}
                    <div className="pt-4 border-t border-slate-800">
                        <h3 className="font-semibold text-slate-300 mb-3">How it works</h3>
                        <ul className="space-y-2 text-sm text-slate-400">
                            <li className="flex items-start gap-2">
                                <span className="text-emerald-400">•</span>
                                <span>Your match data is saved to YOUR Google Sheets</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-emerald-400">•</span>
                                <span>Recent 100 matches are loaded for statistics</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-emerald-400">•</span>
                                <span>You have full control and ownership of your data</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-emerald-400">•</span>
                                <span>Export to Excel/CSV anytime directly from Google Sheets</span>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};
