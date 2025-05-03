import React, { useState } from 'react';
import { Learn2EarnTask } from '../../types/learn2earn';

// Define correct prop interface
interface TaskCardProps {
  task: Learn2EarnTask;
  isReadOnly?: boolean;
}

const TaskCard = ({ task, isReadOnly = false }: TaskCardProps) => {
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  
  // Handle embedded YouTube video if present
  const getVideoEmbedUrl = (url: string) => {
    if (!url) return null;
    
    // Extract YouTube video ID from various formats
    const ytRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(ytRegex);
    
    if (match && match[1]) {
      return `https://www.youtube.com/embed/${match[1]}`;
    }
    
    return null;
  };
  
  const videoUrl = task.videoUrl ? getVideoEmbedUrl(task.videoUrl) : null;
  
  return (
    <div className="bg-black/20 rounded-lg p-6 border border-gray-800">
      <h3 className="text-xl font-bold text-orange-300 mb-3">{task.title}</h3>
      <p className="text-gray-300 mb-4 break-words whitespace-normal">{task.description}</p>
      
      {videoUrl && (
        <div className="mb-6 aspect-video">
          <iframe 
            src={videoUrl}
            className="w-full h-full rounded-lg"
            allowFullScreen
            title={task.title}
          ></iframe>
        </div>
      )}
      
      {task.type === 'content' && task.contentText && (
        <div className="bg-black/30 p-4 rounded-lg text-gray-300 mb-4 overflow-hidden">
          <div 
            className="prose prose-sm prose-invert max-w-none overflow-auto break-words whitespace-normal"
            dangerouslySetInnerHTML={{ 
              __html: task.contentText
                .replace(/\n/g, '<br>')
                .replace(/<img(.+?)>/g, '<img$1 style="max-width:100%; height:auto;">')
            }}
          />
        </div>
      )}
      
      {task.type === 'question' && task.options && !isReadOnly && (
        <div className="mt-4">
          <h4 className="text-lg font-medium text-white mb-3 break-words whitespace-normal">{task.question}</h4>
          
          <div className="space-y-2 mb-4">
            {task.options.map((option, index) => (
              <div key={index} className="flex items-start">
                <input
                  type="radio"
                  id={`option-${index}`}
                  name="question-option"
                  checked={selectedOption === index}
                  onChange={() => setSelectedOption(index)}
                  className="mr-3 mt-1"
                />
                <label 
                  htmlFor={`option-${index}`}
                  className={`text-gray-300 break-words whitespace-normal ${showAnswer && task.correctOption === index ? 'text-green-400 font-medium' : ''}`}
                >
                  {option}
                </label>
              </div>
            ))}
          </div>
          
          <div className="flex flex-wrap justify-between">
            <button
              onClick={() => setShowAnswer(true)}
              className="text-orange-400 hover:text-orange-300"
            >
              Show Answer
            </button>
            
            {showAnswer && (
              <div className={`text-sm break-words whitespace-normal ${selectedOption === task.correctOption ? 'text-green-500' : 'text-red-500'}`}>
                {selectedOption === task.correctOption 
                  ? 'Correct! ✓' 
                  : `Incorrect. The correct answer is: ${task.options[task.correctOption ?? 0]}`}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskCard;
