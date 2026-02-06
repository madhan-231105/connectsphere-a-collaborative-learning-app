import React from "react";
import { useNavigate } from "react-router-dom";
import { Home, Users, MessageCircle, Bell, TrendingUp } from "lucide-react";

const Dashboard = () => {
  const navigate = useNavigate();

  const quickActions = [
    {
      title: "Feed",
      description: "See what your friends are sharing",
      icon: Home,
      path: "/feed",
      color: "bg-blue-50 text-blue-600 hover:bg-blue-100"
    },
    {
      title: "Groups",
      description: "Join group conversations",
      icon: Users,
      path: "/groups",
      color: "bg-purple-50 text-purple-600 hover:bg-purple-100"
    },
    {
      title: "Messages",
      description: "Chat with your connections",
      icon: MessageCircle,
      path: "/messages",
      color: "bg-green-50 text-green-600 hover:bg-green-100"
    },
    {
      title: "Notifications",
      description: "Check your latest updates",
      icon: Bell,
      path: "/notifications",
      color: "bg-orange-50 text-orange-600 hover:bg-orange-100"
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Welcome Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-900 rounded-2xl mb-6">
            <TrendingUp className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Welcome to ConnectSphere
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Your collaborative learning platform for connecting, sharing, and growing together
          </p>
        </div>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {quickActions.map((action, index) => (
            <div
              key={index}
              onClick={() => navigate(action.path)}
              className="bg-white rounded-xl border border-gray-200 p-8 hover:shadow-lg transition-all cursor-pointer group"
            >
              <div className={`inline-flex items-center justify-center w-14 h-14 rounded-xl mb-4 transition-colors ${action.color}`}>
                <action.icon className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-gray-700 transition-colors">
                {action.title}
              </h3>
              <p className="text-gray-600">
                {action.description}
              </p>
            </div>
          ))}
        </div>

        {/* Features Section */}
        <div className="bg-white rounded-xl border border-gray-200 p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            Platform Features
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Users className="w-6 h-6 text-gray-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Connect</h3>
              <p className="text-sm text-gray-600">
                Build meaningful connections with peers and mentors
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <MessageCircle className="w-6 h-6 text-gray-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Collaborate</h3>
              <p className="text-sm text-gray-600">
                Work together in groups and share knowledge
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <TrendingUp className="w-6 h-6 text-gray-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Grow</h3>
              <p className="text-sm text-gray-600">
                Learn from others and track your progress
              </p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center mt-12">
          <button
            onClick={() => navigate("/profile")}
            className="px-8 py-4 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 transition-colors"
          >
            Go to Your Profile
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;