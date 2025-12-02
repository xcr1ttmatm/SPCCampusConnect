import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import supabase from '../lib/supabase';
import toast, { Toaster } from 'react-hot-toast';

export default function PostDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submittingComment, setSubmittingComment] = useState(false);

  const departments = [
    { code: 'CCS', name: 'College of Computer Studies', logo: '/src/logos/ccs-logo.png' },
    { code: 'COE', name: 'College of Engineering', logo: '/src/logos/coe-logo.png' },
    { code: 'COC', name: 'College of Criminology', logo: '/src/logos/coc-logo.png' },
    { code: 'CED', name: 'College of Education', logo: '/src/logos/ced-logo.png' },
    { code: 'CAS', name: 'College of Arts and Sciences', logo: '/src/logos/cas-logo.png' },
    { code: 'CBAA', name: 'College of Business Administration and Accountancy', logo: '/src/logos/cba-logo.png' }
  ];

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

        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (profileError) {
          toast.error('Failed to load user profile');
          console.error(profileError);
        } else {
          setUserProfile(profile);
        }
      } catch (error) {
        console.error('Error fetching user:', error);
        navigate('/');
      }
    };

    checkAuth();
  }, [navigate]);

  useEffect(() => {
    if (!user) return;
    fetchPost();
    fetchComments();
  }, [user, id]);

  useEffect(() => {
    const handleFocus = () => {
      if (user) {
        fetchPost();
        fetchComments();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [user, id]);

  const fetchPost = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          users:author_id (name, department, role, profile_picture)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      setPost(data);
    } catch (error) {
      toast.error('Failed to load post');
      console.error(error);
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async () => {
    try {
      const { data, error } = await supabase
        .from('comments')
        .select(`
          *,
          users:user_id (name, department, role, profile_picture)
        `)
        .eq('post_id', id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      setComments(data);
    } catch (error) {
      toast.error('Failed to load comments');
      console.error(error);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();

    if (!newComment.trim()) {
      toast.error('Comment cannot be empty');
      return;
    }

    setSubmittingComment(true);
    const loadingToast = toast.loading('Adding comment...');

    try {
      const { error } = await supabase
        .from('comments')
        .insert([
          {
            post_id: id,
            user_id: userProfile.id,
            content: newComment.trim()
          }
        ]);

      if (error) throw error;

      toast.success('Comment added successfully!', { id: loadingToast });
      setNewComment('');
      fetchComments();
    } catch (error) {
      toast.error(error.message, { id: loadingToast });
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!confirm('Are you sure you want to delete this comment?')) {
      return;
    }

    const loadingToast = toast.loading('Deleting comment...');

    try {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;

      toast.success('Comment deleted successfully!', { id: loadingToast });
      fetchComments();
    } catch (error) {
      toast.error(error.message, { id: loadingToast });
    }
  };

  const getDepartmentInfo = (code) => {
    return departments.find(dept => dept.code === code);
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

  const getInitials = (name) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((word) => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 sm:h-16 w-12 sm:w-16 border-t-4 border-red-900 border-solid mx-auto mb-4"></div>
          <p className="text-gray-600 text-base sm:text-lg">Loading post...</p>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
        <div className="text-center">
          <p className="text-gray-500 text-base sm:text-lg">Post not found</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="mt-4 px-4 sm:px-6 py-2 bg-red-900 hover:bg-red-800 text-white font-semibold rounded-lg transition-colors text-sm sm:text-base"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const deptInfo = getDepartmentInfo(post.department);
  const isOwnPost = userProfile?.role === 'admin' && post.author_id === userProfile?.id;

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-center" />

      {/* Header - Responsive */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center space-x-1 sm:space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span className="font-medium text-sm sm:text-base">Back</span>
            </button>

            {isOwnPost && (
              <button
                onClick={() => navigate('/admin')}
                className="px-3 sm:px-4 py-1.5 sm:py-2 text-blue-600 hover:text-blue-800 font-medium transition-colors text-xs sm:text-sm"
              >
                Edit Post
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content - Responsive */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Post Card */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-6 sm:mb-8">
          {/* Department Header - Responsive */}
          <div className={`px-4 sm:px-6 py-3 sm:py-4 flex items-center ${
            post.status === 'archived'
              ? 'bg-gradient-to-r from-gray-700 to-gray-600'
              : 'bg-gradient-to-r from-red-900 to-red-800'
          }`}>
            <img
              src={deptInfo?.logo}
              alt={post.department}
              className="h-8 w-8 sm:h-10 sm:w-10 rounded-full object-contain bg-white p-0.5 sm:p-1"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = '/src/assets/spc-logo.jpg';
              }}
            />
            <div className="ml-2 sm:ml-3 flex-1 min-w-0">
              <p className="text-white font-semibold text-sm sm:text-base truncate">{post.department}</p>
              <p className={`text-xs ${post.status === 'archived' ? 'text-gray-200' : 'text-red-100'} truncate hidden sm:block`}>
                {deptInfo?.name}
              </p>
            </div>
            <div className="ml-2 flex items-center gap-1 sm:gap-2 flex-shrink-0">
              <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-semibold ${
                post.type === 'event' 
                  ? 'bg-blue-100 text-blue-800' 
                  : 'bg-green-100 text-green-800'
              }`}>
                <span className="hidden sm:inline">{post.type === 'event' ? '📅 Event' : '📢 Announcement'}</span>
                <span className="sm:hidden">{post.type === 'event' ? '📅' : '📢'}</span>
              </span>
              {post.status === 'archived' && (
                <span className="px-2 sm:px-3 py-1 rounded-full text-xs font-semibold bg-gray-200 text-gray-700">
                  📦
                </span>
              )}
            </div>
          </div>

          {/* Post Content - Responsive */}
          <div className="p-4 sm:p-6 lg:p-8">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-3 sm:mb-4">{post.title}</h1>
            
            <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-500 mb-4 sm:mb-6 pb-4 sm:pb-6 border-b">
              <div className="flex items-center space-x-2">
                {post.users?.profile_picture ? (
                  <img
                    src={post.users.profile_picture}
                    alt={post.users.name}
                    className="h-6 w-6 sm:h-8 sm:w-8 rounded-full object-cover border-2 border-red-900"
                  />
                ) : (
                  <div className="h-6 w-6 sm:h-8 sm:w-8 rounded-full bg-red-900 flex items-center justify-center text-white font-semibold text-xs">
                    {getInitials(post.users?.name)}
                  </div>
                )}
                <span className="font-medium text-gray-700">{post.users?.name}</span>
              </div>
              <span className="hidden sm:inline">•</span>
              <span className="hidden sm:inline">{post.users?.department}</span>
              {post.users?.role === 'admin' && (
                <>
                  <span className="hidden sm:inline">•</span>
                  <span className="text-red-900 font-semibold">Admin</span>
                </>
              )}
              <span className="hidden sm:inline">•</span>
              <span className="text-xs">{formatDate(post.created_at)}</span>
            </div>

            {/* Event Date - Responsive */}
            {post.type === 'event' && post.event_date && (
              <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-blue-50 rounded-lg flex items-center space-x-3">
                <div className="p-2 sm:p-3 bg-blue-100 rounded-full flex-shrink-0">
                  <span className="text-xl sm:text-2xl">📅</span>
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-semibold text-gray-700">Event Date</p>
                  <p className="text-base sm:text-lg text-blue-900 font-bold">{formatDate(post.event_date)}</p>
                </div>
              </div>
            )}

            <div className="prose max-w-none">
              <p className="text-gray-700 text-sm sm:text-base lg:text-lg leading-relaxed whitespace-pre-wrap">{post.content}</p>
            </div>
          </div>
        </div>

        {/* Comments Section - Responsive */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-b bg-gray-50">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900">
              Comments ({comments.length})
            </h2>
          </div>

          {/* Add Comment Form - Responsive */}
          <div className="p-4 sm:p-6 border-b bg-gray-50">
            <form onSubmit={handleAddComment}>
              <div className="flex items-start space-x-2 sm:space-x-4">
                {userProfile?.profile_picture ? (
                  <img
                    src={userProfile.profile_picture}
                    alt="Your profile"
                    className="h-8 w-8 sm:h-10 sm:w-10 rounded-full object-cover border-2 border-red-900 flex-shrink-0"
                  />
                ) : (
                  <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-red-900 flex items-center justify-center text-white font-semibold text-xs flex-shrink-0">
                    {getInitials(userProfile?.name)}
                  </div>
                )}
                <div className="flex-1">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Write a comment..."
                    rows="3"
                    className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-900 resize-none text-sm sm:text-base"
                    disabled={submittingComment}
                  ></textarea>
                  <div className="mt-2 flex justify-end">
                    <button
                      type="submit"
                      disabled={submittingComment || !newComment.trim()}
                      className="px-4 sm:px-6 py-1.5 sm:py-2 bg-red-900 hover:bg-red-800 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm"
                    >
                      {submittingComment ? 'Posting...' : 'Post Comment'}
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>

          {/* Comments List - Responsive */}
          <div className="divide-y">
            {comments.length === 0 ? (
              <div className="p-8 sm:p-12 text-center">
                <p className="text-gray-500 text-sm sm:text-base">No comments yet</p>
                <p className="text-gray-400 text-xs sm:text-sm mt-1">Be the first to comment!</p>
              </div>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} className="p-4 sm:p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start space-x-2 sm:space-x-4">
                    {comment.users?.profile_picture ? (
                      <img
                        src={comment.users.profile_picture}
                        alt={comment.users.name}
                        className="h-8 w-8 sm:h-10 sm:w-10 rounded-full object-cover border-2 border-red-900 flex-shrink-0"
                      />
                    ) : (
                      <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-red-900 flex items-center justify-center text-white font-semibold text-xs flex-shrink-0">
                        {getInitials(comment.users?.name)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1 sm:gap-2 mb-1">
                        <span className="font-semibold text-gray-900 text-sm sm:text-base">{comment.users?.name}</span>
                        <span className="text-gray-500 text-xs sm:text-sm">•</span>
                        <span className="text-gray-500 text-xs sm:text-sm">{comment.users?.department}</span>
                        {comment.users?.role === 'admin' && (
                          <>
                            <span className="text-gray-500 text-xs sm:text-sm hidden sm:inline">•</span>
                            <span className="text-red-900 font-semibold text-xs">Admin</span>
                          </>
                        )}
                        <span className="text-gray-500 text-xs sm:text-sm hidden sm:inline">•</span>
                        <span className="text-gray-500 text-xs">{formatDate(comment.created_at)}</span>
                      </div>
                      <p className="text-gray-700 whitespace-pre-wrap text-sm sm:text-base">{comment.content}</p>
                    </div>
                    
                    {comment.user_id === userProfile?.id && (
                      <button
                        onClick={() => handleDeleteComment(comment.id)}
                        className="text-red-600 hover:text-red-800 transition-colors flex-shrink-0"
                        title="Delete comment"
                      >
                        <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}