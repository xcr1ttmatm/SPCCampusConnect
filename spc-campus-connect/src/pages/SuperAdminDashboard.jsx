import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import supabase from '../lib/supabase';
import toast, { Toaster } from 'react-hot-toast';

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const [superAdmin, setSuperAdmin] = useState(null);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [approvedUsers, setApprovedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' or 'approved'

  const departments = {
    'CCS': 'College of Computer Studies',
    'COE': 'College of Engineering',
    'COC': 'College of Criminology',
    'CED': 'College of Education',
    'CAS': 'College of Arts and Sciences',
    'CBAA': 'College of Business Administration and Accountancy'
  };

  useEffect(() => {
    checkSuperAdmin();
  }, []);

  const checkSuperAdmin = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate('/');
        return;
      }

      // Check if user is a super admin
      const { data: superAdminData, error } = await supabase
        .from('super_admins')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (error || !superAdminData) {
        toast.error('Unauthorized access');
        navigate('/dashboard');
        return;
      }

      setSuperAdmin(superAdminData);
      fetchUsers(superAdminData.department);
    } catch (error) {
      console.error('Error checking super admin:', error);
      navigate('/');
    }
  };

  const fetchUsers = async (department) => {
    setLoading(true);
    try {
      // Fetch pending users in this department
      const { data: pending, error: pendingError } = await supabase
        .from('users')
        .select('*')
        .eq('department', department)
        .eq('is_approved', false)
        .order('created_at', { ascending: false });

      if (pendingError) throw pendingError;

      // Fetch approved users in this department
      const { data: approved, error: approvedError } = await supabase
        .from('users')
        .select('*')
        .eq('department', department)
        .eq('is_approved', true)
        .order('approved_at', { ascending: false });

      if (approvedError) throw approvedError;

      setPendingUsers(pending || []);
      setApprovedUsers(approved || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (userId, userName) => {
    const loadingToast = toast.loading(`Approving ${userName}...`);
    
    try {
      const { error } = await supabase
        .from('users')
        .update({
          is_approved: true,
          approved_by: superAdmin.id,
          approved_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) throw error;

      toast.success(`${userName} has been approved!`, { id: loadingToast });
      fetchUsers(superAdmin.department);
    } catch (error) {
      console.error('Error approving user:', error);
      toast.error('Failed to approve user', { id: loadingToast });
    }
  };

  const handleReject = async (userId, userName) => {
    const confirmReject = window.confirm(
      `Are you sure you want to reject ${userName}? This will delete their account permanently.`
    );

    if (!confirmReject) return;

    const loadingToast = toast.loading(`Rejecting ${userName}...`);
    
    try {
      // Delete from users table (this will also delete from auth.users due to CASCADE)
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);

      if (error) throw error;

      toast.success(`${userName} has been rejected and removed`, { id: loadingToast });
      fetchUsers(superAdmin.department);
    } catch (error) {
      console.error('Error rejecting user:', error);
      toast.error('Failed to reject user', { id: loadingToast });
    }
  };

  const handleRevokeApproval = async (userId, userName) => {
    const confirmRevoke = window.confirm(
      `Are you sure you want to revoke approval for ${userName}? They will not be able to access the system until re-approved.`
    );

    if (!confirmRevoke) return;

    const loadingToast = toast.loading(`Revoking approval for ${userName}...`);
    
    try {
      const { error } = await supabase
        .from('users')
        .update({
          is_approved: false,
          approved_by: null,
          approved_at: null
        })
        .eq('id', userId);

      if (error) throw error;

      toast.success(`Approval revoked for ${userName}`, { id: loadingToast });
      fetchUsers(superAdmin.department);
    } catch (error) {
      console.error('Error revoking approval:', error);
      toast.error('Failed to revoke approval', { id: loadingToast });
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
    toast.success('Logged out successfully');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 sm:w-16 sm:h-16 border-4 border-red-900 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 text-sm sm:text-base">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-center" />

      {/* Header - Responsive */}
      <header className="bg-red-900 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
            <div className="w-full sm:w-auto">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Program Head Dashboard</h1>
              <p className="text-red-100 mt-1 text-xs sm:text-sm lg:text-base">
                {superAdmin?.name}
              </p>
              <p className="text-red-200 text-xs sm:text-sm">
                {departments[superAdmin?.department]}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="w-full sm:w-auto px-4 py-2 bg-white text-red-900 rounded-lg font-semibold hover:bg-gray-100 transition-colors duration-300 text-sm sm:text-base"
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      {/* Stats Cards - Responsive */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {/* Pending Card */}
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-xs sm:text-sm font-medium">Pending Approval</p>
                <p className="text-2xl sm:text-3xl font-bold text-orange-600 mt-1 sm:mt-2">{pendingUsers.length}</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-xl sm:text-2xl">⏳</span>
              </div>
            </div>
          </div>

          {/* Approved Card */}
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-xs sm:text-sm font-medium">Approved Users</p>
                <p className="text-2xl sm:text-3xl font-bold text-green-600 mt-1 sm:mt-2">{approvedUsers.length}</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-xl sm:text-2xl">✓</span>
              </div>
            </div>
          </div>

          {/* Total Card */}
          <div className="bg-white rounded-lg shadow p-4 sm:p-6 sm:col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-xs sm:text-sm font-medium">Total Users</p>
                <p className="text-2xl sm:text-3xl font-bold text-blue-600 mt-1 sm:mt-2">{pendingUsers.length + approvedUsers.length}</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-xl sm:text-2xl">👥</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs - Responsive */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="border-b border-gray-200 overflow-x-auto">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('pending')}
                className={`px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === 'pending'
                    ? 'border-red-900 text-red-900'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Pending ({pendingUsers.length})
              </button>
              <button
                onClick={() => setActiveTab('approved')}
                className={`px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === 'approved'
                    ? 'border-red-900 text-red-900'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Approved ({approvedUsers.length})
              </button>
            </nav>
          </div>

          {/* Pending Users - Responsive */}
          {activeTab === 'pending' && (
            <div className="p-4 sm:p-6">
              {pendingUsers.length === 0 ? (
                <div className="text-center py-8 sm:py-12">
                  <div className="text-4xl sm:text-6xl mb-3 sm:mb-4">🎉</div>
                  <p className="text-gray-500 text-base sm:text-lg">No pending approvals</p>
                  <p className="text-gray-400 text-xs sm:text-sm mt-2">All users in your department are approved</p>
                </div>
              ) : (
                <>
                  {/* Mobile Card View */}
                  <div className="block lg:hidden space-y-4">
                    {pendingUsers.map((user) => (
                      <div key={user.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <div className="flex items-start gap-3 mb-3">
                          <img
                            src={user.profile_picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=7f1d1d&color=fff`}
                            alt={user.name}
                            className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">{user.name}</p>
                            <p className="text-xs text-gray-500 truncate">{user.email}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                                user.role === 'admin' 
                                  ? 'bg-purple-100 text-purple-800' 
                                  : 'bg-blue-100 text-blue-800'
                              }`}>
                                {user.role === 'admin' ? 'Admin' : 'Student'}
                              </span>
                              <span className="text-xs text-gray-400">
                                {new Date(user.created_at).toLocaleDateString('en-US', { 
                                  month: 'short', 
                                  day: 'numeric' 
                                })}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleApprove(user.id, user.name)}
                            className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors duration-300 text-sm"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleReject(user.id, user.name)}
                            className="flex-1 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors duration-300 text-sm"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop Table View */}
                  <div className="hidden lg:block overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Requested</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {pendingUsers.map((user) => (
                          <tr key={user.id} className="hover:bg-gray-50">
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <img
                                  src={user.profile_picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=7f1d1d&color=fff`}
                                  alt={user.name}
                                  className="w-10 h-10 rounded-full object-cover"
                                />
                                <div className="ml-3">
                                  <p className="text-sm font-medium text-gray-900">{user.name}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                user.role === 'admin' 
                                  ? 'bg-purple-100 text-purple-800' 
                                  : 'bg-blue-100 text-blue-800'
                              }`}>
                                {user.role === 'admin' ? 'Admin' : 'Student'}
                              </span>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(user.created_at).toLocaleDateString('en-US', { 
                                year: 'numeric', 
                                month: 'short', 
                                day: 'numeric' 
                              })}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm">
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleApprove(user.id, user.name)}
                                  className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors duration-300"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleReject(user.id, user.name)}
                                  className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors duration-300"
                                >
                                  Reject
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Approved Users - Responsive */}
          {activeTab === 'approved' && (
            <div className="p-4 sm:p-6">
              {approvedUsers.length === 0 ? (
                <div className="text-center py-8 sm:py-12">
                  <div className="text-4xl sm:text-6xl mb-3 sm:mb-4">👤</div>
                  <p className="text-gray-500 text-base sm:text-lg">No approved users yet</p>
                  <p className="text-gray-400 text-xs sm:text-sm mt-2">Approve pending users to see them here</p>
                </div>
              ) : (
                <>
                  {/* Mobile Card View */}
                  <div className="block lg:hidden space-y-4">
                    {approvedUsers.map((user) => (
                      <div key={user.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <div className="flex items-start gap-3 mb-3">
                          <img
                            src={user.profile_picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=7f1d1d&color=fff`}
                            alt={user.name}
                            className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">{user.name}</p>
                            <p className="text-xs text-gray-500 truncate">{user.email}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                                user.role === 'admin' 
                                  ? 'bg-purple-100 text-purple-800' 
                                  : 'bg-blue-100 text-blue-800'
                              }`}>
                                {user.role === 'admin' ? 'Admin' : 'Student'}
                              </span>
                              <span className="text-xs text-gray-400">
                                Approved {new Date(user.approved_at).toLocaleDateString('en-US', { 
                                  month: 'short', 
                                  day: 'numeric' 
                                })}
                              </span>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleRevokeApproval(user.id, user.name)}
                          className="w-full px-3 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors duration-300 text-sm"
                        >
                          Revoke Approval
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Desktop Table View */}
                  <div className="hidden lg:block overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Approved</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {approvedUsers.map((user) => (
                          <tr key={user.id} className="hover:bg-gray-50">
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <img
                                  src={user.profile_picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=7f1d1d&color=fff`}
                                  alt={user.name}
                                  className="w-10 h-10 rounded-full object-cover"
                                />
                                <div className="ml-3">
                                  <p className="text-sm font-medium text-gray-900">{user.name}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                user.role === 'admin' 
                                  ? 'bg-purple-100 text-purple-800' 
                                  : 'bg-blue-100 text-blue-800'
                              }`}>
                                {user.role === 'admin' ? 'Admin' : 'Student'}
                              </span>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(user.approved_at).toLocaleDateString('en-US', { 
                                year: 'numeric', 
                                month: 'short', 
                                day: 'numeric' 
                              })}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm">
                              <button
                                onClick={() => handleRevokeApproval(user.id, user.name)}
                                className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors duration-300"
                              >
                                Revoke
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}