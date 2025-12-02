import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import supabase from '../lib/supabase';
import toast, { Toaster } from 'react-hot-toast';

export default function Archive() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [userType, setUserType] = useState(null); // 'user', 'admin', or 'super_admin'
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);

  const departments = [
    { code: 'CCS', name: 'College of Computer Studies', logo: '/src/logos/ccs-logo.png' },
    { code: 'COE', name: 'College of Engineering', logo: '/src/logos/coe-logo.png' },
    { code: 'COC', name: 'College of Criminology', logo: '/src/logos/coc-logo.png' },
    { code: 'CED', name: 'College of Education', logo: '/src/logos/ced-logo.png' },
    { code: 'CAS', name: 'College of Arts and Sciences', logo: '/src/logos/cas-logo.png' },
    { code: 'CBAA', name: 'College of Business Administration and Accountancy', logo: '/src/logos/cba-logo.png' }
  ];

  // Check authentication and determine user type
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

        // Check if super admin
        const { data: superAdmin } = await supabase
          .from('super_admins')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle();

        if (superAdmin) {
          setUserProfile(superAdmin);
          setUserType('super_admin');
          setLoading(false);
          return;
        }

        // Check if admin
        const { data: admin } = await supabase
          .from('admins')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle();

        if (admin) {
          setUserProfile(admin);
          setUserType('admin');
          setLoading(false);
          return;
        }

        // Check if regular user
        const { data: regularUser } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle();

        if (regularUser) {
          setUserProfile(regularUser);
          setUserType('user');
          setLoading(false);
          return;
        }

        // No profile found
        toast.error('User profile not found');
        navigate('/');

      } catch (error) {
        console.error('Error fetching user:', error);
        navigate('/');
      }
    };

    checkAuth();
  }, [navigate]);

  // Fetch archived posts based on user type
  useEffect(() => {
    if (!user || !userProfile || !userType) return;
    fetchPosts();
  }, [user, userProfile, userType]);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('posts')
        .select(`
          *,
          admins:author_id (name, department)
        `)
        .eq('status', 'archived');

      // Filter based on user type
      if (userType === 'admin') {
        // Admins see only their own archived posts
        query = query.eq('author_id', userProfile.id);
      } else if (userType === 'user') {
        // Regular users see archived posts from their department
        query = query.eq('department', userProfile.department);
      }
      // Super admins see all archived posts (no filter)

      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;

      // Add comment count to each post
      const postsWithComments = await Promise.all(
        (data || []).map(async (post) => {
          const { count } = await supabase
            .from('comments')
            .select('*', { count: 'exact', head: true })
            .eq('post_id', post.id);
          
          return { ...post, comment_count: count || 0 };
        })
      );

      setPosts(postsWithComments);
    } catch (error) {
      toast.error('Failed to load archived posts');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleRestorePost = async (postId) => {
    if (!confirm('Are you sure you want to restore this post to active?')) {
      return;
    }

    const loadingToast = toast.loading('Restoring post...');

    try {
      const { error } = await supabase
        .from('posts')
        .update({ status: 'active' })
        .eq('id', postId);

      if (error) throw error;

      toast.success('Post restored successfully!', { id: loadingToast });
      fetchPosts();
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

  const truncateText = (text, maxLength = 200) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-red-900 border-solid mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading archive...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Toaster position="top-center" />

      {/* Mobile Sidebar Overlay */}
      {showMobileSidebar && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setShowMobileSidebar(false)}
        ></div>
      )}

      {/* SIDEBAR - Responsive */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-64 bg-white shadow-lg flex flex-col
        transform transition-transform duration-300 ease-in-out
        ${showMobileSidebar ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-4 sm:p-6 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <img
                src="/src/logos/spc-logo.jpg"
                alt="SPC Logo"
                className="h-8 sm:h-10 w-8 sm:w-10 rounded-full object-contain"
              />
              <div className="ml-2 sm:ml-3">
                <h1 className="font-bold text-red-900 text-base sm:text-lg">SPC Connect</h1>
                <p className="text-xs text-gray-500">St. Peter's College</p>
              </div>
            </div>
            <button
              onClick={() => setShowMobileSidebar(false)}
              className="lg:hidden text-gray-600 hover:text-gray-900"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-4">
          <button
            onClick={() => {
              navigate('/dashboard');
              setShowMobileSidebar(false);
            }}
            className="w-full text-left px-4 sm:px-6 py-3 transition-colors text-gray-700 hover:bg-gray-50"
          >
            <div className="flex items-center">
              <span className="text-lg sm:text-xl mr-3">🏠</span>
              <span className="text-sm sm:text-base">Home</span>
            </div>
          </button>

          <div className="mt-4 sm:mt-6 px-4 sm:px-6 mb-2">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Other
            </h3>
          </div>

          <button
            className="w-full text-left px-4 sm:px-6 py-3 bg-red-50 border-r-4 border-red-900 text-red-900 font-semibold"
          >
            <div className="flex items-center">
              <span className="text-lg sm:text-xl mr-3">📦</span>
              <span className="text-xs sm:text-sm">Archive</span>
            </div>
          </button>

          {userType === 'admin' && (
            <button
              onClick={() => {
                navigate('/admin');
                setShowMobileSidebar(false);
              }}
              className="w-full text-left px-4 sm:px-6 py-3 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center">
                <span className="text-lg sm:text-xl mr-3">⚙️</span>
                <span className="text-xs sm:text-sm">Admin Panel</span>
              </div>
            </button>
          )}
        </nav>
      </aside>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* TOP NAVBAR - Responsive */}
        <header className="bg-white shadow-sm border-b">
          <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowMobileSidebar(true)}
                className="lg:hidden text-gray-600 hover:text-gray-900"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>

              <div>
                <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">
                  📦 Archive
                  {userType === 'admin' && ` - ${userProfile.department}`}
                </h2>
                <p className="text-xs sm:text-sm text-gray-500 mt-0.5 sm:mt-1">
                  {posts.length} archived {posts.length === 1 ? 'post' : 'posts'}
                  {userType === 'admin' && ' (your posts only)'}
                </p>
              </div>
            </div>

            <button
              onClick={() => navigate('/dashboard')}
              className="px-3 sm:px-4 py-1.5 sm:py-2 text-gray-600 hover:text-gray-900 font-medium transition-colors flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span className="hidden sm:inline">Back to Dashboard</span>
              <span className="sm:hidden">Back</span>
            </button>
          </div>
        </header>

        {/* POSTS FEED - Responsive */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-red-900 mx-auto"></div>
                <p className="mt-4 text-gray-600 text-sm sm:text-base">Loading archived posts...</p>
              </div>
            </div>
          ) : posts.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center px-4">
                <span className="text-5xl sm:text-6xl mb-4 block">📦</span>
                <p className="text-gray-500 text-base sm:text-lg">No archived posts</p>
                <p className="text-gray-400 text-sm mt-2">
                  {userType === 'admin' 
                    ? 'Your archived posts will appear here'
                    : 'Archived posts from your department will appear here'}
                </p>
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
              {posts.map((post) => {
                const deptInfo = getDepartmentInfo(post.department);
                const isOwnPost = userType === 'admin' && post.author_id === userProfile?.id;
                
                return (
                  <div
                    key={post.id}
                    className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden"
                  >
                    {/* Department Header */}
                    <div className="bg-gradient-to-r from-gray-700 to-gray-600 px-4 sm:px-6 py-2.5 sm:py-3 flex items-center">
                      <img
                        src={deptInfo?.logo}
                        alt={post.department}
                        className="h-6 w-6 sm:h-8 sm:w-8 rounded-full object-contain bg-white p-0.5 sm:p-1"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = '/src/logos/spc-logo.jpg';
                        }}
                      />
                      <div className="ml-2 sm:ml-3 flex-1 min-w-0">
                        <p className="text-white font-semibold text-xs sm:text-sm truncate">{post.department}</p>
                        <p className="text-gray-200 text-xs truncate hidden sm:block">{deptInfo?.name}</p>
                      </div>
                      <span className="ml-2 px-2 sm:px-3 py-1 rounded-full text-xs font-semibold bg-gray-200 text-gray-700 whitespace-nowrap">
                        📦 Archived
                      </span>
                    </div>

                    {/* Post Content */}
                    <div className="p-4 sm:p-6">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-2 space-y-2 sm:space-y-0">
                        <div className="flex-1">
                          <span className={`inline-block px-2 sm:px-3 py-1 rounded-full text-xs font-semibold mb-2 ${
                            post.type === 'event' 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {post.type === 'event' ? '📅 Event' : '📢 Announcement'}
                          </span>
                          <h3 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900">{post.title}</h3>
                        </div>
                        
                        {isOwnPost && (
                          <button
                            onClick={() => handleRestorePost(post.id)}
                            className="w-full sm:w-auto sm:ml-4 px-3 sm:px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold rounded-lg transition-colors flex items-center justify-center space-x-2"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            <span>Restore</span>
                          </button>
                        )}
                      </div>
                      
                      <p className="text-sm sm:text-base text-gray-600 mb-4 whitespace-pre-wrap">{truncateText(post.content, 200)}</p>

                      {post.type === 'event' && post.event_date && (
                        <div className="mb-4 flex items-center text-xs sm:text-sm text-gray-500">
                          <span className="mr-2">📅</span>
                          <span>Event Date: {formatDate(post.event_date)}</span>
                        </div>
                      )}

                      {/* Post Meta */}
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs sm:text-sm text-gray-500 pt-4 border-t space-y-2 sm:space-y-0">
                        <div className="flex items-center space-x-2 sm:space-x-4">
                          <span className="truncate">By {post.admins?.name || 'Unknown'}</span>
                          <span className="hidden sm:inline">•</span>
                          <span className="text-xs">Archived: {formatDate(post.updated_at)}</span>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center space-x-1">
                            <span>💬</span>
                            <span>{post.comment_count}</span>
                          </div>
                          <button
                            onClick={() => navigate(`/post/${post.id}`)}
                            className="text-blue-600 hover:text-blue-800 font-medium"
                          >
                            View Details
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}