import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import supabase from '../lib/supabase';
import toast, { Toaster } from 'react-hot-toast';

export default function LandingPage() {
  const navigate = useNavigate();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [signupData, setSignupData] = useState({ 
    name: '', 
    email: '', 
    password: '', 
    confirmPassword: '',
    role: 'user',
    department: 'CCS'
  });
  const [loading, setLoading] = useState(false);

  const departments = [
    { code: 'CCS', name: 'College of Computer Studies' },
    { code: 'COE', name: 'College of Engineering' },
    { code: 'COC', name: 'College of Criminology' },
    { code: 'CED', name: 'College of Education' },
    { code: 'CAS', name: 'College of Arts and Sciences' },
    { code: 'CBAA', name: 'College of Business Administration and Accountancy' }
  ];

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate('/dashboard');
      }
    };
    checkUser();
  }, [navigate]);

  const heroImages = [
    '/src/assets/spc.png',
    '/src/assets/comlab.png',
    '/src/assets/library.png',
    '/src/assets/avr.png',
    '/src/assets/clinic.png',
  ];

  const [currentImage, setCurrentImage] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImage((prev) => (prev + 1) % heroImages.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [heroImages.length]);

  const handleLogin = async () => {
    if (!loginData.email || !loginData.password) {
      toast.error('Please enter both email and password');
      return;
    }

    setLoading(true);
    const loadingToast = toast.loading('Logging in...');
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginData.email,
        password: loginData.password,
      });

      if (error) throw error;

      // Check if user is a super admin (Program Head)
      const { data: superAdmin, error: superAdminError } = await supabase
        .from('super_admins')
        .select('*')
        .eq('id', data.user.id)
        .maybeSingle();

      if (superAdmin) {
        toast.success('Welcome, Program Head!', { id: loadingToast });
        setTimeout(() => {
          navigate('/super-admin-dashboard');
        }, 500);
        return;
      }

      // Check if user is an admin (President Officer)
      const { data: adminProfile, error: adminError } = await supabase
        .from('admins')
        .select('*')
        .eq('id', data.user.id)
        .maybeSingle();

      if (adminProfile) {
        // Check if admin is approved
        if (!adminProfile.is_approved) {
          await supabase.auth.signOut();
          toast.error('Your account is pending approval from your Program Head', { id: loadingToast });
          return;
        }

        toast.success('Welcome, Admin!', { id: loadingToast });
        setTimeout(() => {
          navigate('/dashboard');
        }, 500);
        return;
      }

      // Check if user is a regular user (Student)
      const { data: userProfile, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', data.user.id)
        .maybeSingle();

      if (userProfile) {
        // Check if user is approved
        if (!userProfile.is_approved) {
          await supabase.auth.signOut();
          toast.error('Your account is pending approval from your Program Head', { id: loadingToast });
          return;
        }

        toast.success('Login successful!', { id: loadingToast });
        setTimeout(() => {
          navigate('/dashboard');
        }, 500);
        return;
      }

      // If no profile found in any table
      await supabase.auth.signOut();
      toast.error('Account not found. Please sign up first.', { id: loadingToast });

    } catch (error) {
      toast.error(error.message, { id: loadingToast });
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async () => {
    if (!signupData.name || !signupData.email || !signupData.password || !signupData.confirmPassword) {
      toast.error('All fields are required');
      return;
    }
    if (signupData.password !== signupData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (signupData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    // Validation for Super Admin (Program Head)
    if (signupData.role === 'super_admin') {
      const expectedEmail = `${signupData.department.toLowerCase()}-head@spc.edu`;
      if (signupData.email.toLowerCase() !== expectedEmail) {
        toast.error(`Program Head email must be ${expectedEmail} for ${signupData.department} department`);
        return;
      }

      // Check if super admin for this department already exists
      setLoading(true);
      const { data: existingSuperAdmin } = await supabase
        .from('super_admins')
        .select('id')
        .eq('department', signupData.department)
        .maybeSingle();

      if (existingSuperAdmin) {
        setLoading(false);
        toast.error(`A Program Head for ${signupData.department} already exists`);
        return;
      }
      setLoading(false);
    }

    // Validation for Admin (President Officer)
    if (signupData.role === 'admin') {
      const expectedEmail = `${signupData.department.toLowerCase()}-admin@spc.edu`;
      if (signupData.email.toLowerCase() !== expectedEmail) {
        toast.error(`Admin email must be ${expectedEmail} for ${signupData.department} department`);
        return;
      }

      // Check if admin for this department already exists
      setLoading(true);
      const { data: existingAdmin } = await supabase
        .from('admins')
        .select('id')
        .eq('department', signupData.department)
        .maybeSingle();

      if (existingAdmin) {
        setLoading(false);
        toast.error(`An Admin for ${signupData.department} already exists`);
        return;
      }
      setLoading(false);
    }

    setLoading(true);
    const loadingToast = toast.loading('Creating account...');
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email: signupData.email,
        password: signupData.password,
        options: {
          data: { 
            full_name: signupData.name 
          },
        },
      });

      if (error) throw error;

      // If Super Admin (Program Head), insert into super_admins table
      if (signupData.role === 'super_admin') {
        const { error: superAdminError } = await supabase
          .from('super_admins')
          .insert([
            {
              id: data.user.id,
              name: signupData.name,
              email: signupData.email,
              department: signupData.department
            }
          ]);

        if (superAdminError) throw superAdminError;

        toast.success('Program Head account created! Please verify your email.', { id: loadingToast });
        
        setTimeout(() => {
          setShowSignupModal(false);
          setSignupData({ name: '', email: '', password: '', confirmPassword: '', role: 'user', department: 'CCS' });
          toast('Check your email for verification link', { 
            icon: '📧',
            duration: 5000 
          });
        }, 2000);
        return;
      }

      // If Admin (President Officer), insert into admins table
      if (signupData.role === 'admin') {
        const { error: adminError } = await supabase
          .from('admins')
          .insert([
            {
              id: data.user.id,
              name: signupData.name,
              email: signupData.email,
              department: signupData.department,
              is_approved: false // Needs approval from Program Head
            }
          ]);

        if (adminError) throw adminError;

        toast.success('Admin account created successfully!', { id: loadingToast });
        
        setTimeout(() => {
          setShowSignupModal(false);
          setSignupData({ name: '', email: '', password: '', confirmPassword: '', role: 'user', department: 'CCS' });
          setShowLoginModal(true);
          toast('Your account is pending approval from your Program Head', { 
            icon: '⏳',
            duration: 5000 
          });
        }, 1000);
        return;
      }

      // If regular user (Student), insert into users table
      const { error: userError } = await supabase
  .from('users')
  .insert([
    {
      id: data.user.id,
      name: signupData.name,
      email: signupData.email,
      role: 'user',  // ← ADD THIS LINE
      department: signupData.department,
      is_approved: false // Needs approval from Program Head
    }
  ]);

      if (userError) throw userError;

      toast.success('Account created successfully!', { id: loadingToast });
      
      setTimeout(() => {
        setShowSignupModal(false);
        setSignupData({ name: '', email: '', password: '', confirmPassword: '', role: 'user', department: 'CCS' });
        setShowLoginModal(true);
        toast('Your account is pending approval from your Program Head', { 
          icon: '⏳',
          duration: 5000 
        });
      }, 1000);

    } catch (error) {
      toast.error(error.message, { id: loadingToast });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      <Toaster position="top-center" />
      
      {/* HERO SECTION */}
      <div className="relative h-screen w-full overflow-hidden">
        {heroImages.map((img, i) => (
          <div
            key={i}
            className={`absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-1000 ${
              i === currentImage ? 'opacity-100' : 'opacity-0'
            }`}
            style={{
              backgroundImage: `linear-gradient(rgba(128, 0, 32, 0.4), rgba(128, 0, 32, 0.4)), url('${img}')`,
            }}
          ></div>
        ))}

        {/* Navigation Bar - Responsive */}
        <nav className="relative z-10 flex items-center justify-between px-4 sm:px-6 lg:px-8 py-4 sm:py-6 bg-gradient-to-b from-black/30 to-transparent">
          <div className="flex items-center">
            <img
              src="/src/logos/spc-logo.jpg"
              alt="St. Peter's College Logo"
              className="h-8 sm:h-10 lg:h-12 w-auto object-contain rounded-full"
            />
            <span className="ml-2 sm:ml-3 text-white font-semibold text-sm sm:text-base lg:text-lg">St. Peter's College</span>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={() => setShowLoginModal(true)}
              className="px-3 sm:px-4 lg:px-6 py-1.5 sm:py-2 bg-transparent hover:bg-white/10 text-white font-semibold text-sm sm:text-base rounded-lg transition-colors duration-300 border-2 border-white"
            >
              Log In
            </button>
            <button
              onClick={() => setShowSignupModal(true)}
              className="px-3 sm:px-4 lg:px-6 py-1.5 sm:py-2 bg-red-900 hover:bg-red-800 text-white font-semibold text-sm sm:text-base rounded-lg transition-colors duration-300 shadow-lg"
            >
              Sign Up
            </button>
          </div>
        </nav>

        {/* Hero Text - Responsive */}
        <div className="absolute inset-0 flex items-center justify-center px-4">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-white mb-4 drop-shadow-2xl">
              Welcome to St. Peter's College
            </h1>
            <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-gray-100 mt-4 sm:mt-6 drop-shadow-lg">
              Empowering minds, building futures
            </p>
          </div>
        </div>
      </div>

      {/* ======================= LOGIN MODAL - Responsive ======================= */}
      {showLoginModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4"
          onClick={() => {
            setShowLoginModal(false);
            setLoginData({ email: '', password: '' });
          }}
        >
          <div
            className="bg-white/40 backdrop-blur-md rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-md relative border border-white/30"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => {
                setShowLoginModal(false);
                setLoginData({ email: '', password: '' });
              }}
              className="absolute top-3 right-3 sm:top-4 sm:right-4 text-white hover:text-gray-200 text-2xl font-bold w-8 h-8 flex items-center justify-center"
            >
              ×
            </button>

            <div className="p-6 sm:p-8">
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4 sm:mb-6 text-center drop-shadow-lg">Log In</h2>

              <div>
                <div className="mb-3 sm:mb-4">
                  <label className="block text-white font-semibold mb-2 text-sm sm:text-base">Email</label>
                  <input
                    type="email"
                    value={loginData.email}
                    onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                    className="w-full px-3 sm:px-4 py-2 border border-white/50 rounded-lg bg-white/20 text-white placeholder-gray-200 focus:outline-none focus:ring-2 focus:ring-red-900 text-sm sm:text-base"
                    placeholder="Enter your email"
                    disabled={loading}
                  />
                </div>
                <div className="mb-4 sm:mb-6">
                  <label className="block text-white font-semibold mb-2 text-sm sm:text-base">Password</label>
                  <input
                    type="password"
                    value={loginData.password}
                    onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                    className="w-full px-3 sm:px-4 py-2 border border-white/50 rounded-lg bg-white/20 text-white placeholder-gray-200 focus:outline-none focus:ring-2 focus:ring-red-900 text-sm sm:text-base"
                    placeholder="Enter your password"
                    disabled={loading}
                    onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                  />
                </div>
                <button
                  onClick={handleLogin}
                  disabled={loading}
                  className="w-full bg-red-900 hover:bg-red-800 text-white font-semibold py-2.5 sm:py-3 rounded-lg transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
                >
                  {loading ? 'Logging in...' : 'Log In'}
                </button>
              </div>
              <p className="text-center text-white mt-3 sm:mt-4 text-sm sm:text-base">
                Don't have an account?{' '}
                <button
                  onClick={() => {
                    setShowLoginModal(false);
                    setShowSignupModal(true);
                  }}
                  className="text-blue-200 font-semibold hover:underline"
                  disabled={loading}
                >
                  Sign Up
                </button>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ======================= SIGNUP MODAL - Responsive ======================= */}
      {showSignupModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm overflow-y-auto p-4"
          onClick={() => {
            setShowSignupModal(false);
            setSignupData({ name: '', email: '', password: '', confirmPassword: '', role: 'user', department: 'CCS' });
          }}
        >
          <div
            className="bg-white/40 backdrop-blur-md rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-md my-8 relative border border-white/30"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => {
                setShowSignupModal(false);
                setSignupData({ name: '', email: '', password: '', confirmPassword: '', role: 'user', department: 'CCS' });
              }}
              className="absolute top-3 right-3 sm:top-4 sm:right-4 text-white hover:text-gray-200 text-2xl font-bold w-8 h-8 flex items-center justify-center"
            >
              ×
            </button>

            <div className="p-6 sm:p-8">
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4 sm:mb-6 text-center drop-shadow-lg">Sign Up</h2>

              <div className="space-y-3 sm:space-y-4">
                {/* Role Selection */}
                <div>
                  <label className="block text-white font-semibold mb-2 text-sm sm:text-base">Account Type</label>
                  <select
                    value={signupData.role}
                    onChange={(e) => setSignupData({ ...signupData, role: e.target.value })}
                    className="w-full px-3 sm:px-4 py-2 border border-white/50 rounded-lg bg-white/20 text-white focus:outline-none focus:ring-2 focus:ring-red-900 text-sm sm:text-base"
                    disabled={loading}
                  >
                    <option value="user" className="text-gray-900">Student</option>
                    <option value="admin" className="text-gray-900">Department Admin (President Officer)</option>
                    <option value="super_admin" className="text-gray-900">Program Head</option>
                  </select>
                  {signupData.role === 'admin' && (
                    <p className="text-xs text-yellow-200 mt-1">Admin accounts must use -admin@spc.edu email</p>
                  )}
                  {signupData.role === 'super_admin' && (
                    <p className="text-xs text-yellow-200 mt-1">Program Head accounts must use -head@spc.edu email</p>
                  )}
                </div>

                {/* Department Selection */}
                <div>
                  <label className="block text-white font-semibold mb-2 text-sm sm:text-base">Department</label>
                  <select
                    value={signupData.department}
                    onChange={(e) => setSignupData({ ...signupData, department: e.target.value })}
                    className="w-full px-3 sm:px-4 py-2 border border-white/50 rounded-lg bg-white/20 text-white focus:outline-none focus:ring-2 focus:ring-red-900 text-sm sm:text-base"
                    disabled={loading}
                  >
                    {departments.map((dept) => (
                      <option key={dept.code} value={dept.code} className="text-gray-900">
                        {dept.code} - {dept.name}
                      </option>
                    ))}
                  </select>
                  {signupData.role === 'admin' && (
                    <p className="text-xs text-yellow-200 mt-1">
                      Use email: {signupData.department.toLowerCase()}-admin@spc.edu
                    </p>
                  )}
                  {signupData.role === 'super_admin' && (
                    <p className="text-xs text-yellow-200 mt-1">
                      Use email: {signupData.department.toLowerCase()}-head@spc.edu
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-white font-semibold mb-2 text-sm sm:text-base">Full Name</label>
                  <input
                    type="text"
                    value={signupData.name}
                    onChange={(e) => setSignupData({ ...signupData, name: e.target.value })}
                    className="w-full px-3 sm:px-4 py-2 border border-white/50 rounded-lg bg-white/20 text-white placeholder-gray-200 focus:outline-none focus:ring-2 focus:ring-red-900 text-sm sm:text-base"
                    placeholder="Enter your full name"
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="block text-white font-semibold mb-2 text-sm sm:text-base">Email</label>
                  <input
                    type="email"
                    value={signupData.email}
                    onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                    className="w-full px-3 sm:px-4 py-2 border border-white/50 rounded-lg bg-white/20 text-white placeholder-gray-200 focus:outline-none focus:ring-2 focus:ring-red-900 text-sm sm:text-base"
                    placeholder={
                      signupData.role === 'super_admin' 
                        ? `${signupData.department.toLowerCase()}-head@spc.edu` 
                        : signupData.role === 'admin' 
                        ? `${signupData.department.toLowerCase()}-admin@spc.edu` 
                        : 'Enter your email'
                    }
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="block text-white font-semibold mb-2 text-sm sm:text-base">Password</label>
                  <input
                    type="password"
                    value={signupData.password}
                    onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                    className="w-full px-3 sm:px-4 py-2 border border-white/50 rounded-lg bg-white/20 text-white placeholder-gray-200 focus:outline-none focus:ring-2 focus:ring-red-900 text-sm sm:text-base"
                    placeholder="Create a password (min 6 characters)"
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="block text-white font-semibold mb-2 text-sm sm:text-base">Confirm Password</label>
                  <input
                    type="password"
                    value={signupData.confirmPassword}
                    onChange={(e) => setSignupData({ ...signupData, confirmPassword: e.target.value })}
                    className="w-full px-3 sm:px-4 py-2 border border-white/50 rounded-lg bg-white/20 text-white placeholder-gray-200 focus:outline-none focus:ring-2 focus:ring-red-900 text-sm sm:text-base"
                    placeholder="Confirm your password"
                    disabled={loading}
                    onKeyPress={(e) => e.key === 'Enter' && handleSignup()}
                  />
                </div>

                <button
                  onClick={handleSignup}
                  disabled={loading}
                  className="w-full bg-red-900 hover:bg-red-800 text-white font-semibold py-2.5 sm:py-3 rounded-lg transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
                >
                  {loading ? 'Creating account...' : 'Sign Up'}
                </button>
              </div>

              <p className="text-center text-white mt-3 sm:mt-4 text-sm sm:text-base">
                Already have an account?{' '}
                <button
                  onClick={() => {
                    setShowSignupModal(false);
                    setShowLoginModal(true);
                  }}
                  className="text-blue-200 font-semibold hover:underline"
                  disabled={loading}
                >
                  Log In
                </button>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* VISION - Responsive */}
      <section className="py-12 sm:py-16 lg:py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-red-900 mb-4 sm:mb-6">Vision</h2>
          <p className="text-base sm:text-lg text-gray-700 leading-relaxed">
            St. Peter's College, a school founded in 1952 in Iligan City, is a leading institution in providing
            quality education infused with technology, research, community extension, environmental preservation and
            internationalization.
          </p>
        </div>
      </section>

      {/* MISSION - Responsive */}
      <section className="py-12 sm:py-16 lg:py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-red-900 mb-4 sm:mb-6">Mission</h2>
          <p className="text-base sm:text-lg text-gray-700 leading-relaxed">
            Our mission is to provide a holistic and transformative education that equips students with knowledge,
            skills, values and strong character to become globally competitive individuals. We aim to nurture
            intellectual curiosity, critical thinking, social responsibility and moral integrity through innovative
            practices and collaborative partnerships with the community.
          </p>
        </div>
      </section>

      {/* CORE VALUES - Responsive */}
      <section className="py-12 sm:py-16 lg:py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-red-900 mb-8 sm:mb-12 text-center">Core Values</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            {[
              { letter: 'E', title: 'Excellence', desc: 'Uphold high standards of performance in all areas of the academe.' },
              { letter: 'C', title: 'Commitment', desc: "Satisfy clients' demands by prompt, enthusiastic, professional, responsive, and prestigious services regardless of personal wants." },
              { letter: 'L', title: 'Leadership', desc: 'Motivate and strengthen the constituents and feel responsible for identifying and accomplishing tasks.' },
              { letter: 'A', title: 'Accountability', desc: 'Acknowledges and accepts responsibility for its actions in relation to established policies, procedures, and standards.' },
              { letter: 'P', title: 'Perseverance', desc: 'The inner strength to remain constant to a purpose, idea, or task in the face of obstacles by means of dedication, consistency, and having a positive attitude.' },
              { letter: 'H', title: 'Honesty', desc: 'Open and honest in all dealings and maintain the highest integrity at all times.' },
              { letter: 'E', title: 'Environmentalism', desc: 'Advocate sustainable management and protection of natural resources through influencing individual behavior.' },
              { letter: 'N', title: 'Nationalism', desc: 'Have the dedication and loyalty in serving the interest of the nation.' },
            ].map((value, i) => (
              <div key={i} className="text-center p-4 sm:p-6">
                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-red-900 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                  <span className="text-white text-xl sm:text-2xl font-bold">{value.letter}</span>
                </div>
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2 sm:mb-3">{value.title}</h3>
                <p className="text-sm sm:text-base text-gray-600">{value.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}