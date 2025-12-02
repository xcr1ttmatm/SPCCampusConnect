import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import supabase from '../lib/supabase';
import toast, { Toaster } from 'react-hot-toast';

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [filteredPosts, setFilteredPosts] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [loading, setLoading] = useState(true);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);

  const departments = [
    { code: 'CCS', name: 'College of Computer Studies', logo: '/src/logos/ccs-logo.png' },
    { code: 'COE', name: 'College of Engineering', logo: '/src/logos/coe-logo.png' },
    { code: 'COC', name: 'College of Criminology', logo: '/src/logos/coc-logo.png' },
    { code: 'CED', name: 'College of Education', logo: '/src/logos/ced-logo.png' },
    { code: 'CAS', name: 'College of Arts and Sciences', logo: '/src/logos/cas-logo.png' },
    { code: 'CBAA', name: 'College of Business Administration and Accountancy', logo: '/src/logos/cba-logo.png' }
  ];

  useEffect(() => {
    let subscription;

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
      } finally {
        setLoading(false);
      }
    };

    checkAuth();

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        navigate('/');
      } else if (session) {
        setUser(session.user);
      }
    });

    subscription = data?.subscription;

    return () => {
      if (subscription) subscription.unsubscribe();
    };
  }, [navigate]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showProfileDropdown && !event.target.closest('.profile-dropdown')) {
        setShowProfileDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showProfileDropdown]);

  useEffect(() => {
    if (!user) return;
    fetchPosts();
  }, [user]);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          users:author_id (name, department)
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;

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
      setFilteredPosts(postsWithComments);
    } catch (error) {
      toast.error('Failed to load posts');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedDepartment === 'all') {
      setFilteredPosts(posts);
    } else {
      setFilteredPosts(posts.filter(post => post.department === selectedDepartment));
    }
  }, [selectedDepartment, posts]);

  const handleLogout = async () => {
    const loadingToast = toast.loading('Logging out...');
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast.success('Logged out successfully', { id: loadingToast });
      navigate('/');
    } catch (error) {
      toast.error('Failed to log out', { id: loadingToast });
      console.error('Error logging out:', error);
    }
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

  const handleDepartmentSelect = (dept) => {
    setSelectedDepartment(dept);
    setShowMobileSidebar(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 sm:h-16 w-12 sm:w-16 border-t-4 border-red-900 border-solid mx-auto mb-4"></div>
          <p className="text-gray-600 text-base sm:text-lg">Loading dashboard...</p>
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
        {/* Sidebar Header */}
        <div className="p-4 sm:p-6 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <img
                src="/src/logos/spc-logo.jpg"
                alt="SPC Logo"
                className="h-8 sm:h-10 w-8 sm:w-10 rounded-full object-contain"
              />
              <div className="ml-2 sm:ml-3">
                <h1 className="font-bold text-red-900 text-base sm:text-lg">SPC Campus Connect</h1>
                <p className="text-xs text-gray-500">St. Peter's College</p>
              </div>
            </div>
            {/* Close button for mobile */}
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

        {/* Sidebar Navigation */}
        <nav className="flex-1 overflow-y-auto py-4">
          <button
            onClick={() => handleDepartmentSelect('all')}
            className={`w-full text-left px-4 sm:px-6 py-3 transition-colors ${
              selectedDepartment === 'all'
                ? 'bg-red-50 border-r-4 border-red-900 text-red-900 font-semibold'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center">
              <span className="text-lg sm:text-xl mr-3">🏠</span>
              <span className="text-sm sm:text-base">Home (All Posts)</span>
            </div>
          </button>

          <div className="mt-4 sm:mt-6 px-4 sm:px-6 mb-2">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Departments
            </h3>
          </div>

          {departments.map((dept) => (
            <button
              key={dept.code}
              onClick={() => handleDepartmentSelect(dept.code)}
              className={`w-full text-left px-4 sm:px-6 py-3 transition-colors ${
                selectedDepartment === dept.code
                  ? 'bg-red-50 border-r-4 border-red-900 text-red-900 font-semibold'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center">
                <img
                  src={dept.logo}
                  alt={dept.code}
                  className="h-5 w-5 sm:h-6 sm:w-6 rounded-full object-contain mr-3"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = '/src/assets/spc-logo.jpg';
                  }}
                />
                <span className="text-xs sm:text-sm">{dept.code}</span>
              </div>
            </button>
          ))}

          <div className="mt-4 sm:mt-6 px-4 sm:px-6 mb-2">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Other
            </h3>
          </div>
          <button
            onClick={() => {
              navigate('/archive');
              setShowMobileSidebar(false);
            }}
            className="w-full text-left px-4 sm:px-6 py-3 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center">
              <span className="text-lg sm:text-xl mr-3">📦</span>
              <span className="text-xs sm:text-sm">Archive</span>
            </div>
          </button>

          {userProfile?.role === 'admin' && (
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
              {/* Hamburger Menu Button - Mobile Only */}
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
                  {selectedDepartment === 'all' 
                    ? 'All Posts' 
                    : getDepartmentInfo(selectedDepartment)?.name}
                </h2>
                <p className="text-xs sm:text-sm text-gray-500 mt-0.5 sm:mt-1">
                  {filteredPosts.length} {filteredPosts.length === 1 ? 'post' : 'posts'}
                </p>
              </div>
            </div>

            {/* User Profile Menu - Responsive */}
            <div className="relative profile-dropdown">
              <button
                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                className="flex items-center space-x-2 sm:space-x-3 hover:bg-gray-50 rounded-lg p-1.5 sm:p-2 transition-colors"
              >
                <div className="text-right hidden sm:block">
                  <p className="text-xs sm:text-sm font-semibold text-gray-900">{userProfile?.name}</p>
                  <p className="text-xs text-gray-500">
                    {userProfile?.role === 'admin' ? `${userProfile?.department} Admin` : userProfile?.department}
                  </p>
                </div>
                {userProfile?.profile_picture ? (
                  <img
                    src={userProfile.profile_picture}
                    alt="Profile"
                    className="h-8 w-8 sm:h-10 sm:w-10 rounded-full object-cover border-2 border-red-900"
                  />
                ) : (
                  <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-red-900 flex items-center justify-center text-white font-semibold text-xs sm:text-sm">
                    {getInitials(userProfile?.name)}
                  </div>
                )}
              </button>

              {/* Profile Dropdown */}
              {showProfileDropdown && (
                <div className="absolute right-0 mt-2 w-56 sm:w-64 bg-white rounded-lg shadow-lg border py-2 z-10">
                  <div className="px-4 py-3 border-b">
                    <p className="text-sm font-semibold text-gray-900">{userProfile?.name}</p>
                    <p className="text-xs text-gray-500 break-all">{userProfile?.email}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Department: {userProfile?.department}
                    </p>
                    <p className="text-xs text-gray-500">
                      Role: {userProfile?.role === 'admin' ? 'Administrator' : 'User'}
                    </p>
                  </div>
                  <div className="p-2">
                    <button
                      onClick={() => {
                        setShowProfileDropdown(false);
                        navigate('/profile');
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                    >
                      Profile Settings
                    </button>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      Log Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* POSTS FEED - Responsive */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-red-900 mx-auto"></div>
                <p className="mt-4 text-gray-600 text-sm sm:text-base">Loading posts...</p>
              </div>
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center px-4">
                <p className="text-gray-500 text-base sm:text-lg">No posts available</p>
                <p className="text-gray-400 text-sm mt-2">
                  {userProfile?.role === 'admin' 
                    ? 'Go to Admin Panel to create your first post' 
                    : 'Check back later for updates'}
                </p>
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
              {filteredPosts.map((post) => {
                const deptInfo = getDepartmentInfo(post.department);
                return (
                  <div
                    key={post.id}
                    className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer overflow-hidden"
                    onClick={() => navigate(`/post/${post.id}`)}
                  >
                    {/* Department Header */}
                    <div className="bg-gradient-to-r from-red-900 to-red-800 px-4 sm:px-6 py-2.5 sm:py-3 flex items-center">
                      <img
                        src={deptInfo?.logo}
                        alt={post.department}
                        className="h-6 w-6 sm:h-8 sm:w-8 rounded-full object-contain bg-white p-0.5 sm:p-1"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = '/src/assets/spc-logo.jpg';
                        }}
                      />
                      <div className="ml-2 sm:ml-3 flex-1 min-w-0">
                        <p className="text-white font-semibold text-xs sm:text-sm truncate">{post.department}</p>
                        <p className="text-red-100 text-xs truncate hidden sm:block">{deptInfo?.name}</p>
                      </div>
                      <span className={`ml-2 px-2 sm:px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
                        post.type === 'event' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {post.type === 'event' ? '📅 Event' : '📢'}
                      </span>
                    </div>

                    {/* Post Content */}
                    <div className="p-4 sm:p-6">
                      <h3 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900 mb-2">{post.title}</h3>
                      <p className="text-sm sm:text-base text-gray-600 mb-4 whitespace-pre-wrap">{truncateText(post.content, 200)}</p>

                      {/* Event Date */}
                      {post.type === 'event' && post.event_date && (
                        <div className="mb-4 flex items-center text-xs sm:text-sm text-gray-500">
                          <span className="mr-2">📅</span>
                          <span>Event Date: {formatDate(post.event_date)}</span>
                        </div>
                      )}

                      {/* Post Meta */}
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs sm:text-sm text-gray-500 pt-4 border-t space-y-2 sm:space-y-0">
                        <div className="flex items-center space-x-2 sm:space-x-4">
                          <span className="truncate">By {post.users?.name || 'Unknown'}</span>
                          <span className="hidden sm:inline">•</span>
                          <span className="text-xs">{formatDate(post.created_at)}</span>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center space-x-1">
                            <span>💬</span>
                            <span>{post.comment_count}</span>
                          </div>
                          
                          {userProfile?.role === 'admin' && post.author_id === userProfile?.id && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate('/admin');
                              }}
                              className="text-blue-600 hover:text-blue-800 font-medium text-xs ml-2 pl-2 border-l"
                            >
                              Edit
                            </button>
                          )}
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