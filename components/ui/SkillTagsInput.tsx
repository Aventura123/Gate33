import React from "react";

interface SkillTagsInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  suggestions?: string[];
  placeholder?: string;
  label?: string;
  className?: string;
}

export const SkillTagsInput: React.FC<SkillTagsInputProps> = ({  value,
  onChange,
  suggestions = [],
  placeholder = "Enter skills separated by commas",
  label = "Required Skills & Tags",
  className = ""
}) => {
  const [input, setInput] = React.useState("");

  // Add tag from input
  const handleAddTag = (tag: string) => {
    if (!tag.trim() || value.includes(tag.trim())) return;
    onChange([...value, tag.trim()]);
    setInput("");
  };

  // Remove tag
  const handleRemoveTag = (tag: string) => {
    onChange(value.filter(t => t !== tag));
  };
  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    
    // Check if user typed a comma
    if (newValue.includes(',')) {
      const tags = newValue.split(',');
      const lastTag = tags.pop() || '';
      
      // Add all tags except the last one
      tags.forEach(tag => {
        if (tag.trim() && !value.includes(tag.trim())) {
          handleAddTag(tag.trim());
        }
      });
      
      // Set the remaining text as input
      setInput(lastTag);
    } else {
      setInput(newValue);
    }
  };

  // Handle enter key and other special keys
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === "Enter" || e.key === ",") && input.trim()) {
      e.preventDefault();
      handleAddTag(input);
    } else if (e.key === "Backspace" && !input && value.length > 0) {
      // Remove last tag if input is empty and backspace is pressed
      e.preventDefault();
      const newTags = [...value];
      newTags.pop();
      onChange(newTags);
    }
  };

  // Add suggestion
  const handleSuggestionClick = (tag: string) => {
    handleAddTag(tag);
  };

  return (
    <div className={className}>
      {label && <label className="block text-orange-400 font-semibold mb-1">{label}</label>}
      <input
        type="text"
        value={input}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}        placeholder={placeholder}
        className="w-full p-2 rounded bg-black/50 border border-gray-700 text-white focus:ring-2 focus:ring-orange-400 focus:outline-none"
      />
      {/* Tags display */}
      <div className="flex flex-wrap gap-2 mt-2">
        {value.map((tag, idx) => (
          <span key={tag + idx} className="bg-orange-500 text-white px-3 py-1 rounded-full text-sm flex items-center">
            {tag}
            <button
              type="button"
              onClick={() => handleRemoveTag(tag)}
              className="ml-2 text-white hover:text-orange-200"
            >
              ✕
            </button>
          </span>
        ))}
      </div>
      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {suggestions.map(s => (
            <button
              type="button"
              key={s}
              onClick={() => handleSuggestionClick(s)}
              className={`px-3 py-1 rounded-full border text-sm ${value.includes(s) ? 'bg-orange-500 text-white border-orange-500' : 'bg-black/50 text-gray-300 border-gray-700'}`}
            >
              {s}
            </button>
          ))}
        </div>
      )}
      <p className="text-xs text-gray-400 mt-2">Type skills and press Enter or comma to add them. Click on suggestion tags below to add or remove skills.</p>
    </div>
  );
};

export default SkillTagsInput;
