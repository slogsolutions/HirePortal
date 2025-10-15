import React, { useState, useEffect, useContext, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { format, parseISO } from 'date-fns';
import { AuthContext } from '../context/AuthContext';
import api from '../api/axios';

// Icons
import { 
  UserCircleIcon, 
  BriefcaseIcon, 
  DocumentTextIcon, 
  LockClosedIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

// Placeholder image
const placeholderImage = 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80';

const UserPortal = () => {
  const { user: authUser, logout } = useContext(AuthContext);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('personal');
  const [isEditing, setIsEditing] = useState(false);
  
  // Calculate age from date of birth
  const calculateAge = (dob) => {
    if (!dob) return null;
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };
  
  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return format(parseISO(dateString), 'MMMM d, yyyy');
    } catch (e) {
      return dateString;
    }
  };
  
  // Format date and time for display
  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return format(parseISO(dateString), 'MMMM d, yyyy hh:mm a');
    } catch (e) {
      return dateString;
    }
  };
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        if (!authUser) {
          navigate('/login');
          return;
        }

        // Always try to fetch fresh user data from the API
        try {
          const response = await api.get('/profile/me');
          setUser(response.data);
        } catch (apiError) {
          console.warn('Failed to fetch fresh user data, using cached data:', apiError);
          // Fallback to authUser data if API call fails
          if (authUser) {
            setUser(authUser);
          }
        }
      } catch (error) {
        console.error('Error in user data fetch:', error);
        toast.error('Failed to load user data');
        if (error.response?.status === 401) {
          logout();
          navigate('/login');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [authUser, navigate, logout]);

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordForm(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Status badge component
  const StatusBadge = ({ status }) => {
    const statusConfig = {
      active: { bg: 'bg-green-100 text-green-800', icon: CheckCircleIcon },
      inactive: { bg: 'bg-yellow-100 text-yellow-800', icon: ClockIcon },
      rejected: { bg: 'bg-red-100 text-red-800', icon: XCircleIcon },
      default: { bg: 'bg-gray-100 text-gray-800', icon: ClockIcon }
    };
    
    const config = statusConfig[status?.toLowerCase()] || statusConfig.default;
    const Icon = config.icon;
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg}`}>
        <Icon className="h-3.5 w-3.5 mr-1" />
        {status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Unknown'}
      </span>
    );
  };
  
  // Info field component
  const InfoField = ({ label, value, className = '' }) => (
    <div className={className}>
      <dt className="text-sm font-medium text-gray-500">{label}</dt>
      <dd className="mt-1 text-sm text-gray-900">
        {value || <span className="text-gray-400">Not provided</span>}
      </dd>
    </div>
  );
  
  // Document card component
  const DocumentCard = ({ doc, index }) => (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
      <div className="flex items-center">
        <div className="flex-shrink-0 bg-blue-100 p-2 rounded-md">
          <DocumentTextIcon className="h-5 w-5 text-blue-600" />
        </div>
        <div className="ml-3">
          <p className="text-sm font-medium text-gray-900">
            {doc.type ? doc.type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : `Document ${index + 1}`}
          </p>
          <p className="text-xs text-gray-500">
            {doc.verifiedAt ? `Verified on ${formatDate(doc.verifiedAt)}` : 'Pending verification'}
          </p>
        </div>
      </div>
      <div className="flex items-center space-x-2">
        {doc.verifiedAt && (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
            Verified
          </span>
        )}
        <a 
          href={doc.fileUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          className="inline-flex items-center px-2.5 py-1 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          View
        </a>
      </div>
    </div>
  );

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    try {
      await api.put(
        '/profile/password',
        {
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword
        }
      );

      toast.success('Password updated successfully');
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error) {
      console.error('Error updating password:', error);
      const errorMessage = error.response?.data?.message || 'Failed to update password';
      toast.error(errorMessage);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading your profile...</p>
          </div>
        </div>
      </div>
    );
  }
  
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Profile Not Found</h2>
            <p className="text-gray-600 mb-6">We couldn't load your profile information.</p>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-2xl font-bold text-gray-900">User Portal</h1>
        </div>
      </div>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : user ? (
          <div className="space-y-6">
            {/* User status and role */}
            <div className="flex items-center space-x-3">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                user.status === 'active' 
                  ? 'bg-green-100 text-green-800' 
                  : user.status === 'inactive' 
                    ? 'bg-yellow-100 text-yellow-800' 
                    : 'bg-gray-100 text-gray-800'
              }`}>
                {user.status ? user.status.charAt(0).toUpperCase() + user.status.slice(1) : 'Unknown'}
              </span>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'User'}
              </span>
            </div>

            {/* Main content area */}
            <div className="bg-white shadow rounded-lg overflow-hidden">
            <nav className="flex -mb-px overflow-x-auto">
              <button
                onClick={() => setActiveTab('personal')}
                className={`whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm flex items-center ${
                  activeTab === 'personal'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <UserCircleIcon className="h-5 w-5 mr-2" />
                Personal
              </button>
              {user.candidate && (
                <button
                  onClick={() => setActiveTab('employment')}
                  className={`whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm flex items-center ${
                    activeTab === 'employment'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <BriefcaseIcon className="h-5 w-5 mr-2" />
                  Employment
                </button>
              )}
              {user.candidate?.documents?.length > 0 && (
                <button
                  onClick={() => setActiveTab('documents')}
                  className={`whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm flex items-center ${
                    activeTab === 'documents'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <DocumentTextIcon className="h-5 w-5 mr-2" />
                  Documents {user.candidate.documents.length > 0 && `(${user.candidate.documents.length})`}
                </button>
              )}
              <button
                onClick={() => setActiveTab('security')}
                className={`whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm flex items-center ${
                  activeTab === 'security'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <LockClosedIcon className="h-5 w-5 mr-2" />
                Security
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="px-4 py-5 sm:p-6">
            {activeTab === 'personal' && (
              <div className="space-y-6">
                {/* Personal Information Section */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium text-gray-900">Personal Information</h3>
                    <button
                      type="button"
                      onClick={() => setIsEditing(!isEditing)}
                      className="text-sm font-medium text-blue-600 hover:text-blue-500"
                    >
                      {isEditing ? 'Cancel' : 'Edit'}
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <InfoField 
                        label="Full Name" 
                        value={user.candidate ? `${user.candidate.firstName || ''} ${user.candidate.lastName || ''}`.trim() || 'Not provided' : user.name || 'Not provided'}
                      />
                      
                      <InfoField 
                        label="Email Address" 
                        value={user.email}
                      />
                      
                      <InfoField 
                        label="Phone Number" 
                        value={user.candidate?.mobile || user.phone}
                      />
                      
                      <InfoField 
                        label="Alternative Phone" 
                        value={user.candidate?.AlternativeMobile}
                      />
                      
                      <InfoField 
                        label="Date of Birth" 
                        value={user.candidate?.dob ? `${formatDate(user.candidate.dob)} (${calculateAge(user.candidate.dob)} years)` : 'Not provided'}
                      />
                      
                      <InfoField 
                        label="Gender" 
                        value={user.candidate?.Gender ? user.candidate.Gender.charAt(0).toUpperCase() + user.candidate.Gender.slice(1) : 'Not specified'}
                      />
                      
                      <InfoField 
                        label="Blood Group" 
                        value={user.candidate?.BloodGroup || 'Not specified'}
                      />
                    </div>
                    
                    <div className="space-y-4">
                      <InfoField 
                        label="Father's Name" 
                        value={user.candidate?.fatherName}
                      />
                      
                      <InfoField 
                        label="Father's Mobile" 
                        value={user.candidate?.fatherMobile}
                      />
                      
                      <InfoField 
                        label="Mother's Name" 
                        value={user.candidate?.MotherName}
                      />
                      
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Marital Status</dt>
                        <dd className="mt-1 text-sm text-gray-900">
                          {user.candidate?.isMarried ? 'Married' : 'Single'}
                        </dd>
                      </div>
                      
                      {user.candidate?.isMarried && (
                        <>
                          <InfoField 
                            label="Spouse Name" 
                            value={user.candidate?.spouseName}
                          />
                          <InfoField 
                            label="Spouse Phone" 
                            value={user.candidate?.spouseNumber}
                          />
                        </>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Address Section */}
                {user.candidate?.address && (
                  <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Address</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                            <h4 className="text-sm font-medium text-gray-500 mb-2">Current Address</h4>
                            <div className="text-sm text-gray-900 space-y-1">
                              <div>{user.candidate.address.current?.line1}</div>
                              {user.candidate.address.current?.line2 && <div>{user.candidate.address.current.line2}</div>}
                              <div>
                                {user.candidate.address.current?.city}
                                {user.candidate.address.current?.state && `, ${user.candidate.address.current.state}`}
                                {user.candidate.address.current?.pincode && ` - ${user.candidate.address.current.pincode}`}
                              </div>
                            </div>
                          </div>
                          {!user.candidate.address.isPermanentSameAsCurrent ? (
                            <div>
                              <h4 className="text-sm font-medium text-gray-500 mb-2">Permanent Address</h4>
                              <div className="text-sm text-gray-900 space-y-1">
                                <div>{user.candidate.address.permanent?.line1}</div>
                                {user.candidate.address.permanent?.line2 && <div>{user.candidate.address.permanent.line2}</div>}
                                <div>
                                  {user.candidate.address.permanent?.city}
                                  {user.candidate.address.permanent?.state && `, ${user.candidate.address.permanent.state}`}
                                  {user.candidate.address.permanent?.pincode && ` - ${user.candidate.address.permanent.pincode}`}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="text-sm text-gray-500 italic">
                              Same as current address
                            </div>
                          )}
                          
                          {user.candidate.address.isPG && (
                            <div className="md:col-span-2 mt-4 pt-4 border-t border-gray-200">
                              <h4 className="text-sm font-medium text-gray-500 mb-2">PG/Hostel Details</h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <InfoField 
                                  label="PG/Hostel Name" 
                                  value={user.candidate.address.pgName}
                                />
                                <InfoField 
                                  label="PG Owner Name" 
                                  value={user.candidate.address.pgOwnerName}
                                />
                                <InfoField 
                                  label="PG Contact Number" 
                                  value={user.candidate.address.pgNumber}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* Identification Details */}
                    {(user.candidate?.aadhaarNumber || user.candidate?.panNumber || user.candidate?.drivingLicenseNumber) && (
                      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Identification Details</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-4">
                            <InfoField 
                              label="Aadhaar Number" 
                              value={user.candidate?.aadhaarNumber}
                            />
                            
                            <InfoField 
                              label="PAN Number" 
                              value={user.candidate?.panNumber}
                            />
                            
                            <InfoField 
                              label="Driving License" 
                              value={user.candidate?.drivingLicenseNumber}
                            />
                          </div>
                          
                          <div className="space-y-4">
                            <InfoField 
                              label="PF Number" 
                              value={user.candidate?.pfNumber}
                            />
                            
                            <InfoField 
                              label="ESIC Number" 
                              value={user.candidate?.esicNumber}
                            />
                            
                            <InfoField 
                              label="Medical Policy" 
                              value={user.candidate?.medicalPolicyNumber}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Employment Details Tab */}
                {activeTab === 'employment' && user.candidate && (
                  <div className="space-y-6">
                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Employment Information</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <InfoField 
                            label="Employee ID" 
                            value={user.employeeId || 'Not assigned'}
                          />
                          
                          <InfoField 
                            label="Designation" 
                            value={user.candidate.Designation}
                          />
                          
                          <InfoField 
                            label="Department" 
                            value={user.candidate.department}
                          />
                          
                          <InfoField 
                            label="Date of Joining" 
                            value={user.candidate.DateOfJoining ? formatDate(user.candidate.DateOfJoining) : 'Not specified'}
                          />
                          
                          <InfoField 
                            label="Salary" 
                            value={user.candidate.Salary ? `₹${Number(user.candidate.Salary).toLocaleString()}` : 'Not specified'}
                          />
                        </div>
                        
                        <div className="space-y-4">
                          <InfoField 
                            label="Next Increment" 
                            value={user.candidate.NextIncreament}
                          />
                          
                          <InfoField 
                            label="Next Increment Date" 
                            value={user.candidate.NextIncreamentDate ? formatDate(user.candidate.NextIncreamentDate) : 'Not specified'}
                          />
                          
                          <div>
                            <dt className="text-sm font-medium text-gray-500">Employment Status</dt>
                            <dd className="mt-1">
                              <StatusBadge status={user.candidate.status} />
                            </dd>
                          </div>
                          
                          {user.candidate.scoresSummary && (
                            <div className="mt-4 pt-4 border-t border-gray-200">
                              <h4 className="text-sm font-medium text-gray-500 mb-3">Interview Scores</h4>
                              <div className="space-y-3">
                                {user.candidate.scoresSummary.hr?.score !== undefined && (
                                  <div>
                                    <div className="flex justify-between text-sm">
                                      <span className="font-medium text-gray-700">HR Round</span>
                                      <span className="font-medium">
                                        {user.candidate.scoresSummary.hr.score}/10
                                      </span>
                                    </div>
                                    {user.candidate.scoresSummary.hr.comments && (
                                      <p className="mt-1 text-xs text-gray-500">
                                        {user.candidate.scoresSummary.hr.comments}
                                      </p>
                                    )}
                                  </div>
                                )}
                                
                                {user.candidate.scoresSummary.technical?.score !== undefined && (
                                  <div>
                                    <div className="flex justify-between text-sm">
                                      <span className="font-medium text-gray-700">Technical Round</span>
                                      <span className="font-medium">
                                        {user.candidate.scoresSummary.technical.score}/10
                                      </span>
                                    </div>
                                    {user.candidate.scoresSummary.technical.comments && (
                                      <p className="mt-1 text-xs text-gray-500">
                                        {user.candidate.scoresSummary.technical.comments}
                                      </p>
                                    )}
                                  </div>
                                )}
                                
                                {user.candidate.scoresSummary.founder?.score !== undefined && (
                                  <div>
                                    <div className="flex justify-between text-sm">
                                      <span className="font-medium text-gray-700">Final Round</span>
                                      <span className="font-medium">
                                        {user.candidate.scoresSummary.founder.score}/10
                                      </span>
                                    </div>
                                    {user.candidate.scoresSummary.founder.comments && (
                                      <p className="mt-1 text-xs text-gray-500">
                                        {user.candidate.scoresSummary.founder.comments}
                                      </p>
                                    )}
                                  </div>
                                )}
                                
                                {user.candidate.scoresSummary.weightedAvg !== undefined && (
                                  <div className="pt-3 mt-3 border-t border-gray-200">
                                    <div className="flex justify-between text-sm font-medium">
                                      <span className="text-gray-900">Overall Score</span>
                                      <span className="text-blue-600">
                                        {user.candidate.scoresSummary.weightedAvg.toFixed(1)}/10
                                      </span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Documents Tab */}
                {activeTab === 'documents' && user.candidate?.documents?.length > 0 && (
                  <div className="space-y-6">
                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-medium text-gray-900">Your Documents</h3>
                        <span className="text-sm text-gray-500">{user.candidate.documents.length} documents</span>
                      </div>
                      
                      <div className="space-y-3">
                        {user.candidate.documents.map((doc, index) => (
                          <DocumentCard key={doc._id || index} doc={doc} index={index} />
                        ))}
                      </div>
                    </div>
                    
                    <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <svg className="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <p className="text-sm text-blue-700">
                            All your submitted documents are securely stored. Contact HR if you need to update any document.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Security Tab */}
                {activeTab === 'security' && (
                  <div className="space-y-6">
                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Change Password</h3>
                      <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-lg">
                        <div>
                          <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700">
                            Current Password
                          </label>
                          <div className="mt-1">
                            <input
                              type="password"
                              name="currentPassword"
                              id="currentPassword"
                              value={passwordForm.currentPassword}
                              onChange={handlePasswordChange}
                              className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                              required
                            />
                          </div>
                        </div>
                        
                        <div>
                          <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                            New Password
                          </label>
                          <div className="mt-1">
                            <input
                              type="password"
                              name="newPassword"
                              id="newPassword"
                              value={passwordForm.newPassword}
                              onChange={handlePasswordChange}
                              className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                              required
                              minLength={6}
                            />
                          </div>
                        </div>
                        
                        <div>
                          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                            Confirm New Password
                          </label>
                          <div className="mt-1">
                            <input
                              type="password"
                              name="confirmPassword"
                              id="confirmPassword"
                              value={passwordForm.confirmPassword}
                              onChange={handlePasswordChange}
                              className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                              required
                              minLength={6}
                            />
                          </div>
                        </div>
                        
                        <div className="pt-2">
                          <button
                            type="submit"
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                          >
                            Update Password
                          </button>
                        </div>
                      </form>
                    </div>
                    
                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Account Activity</h3>
                      <div className="flex items-start">
                        <div className="flex-shrink-0 bg-green-100 p-2 rounded-md">
                          <CheckCircleIcon className="h-6 w-6 text-green-600" />
                        </div>
                        <div className="ml-4">
                          <h4 className="text-sm font-medium text-gray-900">Your account is active</h4>
                          <p className="text-sm text-gray-500 mt-1">
                            Last login: {user.lastLogin ? formatDateTime(user.lastLogin) : 'N/A'}
                          </p>
                          <p className="text-sm text-gray-500 mt-1">
                            Account created: {formatDate(user.createdAt)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500">No user data available. Please try again later.</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default UserPortal;
