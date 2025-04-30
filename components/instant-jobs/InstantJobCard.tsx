import React, { useState } from 'react';
import { Button } from "../ui/button";
import { InstantJob } from '@/services/instantJobsService';
import { Timestamp } from 'firebase/firestore';
import { Coins, Check, Clock, AlertCircle } from 'lucide-react';

interface InstantJobCardProps {
  job: InstantJob;
  onClick: (jobId: string) => void;
  showActionButtons?: boolean;
  onAccept?: (jobId: string) => Promise<void>;
  onApprove?: (jobId: string) => Promise<void>;
  onComplete?: (jobId: string) => Promise<void>;
  onApply?: (jobId: string) => Promise<void>;
  isCompanyView: boolean;
  hasApplied?: boolean;
}

const InstantJobCard: React.FC<InstantJobCardProps> = ({
  job,
  onClick,
  showActionButtons = false,
  onAccept,
  onApprove,
  onComplete,
  onApply,
  isCompanyView,
  hasApplied = false
}) => {
  const [isLoading, setIsLoading] = useState(false);
  
  // Function to format date
  const formatDate = (date: Date | Timestamp) => {
    if (date instanceof Timestamp) {
      return new Date(date.seconds * 1000).toLocaleDateString();
    }
    return new Date(date).toLocaleDateString();
  };
  
  // Function to get shortened description
  const getShortDescription = (description: string, maxLength = 100) => {
    if (description.length <= maxLength) return description;
    return description.substring(0, maxLength) + '...';
  };
  
  // Function to get formatted status
  const getStatusText = (status: string) => {
    switch (status) {
      case 'open': return 'Open';
      case 'accepted': return 'Accepted';
      case 'in_progress': return 'In Progress';
      case 'completed': return 'Completed - Pending Approval';
      case 'approved': return 'Approved';
      case 'disputed': return 'Disputed';
      case 'closed': return 'Closed';
      default: return status;
    }
  };
  
  // Function to get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'text-green-400';
      case 'accepted': 
      case 'in_progress': return 'text-blue-400';
      case 'completed': return 'text-yellow-400';
      case 'approved': return 'text-orange-400';
      case 'disputed': return 'text-red-400';
      case 'closed': return 'text-gray-400';
      default: return 'text-white';
    }
  };

  // Handling actions with loading state
  const handleAction = async (
    action: (jobId: string) => Promise<void>,
    jobId: string,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    setIsLoading(true);
    try {
      await action(jobId);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div 
      className="border border-gray-800 rounded-lg p-5 bg-black/50 hover:bg-black/70 hover:border-orange-500/50 transition-all cursor-pointer"
      onClick={() => job.id && onClick(job.id)}
    >
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-xl font-semibold text-orange-400 mb-2">
            {job.title}
          </h3>
          
          <div className="space-y-2">
            <p className="text-gray-300 text-sm">{getShortDescription(job.description)}</p>
            
            <div className="flex flex-wrap gap-2 mt-2">
              {job.requiredSkills?.map((skill, index) => (
                <span key={index} className="bg-gray-800 text-xs text-orange-300 px-2 py-1 rounded-full">
                  {skill}
                </span>
              ))}
            </div>
          </div>
        </div>
        
        <div className="text-right">
          <div className={`font-semibold ${getStatusColor(job.status)}`}>
            {getStatusText(job.status)}
          </div>
          <div className="text-white font-bold mt-1">
            {job.budget} {job.currency}
          </div>
          <div className="text-gray-400 text-sm mt-1">
            Deadline: {formatDate(job.deadline)}
          </div>
        </div>
      </div>
      
      {!isCompanyView && job.companyName && (
        <div className="mt-3 text-sm text-gray-400">
          Company: <span className="text-blue-300">{job.companyName}</span>
        </div>
      )}
      
      {isCompanyView && job.acceptedByName && job.status !== 'open' && (
        <div className="mt-3 text-sm text-gray-400">
          Accepted by: <span className="text-blue-300">{job.acceptedByName}</span>
        </div>
      )}

      {/* Escrow Status Indicator */}
      {job.status !== 'open' && (
        <div className="mt-3 flex items-center gap-2">
          {job.escrowDeposited ? (
            <div className="bg-green-900/30 text-green-400 text-xs py-1 px-3 rounded-full flex items-center">
              <Coins className="w-3 h-3 mr-1" /> 
              Funds in Escrow
            </div>
          ) : (
            <div className="bg-yellow-900/30 text-yellow-400 text-xs py-1 px-3 rounded-full flex items-center">
              <AlertCircle className="w-3 h-3 mr-1" /> 
              Awaiting Deposit
            </div>
          )}
          
          {job.status === 'approved' && (
            <div className="bg-green-900/30 text-green-400 text-xs py-1 px-3 rounded-full flex items-center">
              <Check className="w-3 h-3 mr-1" /> 
              Payment Released
            </div>
          )}
          
          {job.status === 'completed' && (
            <div className="bg-blue-900/30 text-blue-400 text-xs py-1 px-3 rounded-full flex items-center">
              <Clock className="w-3 h-3 mr-1" /> 
              Awaiting Approval
            </div>
          )}
        </div>
      )}
      
      {showActionButtons && (
        <div className="mt-4 flex justify-end space-x-2">
          {/* Apply for job */}
          {!isCompanyView && job.status === 'open' && onApply && job.id && !hasApplied && (
            <Button 
              onClick={(e) => handleAction(onApply, job.id!, e)}
              className="bg-purple-500 hover:bg-purple-600 text-white text-sm"
              disabled={isLoading}
            >
              {isLoading ? 'Applying...' : 'Apply'}
            </Button>
          )}
          
          {/* Show applied status */}
          {!isCompanyView && job.status === 'open' && hasApplied && (
            <div className="bg-purple-900/30 text-purple-400 text-xs py-1 px-3 rounded-full flex items-center">
              <Check className="w-3 h-3 mr-1" /> 
              Applied
            </div>
          )}
          
          {/* Accept task (for worker who was selected) */}
          {!isCompanyView && job.status === 'open' && onAccept && job.id && (
            <Button 
              onClick={(e) => handleAction(onAccept, job.id!, e)}
              className="bg-green-500 hover:bg-green-600 text-white text-sm"
              disabled={isLoading}
            >
              {isLoading ? 'Accepting...' : 'Accept Task'}
            </Button>
          )}
          
          {/* Complete task button */}
          {!isCompanyView && job.status === 'accepted' && onComplete && job.id && (
            <Button 
              onClick={(e) => handleAction(onComplete, job.id!, e)}
              className="bg-blue-500 hover:bg-blue-600 text-white text-sm"
              disabled={isLoading}
            >
              {isLoading ? 'Submitting...' : 'Mark as Complete'}
            </Button>
          )}
          
          {/* Approve button (for company) */}
          {isCompanyView && job.status === 'completed' && onApprove && job.id && (
            <Button 
              onClick={(e) => handleAction(onApprove, job.id!, e)}
              className="bg-orange-500 hover:bg-orange-600 text-white text-sm"
              disabled={isLoading}
            >
              {isLoading ? 'Approving...' : 'Approve'}
            </Button>
          )}
          
          <Button 
            onClick={(e) => {
              e.stopPropagation();
              if (job.id) {
                onClick(job.id);
              }
            }}
            className="bg-gray-700 hover:bg-gray-600 text-white text-sm"
          >
            View Details
          </Button>
        </div>
      )}
    </div>
  );
};

export default InstantJobCard;