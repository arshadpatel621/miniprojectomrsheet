import { useState } from 'react';
import { Upload, File, X } from 'lucide-react';
import { motion } from 'framer-motion';

const FileDropZone = ({ onFilesSelected, accept, multiple = false, label }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState([]);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    handleFiles(droppedFiles);
  };

  const handleFileInput = (e) => {
    const selectedFiles = Array.from(e.target.files);
    handleFiles(selectedFiles);
  };

  const handleFiles = (newFiles) => {
    if (!multiple && newFiles.length > 1) {
      newFiles = [newFiles[0]];
    }
    
    setFiles(newFiles);
    onFilesSelected(newFiles);
  };

  const removeFile = (index) => {
    const updatedFiles = files.filter((_, i) => i !== index);
    setFiles(updatedFiles);
    onFilesSelected(updatedFiles);
  };

  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>
      
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ${
          isDragging
            ? 'border-primary-500 bg-primary-50'
            : 'border-gray-300 bg-gray-50 hover:border-primary-400'
        }`}
      >
        <input
          type="file"
          id={`file-upload-${label}`}
          onChange={handleFileInput}
          accept={accept}
          multiple={multiple}
          className="hidden"
        />
        
        <label
          htmlFor={`file-upload-${label}`}
          className="cursor-pointer flex flex-col items-center"
        >
          <Upload
            className={`w-12 h-12 mb-4 ${
              isDragging ? 'text-primary-600' : 'text-gray-400'
            }`}
          />
          <p className="text-gray-700 font-medium mb-2">
            Drag & drop files here, or click to browse
          </p>
          <p className="text-sm text-gray-500">
            {accept ? `Accepted formats: ${accept}` : 'All formats accepted'}
          </p>
          {multiple && (
            <p className="text-xs text-gray-400 mt-1">
              You can select multiple files at once
            </p>
          )}
        </label>
      </div>

      {files.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 space-y-2"
        >
          {files.map((file, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg shadow-sm"
            >
              <div className="flex items-center gap-3">
                <File className="w-5 h-5 text-primary-600" />
                <div>
                  <p className="text-sm font-medium text-gray-800">{file.name}</p>
                  <p className="text-xs text-gray-500">
                    {(file.size / 1024).toFixed(2)} KB
                  </p>
                </div>
              </div>
              <button
                onClick={() => removeFile(index)}
                className="p-1 hover:bg-red-50 rounded-full transition-colors"
              >
                <X className="w-4 h-4 text-red-600" />
              </button>
            </div>
          ))}
        </motion.div>
      )}
    </div>
  );
};

export default FileDropZone;
