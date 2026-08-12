import React from 'react';

const SchedulingView = () => {
    return (
        <div className="qc-panel">
            <div className="qc-panel-head">
                <div className="qc-panel-title">Scheduling, Delivery, & Automation</div>
            </div>
            <div className="qc-panel-body">
                <div className="qc-settings-grid">
                    <div className="qc-form-group">
                        <label className="qc-label">Targeted Assignment</label>
                        <select className="qc-select" multiple>
                            <option>Entire Batch</option>
                            <option>Class 10 - Section A</option>
                            <option>Class 10 - Section B</option>
                            <option>Remedial Group</option>
                        </select>
                    </div>
                    <div className="qc-form-group">
                        <label className="qc-label">Grading Automation</label>
                        <div className="qc-checkbox-group">
                            <input type="checkbox" id="autoGrade" defaultChecked />
                            <label htmlFor="autoGrade">Auto-grade objective questions</label>
                        </div>
                        <div className="qc-checkbox-group">
                            <input type="checkbox" id="aiAssist" />
                            <label htmlFor="aiAssist">Enable AI-assist for subjective answers</label>
                        </div>
                    </div>
                    <div className="qc-form-group">
                        <label className="qc-label">Result Release</label>
                        <select className="qc-select">
                            <option>Immediately upon submission</option>
                            <option>After quiz window closes for everyone</option>
                            <option>Manually by teacher</option>
                        </select>
                    </div>
                     <div className="qc-form-group">
                       <button className="qc-btn qc-btn-primary" style={{width: '100%'}}>Publish Assessment</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SchedulingView;
