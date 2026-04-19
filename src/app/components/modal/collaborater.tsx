import React, { useState, ChangeEvent } from 'react';

type ModalTypes = {
    isOpen: boolean;
    title: string;
    description: string | null;
    questionToAsked?: string | null;
    onSave?: (values: string[]) => void;
    onClose?: (value: boolean) => void;
    initialMembers?: string[];
};

function Collaborater({
    isOpen,
    title,
    description,
    questionToAsked,
    onSave,
    onClose,
    initialMembers,
}: ModalTypes) {
    const [facultyMembers, setFacultyMembers] = useState<string[]>(
        initialMembers && initialMembers.length > 0 ? initialMembers : [""]
    );

    React.useEffect(() => {
        if (initialMembers && initialMembers.length > 0) {
            setFacultyMembers(initialMembers);
        }
    }, [initialMembers]);

    const handleAddRow = () => {
        setFacultyMembers([...facultyMembers, ""]);
    };

    const handleRemoveRow = (index: number) => {
        const newList = facultyMembers.filter((_, i) => i !== index);
        setFacultyMembers(newList);
    };

    const handleInputChange = (index: number, value: string) => {
        const newList = [...facultyMembers];
        newList[index] = value;
        setFacultyMembers(newList);
    };

    const handleSave = () => {
        const validMembers = facultyMembers.filter((f) => f.trim() !== "");
        if (onSave) onSave(validMembers);
        if (onClose) onClose(false);
    };

    const handleCancel = () => {
        if (onClose) onClose(false);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
            <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md mx-4">
                <h2 className="text-2xl font-semibold text-gray-800 mb-3">{title}</h2>
                {description && <p className="text-gray-600 mb-4">{description}</p>}
                {questionToAsked && (
                    <p className="text-gray-700 font-medium mb-2">{questionToAsked}</p>
                )}

                {facultyMembers.map((member, index) => (
                    <div key={index} className="flex items-center mb-2 space-x-2">
                        <input
                            type="text"
                            value={member}
                            onChange={(e) => handleInputChange(index, e.target.value)}
                            placeholder="Enter faculty Email"
                            className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                        />
                        {facultyMembers.length > 1 && (
                            <button
                                type="button"
                                onClick={() => handleRemoveRow(index)}
                                className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition"
                            >
                                Remove
                            </button>
                        )}
                    </div>
                ))}

                <button
                    type="button"
                    onClick={handleAddRow}
                    className="mb-4 px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition"
                >
                    + Add Another
                </button>

                <div className="flex justify-end space-x-3 mt-4">
                    <button
                        type="button"
                        onClick={handleCancel}
                        className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                    >
                        Save
                    </button>
                </div>
            </div>
        </div>
    );
}

export default Collaborater;
