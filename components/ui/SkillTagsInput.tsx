import React from "react";

interface SkillTagsInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  suggestions?: string[];
  placeholder?: string;
  label?: string;
  className?: string;
}

export const SkillTagsInput: React.FC<SkillTagsInputProps> = ({
  value,
  onChange,
  suggestions = [],
  placeholder = "Enter skills separated by commas",
  label = "Required Skills",
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
    setInput(e.target.value);
    // If comma, add as tag
    if (e.target.value.endsWith(",")) {
      handleAddTag(e.target.value.slice(0, -1));
    }
  };

  // Handle enter key
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && input.trim()) {
      e.preventDefault();
      handleAddTag(input);
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
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="w-full p-2 rounded bg-black/50 border border-gray-700 text-white"
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
      <p className="text-xs text-gray-400 mt-2">Click on tags to add or remove them from the required skills.</p>
    </div>
  );
};

export default SkillTagsInput;
