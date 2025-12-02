import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import supabase from '../lib/supabase';
import toast, { Toaster } from 'react-hot-toast';

export default function AdminPanel() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    type: 'announcement',
    event_date: ''
  });

  // Check authentication and verify admin role
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) throw error;

        if (!session) {
          navigate('/');
          return;
        }

        setUser(session.user);

        // Fetch user profile
        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (profileError) throw profileError;

        // Check if user is admin
        if (profile.role !== 'admin') {
          toast.error('Access denied. Admin only.');
          navigate('/dashboard');
          return;
        }

        setUserProfile(profile);
      } catch (error) {
        console.error('Error:', error);
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [navigate]);

  // Fetch admin's posts
  useEffect(() => {
    if (userProfile) {
      fetchPosts();
    }
  }, [userProfile]);

  const fetchPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('author_id', userProfile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Add comment count to each post
      const postsWithComments = await Promise.all(
        data.map(async (post) => {
          const { count } = await supabase
            .from('comments')
            .select('*', { count: 'exact', head: true })
            .eq('post_id', post.id);
          
          return { ...post, comment_count: count || 0 };
        })
      );

      setPosts(postsWithComments);
    } catch (error) {
      toast.error('Failed to load posts');
      console.error(error);
    }
  };

  const handleCreatePost = async () => {
    if (!formData.title || !formData.content) {
      toast.error('Title and content are required');
      return;
    }

    if (formData.type === 'event' && !formData.event_date) {
      toast.error('Event date is required for events');
      return;
    }

    const loadingToast = toast.loading('Creating post...');

    try {
      const { error } = await supabase
        .from('posts')
        .insert([
          {
            title: formData.title,
            content: formData.content,
            type: formData.type,
            department: userProfile.department,
            author_id: userProfile.id,
            event_date: formData.type === 'event' ? formData.event_date : null,
            status: 'active'
          }
        ]);

      if (error) throw error;

      toast.success('Post created successfully!', { id: loadingToast });
      setShowCreateModal(false);
      setFormData({ title: '', content: '', type: 'announcement', event_date: '' });
      fetchPosts();
    } catch (error) {
      toast.error(error.message, { id: loadingToast });
    }
  };

  const handleEditPost = async () => {
    if (!formData.title || !formData.content) {
      toast.error('Title and content are required');
      return;
    }

    if (formData.type === 'event' && !formData.event_date) {
      toast.error('Event date is required for events');
      return;
    }

    const loadingToast = toast.loading('Updating post...');

    try {
      const { error } = await supabase
        .from('posts')
        .update({
          title: formData.title,
          content: formData.content,
          type: formData.type,
          event_date: formData.type === 'event' ? formData.event_date : null
        })
        .eq('id', editingPost.id);

      if (error) throw error;

      toast.success('Post updated successfully!', { id: loadingToast });
      setShowEditModal(false);
      setEditingPost(null);
      setFormData({ title: '', content: '', type: 'announcement', event_date: '' });
      fetchPosts();
    } catch (error) {
      toast.error(error.message, { id: loadingToast });
    }
  };

  const handleDeletePost = async (postId) => {
    if (!confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
      return;
    }

    const loadingToast = toast.loading('Deleting post...');

    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId);

      if (error) throw error;

      toast.success('Post deleted successfully!', { id: loadingToast });
      fetchPosts();
    } catch (error) {
      toast.error(error.message, { id: loadingToast });
    }
  };

  const handleArchivePost = async (postId) => {
    if (!confirm('Are you sure you want to archive this post?')) {
      return;
    }

    const loadingToast = toast.loading('Archiving post...');

    try {
      const { error } = await supabase
        .from('posts')
        .update({ status: 'archived' })
        .eq('id', postId);

      if (error) throw error;

      toast.success('Post archived successfully!', { id: loadingToast });
      fetchPosts();
    } catch (error) {
      toast.error(error.message, { id: loadingToast });
    }
  };

  const openEditModal = (post) => {
    setEditingPost(post);
    setFormData({
      title: post.title,
      content: post.content,
      type: post.type,
      event_date: post.event_date ? new Date(post.event_date).toISOString().slice(0, 16) : ''
    });
    setShowEditModal(true);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-red-900 border-solid mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-center" />

      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
                <p className="text-sm text-gray-500">{userProfile?.department} - Manage your posts</p>
              </div>
            </div>

            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-2 bg-red-900 hover:bg-red-800 text-white font-semibold rounded-lg transition-colors"
            >
              + Create Post
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-full">
                <span className="text-2xl">📝</span>
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-500">Active Posts</p>
                <p className="text-2xl font-bold text-gray-900">
                  {posts.filter(p => p.status === 'active').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-full">
                <span className="text-2xl">📢</span>
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-500">Announcements</p>
                <p className="text-2xl font-bold text-gray-900">
                  {posts.filter(p => p.type === 'announcement' && p.status === 'active').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="p-3 bg-purple-100 rounded-full">
                <span className="text-2xl">📅</span>
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-500">Events</p>
                <p className="text-2xl font-bold text-gray-900">
                  {posts.filter(p => p.type === 'event' && p.status === 'active').length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Posts List */}
        <div className="bg-white rounded-lg shadow-md">
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-semibold text-gray-900">Your Posts</h2>
          </div>

          {posts.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-gray-500 text-lg">No posts yet</p>
              <p className="text-gray-400 text-sm mt-2">Create your first post to get started</p>
            </div>
          ) : (
            <div className="divide-y">
              {posts.map((post) => (
                <div key={post.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          post.type === 'event' 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {post.type === 'event' ? '📅 Event' : '📢 Announcement'}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          post.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {post.status}
                        </span>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">{post.title}</h3>
                      <p className="text-gray-600 text-sm mb-2 line-clamp-2">{post.content}</p>
                      
                      {post.type === 'event' && post.event_date && (
                        <p className="text-sm text-gray-500 mb-2">
                          📅 Event Date: {formatDate(post.event_date)}
                        </p>
                      )}

                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span>Posted: {formatDate(post.created_at)}</span>
                        <span>•</span>
                        <span>💬 {post.comment_count} comments</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => navigate(`/post/${post.id}`)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="View"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => openEditModal(post)}
                        className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      {post.status === 'active' && (
                        <button
                          onClick={() => handleArchivePost(post.id)}
                          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Archive"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                          </svg>
                        </button>
                      )}
                      <button
                        onClick={() => handleDeletePost(post.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* CREATE POST MODAL */}
      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => {
            setShowCreateModal(false);
            setFormData({ title: '', content: '', type: 'announcement', event_date: '' });
          }}
        >
          <div
            className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b">
              <h2 className="text-2xl font-bold text-gray-900">Create New Post</h2>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Post Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-900"
                >
                  <option value="announcement">Announcement</option>
                  <option value="event">Event</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-900"
                  placeholder="Enter post title"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Content</label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  rows="6"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-900"
                  placeholder="Enter post content"
                ></textarea>
              </div>

              {formData.type === 'event' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Event Date & Time</label>
                  <input
                    type="datetime-local"
                    value={formData.event_date}
                    onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-900"
                  />
                </div>
              )}
            </div>

            <div className="p-6 border-t flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setFormData({ title: '', content: '', type: 'announcement', event_date: '' });
                }}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreatePost}
                className="px-6 py-2 bg-red-900 hover:bg-red-800 text-white font-semibold rounded-lg transition-colors"
              >
                Create Post
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT POST MODAL */}
      {showEditModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => {
            setShowEditModal(false);
            setEditingPost(null);
            setFormData({ title: '', content: '', type: 'announcement', event_date: '' });
          }}
        >
          <div
            className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b">
              <h2 className="text-2xl font-bold text-gray-900">Edit Post</h2>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Post Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-900"
                >
                  <option value="announcement">Announcement</option>
                  <option value="event">Event</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-900"
                  placeholder="Enter post title"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Content</label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  rows="6"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-900"
                  placeholder="Enter post content"
                ></textarea>
              </div>

              {formData.type === 'event' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Event Date & Time</label>
                  <input
                    type="datetime-local"
                    value={formData.event_date}
                    onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-900"
                  />
                </div>
              )}
            </div>

            <div className="p-6 border-t flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingPost(null);
                  setFormData({ title: '', content: '', type: 'announcement', event_date: '' });
                }}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleEditPost}
                className="px-6 py-2 bg-red-900 hover:bg-red-800 text-white font-semibold rounded-lg transition-colors"
              >
                Update Post
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}