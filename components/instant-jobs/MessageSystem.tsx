import React, { useState, useRef, useEffect } from 'react';
import { Button } from "../ui/button";
import { JobMessage } from '@/services/instantJobsService';
import { Timestamp } from 'firebase/firestore';
import { Paperclip, FileText, Image, X } from 'lucide-react'; 

interface MessageSystemProps {
  messages: JobMessage[];
  onSendMessage: (message: string, attachments?: File[]) => Promise<void>;
  isLoading: boolean;
  currentUserId: string;
  currentUserType: 'company' | 'worker';
}

const MessageSystem: React.FC<MessageSystemProps> = ({
  messages,
  onSendMessage,
  isLoading,
  currentUserId,
  currentUserType
}) => {
  const [newMessage, setNewMessage] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Function to format timestamp
  const formatTimestamp = (timestamp: Date | Timestamp) => {
    if (timestamp instanceof Timestamp) {
      return new Date(timestamp.seconds * 1000).toLocaleString();
    }
    return new Date(timestamp).toLocaleString();
  };
  
  // Function to handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setFiles(prev => [...prev, ...newFiles]);
    }
  };
  
  // Function to remove file from the list
  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };
  
  // Function to trigger file input click
  const handleAttachClick = () => {
    fileInputRef.current?.click();
  };
  
  // Function to send message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() && files.length === 0) return;
    
    try {
      await onSendMessage(newMessage, files);
      setNewMessage('');
      setFiles([]);
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };
  
  // Get file icon based on file type
  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) {
      return <Image className="w-5 h-5 text-blue-400" />;
    }
    return <FileText className="w-5 h-5 text-orange-400" />;
  };
  
  // Get file type label
  const getFileTypeLabel = (file: File) => {
    if (file.type.startsWith('image/')) {
      return 'Image';
    }
    if (file.type === 'application/pdf') {
      return 'PDF';
    }
    return 'File';
  };
  
  // Format file size
  const formatFileSize = (size: number) => {
    if (size < 1024) {
      return size + ' B';
    } else if (size < 1024 * 1024) {
      return (size / 1024).toFixed(1) + ' KB';
    } else {
      return (size / (1024 * 1024)).toFixed(1) + ' MB';
    }
  };
  
  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  return (
    <div className="flex flex-col h-[500px] max-h-[500px]">
      {/* Messages container */}
      <div className="flex-grow overflow-y-auto mb-4">
        {messages.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-gray-400">No messages yet.</p>
            <p className="text-gray-500 text-sm mt-2">
              Start the conversation by sending a message below.
            </p>
          </div>
        ) : (
          <div className="space-y-3 p-2">
            {messages.map((msg, index) => (
              <div 
                key={index} 
                className={`flex ${msg.senderId === currentUserId ? 'justify-end' : 'justify-start'}`}
              >
                <div 
                  className={`rounded-lg px-4 py-2 max-w-[80%] break-words
                    ${msg.senderId === currentUserId 
                      ? 'bg-orange-500 text-white' 
                      : 'bg-gray-700 text-white'
                    }
                  `}
                >
                  <div className="text-xs mb-1 opacity-70">
                    {msg.senderName} - {formatTimestamp(msg.timestamp)}
                  </div>
                  <div className="whitespace-pre-line">{msg.message}</div>
                  
                  {/* Display attachments if any */}
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-white/20">
                      <p className="text-xs mb-1 font-medium">Attachments:</p>
                      <div className="grid grid-cols-1 gap-2">
                        {msg.attachments.map((url, i) => (
                          <a 
                            key={i} 
                            href={url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center bg-black/20 px-2 py-1 rounded hover:bg-black/30 transition-colors"
                          >
                            <FileText className="w-4 h-4 mr-2" />
                            <span className="text-xs truncate">Attachment {i + 1}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>
      
      {/* File attachments */}
      {files.length > 0 && (
        <div className="mb-2 p-2 bg-black/30 rounded-lg border border-gray-700">
          <div className="text-xs mb-2 text-gray-400">Attachments:</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {files.map((file, index) => (
              <div 
                key={index}
                className="flex items-center justify-between bg-black/20 p-2 rounded"
              >
                <div className="flex items-center overflow-hidden">
                  {getFileIcon(file)}
                  <div className="ml-2 truncate">
                    <div className="text-sm truncate">{file.name}</div>
                    <div className="text-xs text-gray-400">
                      {getFileTypeLabel(file)} • {formatFileSize(file.size)}
                    </div>
                  </div>
                </div>
                <button 
                  type="button" 
                  onClick={() => removeFile(index)}
                  className="ml-2 text-gray-400 hover:text-white"
                  title="Remove file"
                  aria-label="Remove file"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Send form */}
      <form onSubmit={handleSendMessage} className="flex flex-col space-y-2 mt-auto">
        <textarea
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type your message..."
          className="w-full p-3 bg-black/50 border border-gray-700 rounded-lg text-white resize-none"
          rows={2}
          disabled={isLoading}
        />
        <div className="flex space-x-2">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileChange}
            disabled={isLoading}
          />
          <Button
            type="button"
            onClick={handleAttachClick}
            className="bg-gray-700 hover:bg-gray-600 text-white"
            disabled={isLoading}
          >
            <Paperclip className="w-4 h-4 mr-1" />
            Attach Files
          </Button>
          <Button
            type="submit"
            className="bg-orange-500 hover:bg-orange-600 text-white flex-grow"
            disabled={isLoading || (!newMessage.trim() && files.length === 0)}
          >
            {isLoading ? 'Sending...' : 'Send'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default MessageSystem;