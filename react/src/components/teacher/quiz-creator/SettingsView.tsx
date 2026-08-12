import React from 'react';

const SettingsView = () => {
    return (
        <div className="qc-panel">
            <div className="qc-panel-head">
                <div className="qc-panel-title">Advanced Configuration & Security Settings</div>
            </div>
            <div className="qc-panel-body">
                <div className="qc-settings-grid">
                    <div className="qc-form-group">
                        <label className="qc-label">Randomization Engine</label>
                        <div className="qc-checkbox-group">
                            <input type="checkbox" id="shuffleQuestions" />
                            <label htmlFor="shuffleQuestions">Shuffle question order per student</label>
                        </div>
                        <div className="qc-checkbox-group">
                            <input type="checkbox" id="shuffleOptions" />
                            <label htmlFor="shuffleOptions">Shuffle answer choices for MCQs</label>
                        </div>
                    </div>
                    <div className="qc-form-group">
                        <label className="qc-label">Time Control</label>
                        <input type="number" className="qc-input" placeholder="Overall quiz time limit in minutes" />
                    </div>
                     <div className="qc-form-group">
                        <label className="qc-label">Access Window</label>
                         <div className="qc-input-grid">
                            <input type="datetime-local" className="qc-input" />
                            <input type="datetime-local" className="qc-input" />
                        </div>
                    </div>
                     <div className="qc-form-group">
                        <label className="qc-label">Proctoring & Anti-Cheat Rules</label>
                        <div className="qc-checkbox-group">
                            <input type="checkbox" id="fullscreen" />
                            <label htmlFor="fullscreen">Enforce full-screen mode</label>
                        </div>
                         <div className="qc-checkbox-group">
                            <input type="checkbox" id="tabSwitch" />
                            <label htmlFor="tabSwitch">Track browser tab switching</label>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SettingsView;
