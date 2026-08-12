import React, { useState } from 'react';
import { mockCurriculum, Module } from '../../lib/mock-curriculum-data';

const CourseArchitecture = () => {
    const [modules, setModules] = useState<Module[]>(mockCurriculum);
    const [isFormVisible, setIsFormVisible] = useState(false);
    const [editingModuleId, setEditingModuleId] = useState<string | null>(null);
    const [moduleTitle, setModuleTitle] = useState('');
    const [moduleDueDate, setModuleDueDate] = useState('');

    const handleShowAddForm = () => {
        setEditingModuleId(null);
        setModuleTitle('');
        setModuleDueDate('');
        setIsFormVisible(true);
    };

    const handleShowEditForm = (module: Module) => {
        setEditingModuleId(module.id);
        setModuleTitle(module.title);
        setModuleDueDate(module.dueDate);
        setIsFormVisible(true);
    };

    const handleCancel = () => {
        setIsFormVisible(false);
        setEditingModuleId(null);
        setModuleTitle('');
        setModuleDueDate('');
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!moduleTitle || !moduleDueDate) return;

        if (editingModuleId) {
            // Update existing module
            setModules(modules.map(m => 
                m.id === editingModuleId 
                    ? { ...m, title: moduleTitle, dueDate: moduleDueDate } 
                    : m
            ));
        } else {
            // Add new module
            const newModule: Module = {
                id: `module-${Date.now()}`,
                title: moduleTitle,
                dueDate: moduleDueDate,
                chapters: [],
            };
            setModules([...modules, newModule]);
        }
        handleCancel();
    };

    const handleDeleteModule = (moduleId: string) => {
        if (window.confirm('Are you sure you want to delete this module?')) {
            setModules(modules.filter(module => module.id !== moduleId));
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-800">Course Outline</h3>
                {!isFormVisible && (
                    <button 
                        onClick={handleShowAddForm}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2 rounded-lg shadow-sm transition-colors duration-200 text-sm"
                    >
                        + Add Module
                    </button>
                )}
            </div>

            {isFormVisible && (
                <form onSubmit={handleSubmit} className="bg-white p-4 rounded-lg shadow-md mb-6 border border-gray-200">
                    <h4 className="text-lg font-semibold mb-3">
                        {editingModuleId ? 'Edit Module' : 'Add New Module'}
                    </h4>
                    <div className="flex flex-col space-y-3">
                        <input
                            type="text"
                            placeholder="Module Title"
                            value={moduleTitle}
                            onChange={(e) => setModuleTitle(e.target.value)}
                            className="p-2 border rounded-md"
                            required
                        />
                        <input
                            type="date"
                            value={moduleDueDate}
                            onChange={(e) => setModuleDueDate(e.target.value)}
                            className="p-2 border rounded-md"
                            required
                        />
                        <div className="flex justify-end space-x-2">
                            <button type="button" onClick={handleCancel} className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-2 px-4 rounded-lg">
                                Cancel
                            </button>
                            <button type="submit" className="bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-lg">
                                {editingModuleId ? 'Save Changes' : 'Save Module'}
                            </button>
                        </div>
                    </div>
                </form>
            )}

            <div className="space-y-4">
                {modules.map((module) => (
                    <div key={module.id} className="bg-white border border-gray-200 p-4 rounded-lg shadow-sm">
                        <div className="flex justify-between items-start">
                            <div>
                                <h4 className="font-semibold text-gray-700">{module.title}</h4>
                                <span className="text-xs text-gray-500">Due: {new Date(module.dueDate).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center space-x-3">
                                <button 
                                    onClick={() => handleShowEditForm(module)}
                                    className="text-xs text-blue-600 hover:text-blue-800 font-medium">
                                    Edit
                                </button>
                                <button 
                                    onClick={() => handleDeleteModule(module.id)}
                                    className="text-xs text-red-600 hover:text-red-800 font-medium"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                        <ul className="mt-3 space-y-2 pl-1">
                            {module.chapters.map((chapter) => (
                                <li key={chapter.id} className="text-sm flex items-center p-2 rounded-md bg-gray-50 hover:bg-gray-100 transition-colors">
                                    <span
                                        className={`mr-3 h-2.5 w-2.5 rounded-full flex-shrink-0 ${
                                            chapter.status === 'completed' ? 'bg-green-500' :
                                            chapter.status === 'in-progress' ? 'bg-yellow-400' :
                                            'bg-gray-300'
                                        }`}
                                        title={`Status: ${chapter.status}`}
                                    ></span>
                                    <span className="text-gray-600">{chapter.title}</span>
                                </li>
                            ))}
                             {module.chapters.length === 0 && (
                                <li className="text-xs text-gray-400 italic">No chapters yet.</li>
                            )}
                        </ul>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default CourseArchitecture;
