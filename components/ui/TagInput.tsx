import React, { useState, useEffect } from 'react';

interface TagInputProps {
  value: string; // Comma-separated string
  onChange: (value: string) => void;
  predefinedTags?: string[];
  placeholder?: string;
  className?: string;
  label?: string;
  required?: boolean;
}

const TagInput: React.FC<TagInputProps> = ({
  value,
  onChange,
  predefinedTags = [],
  placeholder = "Digite tags separadas por vírgula ou selecione abaixo",
  className = "",
  label,
  required = false
}) => {
  const [inputValue, setInputValue] = useState("");
  
  // Convert comma-separated string to array for display
  const selectedTags = value ? value.split(',').map(tag => tag.trim()).filter(tag => tag) : [];

  // Add a tag
  const addTag = (tagToAdd: string) => {
    const trimmedTag = tagToAdd.trim();
    if (!trimmedTag) return;
    
    const currentTags = selectedTags;
    if (!currentTags.includes(trimmedTag)) {
      const newTags = [...currentTags, trimmedTag];
      onChange(newTags.join(', '));
    }
    setInputValue("");
  };

  // Remove a tag
  const removeTag = (tagToRemove: string) => {
    const newTags = selectedTags.filter(tag => tag !== tagToRemove);
    onChange(newTags.join(', '));
  };

  // Toggle predefined tag
  const togglePredefinedTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      removeTag(tag);
    } else {
      addTag(tag);
    }
  };

  // Handle manual input
  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(inputValue);
    }
  };

  const handleInputBlur = () => {
    if (inputValue.trim()) {
      addTag(inputValue);
    }
  };

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-semibold text-gray-300 mb-1">
          {label} {required && <span className="text-orange-400">*</span>}
        </label>
      )}
      
      {/* Manual Input */}
      <div className="mb-2">
        <input 
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleInputKeyDown}
          onBlur={handleInputBlur}
          className="w-full px-3 py-2 bg-black/40 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-orange-400 focus:outline-none"
          placeholder={placeholder}
        />
        <p className="text-xs text-gray-400 mt-1">
          Pressione Enter ou vírgula para adicionar uma tag. Clique nos botões abaixo para tags predefinidas.
        </p>
      </div>
      
      {/* Display Selected Tags */}
      {selectedTags.length > 0 && (
        <div className="mt-3 mb-4">
          <label className="block text-sm text-gray-300 mb-1">Tags Selecionadas:</label>
          <div className="flex flex-wrap gap-2">
            {selectedTags.map((tag, index) => (
              <div key={index} className="bg-orange-500 text-white px-3 py-1 rounded-full text-sm flex items-center">
                {tag}
                <button 
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="ml-2 text-white hover:text-orange-200"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Predefined Tags */}
      {predefinedTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {predefinedTags.map(tag => (
            <button 
              type="button" 
              key={tag} 
              onClick={() => togglePredefinedTag(tag)}
              className={`px-3 py-1 rounded-full border text-xs transition-colors ${
                selectedTags.includes(tag) 
                  ? 'bg-orange-500 text-white border-orange-500' 
                  : 'bg-black/40 text-gray-300 border-gray-600 hover:bg-gray-700'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default TagInput;
