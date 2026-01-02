import React, { useState } from 'react';
import { X, Copy, Check, ChevronRight } from 'lucide-react';

interface GoogleSheetsGuideProps {
    onClose: () => void;
}

const APPS_SCRIPT_CODE = `// Tennis Mate - Google Sheets Backend
// Copy this entire code to your Google Apps Script editor

function doGet(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Matches');

  // If sheet doesn't exist, create it with headers
  if (!sheet) {
    sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet('Matches');
    sheet.appendRow(['timestamp', 'date', 'duration', 'winner1', 'winner2', 'loser1', 'loser2', 'score', 'location']);
  }

  // Get all data excluding header
  var data = sheet.getDataRange().getValues();
  var rows = data.slice(1);

  // Return recent 100 matches (newest first)
  var recentRows = rows.slice(-100).reverse();

  return ContentService.createTextOutput(JSON.stringify(recentRows))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Matches');

  // If sheet doesn't exist, create it with headers
  if (!sheet) {
    sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet('Matches');
    sheet.appendRow(['timestamp', 'date', 'duration', 'winner1', 'winner2', 'loser1', 'loser2', 'score', 'location']);
  }

  var params = JSON.parse(e.postData.contents);

  sheet.appendRow([
    new Date(), // timestamp
    params.date,
    params.duration,
    params.winner1,
    params.winner2,
    params.loser1,
    params.loser2,
    params.score,
    params.location
  ]);

  return ContentService.createTextOutput(JSON.stringify({result: 'success'}))
    .setMimeType(ContentService.MimeType.JSON);
}`;

export const GoogleSheetsGuide: React.FC<GoogleSheetsGuideProps> = ({ onClose }) => {
    const [copiedCode, setCopiedCode] = useState(false);
    const [currentStep, setCurrentStep] = useState(1);

    const handleCopyCode = () => {
        navigator.clipboard.writeText(APPS_SCRIPT_CODE);
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
    };

    const steps = [
        {
            title: 'Create a New Google Sheet',
            content: (
                <div className="space-y-3">
                    <p className="text-slate-300">
                        1. Open <a href="https://sheets.google.com" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:text-emerald-300 underline">Google Sheets</a>
                    </p>
                    <p className="text-slate-300">
                        2. Click <strong className="text-slate-100">+ Blank</strong> to create a new spreadsheet
                    </p>
                    <p className="text-slate-300">
                        3. Give it a name like "Tennis Mate Data"
                    </p>
                </div>
            )
        },
        {
            title: 'Open Apps Script Editor',
            content: (
                <div className="space-y-3">
                    <p className="text-slate-300">
                        1. In your Google Sheet, click <strong className="text-slate-100">Extensions</strong> in the top menu
                    </p>
                    <p className="text-slate-300">
                        2. Select <strong className="text-slate-100">Apps Script</strong>
                    </p>
                    <p className="text-slate-300">
                        3. A new tab will open with the Apps Script editor
                    </p>
                </div>
            )
        },
        {
            title: 'Paste the Code',
            content: (
                <div className="space-y-3">
                    <p className="text-slate-300">
                        1. Delete any existing code in the editor (usually <code className="text-emerald-400 bg-slate-800 px-2 py-1 rounded">function myFunction() {'{}'}</code>)
                    </p>
                    <p className="text-slate-300">
                        2. Copy the code below and paste it into the editor
                    </p>
                    <div className="relative mt-4">
                        <pre className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs text-slate-300 overflow-x-auto max-h-64">
{APPS_SCRIPT_CODE}
                        </pre>
                        <button
                            onClick={handleCopyCode}
                            className="absolute top-2 right-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg flex items-center gap-2 text-xs font-medium transition-colors"
                        >
                            {copiedCode ? (
                                <>
                                    <Check size={14} className="text-emerald-400" />
                                    <span className="text-emerald-400">Copied!</span>
                                </>
                            ) : (
                                <>
                                    <Copy size={14} />
                                    <span>Copy Code</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )
        },
        {
            title: 'Deploy as Web App',
            content: (
                <div className="space-y-3">
                    <p className="text-slate-300">
                        1. Click the <strong className="text-slate-100">Deploy</strong> button (top right)
                    </p>
                    <p className="text-slate-300">
                        2. Select <strong className="text-slate-100">New deployment</strong>
                    </p>
                    <p className="text-slate-300">
                        3. Click the gear icon next to "Select type" and choose <strong className="text-slate-100">Web app</strong>
                    </p>
                    <p className="text-slate-300">
                        4. Configure the deployment:
                    </p>
                    <ul className="ml-6 space-y-2">
                        <li className="text-slate-300">
                            • <strong className="text-slate-100">Description:</strong> Tennis Mate Backend
                        </li>
                        <li className="text-slate-300">
                            • <strong className="text-slate-100">Execute as:</strong> Me
                        </li>
                        <li className="text-slate-300">
                            • <strong className="text-slate-100">Who has access:</strong> Anyone
                        </li>
                    </ul>
                    <p className="text-slate-300">
                        5. Click <strong className="text-slate-100">Deploy</strong>
                    </p>
                </div>
            )
        },
        {
            title: 'Copy the Web App URL',
            content: (
                <div className="space-y-3">
                    <p className="text-slate-300">
                        1. After deployment, you'll see a dialog with the <strong className="text-slate-100">Web app URL</strong>
                    </p>
                    <p className="text-slate-300">
                        2. Click <strong className="text-slate-100">Copy</strong> to copy the URL
                    </p>
                    <p className="text-slate-300">
                        3. It will look something like:
                    </p>
                    <code className="block bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-emerald-400 mt-2">
                        https://script.google.com/macros/s/AKfy...xyz/exec
                    </code>
                    <p className="text-slate-300 mt-4">
                        4. You may need to authorize the script on first deployment. Click <strong className="text-slate-100">Authorize access</strong> and follow the prompts.
                    </p>
                </div>
            )
        },
        {
            title: 'Connect to Tennis Mate',
            content: (
                <div className="space-y-3">
                    <p className="text-slate-300">
                        1. Return to Tennis Mate
                    </p>
                    <p className="text-slate-300">
                        2. Paste your Web App URL in the input field
                    </p>
                    <p className="text-slate-300">
                        3. Click <strong className="text-slate-100">Test & Connect</strong>
                    </p>
                    <p className="text-slate-300">
                        4. If successful, you're all set! Match data will now be saved to your Google Sheet.
                    </p>
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 mt-4">
                        <p className="text-sm text-emerald-400">
                            <strong>✓ Done!</strong> Your Google Sheets backend is ready to use.
                        </p>
                    </div>
                </div>
            )
        }
    ];

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-slate-900 border-b border-slate-800 p-6 z-10">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-bold text-slate-100">Google Sheets Setup Guide</h2>
                            <p className="text-sm text-slate-400 mt-1">
                                Step {currentStep} of {steps.length}: {steps[currentStep - 1].title}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                        >
                            <X size={20} className="text-slate-400" />
                        </button>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-4 bg-slate-800 rounded-full h-2 overflow-hidden">
                        <div
                            className="bg-emerald-500 h-full transition-all duration-300"
                            style={{ width: `${(currentStep / steps.length) * 100}%` }}
                        />
                    </div>
                </div>

                {/* Content */}
                <div className="p-6">
                    <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                        <h3 className="text-lg font-semibold text-slate-100 mb-4">
                            {steps[currentStep - 1].title}
                        </h3>
                        <div className="text-sm text-slate-400">
                            {steps[currentStep - 1].content}
                        </div>
                    </div>

                    {/* Navigation */}
                    <div className="flex items-center justify-between mt-6">
                        <button
                            onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
                            disabled={currentStep === 1}
                            className="px-4 py-2 text-slate-400 hover:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                        >
                            ← Previous
                        </button>

                        <div className="flex gap-2">
                            {steps.map((_, index) => (
                                <button
                                    key={index}
                                    onClick={() => setCurrentStep(index + 1)}
                                    className={`w-2 h-2 rounded-full transition-colors ${
                                        index + 1 === currentStep
                                            ? 'bg-emerald-500'
                                            : index + 1 < currentStep
                                            ? 'bg-emerald-500/50'
                                            : 'bg-slate-700'
                                    }`}
                                />
                            ))}
                        </div>

                        {currentStep < steps.length ? (
                            <button
                                onClick={() => setCurrentStep(Math.min(steps.length, currentStep + 1))}
                                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium flex items-center gap-2"
                            >
                                Next
                                <ChevronRight size={16} />
                            </button>
                        ) : (
                            <button
                                onClick={onClose}
                                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium"
                            >
                                Done
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
