import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import supabase from '../lib/supabase';
import toast, { Toaster } from 'react-hot-toast';

export default function ProfileSettings() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: ''
  });
  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmPassword: ''
  });

  const departments = [
    { code: 'CCS', name: 'College of Computer Studies' },
    { code: 'COE', name: 'College of Engineering' },
    { code: 'COC', name: 'College of Criminology' },
    { code: 'CED', name: 'College of Education' },
    { code: 'CAS', name: 'College of Arts and Sciences' },
    { code: 'CBAA', name: 'College of Business Administration and Accountancy' }
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

        if (profileError) throw profileError;

        setUserProfile(profile);
        setFormData({
          name: profile.name,
          email: profile.email
        });
      } catch (error) {
        console.error('Error:', error);
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [navigate]);

  const handleProfilePictureUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image size must be less than 2MB');
      return;
    }

    setUploading(true);
    const loadingToast = toast.loading('Uploading profile picture...');

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userProfile.id}/${Date.now()}.${fileExt}`;

      if (userProfile.profile_picture) {
        const oldPath = userProfile.profile_picture.split('/').slice(-2).join('/');
        await supabase.storage.from('profile-pictures').remove([oldPath]);
      }

      const { error: uploadError } = await supabase.storage
        .from('profile-pictures')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('profile-pictures')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('users')
        .update({ profile_picture: publicUrl })
        .eq('id', userProfile.id);

      if (updateError) throw updateError;

      setUserProfile({ ...userProfile, profile_picture: publicUrl });
      toast.success('Profile picture updated! Changes will appear across the site.', { id: loadingToast, duration: 4000 });
      
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      toast.error(error.message, { id: loadingToast });
    } finally {
      setUploading(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (!formData.name) {
      toast.error('Name is required');
      return;
    }

    const loadingToast = toast.loading('Updating profile...');

    try {
      const { error } = await supabase
        .from('users')
        .update({ name: formData.name })
        .eq('id', userProfile.id);

      if (error) throw error;

      setUserProfile({ ...userProfile, name: formData.name });
      toast.success('Profile updated successfully!', { id: loadingToast });
    } catch (error) {
      toast.error(error.message, { id: loadingToast });
    }
  };

  const handleChangePassword = async () => {
    if (!passwordData.newPassword || !passwordData.confirmPassword) {
      toast.error('Please fill in all password fields');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    const loadingToast = toast.loading('Changing password...');

    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });

      if (error) throw error;

      toast.success('Password changed successfully!', { id: loadingToast });
      setPasswordData({ newPassword: '', confirmPassword: '' });
    } catch (error) {
      toast.error(error.message, { id: loadingToast });
    }
  };

  const handleRemoveProfilePicture = async () => {
    if (!userProfile.profile_picture) return;

    if (!confirm('Are you sure you want to remove your profile picture?')) {
      return;
    }

    const loadingToast = toast.loading('Removing profile picture...');

    try {
      const oldPath = userProfile.profile_picture.split('/').slice(-2).join('/');
      await supabase.storage.from('profile-pictures').remove([oldPath]);

      const { error } = await supabase
        .from('users')
        .update({ profile_picture: null })
        .eq('id', userProfile.id);

      if (error) throw error;

      setUserProfile({ ...userProfile, profile_picture: null });
      toast.success('Profile picture removed!', { id: loadingToast });
    } catch (error) {
      toast.error(error.message, { id: loadingToast });
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

  const getDepartmentName = (code) => {
    return departments.find(d => d.code === code)?.name || code;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 sm:h-16 w-12 sm:w-16 border-t-4 border-red-900 border-solid mx-auto mb-4"></div>
          <p className="text-gray-600 text-base sm:text-lg">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-center" />

      {/* Header - Responsive */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center space-x-2 sm:space-x-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="text-gray-600 hover:text-gray-900 transition-colors flex-shrink-0"
            >
              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 truncate">Profile Settings</h1>
              <p className="text-xs sm:text-sm text-gray-500 truncate">Manage your account information</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Responsive */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          {/* Profile Picture Section - Responsive */}
          <div className="lg:col-span-1 space-y-4 sm:space-y-6">
            <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Profile Picture</h2>
              
              <div className="flex flex-col items-center">
                {userProfile.profile_picture ? (
                  <img
                    src={userProfile.profile_picture}
                    alt="Profile"
                    className="w-32 h-32 sm:w-40 sm:h-40 rounded-full object-cover border-4 border-red-900 mb-3 sm:mb-4"
                  />
                ) : (
                  <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full bg-red-900 flex items-center justify-center text-white text-3xl sm:text-4xl font-bold mb-3 sm:mb-4 border-4 border-red-800">
                    {getInitials(userProfile.name)}
                  </div>
                )}

                <input
                  type="file"
                  id="profile-picture"
                  accept="image/*"
                  onChange={handleProfilePictureUpload}
                  className="hidden"
                  disabled={uploading}
                />
                
                <label
                  htmlFor="profile-picture"
                  className={`w-full px-3 sm:px-4 py-2 bg-red-900 hover:bg-red-800 text-white font-semibold rounded-lg transition-colors text-center cursor-pointer text-sm sm:text-base ${
                    uploading ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {uploading ? 'Uploading...' : 'Change Picture'}
                </label>

                {userProfile.profile_picture && (
                  <button
                    onClick={handleRemoveProfilePicture}
                    className="w-full mt-2 px-3 sm:px-4 py-2 border border-red-600 text-red-600 hover:bg-red-50 font-semibold rounded-lg transition-colors text-sm sm:text-base"
                    disabled={uploading}
                  >
                    Remove Picture
                  </button>
                )}

                <p className="text-xs text-gray-500 mt-3 sm:mt-4 text-center">
                  JPG, PNG or GIF. Max size 2MB.
                </p>
              </div>
            </div>

            {/* Account Info Card - Responsive */}
            <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Account Info</h2>
              <div className="space-y-2 sm:space-y-3 text-xs sm:text-sm">
                <div>
                  <p className="text-gray-500">Department</p>
                  <p className="font-semibold text-gray-900">{userProfile.department}</p>
                  <p className="text-xs text-gray-500">{getDepartmentName(userProfile.department)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Role</p>
                  <p className="font-semibold text-gray-900">
                    {userProfile.role === 'admin' ? 'Administrator' : 'User'}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Member Since</p>
                  <p className="font-semibold text-gray-900">
                    {new Date(userProfile.created_at).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Settings Section - Responsive */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            {/* Profile Information - Responsive */}
            <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Profile Information</h2>
              
              <div className="space-y-3 sm:space-y-4">
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">Full Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-900 text-sm sm:text-base"
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    disabled
                    className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500 cursor-not-allowed text-sm sm:text-base"
                  />
                  <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                </div>

                <button
                  onClick={handleUpdateProfile}
                  className="w-full sm:w-auto px-4 sm:px-6 py-2 bg-red-900 hover:bg-red-800 text-white font-semibold rounded-lg transition-colors text-sm sm:text-base"
                >
                  Save Changes
                </button>
              </div>
            </div>

            {/* Change Password - Responsive */}
            <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Change Password</h2>
              
              <div className="space-y-3 sm:space-y-4">
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">New Password</label>
                  <input
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-900 text-sm sm:text-base"
                    placeholder="Enter new password"
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">Confirm New Password</label>
                  <input
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-900 text-sm sm:text-base"
                    placeholder="Confirm new password"
                  />
                </div>

                <button
                  onClick={handleChangePassword}
                  className="w-full sm:w-auto px-4 sm:px-6 py-2 bg-red-900 hover:bg-red-800 text-white font-semibold rounded-lg transition-colors text-sm sm:text-base"
                >
                  Change Password
                </button>
              </div>
            </div>

            {/* Danger Zone - Responsive */}
            <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 border-2 border-red-200">
              <h2 className="text-base sm:text-lg font-semibold text-red-900 mb-2">Danger Zone</h2>
              <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4">
                Once you delete your account, there is no going back. Please be certain.
              </p>
              <button
                onClick={() => toast.error('Account deletion is disabled for this demo')}
                className="w-full sm:w-auto px-4 sm:px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors text-sm sm:text-base"
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}