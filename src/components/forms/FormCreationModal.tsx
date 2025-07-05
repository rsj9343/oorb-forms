import React, { useState, useEffect } from 'react';
import { X, Folder, FileText, Plus } from 'lucide-react';
import { folderAPI } from '../../services/api';
import toast from 'react-hot-toast';

interface FolderOption {
  _id: string;
  name: string;
  color: string;
}

interface FormCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { title: string; description: string; folderId?: string }) => void;
}

const FormCreationModal: React.FC<FormCreationModalProps> = ({
  isOpen,
  onClose,
  onSubmit
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedOption, setSelectedOption] = useState<'standalone' | 'folder' | 'new-folder'>('standalone');
  const [selectedFolderId, setSelectedFolderId] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  const [folders, setFolders] = useState<FolderOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadFolders();
    }
  }, [isOpen]);

  const loadFolders = async () => {
    try {
      console.log('Loading folders...');
      const response = await folderAPI.getFolders();
      console.log('Folders loaded:', response.data);
      setFolders(response.data);
    } catch (error) {
      console.error('Error loading folders:', error);
      // Don't show error toast for folders, it's optional
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      toast.error('Please enter a form title');
      return;
    }

    setLoading(true);
    
    try {
      let folderId: string | undefined;

      if (selectedOption === 'new-folder' && newFolderName.trim()) {
        console.log('Creating new folder:', newFolderName);
        // Create new folder first
        const folderResponse = await folderAPI.createFolder({
          name: newFolderName.trim(),
          description: '',
          color: '#3B82F6'
        });
        folderId = folderResponse.data._id;
        console.log('New folder created:', folderId);
      } else if (selectedOption === 'folder' && selectedFolderId) {
        folderId = selectedFolderId;
        console.log('Using existing folder:', folderId);
      }

      console.log('Submitting form creation:', { title, description, folderId });

      onSubmit({
        title: title.trim(),
        description: description.trim(),
        folderId
      });

      // Reset form
      setTitle('');
      setDescription('');
      setSelectedOption('standalone');
      setSelectedFolderId('');
      setNewFolderName('');
    } catch (error: any) {
      console.error('Error in form creation:', error);
      toast.error(error.response?.data?.error || 'Failed to create form');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Create New Form</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Form Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter form title"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
              autoFocus
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter form description (optional)"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Organization
            </label>
            <div className="space-y-3">
              {/* Standalone Option */}
              <label className="flex items-center p-3 border border-gray-200 rounded-md hover:bg-gray-50 cursor-pointer">
                <input
                  type="radio"
                  name="organization"
                  value="standalone"
                  checked={selectedOption === 'standalone'}
                  onChange={(e) => setSelectedOption(e.target.value as any)}
                  className="mr-3"
                />
                <FileText className="w-5 h-5 text-gray-400 mr-3" />
                <div>
                  <p className="font-medium text-gray-900">Standalone Form</p>
                  <p className="text-sm text-gray-500">Create a form without organizing it in a folder</p>
                </div>
              </label>

              {/* Existing Folder Option */}
              {folders.length > 0 && (
                <label className="flex items-start p-3 border border-gray-200 rounded-md hover:bg-gray-50 cursor-pointer">
                  <input
                    type="radio"
                    name="organization"
                    value="folder"
                    checked={selectedOption === 'folder'}
                    onChange={(e) => setSelectedOption(e.target.value as any)}
                    className="mr-3 mt-1"
                  />
                  <Folder className="w-5 h-5 text-gray-400 mr-3 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">Add to Existing Folder</p>
                    <p className="text-sm text-gray-500 mb-2">Organize this form in an existing folder</p>
                    {selectedOption === 'folder' && (
                      <select
                        value={selectedFolderId}
                        onChange={(e) => setSelectedFolderId(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        required={selectedOption === 'folder'}
                      >
                        <option value="">Select a folder</option>
                        {folders.map((folder) => (
                          <option key={folder._id} value={folder._id}>
                            {folder.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </label>
              )}

              {/* New Folder Option */}
              <label className="flex items-start p-3 border border-gray-200 rounded-md hover:bg-gray-50 cursor-pointer">
                <input
                  type="radio"
                  name="organization"
                  value="new-folder"
                  checked={selectedOption === 'new-folder'}
                  onChange={(e) => setSelectedOption(e.target.value as any)}
                  className="mr-3 mt-1"
                />
                <Plus className="w-5 h-5 text-gray-400 mr-3 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-gray-900">Create New Folder</p>
                  <p className="text-sm text-gray-500 mb-2">Create a new folder and add this form to it</p>
                  {selectedOption === 'new-folder' && (
                    <input
                      type="text"
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      placeholder="Enter folder name"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      required={selectedOption === 'new-folder'}
                    />
                  )}
                </div>
              </label>
            </div>
          </div>
          
          <div className="flex items-center justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !title.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating...
                </div>
              ) : (
                'Create Form'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FormCreationModal;