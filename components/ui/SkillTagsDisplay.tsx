import React from 'react';

interface SkillTagsDisplayProps {
  skills: string | string[];
  className?: string;
  maxDisplay?: number;
  tagClassName?: string;
}

const SkillTagsDisplay: React.FC<SkillTagsDisplayProps> = ({
  skills,
  className = "",
  maxDisplay,
  tagClassName = "bg-orange-500/20 px-3 py-1 rounded-full text-sm text-orange-400 border border-orange-500/50"
}) => {
  // Normalize skills to array
  let skillsArray: string[] = [];
    if (Array.isArray(skills)) {
    skillsArray = skills;
  } else if (typeof skills === 'string' && skills) {
    // Split by comma and clean up each skill
    skillsArray = skills.split(',')
      .map(skill => skill.trim())
      .filter(skill => skill);
  }

  if (skillsArray.length === 0) {
    return null;
  }

  const displaySkills = maxDisplay ? skillsArray.slice(0, maxDisplay) : skillsArray;
  const remainingCount = maxDisplay && skillsArray.length > maxDisplay 
    ? skillsArray.length - maxDisplay 
    : 0;

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {displaySkills.map((skill, index) => (
        <span
          key={index}
          className={tagClassName}
        >
          {skill}
        </span>
      ))}
      {remainingCount > 0 && (
        <span className="text-orange-400 text-sm px-2 py-1">
          +{remainingCount} mais
        </span>
      )}
    </div>
  );
};

export default SkillTagsDisplay;
