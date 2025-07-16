import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useCases } from '../contexts/CasesContext';
import { casesAPI } from '../services/api';

const CaseDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentCase, loading, error, fetchCase, updateCase, deleteCase } = useCases();
  
  const [comments, setComments] = useState([]);
  const [files, setFiles] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('comments');

  useEffect(() => {
    if (id) {
      fetchCase(id);
      loadComments();
      loadFiles();
    }
  }, [id, fetchCase]);

  const loadComments = async () => {
    try {
      const commentsData = await casesAPI.getCaseComments(id);
      setComments(commentsData);
    } catch (error) {
      console.error('Error loading comments:', error);
    }
  };

  const loadFiles = async () => {
    try {
      const filesData = await casesAPI.getCaseFiles(id);
      setFiles(filesData);
    } catch (error) {
      console.error('Error loading files:', error);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setCommentLoading(true);
    try {
      const commentData = {
        content: newComment,
        author: 'current_user',
        author_name: 'Current User'
      };
      
      await casesAPI.createComment(id, commentData);
      setNewComment('');
      loadComments();
      // Refresh case to update comment count
      fetchCase(id);
    } catch (error) {
      console.error('Error adding comment:', error);
    } finally {
      setCommentLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const files = e.target.files;
    if (!files.length) return;

    setUploadLoading(true);
    try {
      for (let file of files) {
        await casesAPI.uploadFile(id, file, 'current_user');
      }
      loadFiles();
      // Refresh case to update file count
      fetchCase(id);
    } catch (error) {
      console.error('Error uploading files:', error);
    } finally {
      setUploadLoading(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      await updateCase(id, { status: newStatus });
      loadComments(); // Reload to see system comment
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleDeleteCase = async () => {
    if (window.confirm('Are you sure you want to delete this case? This action cannot be undone.')) {
      try {
        await deleteCase(id);
        navigate('/cases');
      } catch (error) {
        console.error('Error deleting case:', error);
      }
    }
  };

  const downloadFile = async (fileId, filename) => {
    try {
      const blob = await casesAPI.downloadFile(fileId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading file:', error);
    }
  };

  const deleteFile = async (fileId) => {
    if (window.confirm('Are you sure you want to delete this file?')) {
      try {
        await casesAPI.deleteFile(fileId);
        loadFiles();
        fetchCase(id); // Refresh to update file count
      } catch (error) {
        console.error('Error deleting file:', error);
      }
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'open':
        return 'bg-blue-100 text-blue-800';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'closed':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          Error loading case: {error}
        </div>
      </div>
    );
  }

  if (!currentCase) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="text-center py-12">
          <p className="text-gray-500">Case not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <nav className="flex items-center space-x-2 text-sm text-gray-500 mb-2">
              <Link to="/cases" className="hover:text-blue-600">Cases</Link>
              <span>›</span>
              <span>Case #{currentCase.id.slice(-8)}</span>
            </nav>
            <h1 className="text-3xl font-bold text-gray-900">{currentCase.title}</h1>
          </div>
          <div className="flex items-center space-x-4">
            <Link
              to={`/cases/${id}/edit`}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Edit Case
            </Link>
            <button
              onClick={handleDeleteCase}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            >
              Delete Case
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2">
          {/* Case Details */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Case Details</h2>
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(currentCase.priority)}`}>
                  {currentCase.priority?.toUpperCase()}
                </span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(currentCase.status)}`}>
                  {currentCase.status?.replace('_', ' ').toUpperCase()}
                </span>
              </div>
            </div>

            <div className="prose max-w-none mb-6">
              <p className="text-gray-700 whitespace-pre-wrap">{currentCase.description}</p>
            </div>

            {currentCase.tags && currentCase.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {currentCase.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-gray-100 text-gray-700 rounded-md text-sm"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            <div className="text-sm text-gray-500">
              <p>Created by {currentCase.created_by_name} on {formatDate(currentCase.created_at)}</p>
              {currentCase.assigned_to_name && (
                <p>Assigned to {currentCase.assigned_to_name}</p>
              )}
              {currentCase.updated_at !== currentCase.created_at && (
                <p>Last updated {formatDate(currentCase.updated_at)}</p>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-white rounded-lg shadow">
            <div className="border-b border-gray-200">
              <nav className="flex space-x-8 px-6">
                <button
                  onClick={() => setActiveTab('comments')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'comments'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Comments ({comments.length})
                </button>
                <button
                  onClick={() => setActiveTab('files')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'files'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Files ({files.length})
                </button>
              </nav>
            </div>

            <div className="p-6">
              {activeTab === 'comments' && (
                <div className="space-y-6">
                  {/* Add Comment Form */}
                  <form onSubmit={handleAddComment} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Add Comment
                      </label>
                      <textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        rows={3}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Write your comment..."
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={commentLoading || !newComment.trim()}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {commentLoading ? 'Adding...' : 'Add Comment'}
                    </button>
                  </form>

                  {/* Comments List */}
                  <div className="space-y-4">
                    {comments.map((comment) => (
                      <div
                        key={comment.id}
                        className={`border rounded-lg p-4 ${
                          comment.comment_type === 'system' ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium text-gray-900">{comment.author_name}</span>
                            {comment.comment_type === 'system' && (
                              <span className="px-2 py-1 bg-gray-200 text-gray-700 rounded-full text-xs">
                                System
                              </span>
                            )}
                          </div>
                          <span className="text-sm text-gray-500">{formatDate(comment.created_at)}</span>
                        </div>
                        <p className="text-gray-700 whitespace-pre-wrap">{comment.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'files' && (
                <div className="space-y-6">
                  {/* File Upload */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Upload Files
                    </label>
                    <input
                      type="file"
                      multiple
                      onChange={handleFileUpload}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={uploadLoading}
                    />
                    {uploadLoading && (
                      <p className="text-sm text-blue-600 mt-2">Uploading files...</p>
                    )}
                  </div>

                  {/* Files List */}
                  <div className="space-y-3">
                    {files.map((file) => (
                      <div key={file.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{file.original_filename}</p>
                            <p className="text-sm text-gray-500">
                              {formatFileSize(file.file_size)} • Uploaded by {file.uploaded_by} • {formatDate(file.uploaded_at)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => downloadFile(file.id, file.original_filename)}
                            className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800"
                          >
                            Download
                          </button>
                          <button
                            onClick={() => deleteFile(file.id)}
                            className="px-3 py-1 text-sm text-red-600 hover:text-red-800"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status Actions */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions</h3>
            <div className="space-y-3">
              {currentCase.status !== 'open' && (
                <button
                  onClick={() => handleStatusChange('open')}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
                >
                  Reopen Case
                </button>
              )}
              {currentCase.status !== 'in_progress' && (
                <button
                  onClick={() => handleStatusChange('in_progress')}
                  className="w-full px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors text-sm"
                >
                  Mark In Progress
                </button>
              )}
              {currentCase.status !== 'closed' && (
                <button
                  onClick={() => handleStatusChange('closed')}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm"
                >
                  Close Case
                </button>
              )}
            </div>
          </div>

          {/* Case Info */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Case Information</h3>
            <div className="space-y-3 text-sm">
              <div>
                <span className="font-medium text-gray-700">Case ID:</span>
                <span className="ml-2 text-gray-600">#{currentCase.id.slice(-8)}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Priority:</span>
                <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(currentCase.priority)}`}>
                  {currentCase.priority?.toUpperCase()}
                </span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Status:</span>
                <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(currentCase.status)}`}>
                  {currentCase.status?.replace('_', ' ').toUpperCase()}
                </span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Created:</span>
                <span className="ml-2 text-gray-600">{formatDate(currentCase.created_at)}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Updated:</span>
                <span className="ml-2 text-gray-600">{formatDate(currentCase.updated_at)}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Comments:</span>
                <span className="ml-2 text-gray-600">{comments.length}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Attachments:</span>
                <span className="ml-2 text-gray-600">{files.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CaseDetail;