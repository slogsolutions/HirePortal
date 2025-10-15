import React, { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';

const UserDashboard = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        // Replace with your actual API endpoint to fetch user-specific data
        const response = await axios.get(`/api/users/${user.id}`);
        setUserData(response.data);
      } catch (err) {
        console.error('Error fetching user data:', err);
        setError('Failed to load user data');
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchUserData();
    }
  }, [user]);

  if (loading) {
    return <div className="p-4">Loading your dashboard...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-600">{error}</div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
            Welcome, {user.name || 'User'}!
          </h1>
          <button
            onClick={() => navigate('/profile')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Edit Profile
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
            <h2 className="text-lg font-semibold mb-3 text-gray-700 dark:text-gray-200">
              Your Information
            </h2>
            <div className="space-y-2">
              <p className="text-gray-600 dark:text-gray-300">
                <span className="font-medium">Email:</span> {user.email}
              </p>
              <p className="text-gray-600 dark:text-gray-300">
                <span className="font-medium">Role:</span> {user.role}
              </p>
              {/* Add more user information as needed */}
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
            <h2 className="text-lg font-semibold mb-3 text-gray-700 dark:text-gray-200">
              Quick Actions
            </h2>
            <div className="space-y-2">
              <button
                onClick={() => navigate('/profile/change-password')}
                className="w-full text-left px-3 py-2 text-blue-600 dark:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-600 rounded"
              >
                Change Password
              </button>
              <button
                onClick={logout}
                className="w-full text-left px-3 py-2 text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-600 rounded"
              >
                Logout
              </button>
            </div>
          </div>
        </div>

        {/* Add more dashboard sections as needed */}
        
      </div>
    </div>
  );
};

export default UserDashboard;
