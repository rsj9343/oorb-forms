import React, { useState, useEffect } from 'react';
import { ArrowLeft, Download, Trash2, Calendar, Clock, User, Menu, X } from 'lucide-react';
import { responseAPI, exportAPI, formAPI } from '../../services/api';
import toast from 'react-hot-toast';

interface Response {
  _id: string;
  responses: Array<{
    fieldId: string;
    fieldLabel: string;
    fieldType: string;
    value: any;
  }>;
  submittedAt: string;
  completionTime?: number;
}

interface Form {
  _id: string;
  title: string;
  description: string;
}

interface ResponseViewerProps {
  formId: string;
  onBack: () => void;
}

const ResponseViewer: React.FC<ResponseViewerProps> = ({ formId, onBack }) => {
  const [form, setForm] = useState<Form | null>(null);
  const [responses, setResponses] = useState<Response[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  useEffect(() => {
    loadForm();
    loadResponses();
  }, [formId, currentPage]);

  const loadForm = async () => {
    try {
      const response = await formAPI.getForm(formId);
      setForm(response.data);
    } catch (error) {
      toast.error('Failed to load form');
      console.error('Error loading form:', error);
    }
  };

  const loadResponses = async () => {
    setLoading(true);
    try {
      const response = await responseAPI.getResponses(formId, currentPage, 10);
      console.log('ResponseViewer: API response:', response.data);
      
      // Handle different response structures
      if (response.data.responses) {
        setResponses(response.data.responses);
        setTotalPages(response.data.pagination?.total || 1);
      } else if (Array.isArray(response.data)) {
        // If the API returns responses directly as an array
        setResponses(response.data);
        setTotalPages(1);
      } else {
        console.warn('Unexpected response structure:', response.data);
        setResponses([]);
        setTotalPages(1);
      }
    } catch (error) {
      console.error('ResponseViewer: Error loading responses:', error);
      
      // More specific error handling
      if (error.response?.status === 404) {
        toast.error('Form not found or no responses available');
      } else if (error.response?.status === 403) {
        toast.error('You do not have permission to view these responses');
      } else {
        toast.error('Failed to load responses. Please try again.');
      }
      
      setResponses([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  const deleteResponse = async (responseId: string) => {
    if (!confirm('Are you sure you want to delete this response?')) {
      return;
    }

    try {
      await responseAPI.deleteResponse(responseId);
      setResponses(responses.filter(r => r._id !== responseId));
      toast.success('Response deleted successfully');
    } catch (error) {
      toast.error('Failed to delete response');
      console.error('Error deleting response:', error);
    }
  };

  const downloadExcel = () => {
    exportAPI.downloadExcel(formId);
    toast.success('Excel download started');
  };

  const downloadCSV = () => {
    exportAPI.downloadCSV(formId);
    toast.success('CSV download started');
  };

  const formatValue = (value: any, fieldType: string) => {
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    if (fieldType === 'rating') {
      return `${value}/5 stars`;
    }
    return value?.toString() || 'No answer';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading responses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0">
            <div className="flex items-center space-x-4 min-w-0 flex-1">
              <button
                onClick={onBack}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 flex-shrink-0"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Back to Dashboard</span>
              </button>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-2xl font-bold text-gray-900 truncate">{form?.title}</h1>
                <p className="text-sm sm:text-base text-gray-600">{responses.length} responses</p>
              </div>
            </div>
            
            {/* Desktop Export Buttons */}
            {responses.length > 0 && (
              <div className="hidden sm:flex items-center space-x-2">
                <button
                  onClick={downloadExcel}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                >
                  <Download className="w-4 h-4" />
                  <span>Excel</span>
                </button>
                <button
                  onClick={downloadCSV}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                >
                  <Download className="w-4 h-4" />
                  <span>CSV</span>
                </button>
              </div>
            )}

            {/* Mobile Menu Button */}
            {responses.length > 0 && (
              <div className="sm:hidden">
                <button
                  onClick={() => setShowMobileMenu(!showMobileMenu)}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <Menu className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {showMobileMenu && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 sm:hidden">
          <div className="fixed right-0 top-0 h-full w-64 bg-white shadow-lg">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Export Options</h2>
                <button
                  onClick={() => setShowMobileMenu(false)}
                  className="p-2 rounded-lg hover:bg-gray-100"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            </div>

            <div className="p-4 space-y-2">
              <button
                onClick={() => {
                  downloadExcel();
                  setShowMobileMenu(false);
                }}
                className="w-full flex items-center space-x-3 px-4 py-3 bg-green-600 text-white rounded-lg"
              >
                <Download className="w-5 h-5" />
                <span>Download Excel</span>
              </button>
              <button
                onClick={() => {
                  downloadCSV();
                  setShowMobileMenu(false);
                }}
                className="w-full flex items-center space-x-3 px-4 py-3 bg-blue-600 text-white rounded-lg"
              >
                <Download className="w-5 h-5" />
                <span>Download CSV</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {responses.length === 0 ? (
          <div className="text-center py-12">
            <User className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No responses yet</h3>
            <p className="text-gray-600">
              Share your form to start collecting responses.
            </p>
          </div>
        ) : (
          <div className="space-y-4 sm:space-y-6">
            {responses.map((response, index) => (
              <div key={response._id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 space-y-2 sm:space-y-0">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                    <h3 className="text-base sm:text-lg font-medium text-gray-900">
                      Response #{(currentPage - 1) * 10 + index + 1}
                    </h3>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-500">
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-4 h-4" />
                        <span>{new Date(response.submittedAt).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="w-4 h-4" />
                        <span>{new Date(response.submittedAt).toLocaleTimeString()}</span>
                      </div>
                      {response.completionTime && (
                        <div className="flex items-center space-x-1">
                          <Clock className="w-4 h-4" />
                          <span>{response.completionTime}s completion</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <button
                    onClick={() => deleteResponse(response._id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md self-end sm:self-auto"
                    title="Delete response"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="grid gap-3 sm:gap-4">
                  {response.responses.map((fieldResponse, fieldIndex) => (
                    <div key={fieldIndex} className="border-l-4 border-blue-500 pl-3 sm:pl-4">
                      <h4 className="font-medium text-gray-900 mb-1 text-sm sm:text-base">
                        {fieldResponse.fieldLabel}
                      </h4>
                      <p className="text-gray-700 text-sm sm:text-base break-words">
                        {formatValue(fieldResponse.value, fieldResponse.fieldType)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-center space-y-2 sm:space-y-0 sm:space-x-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50 text-sm"
                >
                  Previous
                </button>
                
                <span className="px-4 py-2 text-gray-700 text-sm">
                  Page {currentPage} of {totalPages}
                </span>
                
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50 text-sm"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ResponseViewer;