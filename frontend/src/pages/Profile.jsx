import React, { useState, useEffect } from 'react';
import { 
  User, MessageCircle, TrendingUp, Edit3, Camera, Save, LogOut 
} from 'lucide-react';
import { auth, db } from "../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { useNavigate } from "react-router-dom";

const Profile = () => {
  const navigate = useNavigate(); // For navigation after logout
  const [activeTab, setActiveTab] = useState('posts');
  const [isEditing, setIsEditing] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [profileData, setProfileData] = useState({
    name: "",
    email: "",
    title: "",
    location: "",
    joinDate: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    avatar: "",
    coverImage: "",
    bio: "",
    stats: { posts: 0, followers: 0, following: 0, karma: 0, studyGroups: 0 },
    badges: [],
    skills: [],
    studyGroups: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch or create user profile
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        try {
          const docRef = doc(db, "users", user.uid);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            setProfileData(docSnap.data());
          } else {
            const defaultProfile = {
              uid: user.uid,
              name: "",
              email: user.email || "",
              title: "",
              location: "",
              joinDate: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
              avatar: "",
              coverImage: "",
              bio: "",
              stats: { posts: 0, followers: 0, following: 0, karma: 0, studyGroups: 0 },
              badges: [],
              skills: [],
              studyGroups: []
            };
            await setDoc(docRef, defaultProfile);
            setProfileData(defaultProfile);
          }
        } catch (err) {
          console.error("Error fetching/creating profile:", err);
          setError("Failed to load profile data.");
        } finally {
          setLoading(false);
        }
      } else {
        setCurrentUser(null);
        setLoading(false);
        navigate("/login"); // Redirect to login if not authenticated
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  const handleSave = async () => {
    if (!currentUser) return;
    try {
      const docRef = doc(db, "users", currentUser.uid);
      await setDoc(docRef, profileData);
      setIsEditing(false);
      alert("Profile saved successfully!");
    } catch (err) {
      console.error("Error saving profile:", err);
      alert("Failed to save profile.");
    }
  };

  const handleChange = (field, value) => {
    setProfileData(prev => ({ ...prev, [field]: value }));
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/login"); // Redirect to login after logout
    } catch (err) {
      console.error("Logout failed:", err);
      alert("Failed to log out.");
    }
  };

  if (loading) return <div className="text-center p-8">Loading profile...</div>;
  if (error) return <div className="text-center p-8 text-red-600">Error: {error}</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Cover Photo */}
      <div className="relative h-64 bg-gray-200">
        <img 
          src={profileData.coverImage || "https://via.placeholder.com/800x200"} 
          alt="Cover" 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/30"></div>
        {isEditing && (
          <input 
            type="text"
            placeholder="Cover Image URL"
            value={profileData.coverImage}
            onChange={(e) => handleChange("coverImage", e.target.value)}
            className="absolute bottom-4 left-4 p-2 rounded bg-white/80"
          />
        )}
      </div>

      <div className="max-w-4xl mx-auto px-4 -mt-32 relative z-10">
        {/* Profile Header */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          <div className="flex flex-col md:flex-row items-start md:items-end space-y-6 md:space-y-0 md:space-x-8">
            {/* Avatar */}
            <div className="relative">
              <img 
                src={profileData.avatar || "https://via.placeholder.com/150"} 
                alt={profileData.name || "User"} 
                className="w-32 h-32 rounded-full border-4 border-white shadow-lg object-cover"
              />
              {isEditing && (
                <div className="absolute bottom-0 left-0 w-full flex flex-col space-y-1">
                  <input 
                    type="text"
                    placeholder="Avatar URL"
                    value={profileData.avatar}
                    onChange={(e) => handleChange("avatar", e.target.value)}
                    className="w-full p-1 text-xs rounded bg-white/80"
                  />
                  <button
                    onClick={() => alert("You can add file upload here")}
                    className="bg-blue-500 text-white text-xs py-1 rounded flex items-center justify-center space-x-1"
                  >
                    <Camera className="w-3 h-3" /> <span>Edit Avatar</span>
                  </button>
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-4">
                <div>
                  {isEditing ? (
                    <input
                      type="text"
                      value={profileData.name}
                      placeholder="Name"
                      onChange={(e) => handleChange("name", e.target.value)}
                      className="text-3xl font-bold mb-2 w-full border-b border-gray-300 focus:outline-none"
                    />
                  ) : (
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">{profileData.name || "Your Name"}</h1>
                  )}
                  
                  {isEditing ? (
                    <input
                      type="text"
                      value={profileData.title}
                      placeholder="Title"
                      onChange={(e) => handleChange("title", e.target.value)}
                      className="text-xl text-gray-600 mb-3 w-full border-b border-gray-300 focus:outline-none"
                    />
                  ) : (
                    <p className="text-xl text-gray-600 mb-3">{profileData.title || "Your Title"}</p>
                  )}
                </div>

                <div className="flex space-x-2">
                  <button
                    onClick={isEditing ? handleSave : () => setIsEditing(true)}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-full transition-colors flex items-center space-x-1"
                  >
                    {isEditing ? <Save className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
                    <span>{isEditing ? "Save" : "Edit"}</span>
                  </button>
                  <button
                    onClick={handleLogout}
                    className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-full flex items-center space-x-1"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Logout</span>
                  </button>
                </div>
              </div>

              {isEditing ? (
                <textarea
                  value={profileData.bio}
                  placeholder="Bio"
                  onChange={(e) => handleChange("bio", e.target.value)}
                  className="w-full border p-2 rounded focus:outline-none"
                />
              ) : (
                <p className="text-gray-700 leading-relaxed">{profileData.bio || "Your bio..."}</p>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
          <div className="flex border-b border-gray-200">
            {[
              { id: 'posts', label: 'Posts', icon: MessageCircle },
              { id: 'activity', label: 'Activity', icon: TrendingUp },
              { id: 'about', label: 'About', icon: User }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-6 py-4 font-medium transition-colors ${
                  activeTab === tab.id 
                    ? 'text-blue-600 border-b-2 border-blue-600' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          {activeTab === 'posts' && <div className="text-gray-500">No posts yet</div>}
          {activeTab === 'activity' && <div className="text-gray-500">No activity yet</div>}
          {activeTab === 'about' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">About</h3>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Bio</h4>
                  <p className="text-gray-600">{profileData.bio || "Your bio..."}</p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Location</h4>
                  <p className="text-gray-600">{profileData.location || "Your location"}</p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Joined</h4>
                  <p className="text-gray-600">{profileData.joinDate}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
